WITH p AS (SELECT bot, symbol, created_at t, CASE WHEN message LIKE '🟢%' THEN 1 WHEN message LIKE '🔴%' THEN -1 END sg,
   coalesce(substring(message from 'Strategy: ([^\n]*)'), '-') strat, (length(split_part(message, E'\n', 1)) - length(replace(split_part(message, E'\n', 1), '⭐', ''))) stars,
   substring(message from 'Current Price:\s*([\d.]+)')::float8 price
   FROM vv_messages WHERE bot IN ('hammer','hammer-pro','hammer-pro-plus','1d-hammer-pro','div','4s','4sniper') AND created_at >= '2026-10-24' AND created_at < '2026-10-30 15:00'),
 d AS (SELECT *, lag(t) OVER (PARTITION BY bot, symbol, sg, strat ORDER BY t) pt FROM p WHERE sg IS NOT NULL AND price > 0),
 v AS (SELECT d.*, date_bin('5 minutes', t, timestamptz '2000-01-01') b0 FROM d WHERE pt IS NULL OR t - pt > interval '30 minutes'),
 r AS (SELECT v.*,
 100*sg*((SELECT c FROM klines_5m k WHERE k.symbol=v.symbol AND k.t=v.b0+interval '15 minutes')/price-1) r15,
 100*sg*((SELECT c FROM klines_5m k WHERE k.symbol=v.symbol AND k.t=v.b0+interval '60 minutes')/price-1) r60,
 100*sg*((SELECT c FROM klines_5m k WHERE k.symbol=v.symbol AND k.t=v.b0+interval '240 minutes')/price-1) r240,
 w.mfe, w.mae FROM v LEFT JOIN LATERAL (SELECT CASE WHEN sg>0 THEN 100*(max(h)/price-1) ELSE 100*(1-min(l)/price) END mfe, CASE WHEN sg>0 THEN 100*(min(l)/price-1) ELSE 100*(1-max(h)/price) END mae FROM klines_5m k WHERE k.symbol=v.symbol AND k.t>v.b0 AND k.t<=v.b0+interval '55 minutes') w ON true)
SELECT bot, strat, CASE sg WHEN 1 THEN 'up' ELSE 'down' END yon, count(r60) n, round(avg(r15)::numeric,2) o15, round(avg(r60)::numeric,2) o60, round(100*avg((r60>0)::int)::numeric) k60, round(avg(r240)::numeric,2) o240, round(100*avg((r240>0)::int)::numeric) k240, round(avg(mfe)::numeric,2) mfe, round(avg(mae)::numeric,2) mae, round(100*avg((mfe>=1)::int)::numeric) tp1, round(100*avg((mae<=-1)::int)::numeric) sl1
FROM r GROUP BY 1,2,3 HAVING count(r60) >= 15 ORDER BY 1,2,3;
WITH p AS (SELECT bot, symbol, created_at t, CASE WHEN message LIKE '🟢%' THEN 1 WHEN message LIKE '🔴%' THEN -1 END sg,
   coalesce(substring(message from 'Strategy: ([^\n]*)'), '-') strat, (length(split_part(message, E'\n', 1)) - length(replace(split_part(message, E'\n', 1), '⭐', ''))) stars,
   substring(message from 'Current Price:\s*([\d.]+)')::float8 price
   FROM vv_messages WHERE bot IN ('hammer','hammer-pro','hammer-pro-plus','1d-hammer-pro','div','4s','4sniper') AND created_at >= '2026-10-24' AND created_at < '2026-10-30 15:00'),
 d AS (SELECT *, lag(t) OVER (PARTITION BY bot, symbol, sg, strat ORDER BY t) pt FROM p WHERE sg IS NOT NULL AND price > 0),
 v AS (SELECT d.*, date_bin('5 minutes', t, timestamptz '2000-01-01') b0 FROM d WHERE pt IS NULL OR t - pt > interval '30 minutes'),
 r AS (SELECT v.*,
 100*sg*((SELECT c FROM klines_5m k WHERE k.symbol=v.symbol AND k.t=v.b0+interval '15 minutes')/price-1) r15,
 100*sg*((SELECT c FROM klines_5m k WHERE k.symbol=v.symbol AND k.t=v.b0+interval '60 minutes')/price-1) r60,
 100*sg*((SELECT c FROM klines_5m k WHERE k.symbol=v.symbol AND k.t=v.b0+interval '240 minutes')/price-1) r240,
 w.mfe, w.mae FROM v LEFT JOIN LATERAL (SELECT CASE WHEN sg>0 THEN 100*(max(h)/price-1) ELSE 100*(1-min(l)/price) END mfe, CASE WHEN sg>0 THEN 100*(min(l)/price-1) ELSE 100*(1-max(h)/price) END mae FROM klines_5m k WHERE k.symbol=v.symbol AND k.t>v.b0 AND k.t<=v.b0+interval '55 minutes') w ON true)
SELECT bot, stars, CASE sg WHEN 1 THEN 'up' ELSE 'down' END yon, count(r60) n, round(avg(r60)::numeric,2) o60, round(100*avg((r60>0)::int)::numeric) k60, round(avg(r240)::numeric,2) o240, round(100*avg((r240>0)::int)::numeric) k240
FROM r WHERE bot LIKE '%hammer%' GROUP BY 1,2,3 HAVING count(r60) >= 15 ORDER BY 1,2,3;
WITH p AS (SELECT bot, symbol, created_at t, CASE WHEN message LIKE '🟢%' THEN 1 WHEN message LIKE '🔴%' THEN -1 END sg,
   coalesce(substring(message from 'Strategy: ([^\n]*)'), '-') strat, (length(split_part(message, E'\n', 1)) - length(replace(split_part(message, E'\n', 1), '⭐', ''))) stars,
   substring(message from 'Current Price:\s*([\d.]+)')::float8 price
   FROM vv_messages WHERE bot IN ('hammer','hammer-pro','hammer-pro-plus','1d-hammer-pro','div','4s','4sniper') AND created_at >= '2026-10-24' AND created_at < '2026-10-30 15:00'),
 d AS (SELECT *, lag(t) OVER (PARTITION BY bot, symbol, sg, strat ORDER BY t) pt FROM p WHERE sg IS NOT NULL AND price > 0),
 v AS (SELECT d.*, date_bin('5 minutes', t, timestamptz '2000-01-01') b0 FROM d WHERE pt IS NULL OR t - pt > interval '30 minutes'),
 r AS (SELECT v.*,
 100*sg*((SELECT c FROM klines_5m k WHERE k.symbol=v.symbol AND k.t=v.b0+interval '15 minutes')/price-1) r15,
 100*sg*((SELECT c FROM klines_5m k WHERE k.symbol=v.symbol AND k.t=v.b0+interval '60 minutes')/price-1) r60,
 100*sg*((SELECT c FROM klines_5m k WHERE k.symbol=v.symbol AND k.t=v.b0+interval '240 minutes')/price-1) r240,
 w.mfe, w.mae FROM v LEFT JOIN LATERAL (SELECT CASE WHEN sg>0 THEN 100*(max(h)/price-1) ELSE 100*(1-min(l)/price) END mfe, CASE WHEN sg>0 THEN 100*(min(l)/price-1) ELSE 100*(1-max(h)/price) END mae FROM klines_5m k WHERE k.symbol=v.symbol AND k.t>v.b0 AND k.t<=v.b0+interval '55 minutes') w ON true)
SELECT bot, to_char(t,'MM-DD') gun, count(r60) n, round(100*avg((r60>0)::int)::numeric) k60, round(avg(r240)::numeric,2) o240 FROM r WHERE bot IN ('hammer-pro','div') GROUP BY 1,2 ORDER BY 1,2