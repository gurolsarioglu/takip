SELECT min(t) ilk, max(t) son, count(*) n, count(DISTINCT symbol) coin FROM oi_5m;
SELECT min(t) ilk, max(t) son, count(*) n, count(top_long) top, count(global_long) glob, count(taker_buy) taker FROM ls_15m;
SELECT count(*) FILTER (WHERE message LIKE '🟢%') yesil, count(*) FILTER (WHERE message LIKE '#%') tarama, min(created_at) ilk, max(created_at) son FROM vv_messages WHERE bot='fr' AND created_at >= '2026-10-12'
