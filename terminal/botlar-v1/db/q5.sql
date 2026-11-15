WITH x AS (SELECT substring(message from 'Volume:\s*([+-]?[\d.]+)%')::float v, substring(message from 'Value:\s*([+-]?[\d.]+)%')::float b,
  substring(message from 'Current Price:\s*([\d.]+)')::float c, substring(message from 'Previous Price:\s*([\d.]+)')::float p
  FROM vv_messages WHERE bot='m1' AND message LIKE '%Volume:%' AND created_at > '2026-10-26')
SELECT count(*) n, percentile_cont(array[0.05,0.25,0.5,0.75,0.95]) WITHIN GROUP (ORDER BY v/b) oran,
  percentile_cont(array[0.05,0.25,0.5,0.75,0.95]) WITHIN GROUP (ORDER BY abs(b)) boost,
  percentile_cont(array[0.05,0.25,0.5,0.75,0.95]) WITHIN GROUP (ORDER BY v - 100*(c/p-1)) v_eksi_cp,
  avg((abs(v - 100*(c/p-1)) < 0.015)::int) cp_tam,
  avg((abs(v) < abs(b))::int) kucuk
FROM x WHERE b <> 0;
WITH x AS (SELECT substring(message from 'Volume:\s*([+-]?[\d.]+)%')::float v, substring(message from 'Value:\s*([+-]?[\d.]+)%')::float b,
  substring(message from 'Current Price:\s*([\d.]+)')::float c, substring(message from 'Previous Price:\s*([\d.]+)')::float p, message
  FROM vv_messages WHERE bot='m1' AND message LIKE '%Volume:%' AND created_at > '2026-10-29')
SELECT b, v, c, p, round((100*(c/p-1))::numeric,3) cp FROM x LIMIT 25
