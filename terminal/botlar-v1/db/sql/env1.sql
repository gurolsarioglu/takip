SELECT 'klines_5m' tb, count(*) n, count(DISTINCT symbol) coin, min(t) ilk, max(t) son FROM klines_5m;
SELECT 'oi_5m' tb, count(*) n, count(DISTINCT symbol) coin, min(t) ilk, max(t) son FROM oi_5m;
SELECT 'ls_15m' tb, count(*) n, count(DISTINCT symbol) coin, min(t) ilk, max(t) son FROM ls_15m;
SELECT 'lsp_15m' tb, count(*) n, count(DISTINCT symbol) coin, min(t) ilk, max(t) son FROM lsp_15m;
SELECT column_name, data_type, table_name FROM information_schema.columns WHERE table_name IN ('klines_5m','oi_5m','ls_15m','lsp_15m') ORDER BY table_name, ordinal_position;
SELECT bot, count(*) n, min(t) ilk, max(t) son FROM signals GROUP BY bot ORDER BY bot
