'use strict';
const { createHmac, randomBytes } = require('node:crypto');
const DAY = 864e5;
const fail = (status, message) => Object.assign(new Error(message), { status });
const invalid = () => fail(400, 'Geçersiz arşiv parametresi.');
function bounded(p, name, fallback, max) {
  if (!p.has(name)) return fallback;
  const raw = p.get(name), n = Number(raw);
  if (!/^\d+$/.test(raw) || n < 1 || n > max) throw invalid();
  return n;
}

function createArchive({ query, bots, now = Date.now }) {
  // Bind the window and filters together; a caller cannot move "to" into arbitrary history.
  const key = randomBytes(32);
  const mac = body => createHmac('sha256', key).update(body).digest('base64url');
  function encode(value) {
    const body = Buffer.from(JSON.stringify(value)).toString('base64url');
    return body + '.' + mac(body);
  }
  function decode(token) {
    if (!token || token.length > 4096) throw invalid();
    const parts = token.split('.');
    if (parts.length !== 2 || mac(parts[0]) !== parts[1]) throw invalid();
    return JSON.parse(Buffer.from(parts[0], 'base64url').toString());
  }
  return async function archive(p) {
    for (const name of ['symbol', 'bot', 'dir', 'days', 'limit', 'cursor']) if (p.getAll(name).length > 1) throw invalid();
    const symbol = p.get('symbol'), rawBot = p.get('bot'), dir = p.get('dir');
    const bot = rawBot === 'all' ? null : rawBot;
    if (!symbol || !/^[A-Z0-9]{2,30}$/.test(symbol)) throw invalid();
    if (bot !== null && !bots.has(bot)) throw fail(400, 'Bot, yayımlanan botlardan biri veya "all" olmalıdır.');
    if (dir !== null && dir !== 'up' && dir !== 'down') throw fail(400, 'Yön filtresi "up" veya "down" olmalıdır.');
    const days = bounded(p, 'days', 90, 90), limit = bounded(p, 'limit', 50, 100);
    const cursor = p.has('cursor') ? decode(p.get('cursor')) : null;
    if (cursor && (cursor.symbol !== symbol || cursor.bot !== bot || cursor.dir !== dir || cursor.days !== days)) throw invalid();
    const to = cursor ? cursor.to : now(), from = to - days * DAY;
    const args = [symbol, bot, new Date(from).toISOString(), new Date(to).toISOString(), limit + 1, dir];
    if (cursor) args.push(cursor.t, cursor.file, cursor.line);
    const sql = `SELECT src_file, src_line, bot, symbol, dir, strategy, text, price,
        to_char(t AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS exact_t
      FROM signals WHERE symbol = $1 AND ($2::text IS NULL OR bot = $2)
        AND t >= $3::timestamptz AND t < $4::timestamptz AND ($6::text IS NULL OR dir = $6)
      ${cursor ? 'AND (t, src_file, src_line) < ($7::timestamptz, $8, $9)' : ''}
      ORDER BY t DESC, src_file DESC, src_line DESC LIMIT $5`;
    let rows;
    try { rows = await query(sql, args); }
    catch { throw fail(503, 'Sinyal arşivi okunamadı.'); }
    const page = rows.slice(0, limit), last = page[page.length - 1];
    const items = page.map(r => ({ id: r.src_file + ':' + r.src_line, bot: r.bot, symbol: r.symbol, dir: r.dir,
      strategy: r.strategy, text: r.text, price: r.price, t: Date.parse(r.exact_t) }));
    const nextCursor = rows.length > limit ? encode({ symbol, bot, dir, days, to, t: last.exact_t, file: last.src_file, line: last.src_line }) : null;
    return { items, nextCursor, from, to };
  };
}
module.exports = { createArchive };
