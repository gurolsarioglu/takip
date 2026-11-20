(function (global) {
  'use strict';

  const PAGE = 50, ARCHIVE_CAP = 200, DELTA_PAGES = 3;
  const POLL_MS = 5000, RETRY_MS = 15000, TIMEOUT_MS = 12000;
  const symbolOf = value => String(value || '').trim().toUpperCase();
  const isSymbol = value => /^[A-Z0-9]{2,30}$/.test(value);
  const isSeq = value => Number.isSafeInteger(value) && value >= 0;
  const timeOf = value => value == null || value === '' ? NaN :
    typeof value === 'number' || /^\d+$/.test(value) ? Number(value) : Date.parse(value);
  const setText = (node, value) => { if (node.textContent !== value) node.textContent = value; };
  let instance = 0;

  function mount({ root, api, getSymbol, onSelectSymbol }) {
    const doc = root.ownerDocument, win = doc.defaultView;
    const prefix = `terminal-sp-${++instance}`;
    const clock = new Intl.DateTimeFormat('tr-TR', {
      timeZone: 'Europe/Istanbul', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
    });
    const calendar = new Intl.DateTimeFormat('tr-TR', {
      timeZone: 'Europe/Istanbul', day: '2-digit', month: '2-digit'
    });
    const shortTime = t => `${calendar.format(t)} ${clock.format(t)}`;
    const make = (tag, cls, content) => {
      const node = doc.createElement(tag);
      node.className = cls;
      if (content != null) node.textContent = content;
      return node;
    };
    const button = (cls, label, action) => {
      const node = make('button', cls, label);
      node.type = 'button';
      node.addEventListener('click', action);
      return node;
    };

    const shell = make('section', 'sp-panel');
    const title = make('h2', 'sp-title', 'Bot sinyalleri');
    title.id = `${prefix}-title`;
    shell.setAttribute('aria-labelledby', title.id);
    const registryNote = make('p', 'sp-registry-note');
    registryNote.setAttribute('role', 'status');
    const botList = make('div', 'sp-bots');
    shell.append(title, registryNote, botList);
    root.replaceChildren(shell);

    const body = make('div', 'sp-body');
    body.id = `${prefix}-body`;
    body.setAttribute('role', 'region');
    const controls = make('div', 'sp-controls');
    controls.setAttribute('role', 'group');
    controls.setAttribute('aria-label', 'Sinyal kaynağı');
    const live = button('sp-mode sp-live', 'Canlı', () => switchMode('live'));
    const archive = button('sp-mode sp-archive', 'Arşiv', () => switchMode('archive'));
    controls.append(live, archive);
    const status = make('p', 'sp-status');
    status.setAttribute('role', 'status');
    const list = make('ul', 'sp-list');
    list.setAttribute('aria-label', 'Sinyaller (en yeni önce)');
    const detail = make('div', 'sp-detail');
    detail.id = `${prefix}-detail`;
    detail.hidden = true;
    const detailBar = make('div', 'sp-detail-bar');
    const detailTitle = make('span', 'sp-detail-title');
    const close = button('sp-close', 'Kapat', () => closeDetail(true));
    const message = make('pre', 'sp-message');
    detailBar.append(detailTitle, close);
    detail.append(detailBar, message);
    const more = button('sp-more', 'Daha eski sinyaller', () => {
      if (!available() || archiveJob || (!archiveRetry && !archiveCursor)) return;
      archiveJob = archiveRetry || { cursor: archiveCursor };
      archiveRetry = null;
      loadError = false;
      paintStatus();
      pump();
    });
    body.append(controls, status, list, detail, more);
    body.addEventListener('keydown', event => {
      if (event.key === 'Escape' && !detail.hidden) { event.preventDefault(); closeDetail(true); }
    });

    const headers = new Map(), rows = new Map();
    let bot = '', mode = 'live', symbol = symbolOf(getSymbol()), opened = null;
    let registryReady = false, registryError = false, loaded = false, loadError = false;
    let stream = null, renderedEpoch = null, health = null, lastOk = null;
    let archiveCursor = null, archiveJob = null, archiveRetry = null, archiveCapped = false;
    let version = 0, busy = null, timer = null;

    function available() { return !doc.hidden && win.navigator.onLine !== false; }

    function paintStatus() {
      const offline = win.navigator.onLine === false;
      registryNote.hidden = registryReady && headers.size > 0;
      setText(registryNote, offline ? 'Çevrimdışı.' : registryError ? 'Bot listesi alınamadı.' :
        registryReady ? 'Bot yok.' : 'Botlar yükleniyor…');
      if (!bot) return;
      const notes = [];
      let tone = '';
      if (mode === 'archive') notes.push(`${isSymbol(symbol) ? symbol + ' · ' : ''}En çok 90 gün sorgulanır; kapsam doğrulanmadı.`);
      if (offline) { notes.push('Çevrimdışı.'); tone = 'warn'; }
      else if (loadError) { notes.push(mode === 'live' ? 'Sinyaller alınamadı.' : 'Arşiv alınamadı.'); tone = 'error'; }
      else if (mode === 'archive' && !isSymbol(symbol)) notes.push('Önce grafikte bir coin seçin.');
      else if (!loaded || (mode === 'archive' && archiveJob)) notes.push('Yükleniyor…');
      else if (mode === 'live') {
        if (health === 'warming') { notes.push('Canlı akış hazırlanıyor.'); tone = 'warn'; }
        else if (health === 'stale') {
          notes.push('Canlı akış gecikiyor.');
          if (lastOk != null) notes.push(`Son başarılı okuma: ${shortTime(lastOk)}.`);
          tone = 'warn';
        } else if (health === 'fresh') notes.push('Canlı akış güncel.');
        else notes.push('Akış durumu doğrulanmadı.');
      }
      if (loaded && !rows.size && !loadError && !archiveJob && health !== 'warming') notes.push('Sinyal yok.');
      if (mode === 'archive' && archiveCapped) notes.push(`Gösterim sınırı: ${ARCHIVE_CAP} kayıt.`);
      status.setAttribute('data-tone', tone);
      setText(status, notes.join(' '));
      const hideMore = mode !== 'archive' || (!archiveCursor && !archiveRetry);
      const focusWasMore = doc.activeElement === more;
      more.hidden = hideMore;
      more.setAttribute('aria-disabled', String(!available() || !!archiveJob));
      setText(more, archiveRetry ? 'Yeniden dene' : 'Daha eski sinyaller');
      if (hideMore && focusWasMore) (list.children[list.children.length - 1]?.children[0] || archive).focus();
    }

    function selectBot(id) {
      if (bot === id) return;
      const old = headers.get(bot);
      const focusWasInBody = body.contains(doc.activeElement);
      if (old) {
        old.setAttribute('aria-expanded', 'false');
        old.removeAttribute('aria-controls');
      }
      bot = id;
      const head = headers.get(id);
      head.setAttribute('aria-expanded', 'true');
      head.setAttribute('aria-controls', body.id);
      body.setAttribute('aria-labelledby', head.id);
      head.parentNode.append(body);
      if (focusWasInBody) head.focus();
      changeFilter();
    }

    function switchMode(next) {
      if (mode === next) return;
      mode = next;
      changeFilter();
    }

    function changeFilter() {
      invalidate();
      stream = renderedEpoch = health = lastOk = archiveCursor = archiveRetry = null;
      loaded = loadError = archiveCapped = false;
      archiveJob = mode === 'archive' && isSymbol(symbol) ? { cursor: null } : null;
      live.setAttribute('aria-pressed', String(mode === 'live'));
      archive.setAttribute('aria-pressed', String(mode === 'archive'));
      clearRows(mode === 'archive' ? archive : headers.get(bot));
      paintStatus();
      pump();
    }

    function setSymbol(value) {
      const next = symbolOf(value);
      if (next === symbol) return;
      symbol = next;
      if (mode === 'archive') changeFilter();
      else for (const row of rows.values()) markCurrent(row);
    }

    function markCurrent(row) {
      row.select.setAttribute('aria-current', String(row.item.symbol === symbol));
    }

    function openDetail(row) {
      if (opened && opened !== row) opened.detailButton.setAttribute('aria-expanded', 'false');
      opened = row;
      row.detailButton.setAttribute('aria-expanded', 'true');
      detail.hidden = false;
      paintDetail(row);
      close.focus();
    }

    function paintDetail(row) {
      setText(detailTitle, `${row.item.symbol} · Orijinal mesaj`);
      setText(message, row.item.text || 'Orijinal mesaj yok.');
    }

    function closeDetail(returnFocus) {
      if (!opened) return;
      opened.detailButton.setAttribute('aria-expanded', 'false');
      if (returnFocus) opened.detailButton.focus();
      detail.hidden = true;
      opened = null;
      setText(message, '');
    }

    function clearRows(fallback) {
      if (list.contains(doc.activeElement) || detail.contains(doc.activeElement)) fallback.focus({ preventScroll: true });
      closeDetail(false);
      list.replaceChildren();
      list.scrollTop = 0;
      rows.clear();
    }

    function makeRow() {
      const row = { node: make('li', 'sp-row') };
      row.select = button('sp-signal', null, () => onSelectSymbol(row.item.symbol));
      row.time = make('time', 'sp-time');
      row.symbol = make('span', 'sp-symbol');
      row.dir = make('span', 'sp-dir');
      row.select.append(row.time, row.symbol, row.dir);
      row.detailButton = button('sp-detail-trigger', 'Mesaj', () => openDetail(row));
      row.detailButton.setAttribute('aria-controls', detail.id);
      row.detailButton.setAttribute('aria-expanded', 'false');
      row.node.append(row.select, row.detailButton);
      return row;
    }

    function updateRow(row, item) {
      const direction = item.dir === 'up' ? 'Yukarı' : item.dir === 'down' ? 'Aşağı' : 'Yönsüz';
      row.item = item;
      row.time.dateTime = new Date(item.t).toISOString();
      row.select.title = `${item.symbol} · ${row.time.dateTime}`;
      setText(row.time, shortTime(item.t));
      setText(row.symbol, item.symbol);
      setText(row.dir, direction);
      row.dir.setAttribute('data-dir', item.dir === 'up' || item.dir === 'down' ? item.dir : 'none');
      row.select.setAttribute('aria-label', `${item.symbol} grafiğini aç · ${shortTime(item.t)} · ${direction}`);
      row.detailButton.setAttribute('aria-label', `${item.symbol} orijinal mesajını aç · ${shortTime(item.t)}`);
      markCurrent(row);
      if (opened === row) paintDetail(row);
    }

    function reconcile(items, append, cap) {
      const active = doc.activeElement, scroll = list.scrollTop;
      // Keep the first visible surviving row at its previous offset, even when it moves.
      const anchors = scroll > 0 ? [...list.children].filter(node => node.offsetTop + node.offsetHeight > scroll)
        .map(node => [node, node.offsetTop - scroll]) : [];
      const merged = new Map();
      if (append) for (const [id, row] of rows) merged.set(id, row.item);
      for (const item of items) {
        if (!item || item.id == null || (item.bot != null && item.bot !== bot)) continue;
        const coin = symbolOf(item.symbol), t = timeOf(item.t);
        if (!isSymbol(coin) || !Number.isFinite(t) || Math.abs(t) > 8.64e15 || (mode === 'archive' && coin !== symbol)) continue;
        const id = String(item.id), previous = merged.get(id);
        if (previous && isSeq(previous.seq) && isSeq(item.seq) && item.seq < previous.seq) continue;
        merged.set(id, { ...item, symbol: coin, t });
      }
      const shown = [...merged].sort((a, b) => b[1].t - a[1].t || (b[1].seq || 0) - (a[1].seq || 0)).slice(0, cap);
      const keep = new Set(shown.map(([id]) => id));
      const focusWasInRows = list.contains(active) || detail.contains(active);
      for (const [id, row] of rows) if (!keep.has(id)) {
        if (opened === row) closeDetail(false);
        row.node.remove();
        rows.delete(id);
      }
      shown.forEach(([id, item], index) => {
        let row = rows.get(id);
        if (!row) { row = makeRow(); rows.set(id, row); }
        if (row.item !== item) updateRow(row, item);
        const at = list.children[index];
        if (row.node !== at) list.insertBefore(row.node, at || null);
      });
      if (focusWasInRows) {
        if (list.contains(active) || (!detail.hidden && detail.contains(active))) {
          if (doc.activeElement !== active) active.focus({ preventScroll: true });
        } else headers.get(bot).focus({ preventScroll: true });
      }
      const anchor = anchors.find(([node]) => node.parentNode === list);
      list.scrollTop = anchor ? anchor[0].offsetTop - anchor[1] : scroll;
    }

    function clearTimer() {
      if (timer != null) win.clearTimeout(timer);
      timer = null;
    }

    function invalidate() {
      version++;
      clearTimer();
      if (busy) busy.abort();
    }

    function url(path, params) { return `${path}?${new win.URLSearchParams(params)}`; }
    function liveUrl(params) { return url('/api/messages', { bot, limit: PAGE, ...params }); }

    async function livePoll(request, current) {
      const apply = (response, append) => {
        if (!Array.isArray(response?.items)) throw new Error('Invalid signal response');
        discardOldEpoch(response.epoch);
        reconcile(response.items, append, PAGE);
        renderedEpoch = response.epoch ?? null;
        health = response.state;
        const t = timeOf(response.lastPollOkAt);
        lastOk = Number.isFinite(t) && Math.abs(t) <= 8.64e15 ? t : null;
        loaded = true;
      };
      for (let page = 0; stream && page < DELTA_PAGES; page++) {
        const { epoch, after } = stream;
        const response = await request(liveUrl({ mode: 'delta', after, epoch }));
        if (!current()) return;
        const next = response?.nextAfter;
        if (response?.reset || response?.epoch !== epoch || !isSeq(next) || next < after ||
            (response.hasMore && next === after) || typeof response.hasMore !== 'boolean') {
          // A restart or incompatible delta cannot safely share the old cursor.
          if (discardOldEpoch(response?.epoch)) paintStatus();
          stream = null;
          break;
        }
        apply(response, true);
        stream = { epoch, after: next };
        if (!response.hasMore) return;
      }
      if (stream) return; // Bound the burst; the next poll resumes at nextAfter.
      const response = await request(liveUrl());
      if (!current()) return;
      apply(response, false);
      if (response.epoch != null && response.epoch !== '' && isSeq(response.maxSeq)) {
        stream = { epoch: response.epoch, after: response.maxSeq };
      }
    }

    function discardOldEpoch(epoch) {
      if (epoch == null || renderedEpoch == null || epoch === renderedEpoch) return false;
      clearRows(headers.get(bot));
      renderedEpoch = null;
      loaded = false;
      return true;
    }

    async function archivePage(request, current, job) {
      const params = { symbol, bot, days: 90, limit: PAGE };
      if (job.cursor) params.cursor = job.cursor;
      const response = await request(url('/api/t/signal-archive', params));
      if (!current()) return;
      if (!Array.isArray(response?.items)) throw new Error('Invalid archive response');
      reconcile(response.items, !!job.cursor, ARCHIVE_CAP);
      const next = response.nextCursor;
      archiveCapped = rows.size >= ARCHIVE_CAP && !!next;
      archiveCursor = !archiveCapped && typeof next === 'string' && next !== job.cursor ? next : null;
      archiveJob = null;
      loaded = true;
    }

    async function loadRegistry(request, current) {
      const response = await request('/api/bots');
      if (!current()) return;
      if (!Array.isArray(response)) throw new Error('Invalid bot list');
      for (const entry of response) {
        if (!entry || typeof entry.id !== 'string' || !entry.id || headers.has(entry.id)) continue;
        const item = make('div', 'sp-bot-item');
        const head = button('sp-bot', entry.name || entry.id, () => selectBot(entry.id));
        head.id = `${prefix}-bot-${headers.size}`;
        head.setAttribute('aria-expanded', 'false');
        headers.set(entry.id, head);
        item.append(head);
        botList.append(item);
      }
      registryReady = true;
      registryError = false;
      if (headers.size) selectBot(headers.has('m1-premium') ? 'm1-premium' : headers.keys().next().value);
    }

    async function pump() {
      if (busy || !available()) return;
      const job = !registryReady ? 'registry' : bot && mode === 'live' ? 'live' : archiveJob;
      if (!job) return;
      clearTimer();
      const rev = version, controller = new win.AbortController();
      busy = controller;
      const current = () => rev === version && available();
      const request = async path => {
        const deadline = win.setTimeout(() => controller.abort(), TIMEOUT_MS);
        try {
          const data = await api(path, { signal: controller.signal });
          if (controller.signal.aborted) throw new Error('Request aborted');
          return data;
        } finally { win.clearTimeout(deadline); }
      };
      try {
        if (job === 'registry') await loadRegistry(request, current);
        else if (job === 'live') await livePoll(request, current);
        else await archivePage(request, current, job);
        if (current()) loadError = false;
      } catch {
        if (current()) {
          if (job === 'registry') registryError = true;
          else {
            loadError = true;
            if (job !== 'live') { archiveRetry = job; archiveJob = null; }
          }
        }
      } finally {
        busy = null;
        paintStatus();
        if (available()) {
          if (rev !== version) pump();
          else if (!registryReady || (bot && mode === 'live')) {
            timer = win.setTimeout(pump, loadError || registryError ? RETRY_MS : POLL_MS);
          }
        }
      }
    }

    function onAvailability() {
      if (!available()) invalidate();
      paintStatus();
      if (available()) pump();
    }

    doc.addEventListener('visibilitychange', onAvailability);
    win.addEventListener('online', onAvailability);
    win.addEventListener('offline', onAvailability);
    paintStatus();
    pump();
    return { setSymbol };
  }

  global.TerminalSignalPanel = { mount };
})(typeof window === 'undefined' ? globalThis : window);
