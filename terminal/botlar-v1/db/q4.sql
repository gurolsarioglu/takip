SELECT to_char(k.t AT TIME ZONE 'Europe/Istanbul','DD.MM') gun, count(*) n, count(DISTINCT k.symbol) coin, round(100*avg((k.r60<0)::int)::numeric) ters_kazanan60
FROM karne_signals k JOIN LATERAL (SELECT text FROM signals WHERE bot=k.bot AND symbol=k.symbol AND t=k.t LIMIT 1) s ON true
WHERE k.bot='m1-premium' AND k.dir='down' AND k.div1 AND k.div5 AND (substring(s.text from 'RSI:[^\n]*?5m\.(\d+)'))::int <= 20
GROUP BY 1 ORDER BY 1
