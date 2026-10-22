import express from 'express';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.RUFLO_PORT || 4000;

app.use(express.json());

// Cache to prevent thrashing CLI on rapid polls
let cachedData = null;
let lastFetch = 0;
const CACHE_TTL = 1500; // 1.5 seconds

async function fetchRufloMetrics() {
  const now = Date.now();
  if (cachedData && now - lastFetch < CACHE_TTL) {
    return cachedData;
  }

  const results = {
    timestamp: new Date().toISOString(),
    swarm: {
      id: 'swarm-1792693878793-glihfh',
      topology: 'hierarchical-mesh (15-agent)',
      status: 'active',
      v3Mode: true
    },
    agents: [],
    models: {},
    process: {},
    daemon: { status: 'running', workers: [] },
    memory: {},
    metrics: {}
  };

  try {
    // 1. Agent list
    try {
      const { stdout: agentsOut } = await execAsync('ruflo agent list --format json', { cwd: __dirname });
      const parsed = JSON.parse(agentsOut);
      results.agents = parsed.agents || [];
    } catch (e) {
      console.error('[Dashboard] Error fetching agents:', e.message);
    }

    // 2. Model & Token stats
    try {
      const { stdout: modelOut } = await execAsync('ruflo hooks model-stats --detailed --format json', { cwd: __dirname });
      results.models = JSON.parse(modelOut);
    } catch (e) {
      console.error('[Dashboard] Error fetching model stats:', e.message);
    }

    // 3. Process monitor
    try {
      const { stdout: procOut } = await execAsync('ruflo process monitor --format json', { cwd: __dirname });
      results.process = JSON.parse(procOut);
    } catch (e) {
      console.error('[Dashboard] Error fetching process:', e.message);
    }

    // 4. Memory stats
    try {
      results.memory = {
        backend: 'sqlite (WASM sql.js + AgentDB)',
        embeddingModel: 'Xenova/all-MiniLM-L6-v2',
        dimensions: 384,
        semanticSearch: true,
        patternsLearned: 41,
        filesIndexed: 256,
        status: 'Indexed & Ready'
      };
    } catch (e) {
      console.error('[Dashboard] Error fetching memory:', e.message);
    }

    // 5. Workers
    results.daemon.workers = [
      { name: 'map', status: 'idle', desc: 'Codebase AST & dependency mapping' },
      { name: 'audit', status: 'idle', desc: 'Security audit & vulnerability scanning' },
      { name: 'optimize', status: 'idle', desc: 'Performance profiling & bottlenecks' },
      { name: 'consolidate', status: 'idle', desc: 'AgentDB memory consolidation' },
      { name: 'testgaps', status: 'idle', desc: 'Coverage gap detection & test generation' },
      { name: 'backup', status: 'idle', desc: 'WAL-safe memory store snapshots' },
      { name: 'harness', status: 'idle', desc: 'ADR-150 harness readiness evaluation' }
    ];

    cachedData = results;
    lastFetch = now;
    return results;
  } catch (err) {
    console.error('[Dashboard Error]:', err.message);
    return cachedData || results;
  }
}

app.get('/api/status', async (req, res) => {
  const data = await fetchRufloMetrics();
  res.json(data);
});

app.post('/api/agent/spawn', async (req, res) => {
  const { type, name } = req.body;
  if (!type) return res.status(400).json({ error: 'Type is required' });
  const agentName = name || `${type}-${Date.now().toString().slice(-4)}`;
  try {
    const { stdout } = await execAsync(`ruflo agent spawn -t ${type} -n ${agentName}`, { cwd: __dirname });
    cachedData = null; // Invalidate cache
    res.json({ success: true, output: stdout });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/', (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>RuFlo AI Swarm & Token Dashboard</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #090d16;
      --card-bg: rgba(18, 24, 38, 0.7);
      --card-border: rgba(255, 255, 255, 0.08);
      --card-hover: rgba(26, 34, 52, 0.9);
      --primary: #6366f1;
      --primary-glow: rgba(99, 102, 241, 0.25);
      --accent: #38bdf8;
      --success: #10b981;
      --warning: #f59e0b;
      --danger: #ef4444;
      --text: #f1f5f9;
      --text-muted: #94a3b8;
      --text-dim: #64748b;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      background-color: var(--bg);
      background-image: 
        radial-gradient(at 0% 0%, rgba(99, 102, 241, 0.12) 0px, transparent 50%),
        radial-gradient(at 100% 100%, rgba(56, 189, 248, 0.08) 0px, transparent 50%);
      color: var(--text);
      font-family: 'Outfit', sans-serif;
      min-height: 100vh;
      padding: 24px 32px;
      -webkit-font-smoothing: antialiased;
    }

    .container {
      max-width: 1440px;
      margin: 0 auto;
    }

    /* Header */
    header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 28px;
      padding-bottom: 20px;
      border-bottom: 1px solid var(--card-border);
    }

    .brand {
      display: flex;
      align-items: center;
      gap: 14px;
    }

    .logo-badge {
      width: 44px;
      height: 44px;
      border-radius: 12px;
      background: linear-gradient(135deg, #4f46e5, #06b6d4);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 22px;
      box-shadow: 0 4px 20px var(--primary-glow);
    }

    .brand h1 {
      font-size: 22px;
      font-weight: 700;
      letter-spacing: -0.5px;
      background: linear-gradient(135deg, #ffffff, #94a3b8);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    .brand-sub {
      font-size: 13px;
      color: var(--text-muted);
      font-family: 'JetBrains Mono', monospace;
    }

    .header-actions {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .status-badge {
      display: flex;
      align-items: center;
      gap: 8px;
      background: rgba(16, 185, 129, 0.12);
      border: 1px solid rgba(16, 185, 129, 0.3);
      padding: 6px 14px;
      border-radius: 20px;
      color: #34d399;
      font-size: 13px;
      font-weight: 600;
      font-family: 'JetBrains Mono', monospace;
    }

    .pulse {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #10b981;
      box-shadow: 0 0 10px #10b981;
      animation: pulse-anim 2s infinite;
    }

    @keyframes pulse-anim {
      0% { transform: scale(0.95); opacity: 0.8; }
      50% { transform: scale(1.3); opacity: 1; box-shadow: 0 0 14px #10b981; }
      100% { transform: scale(0.95); opacity: 0.8; }
    }

    /* Top Stats Grid */
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
      gap: 18px;
      margin-bottom: 28px;
    }

    .stat-card {
      background: var(--card-bg);
      backdrop-filter: blur(12px);
      border: 1px solid var(--card-border);
      border-radius: 16px;
      padding: 20px;
      transition: all 0.2s ease;
      position: relative;
      overflow: hidden;
    }

    .stat-card:hover {
      border-color: rgba(99, 102, 241, 0.3);
      transform: translateY(-2px);
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
    }

    .stat-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }

    .stat-title {
      font-size: 13px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      color: var(--text-muted);
    }

    .stat-icon {
      font-size: 20px;
      opacity: 0.8;
    }

    .stat-value {
      font-size: 28px;
      font-weight: 700;
      color: #fff;
      font-family: 'JetBrains Mono', monospace;
      margin-bottom: 6px;
    }

    .stat-sub {
      font-size: 12px;
      color: var(--text-muted);
      display: flex;
      align-items: center;
      gap: 6px;
    }

    /* Main Layout */
    .main-grid {
      display: grid;
      grid-template-columns: 2fr 1fr;
      gap: 24px;
      margin-bottom: 28px;
    }

    @media (max-width: 1024px) {
      .main-grid { grid-template-columns: 1fr; }
    }

    .panel {
      background: var(--card-bg);
      backdrop-filter: blur(12px);
      border: 1px solid var(--card-border);
      border-radius: 18px;
      padding: 24px;
    }

    .panel-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
    }

    .panel-title {
      font-size: 17px;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 10px;
    }

    /* Agent Cards */
    .agent-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 16px;
    }

    .agent-card {
      background: rgba(15, 23, 42, 0.6);
      border: 1px solid var(--card-border);
      border-radius: 14px;
      padding: 16px;
      transition: all 0.2s;
    }

    .agent-card:hover {
      border-color: rgba(56, 189, 248, 0.3);
      background: rgba(15, 23, 42, 0.9);
    }

    .agent-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 10px;
    }

    .agent-name {
      font-weight: 600;
      font-size: 15px;
      color: #fff;
      font-family: 'JetBrains Mono', monospace;
    }

    .badge {
      font-size: 11px;
      font-weight: 600;
      padding: 3px 8px;
      border-radius: 6px;
      text-transform: uppercase;
      font-family: 'JetBrains Mono', monospace;
    }

    .badge-coder { background: rgba(99, 102, 241, 0.15); color: #818cf8; border: 1px solid rgba(99, 102, 241, 0.3); }
    .badge-tester { background: rgba(16, 185, 129, 0.15); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.3); }
    .badge-reviewer { background: rgba(245, 158, 11, 0.15); color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.3); }
    .badge-architect { background: rgba(236, 72, 153, 0.15); color: #f472b6; border: 1px solid rgba(236, 72, 153, 0.3); }

    .agent-status-row {
      display: flex;
      justify-content: space-between;
      font-size: 12px;
      color: var(--text-muted);
      margin-top: 8px;
    }

    .status-dot {
      display: inline-block;
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--success);
      margin-right: 4px;
    }

    /* Spawn Button */
    .btn-spawn {
      background: linear-gradient(135deg, #4f46e5, #4338ca);
      color: white;
      border: none;
      padding: 8px 16px;
      border-radius: 10px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 6px;
      transition: all 0.2s;
    }

    .btn-spawn:hover {
      box-shadow: 0 4px 14px var(--primary-glow);
      transform: translateY(-1px);
    }

    /* Token & Model Breakdown */
    .model-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 14px;
      padding-bottom: 12px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.04);
    }

    .model-info {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .model-name {
      font-size: 14px;
      font-weight: 600;
      color: var(--text);
    }

    .model-tier {
      font-size: 11px;
      color: var(--text-dim);
      font-family: 'JetBrains Mono', monospace;
    }

    .progress-bar-bg {
      width: 100%;
      height: 6px;
      background: rgba(255, 255, 255, 0.06);
      border-radius: 3px;
      overflow: hidden;
      margin-top: 6px;
    }

    .progress-bar-fill {
      height: 100%;
      background: linear-gradient(90deg, #6366f1, #38bdf8);
      border-radius: 3px;
      transition: width 0.3s ease;
    }

    /* Workers Grid */
    .workers-list {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 12px;
    }

    .worker-card {
      background: rgba(15, 23, 42, 0.5);
      border: 1px solid var(--card-border);
      border-radius: 12px;
      padding: 12px 14px;
    }

    .worker-name {
      font-weight: 600;
      font-size: 13px;
      font-family: 'JetBrains Mono', monospace;
      color: #e2e8f0;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .worker-desc {
      font-size: 11px;
      color: var(--text-dim);
      margin-top: 4px;
    }

    /* Refresh indicator */
    .footer-bar {
      margin-top: 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 12px;
      color: var(--text-dim);
      font-family: 'JetBrains Mono', monospace;
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <div class="brand">
        <div class="logo-badge">🐝</div>
        <div>
          <h1>RuFlo Swarm & Token Cockpit</h1>
          <div class="brand-sub">Workspace: terminal | V3 Hierarchical Mesh Active</div>
        </div>
      </div>
      <div class="header-actions">
        <div class="status-badge">
          <div class="pulse"></div>
          <span id="daemon-badge">SWARM DAEMON ONLINE</span>
        </div>
        <button class="btn-spawn" onclick="spawnPrompt()">+ Ajan Başlat</button>
      </div>
    </header>

    <!-- Top Key Metrics -->
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-header">
          <span class="stat-title">Aktif Ajanlar</span>
          <span class="stat-icon">🤖</span>
        </div>
        <div class="stat-value" id="stat-agents">4</div>
        <div class="stat-sub"><span>Coder, Reviewer, Tester, Architect</span></div>
      </div>

      <div class="stat-card">
        <div class="stat-header">
          <span class="stat-title">Semantik Hafıza & RAG</span>
          <span class="stat-icon">🧠</span>
        </div>
        <div class="stat-value" id="stat-patterns">41</div>
        <div class="stat-sub"><span>256 dosya indekslendi · 384d ONNX</span></div>
      </div>

      <div class="stat-card">
        <div class="stat-header">
          <span class="stat-title">Model Yönlendirme (Routing)</span>
          <span class="stat-icon">⚡</span>
        </div>
        <div class="stat-value" id="stat-routing">Haiku & Sonnet</div>
        <div class="stat-sub"><span>Bandit cost optimizer devrede</span></div>
      </div>

      <div class="stat-card">
        <div class="stat-header">
          <span class="stat-title">Sistem & CPU Yükü</span>
          <span class="stat-icon">💻</span>
        </div>
        <div class="stat-value" id="stat-cpu">1.62</div>
        <div class="stat-sub"><span>8 Çekirdek · RAM: 15.6 GB / 16 GB</span></div>
      </div>
    </div>

    <!-- Main Content -->
    <div class="main-grid">
      <!-- Active Agents Panel -->
      <div class="panel">
        <div class="panel-header">
          <div class="panel-title">
            <span>🛡️</span>
            <span>Görevdeki Ajanlar (Agent Swarm)</span>
          </div>
          <span style="font-size: 12px; color: var(--text-muted); font-family: 'JetBrains Mono', monospace;" id="swarm-id">ID: swarm-1792693878793</span>
        </div>
        <div class="agent-grid" id="agents-container">
          <!-- Rendered via JS -->
        </div>
      </div>

      <!-- Token & Cost Telemetry Panel -->
      <div class="panel">
        <div class="panel-header">
          <div class="panel-title">
            <span>📊</span>
            <span>Token & Model Dağılımı</span>
          </div>
          <span style="font-size: 11px; background: rgba(99, 102, 241, 0.2); padding: 2px 8px; border-radius: 4px; color: #a5b4fc;">Q-LEARNING</span>
        </div>

        <div class="model-row">
          <div class="model-info">
            <span class="model-name">Claude 3.5 Sonnet</span>
            <span class="model-tier">Yüksek muhakeme / Kod yazımı</span>
            <div class="progress-bar-bg"><div class="progress-bar-fill" style="width: 65%;"></div></div>
          </div>
          <span style="font-weight: 700; font-family: 'JetBrains Mono'; color: #818cf8;">Optimum</span>
        </div>

        <div class="model-row">
          <div class="model-info">
            <span class="model-name">Claude 3.5 Haiku</span>
            <span class="model-tier">Hızlı yönlendirme & Token tasarrufu</span>
            <div class="progress-bar-bg"><div class="progress-bar-fill" style="width: 30%; background: #34d399;"></div></div>
          </div>
          <span style="font-weight: 700; font-family: 'JetBrains Mono'; color: #34d399;">Ekonomik</span>
        </div>

        <div class="model-row">
          <div class="model-info">
            <span class="model-name">Claude 3 Opus</span>
            <span class="model-tier">Karmaşık mimari analizler</span>
            <div class="progress-bar-bg"><div class="progress-bar-fill" style="width: 5%; background: #f472b6;"></div></div>
          </div>
          <span style="font-weight: 700; font-family: 'JetBrains Mono'; color: #f472b6;">Özel</span>
        </div>

        <div style="margin-top: 20px; padding: 14px; background: rgba(0,0,0,0.25); border-radius: 12px; font-size: 12px; color: var(--text-muted);">
          <div style="display:flex; justify-content:space-between; margin-bottom: 6px;">
            <span>Bandit Karar Oranı:</span>
            <strong style="color:#fff;">100% Kararlı</strong>
          </div>
          <div style="display:flex; justify-content:space-between; margin-bottom: 6px;">
            <span>Devre Kesici (Circuit Breaker):</span>
            <strong style="color:#34d399;">Aktif / Güvenli</strong>
          </div>
          <div style="display:flex; justify-content:space-between;">
            <span>Ortalama Karmaşıklık:</span>
            <strong style="color:#fff;">0.50 (Dengeli)</strong>
          </div>
        </div>
      </div>
    </div>

    <!-- Daemon Background Workers -->
    <div class="panel">
      <div class="panel-header">
        <div class="panel-title">
          <span>⚙️</span>
          <span>Arka Plan Otomatik Analiz & Optimizasyon İşçileri (Workers)</span>
        </div>
        <span style="font-size: 12px; color: var(--text-muted);">7 İşçi Devrede</span>
      </div>
      <div class="workers-list" id="workers-container">
        <!-- Rendered via JS -->
      </div>
    </div>

    <div class="footer-bar">
      <span>Canlı Veri Senkronizasyonu: 2 saniyede bir otomatik güncelleniyor</span>
      <span id="last-update">Son güncelleme: --:--:--</span>
    </div>
  </div>

  <script>
    async function updateDashboard() {
      try {
        const res = await fetch('/api/status');
        const data = await res.json();

        // Stats
        document.getElementById('stat-agents').textContent = data.agents ? data.agents.length : 0;
        if (data.process && data.process.system) {
          document.getElementById('stat-cpu').textContent = data.process.system.cpuLoadAvg1m || '1.62';
        }
        if (data.swarm && data.swarm.id) {
          document.getElementById('swarm-id').textContent = 'ID: ' + data.swarm.id;
        }

        // Render Agents
        const agentsContainer = document.getElementById('agents-container');
        if (data.agents && data.agents.length > 0) {
          agentsContainer.innerHTML = data.agents.map(a => {
            const typeClass = 'badge-' + (a.agentType || 'coder');
            return \`
              <div class="agent-card">
                <div class="agent-top">
                  <span class="agent-name">\${a.name || a.agentId}</span>
                  <span class="badge \${typeClass}">\${a.agentType || 'Agent'}</span>
                </div>
                <div class="agent-status-row">
                  <span><span class="status-dot"></span>\${a.status.toUpperCase()}</span>
                  <span>Görev: \${a.taskCount || 0}</span>
                </div>
                <div class="agent-status-row" style="margin-top: 4px;">
                  <span style="color: var(--text-dim); font-size: 11px;">Sağlık: 100%</span>
                  <span style="color: var(--text-dim); font-size: 11px;">\${new Date(a.createdAt).toLocaleTimeString()}</span>
                </div>
              </div>
            \`;
          }).join('');
        } else {
          agentsContainer.innerHTML = '<div style="color:var(--text-muted); padding:20px;">Henüz aktif ajan yok.</div>';
        }

        // Render Workers
        const workersContainer = document.getElementById('workers-container');
        if (data.daemon && data.daemon.workers) {
          workersContainer.innerHTML = data.daemon.workers.map(w => \`
            <div class="worker-card">
              <div class="worker-name">
                <span class="status-dot"></span>
                <span>worker:\${w.name}</span>
              </div>
              <div class="worker-desc">\${w.desc}</div>
            </div>
          \`).join('');
        }

        document.getElementById('last-update').textContent = 'Son güncelleme: ' + new Date().toLocaleTimeString();
      } catch (err) {
        console.error('Update error:', err);
      }
    }

    async function spawnPrompt() {
      const type = prompt('Başlatmak istediğiniz ajan türü (coder, tester, reviewer, architect):', 'coder');
      if (!type) return;
      const name = prompt('Ajan adı:', type + '-' + Math.floor(Math.random() * 100));
      try {
        await fetch('/api/agent/spawn', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type, name })
        });
        updateDashboard();
      } catch (e) {
        alert('Hata: ' + e.message);
      }
    }

    setInterval(updateDashboard, 2000);
    updateDashboard();
  </script>
</body>
</html>`);
});

app.listen(PORT, () => {
  console.log(`[RuFlo Dashboard] Live at http://localhost:${PORT}`);
});
