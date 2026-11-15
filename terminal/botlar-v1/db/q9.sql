SELECT count(*) n, round(100*avg((message LIKE '%Volatilite%')::int)::numeric,1) vol_pct, count(*) FILTER (WHERE message LIKE '%BTC Status%') btc_satiri, min(created_at) ilk FROM vv_messages WHERE bot='m1';
SELECT substring(message from 'BTC Status: ([^\n]*)') durum, count(*) FROM vv_messages WHERE bot IN ('m1','hammer-pro','1d-hammer-pro') GROUP BY 1 ORDER BY 2 DESC LIMIT 8;
SELECT (SELECT count(*) FROM klines_5m WHERE symbol='BTCUSDT') btc5, (SELECT min(t) FROM klines_5m WHERE symbol='BTCUSDT') ilk5, (SELECT count(*) FROM klines_1m WHERE symbol='BTCUSDT') btc1;
WITH m AS (SELECT date_bin('5 minutes', created_at, timestamptz '2000-01-01') b, count(*) n, avg((message LIKE '%Volatilite%')::int) v FROM vv_messages WHERE bot='m1' AND created_at >= '2026-10-20' GROUP BY 1)
SELECT width_bucket(v, 0, 1.0001, 5) dilim, count(*) kova, sum(n) mesaj FROM m GROUP BY 1 ORDER BY 1;
WITH m AS (SELECT date_bin('5 minutes', created_at, timestamptz '2000-01-01') b, count(*) n, avg((message LIKE '%Volatilite%')::int) v FROM vv_messages WHERE bot='m1' AND created_at >= '2026-10-20' GROUP BY 1),
k AS (SELECT t, 100*abs(c/o-1) body, 100*(h-l)/o rng, 100*abs(c/lag(c,3) OVER w-1) ch15, 100*abs(c/lag(c,12) OVER w-1) ch60,
        100*(max(h) OVER (ORDER BY t ROWS 11 PRECEDING)/min(l) OVER (ORDER BY t ROWS 11 PRECEDING)-1) rng60, 100*(max(h) OVER (ORDER BY t ROWS 2 PRECEDING)/min(l) OVER (ORDER BY t ROWS 2 PRECEDING)-1) rng15
      FROM klines_5m WHERE symbol='BTCUSDT' AND t >= '2026-10-19' WINDOW w AS (ORDER BY t))
SELECT (m.v > 0.5) volatil, count(*) kova, round(avg(k.body)::numeric,3) body5, round(avg(k.rng)::numeric,3) rng5, round(avg(k.rng15)::numeric,3) rng15, round(avg(k.ch15)::numeric,3) ch15, round(avg(k.rng60)::numeric,3) rng60, round(avg(k.ch60)::numeric,3) ch60,
  round((percentile_cont(0.1) WITHIN GROUP (ORDER BY k.rng15))::numeric,3) rng15_p10, round((percentile_cont(0.9) WITHIN GROUP (ORDER BY k.rng15))::numeric,3) rng15_p90,
  round((percentile_cont(0.1) WITHIN GROUP (ORDER BY k.rng60))::numeric,3) rng60_p10, round((percentile_cont(0.9) WITHIN GROUP (ORDER BY k.rng60))::numeric,3) rng60_p90,
  round((percentile_cont(0.1) WITHIN GROUP (ORDER BY k.ch60))::numeric,3) ch60_p10, round((percentile_cont(0.9) WITHIN GROUP (ORDER BY k.ch60))::numeric,3) ch60_p90
FROM m JOIN k ON k.t = m.b GROUP BY 1
