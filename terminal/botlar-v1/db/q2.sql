SELECT bot, count(*) sinyal, round(avg(r15)::numeric,2) ort15, round(avg(r60)::numeric,2) ort60, round(avg(r240)::numeric,2) ort240,
 round(100*avg((r60>0)::int)::numeric,0) kazanan60, round(100*avg((r240>0)::int)::numeric,0) kazanan240,
 round(percentile_cont(0.5) WITHIN GROUP (ORDER BY r60)::numeric,2) medyan60,
 round(avg(mfe60)::numeric,2) mfe, round(avg(mae60)::numeric,2) mae, count(r240) olculen
FROM karne_signals GROUP BY 1 ORDER BY 1;
SELECT bot, dir, count(*) n, round(avg(r60)::numeric,2) ort60, round(100*avg((r60>0)::int)::numeric,0) kaz60, round(avg(r240)::numeric,2) ort240, round(100*avg((r240>0)::int)::numeric,0) kaz240
FROM karne_signals GROUP BY 1,2 ORDER BY 1,2;
SELECT star, div1, div5, dir, count(*) n, round(avg(r60)::numeric,2) ort60, round(100*avg((r60>0)::int)::numeric,0) kaz60, round(avg(r240)::numeric,2) ort240, round(100*avg((r240>0)::int)::numeric,0) kaz240
FROM karne_signals WHERE bot='m1-premium' GROUP BY 1,2,3,4 HAVING count(*)>=30 ORDER BY 1,2,3,4;
SELECT bot, strategy, count(*) n, round(avg(r60)::numeric,2) ort60, round(100*avg((r60>0)::int)::numeric,0) kaz60, round(avg(r240)::numeric,2) ort240, round(100*avg((r240>0)::int)::numeric,0) kaz240
FROM karne_signals WHERE bot NOT IN ('m1','m1-premium') GROUP BY 1,2 HAVING count(*)>=20 ORDER BY 1,2;
SELECT date_trunc('day', t) gun, round(avg(CASE WHEN dir='down' THEN -r240 ELSE r240 END)::numeric,2) piyasa_ham240 FROM karne_signals WHERE bot='m1' GROUP BY 1 ORDER BY 1
