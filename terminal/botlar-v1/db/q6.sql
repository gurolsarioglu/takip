SELECT relname tablo, n_live_tup::bigint satir, pg_size_pretty(pg_total_relation_size(relid)) boyut FROM pg_stat_user_tables ORDER BY pg_total_relation_size(relid) DESC;
SELECT pg_size_pretty(pg_database_size(current_database())) db, version();
SELECT bot, count(*) n, min(t) ilk, max(t) son FROM signals GROUP BY 1 ORDER BY 1;
SELECT bot, count(*) n, count(r240) olculen FROM karne_signals GROUP BY 1 ORDER BY 1;
SELECT (SELECT count(*) FROM kasa_periods) donem, (SELECT count(*) FROM kasa_trades) islem, (SELECT min(t) FROM klines_5m) k5ilk, (SELECT max(t) FROM klines_5m) k5son, (SELECT max(t) FROM klines_1m) k1son
