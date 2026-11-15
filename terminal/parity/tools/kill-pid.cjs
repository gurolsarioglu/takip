// node tools/kill-pid.cjs <pid> [pid...]  → verilen node süreçlerini kapatır
for (const a of process.argv.slice(2)) { const pid = Number(a); if (!pid || pid === process.pid || pid === process.ppid) continue; try { process.kill(pid); console.log('kapatıldı', pid); } catch (e) { console.log('kapatılamadı', pid, e.message); } }
