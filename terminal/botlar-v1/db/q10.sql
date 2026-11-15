SELECT left(message, 330) m, created_at FROM vv_messages WHERE bot='fr' AND symbol='REEFUSDT' ORDER BY created_at DESC LIMIT 3;
SELECT substring(message from '^(.)') ilk, (message LIKE '%Difference%') fark, (message LIKE '%changed%') degisti, count(*) FROM vv_messages WHERE bot='fr' AND created_at >= '2026-09-15' GROUP BY 1,2,3 ORDER BY 4 DESC;
SELECT left(message, 300) m FROM vv_messages WHERE bot='fr' AND message LIKE '🟢%' AND created_at >= '2026-10-29' ORDER BY created_at DESC LIMIT 2;
SELECT left(message, 300) m FROM vv_messages WHERE bot='fr' AND message NOT LIKE '🟢%' AND message NOT LIKE '🔴%' AND created_at >= '2026-10-29' ORDER BY created_at DESC LIMIT 2
