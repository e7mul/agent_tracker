# Agent Dashboard

Real-time dashboard to monitor Claude Code agent sessions across multiple machines.

## Architecture

```
[Machine A: Claude Code] ──┐
[Machine B: Claude Code] ──┼──► [Central Server] ──► [Web Dashboard]
[Machine C: Claude Code] ──┘     (Express + SQLite     (React, browser/phone)
                                  + WebSocket)
```

## Server Setup

### 1. Clone and install

```bash
git clone <your-repo> agent-dashboard
cd agent-dashboard
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
# Edit .env — set a strong DASHBOARD_TOKEN
```

### 3. Run

```bash
npm start
```

### Deploy to Fly.io

```bash
fly launch
fly secrets set DASHBOARD_TOKEN=your-token
fly deploy
```

## Hook Installation (each machine)

### 1. Install the hook script

```bash
mkdir -p ~/.claude/hooks
curl -o ~/.claude/hooks/heartbeat.sh https://your-server.com/heartbeat.sh
chmod +x ~/.claude/hooks/heartbeat.sh
```

### 2. Add to `~/.claude/settings.json`

```json
{
  "hooks": {
    "Notification": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "DASHBOARD_URL=https://your-server.com DASHBOARD_TOKEN=your-token ~/.claude/hooks/heartbeat.sh"
          }
        ]
      }
    ]
  }
}
```

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3000` | HTTP port |
| `DASHBOARD_TOKEN` | required | Shared secret for auth |
| `SESSION_TTL_MINUTES` | `5` | Minutes before session marked stopped |

## Troubleshooting

**Hook not firing:** Check `~/.claude/settings.json` has the correct hook path and the file is executable (`chmod +x`).

**CORS errors:** The server enables CORS by default. If behind a proxy, ensure it forwards the `Origin` header.

**Stale sessions not clearing:** The server runs cleanup every 60 seconds. `SESSION_TTL_MINUTES` controls the threshold.

**Token auth failures:** Ensure the token in `.env` exactly matches the token in each machine's hook command.
