# Dashboard UI Redesign Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current low-contrast dark UI with a GitHub Dark themed layout featuring a machine-filtering sidebar and status-tinted session cards.

**Architecture:** The entire frontend lives in a single `client/index.html` file (React 18 + Tailwind via CDN, no build step). We rewrite this file in focused tasks — CSS constants first, then layout shell, then sidebar, then cards, then filtering logic, then mobile. No backend files are touched.

**Tech Stack:** React 18 (CDN UMD), Tailwind CSS v3 (CDN), Babel Standalone (in-browser JSX transform), single HTML file.

**Spec:** `docs/superpowers/specs/2026-03-10-dashboard-ui-redesign.md`

---

## Chunk 1: CSS Foundation + Layout Shell

### Task 1: Replace HTML scaffold with GitHub Dark CSS and layout shell

**Files:**
- Modify: `agent-dashboard/client/index.html` (full rewrite)

The goal of this task is to establish the page skeleton — top bar, sidebar, main area — with GitHub Dark colours and no content yet. React state and components come in later tasks.

- [ ] **Step 1: Rewrite `client/index.html` with the layout shell**

Replace the entire file with:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Agent Dashboard</title>
  <script src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <link href="https://cdn.jsdelivr.net/npm/tailwindcss@3/dist/tailwind.min.css" rel="stylesheet" />
  <style>
    /* GitHub Dark palette tokens */
    :root {
      --bg-canvas:   #0d1117;
      --bg-subtle:   #161b22;
      --bg-inset:    #1c2128;
      --bg-overlay:  #21262d;
      --border:      #30363d;
      --border-muted:#21262d;
      --text-primary:#e6edf3;
      --text-muted:  #8b949e;
      --text-subtle: #6e7681;
      --accent-blue: #58a6ff;

      /* Status colours */
      --c-working-bg:  #0d1f0e;
      --c-working-bd:  #238636;
      --c-working-fg:  #3fb950;

      --c-awaiting-bg: #1f1a0d;
      --c-awaiting-bd: #9e6a03;
      --c-awaiting-fg: #d29922;

      --c-idle-bg:     #111d2d;
      --c-idle-bd:     #1f6feb;
      --c-idle-fg:     #58a6ff;

      --c-stopped-bg:  #161b22;
      --c-stopped-bd:  #30363d;
      --c-stopped-fg:  #6e7681;
    }

    * { box-sizing: border-box; }

    body {
      margin: 0;
      background: var(--bg-canvas);
      color: var(--text-primary);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 13px;
      height: 100vh;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    /* ── Top bar ── */
    .topbar {
      height: 48px;
      background: var(--bg-subtle);
      border-bottom: 1px solid var(--border);
      display: flex;
      align-items: center;
      padding: 0 16px;
      gap: 12px;
      flex-shrink: 0;
      z-index: 10;
    }
    .topbar-title { font-size: 14px; font-weight: 700; color: var(--accent-blue); letter-spacing: 0.5px; }
    .topbar-sep   { color: var(--border); }
    .ws-dot       { width: 7px; height: 7px; border-radius: 50%; display: inline-block; margin-right: 5px; }
    .ws-label     { color: var(--text-muted); font-size: 11px; }
    .topbar-right { margin-left: auto; display: flex; align-items: center; gap: 8px; }
    .session-count {
      background: var(--bg-overlay);
      color: var(--text-muted);
      font-size: 11px;
      padding: 2px 10px;
      border-radius: 12px;
      border: 1px solid var(--border);
    }

    /* ── App body ── */
    .app-body { display: flex; flex: 1; overflow: hidden; }

    /* ── Sidebar ── */
    .sidebar {
      width: 220px;
      background: var(--bg-subtle);
      border-right: 1px solid var(--border);
      flex-shrink: 0;
      overflow-y: auto;
      padding: 12px 0;
    }
    .sidebar-label {
      font-size: 10px;
      font-weight: 600;
      color: var(--text-subtle);
      text-transform: uppercase;
      letter-spacing: 0.8px;
      padding: 0 12px 8px;
    }
    .sidebar-divider { height: 1px; background: var(--border-muted); margin: 6px 12px; }
    .sidebar-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 8px 12px;
      cursor: pointer;
      border-left: 3px solid transparent;
      user-select: none;
    }
    .sidebar-item:hover { background: var(--bg-inset); }
    .sidebar-item.active {
      background: var(--bg-inset);
      border-left-color: var(--accent-blue);
    }
    .machine-icon {
      width: 28px; height: 28px;
      background: var(--bg-overlay);
      border-radius: 6px;
      display: flex; align-items: center; justify-content: center;
      font-size: 14px;
      flex-shrink: 0;
    }
    .machine-info { flex: 1; min-width: 0; }
    .machine-name { font-size: 12px; font-weight: 600; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .machine-meta { font-size: 10px; color: var(--text-subtle); margin-top: 1px; }
    .machine-badge {
      font-size: 10px; font-weight: 600;
      padding: 2px 7px; border-radius: 10px; flex-shrink: 0;
    }
    .badge-active { background: var(--c-working-bg); color: var(--c-working-fg); border: 1px solid var(--c-working-bd); }
    .badge-idle   { background: var(--bg-overlay);   color: var(--text-subtle);  border: 1px solid var(--border); }

    /* ── Main ── */
    .main { flex: 1; overflow-y: auto; padding: 20px; }
    .main-header { display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 16px; }
    .main-title  { font-size: 11px; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.8px; }
    .main-sub    { font-size: 11px; color: var(--text-subtle); }

    /* ── Cards grid ── */
    .cards-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 12px; }

    /* ── Session card ── */
    .session-card { border-radius: 8px; padding: 14px; border: 1px solid; }
    .card-working  { background: var(--c-working-bg);  border-color: var(--c-working-bd); }
    .card-awaiting { background: var(--c-awaiting-bg); border-color: var(--c-awaiting-bd); }
    .card-idle     { background: var(--c-idle-bg);     border-color: var(--c-idle-bd); }
    .card-stopped  { background: var(--c-stopped-bg);  border-color: var(--c-stopped-bd); opacity: 0.45; }

    .card-top     { display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; margin-bottom: 8px; }
    .card-project { font-size: 13px; font-weight: 700; color: var(--text-primary); }
    .status-pill  { font-size: 10px; font-weight: 600; padding: 2px 8px; border-radius: 12px; white-space: nowrap; flex-shrink: 0; }
    .pill-working  { background: var(--c-working-bd);  color: #fff; }
    .pill-awaiting { background: var(--c-awaiting-bd); color: #fff; }
    .pill-idle     { background: var(--c-idle-bd);     color: #fff; }
    .pill-stopped  { background: var(--bg-overlay);    color: var(--text-subtle); }

    .card-meta  { font-size: 10px; color: var(--text-muted); font-family: monospace; margin-bottom: 8px; }
    .card-repo  { font-size: 10px; color: var(--accent-blue); margin-bottom: 10px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: block; }
    .card-repo:hover { text-decoration: underline; }

    .ctx-row   { display: flex; align-items: center; gap: 8px; }
    .ctx-label { font-size: 10px; color: var(--text-subtle); width: 24px; }
    .ctx-bar   { flex: 1; background: var(--bg-overlay); border-radius: 2px; height: 3px; }
    .ctx-fill  { height: 3px; border-radius: 2px; }
    .ctx-pct   { font-size: 10px; color: var(--text-muted); width: 28px; text-align: right; }

    .card-footer { font-size: 10px; color: var(--text-subtle); text-align: right; margin-top: 8px; }

    /* ── Empty states ── */
    .empty-state { text-align: center; color: var(--text-subtle); margin-top: 80px; font-size: 13px; }

    /* ── Login ── */
    .login-wrap { display: flex; align-items: center; justify-content: center; height: 100vh; background: var(--bg-canvas); }
    .login-card { background: var(--bg-subtle); border: 1px solid var(--border); border-radius: 12px; padding: 32px; width: 320px; display: flex; flex-direction: column; gap: 16px; }
    .login-title { font-size: 18px; font-weight: 700; color: var(--accent-blue); }
    .login-input {
      background: var(--bg-canvas);
      border: 1px solid var(--border);
      border-radius: 6px;
      padding: 8px 12px;
      color: var(--text-primary);
      font-size: 13px;
      outline: none;
      width: 100%;
    }
    .login-input:focus { border-color: var(--accent-blue); }
    .login-btn {
      background: var(--c-working-bd);
      color: #fff;
      border: none;
      border-radius: 6px;
      padding: 9px 16px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      width: 100%;
    }
    .login-btn:hover { background: #2ea043; }

    /* ── Mobile: sidebar becomes top strip ── */
    @media (max-width: 767px) {
      .app-body { flex-direction: column; }
      .sidebar {
        width: 100%;
        border-right: none;
        border-bottom: 1px solid var(--border);
        display: flex;
        flex-direction: row;
        overflow-x: auto;
        overflow-y: hidden;
        padding: 8px 12px;
        gap: 8px;
        align-items: center;
      }
      .sidebar-label { display: none; }
      .sidebar-divider { width: 1px; height: 28px; background: var(--border); margin: 0 4px; }
      .sidebar-item {
        border-left: none;
        border-bottom: 2px solid transparent;
        border-radius: 6px;
        padding: 6px 10px;
        white-space: nowrap;
        flex-shrink: 0;
      }
      .sidebar-item.active { border-bottom-color: var(--accent-blue); border-left-color: transparent; }
      .machine-info { display: none; }
      .machine-icon { width: 22px; height: 22px; font-size: 12px; }
      .machine-badge { display: none; }
    }
  </style>
</head>
<body>
<div id="root"></div>
<script type="text/babel">
const { useState, useEffect, useRef } = React;

/* ── Helpers ── */
function relativeTime(unixTs) {
  const diff = Math.max(0, Math.floor(Date.now() / 1000) - unixTs); // guard against clock skew
  if (diff < 60)   return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

const STATUS_ORDER = { working: 0, awaiting_permission: 1, idle: 2, stopped: 3 };

const STATUS_META = {
  working:             { pill: 'pill-working',  card: 'card-working',  label: '● working',           bar: '#3fb950' },
  awaiting_permission: { pill: 'pill-awaiting', card: 'card-awaiting', label: '⚠ awaiting permission', bar: '#d29922' },
  idle:                { pill: 'pill-idle',     card: 'card-idle',     label: '○ idle',               bar: '#58a6ff' },
  stopped:             { pill: 'pill-stopped',  card: 'card-stopped',  label: '— stopped',            bar: '#6e7681' },
};

function barColor(status, pct) {
  if (pct >= 80) return '#da3633';
  return (STATUS_META[status] || STATUS_META.stopped).bar;
}

/* ── SessionCard ── */
function SessionCard({ session }) {
  const [, tick] = useState(0);
  useEffect(() => {
    if (session.status === 'stopped') return; // stopped cards have static timestamps
    const t = setInterval(() => tick(n => n + 1), 30000);
    return () => clearInterval(t);
  }, [session.status]);

  const meta = STATUS_META[session.status] || STATUS_META.stopped;

  return (
    <div className={`session-card ${meta.card}`}>
      <div className="card-top">
        <span className="card-project">{session.project_name}</span>
        <span className={`status-pill ${meta.pill}`}>{meta.label}</span>
      </div>
      <div className="card-meta">{session.git_branch} · {session.machine_hostname}</div>
      {session.git_repo && (
        <a href={session.git_repo} className="card-repo" target="_blank" rel="noreferrer">
          {session.git_repo.replace(/^https?:\/\//, '')}
        </a>
      )}
      <div className="ctx-row">
        <span className="ctx-label">ctx</span>
        <div className="ctx-bar">
          <div className="ctx-fill" style={{ width: `${session.context_pct}%`, background: barColor(session.status, session.context_pct) }} />
        </div>
        <span className="ctx-pct">{session.context_pct}%</span>
      </div>
      <div className="card-footer">{relativeTime(session.last_heartbeat)}</div>
    </div>
  );
}

/* ── Sidebar ── */
function Sidebar({ machines, selected, onSelect, sessions }) {
  const hasActive = hostname => sessions.some(s => hostname === 'all'
    ? s.status !== 'stopped'
    : s.machine_hostname === hostname && s.status !== 'stopped'
  );

  return (
    <div className="sidebar">
      <div className="sidebar-label">Machines</div>

      <div
        className={`sidebar-item${selected === 'all' ? ' active' : ''}`}
        onClick={() => onSelect('all')}
      >
        <div className="machine-icon">⊞</div>
        <div className="machine-info">
          <div className="machine-name">All machines</div>
          <div className="machine-meta">{sessions.length} sessions</div>
        </div>
      </div>

      <div className="sidebar-divider" />

      {machines.map(hostname => {
        const count = sessions.filter(s => s.machine_hostname === hostname).length;
        const active = hasActive(hostname);
        return (
          <div
            key={hostname}
            className={`sidebar-item${selected === hostname ? ' active' : ''}`}
            onClick={() => onSelect(hostname)}
          >
            <div className="machine-icon">💻</div>
            <div className="machine-info">
              <div className="machine-name">{hostname}</div>
              <div className="machine-meta">{count} session{count !== 1 ? 's' : ''}</div>
            </div>
            <span className={`machine-badge ${active ? 'badge-active' : 'badge-idle'}`}>{count}</span>
          </div>
        );
      })}
    </div>
  );
}

/* ── App ── */
function App() {
  const [token,      setToken]      = useState(() => sessionStorage.getItem('token') || '');
  const [tokenInput, setTokenInput] = useState('');
  const [sessions,   setSessions]   = useState(null);
  const [wsStatus,   setWsStatus]   = useState('disconnected');
  const [selected,   setSelected]   = useState('all');
  const wsRef = useRef(null);

  /* WebSocket */
  useEffect(() => {
    if (!token) return;
    sessionStorage.setItem('token', token);
    const proto = location.protocol === 'https:' ? 'wss' : 'ws';
    const ws = new WebSocket(`${proto}://${location.host}/ws?token=${token}`);
    wsRef.current = ws;
    ws.onopen    = () => setWsStatus('connected');
    ws.onmessage = e  => { try { setSessions(JSON.parse(e.data)); } catch (_) {} };
    ws.onclose   = () => setWsStatus('disconnected');
    ws.onerror   = () => setWsStatus('error');
    return () => ws.close();
  }, [token]);

  /* Initial HTTP fetch — clears bad token on 401 */
  useEffect(() => {
    if (!token) return;
    fetch('/api/sessions', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => {
        if (r.status === 401) { sessionStorage.removeItem('token'); setToken(''); return null; }
        return r.json();
      })
      .then(data => { if (data) setSessions(data); })
      .catch(() => {});
  }, [token]);

  /* ── Login ── */
  if (!token) {
    return (
      <div className="login-wrap">
        <div className="login-card">
          <div className="login-title">⬡ Agent Dashboard</div>
          <input
            className="login-input"
            type="password"
            placeholder="Enter token"
            value={tokenInput}
            onChange={e => setTokenInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && setToken(tokenInput)}
            autoFocus
          />
          <button className="login-btn" onClick={() => setToken(tokenInput)}>Connect</button>
        </div>
      </div>
    );
  }

  const allSessions = sessions || [];

  /* Derive machine list — stable alphabetical order to prevent sidebar reordering on WS updates */
  const machines = [...new Set(allSessions.map(s => s.machine_hostname))].sort();

  /* Filter + sort */
  const visible = allSessions
    .filter(s => selected === 'all' || s.machine_hostname === selected)
    .sort((a, b) => (STATUS_ORDER[a.status] ?? 99) - (STATUS_ORDER[b.status] ?? 99));

  const wsDot = { connected: '#3fb950', disconnected: '#6e7681', error: '#da3633' }[wsStatus] || '#6e7681';

  const mainTitle = selected === 'all' ? 'All machines' : selected;
  const activeCount = visible.filter(s => s.status !== 'stopped').length;

  return (
    <>
      {/* Top bar */}
      <div className="topbar">
        <span className="topbar-title">⬡ Agent Dashboard</span>
        <span className="topbar-sep">|</span>
        <span>
          <span className="ws-dot" style={{ background: wsDot }} />
          <span className="ws-label">{wsStatus}</span>
        </span>
        <div className="topbar-right">
          <span className="session-count">{allSessions.length} session{allSessions.length !== 1 ? 's' : ''}</span>
        </div>
      </div>

      <div className="app-body">
        <Sidebar machines={machines} selected={selected} onSelect={setSelected} sessions={allSessions} />

        <div className="main">
          <div className="main-header">
            <span className="main-title">{mainTitle}</span>
            <span className="main-sub">{activeCount} active</span>
          </div>

          {sessions === null && <div className="empty-state">Connecting…</div>}
          {sessions !== null && visible.length === 0 && <div className="empty-state">No sessions</div>}

          <div className="cards-grid">
            {visible.map(s => <SessionCard key={s.session_id} session={s} />)}
          </div>
        </div>
      </div>
    </>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
</script>
</body>
</html>
```

- [ ] **Step 2: Visually verify — start the server and open the dashboard**

```bash
cd agent-dashboard
DASHBOARD_TOKEN=dev-token node server/index.js &
sleep 1
# Open http://localhost:3000 in browser
# Enter dev-token
```

Send a test heartbeat to populate cards:
```bash
curl -s -X POST http://localhost:3000/api/heartbeat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer dev-token" \
  -d '{"session_id":"s1","machine_id":"m1","machine_hostname":"MacBook-Air-3","project_name":"banking_app","project_path":"/p","git_branch":"main","git_repo":"https://github.com/e7mul/banking_app","status":"working","context_pct":42,"notification_message":""}'

curl -s -X POST http://localhost:3000/api/heartbeat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer dev-token" \
  -d '{"session_id":"s2","machine_id":"m1","machine_hostname":"MacBook-Air-3","project_name":"my-api","project_path":"/q","git_branch":"feature/auth","git_repo":"","status":"awaiting_permission","context_pct":85,"notification_message":""}'

curl -s -X POST http://localhost:3000/api/heartbeat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer dev-token" \
  -d '{"session_id":"s3","machine_id":"m2","machine_hostname":"dev-server","project_name":"infra","project_path":"/r","git_branch":"main","git_repo":"","status":"idle","context_pct":10,"notification_message":""}'
```

Expected: green-tinted "working" card, amber-tinted "awaiting permission" card, blue-tinted "idle" card. Sidebar shows MacBook-Air-3 and dev-server. Clicking each machine filters cards.

- [ ] **Step 3: Run backend tests to confirm nothing is broken**

```bash
npx jest --no-coverage
```

Expected: 14 tests PASS (frontend change only, no backend touched).

- [ ] **Step 4: Kill server and commit**

```bash
pkill -f "node server/index.js"
git add client/index.html
git commit -m "feat: GitHub Dark UI redesign with sidebar and status-tinted cards"
git push
```

---

## Chunk 2: Docker rebuild + live verification

### Task 2: Rebuild Docker image and verify with live hook

**Files:**
- No code changes — just rebuild and test.

- [ ] **Step 1: Rebuild Docker image**

```bash
cd agent-dashboard
docker-compose build
docker-compose up -d
```

Expected: container restarts with new image.

- [ ] **Step 2: Open dashboard and verify redesign is live**

Open `http://localhost:3000` in browser. Enter token. Expected: new GitHub Dark layout with sidebar.

- [ ] **Step 3: Fire a real hook event and watch the card appear**

```bash
echo '{"notification_type":"busy","message":""}' | \
  DASHBOARD_URL=http://localhost:3000 \
  DASHBOARD_TOKEN=RYTjQfN67lvr6L \
  CLAUDE_PROJECT_DIR=/Users/wmasarczyk/Documents/MyProjects/banking_app \
  bash ~/.claude/hooks/heartbeat.sh
```

Expected: `banking_app` card appears with green tint and `● working` pill within 1–2 seconds.

- [ ] **Step 4: Verify mobile layout**

In browser DevTools, toggle device toolbar and set width to 375px (iPhone). Expected: sidebar collapses to a horizontal strip at the top; cards stack in single column.
