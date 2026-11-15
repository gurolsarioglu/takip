SELECT bot, dir, count(*) n, min(t) ilk, max(t) son FROM signals GROUP BY 1,2 ORDER BY 1,2;
SELECT count(*) mum, count(DISTINCT symbol) coin FROM klines_5m
