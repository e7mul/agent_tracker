# Agent Dashboard

Real-time dashboard to monitor Claude Code sessions across your local machine and remote servers (HPC clusters, VMs, etc.).

## How it works

```
[Local machine]  ──────────────────────────────────────┐
[Remote machine A] ──curl──► [ngrok edge] ──► [ngrok]──┼──► [Docker: dashboard :3000] ──► [Browser]
[Remote machine B] ──curl──► [ngrok edge] ──► [ngrok]──┘
```

A shell hook fires on every Claude Code notification and POSTs a heartbeat to the dashboard. The dashboard stores active sessions and streams them to your browser in real time via WebSocket.

---

## Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running
- [ngrok](https://ngrok.com/) free account (for remote machine support)
- [Homebrew](https://brew.sh/) (macOS)

---

## Part 1 — Dashboard server (your local machine)

### 1. Clone the repo

```bash
git clone <your-repo-url> agent-dashboard
cd agent-dashboard
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env` and set a strong secret token:

```
DASHBOARD_TOKEN=replace-this-with-a-strong-secret
SESSION_TTL_MINUTES=5
```

### 3. Start the dashboard

```bash
docker compose up -d
```

The dashboard is now running at [http://localhost:3000](http://localhost:3000). It will automatically restart on every reboot.

---

## Part 2 — ngrok tunnel (for remote machine support)

ngrok exposes your local dashboard over a stable public HTTPS URL so that remote machines can send heartbeats to it even when you are not SSH'd into them.

### 1. Install ngrok

```bash
brew install ngrok
```

### 2. Authenticate

Sign in at [ngrok.com](https://ngrok.com), go to **Your Authtoken**, and run:

```bash
ngrok config add-authtoken <your-authtoken>
```

### 3. Claim your free static domain

In the ngrok dashboard go to **Cloud Edge → Domains** and claim your one free static domain. It will look like `something-something.ngrok-free.app`.

### 4. Configure ngrok

Open `~/Library/Application Support/ngrok/ngrok.yml` and add a named tunnel pointing to port 3000:

```yaml
version: "3"
agent:
    authtoken: <your-authtoken>
tunnels:
  dashboard:
    proto: http
    addr: 3000
    domain: your-static-domain.ngrok-free.app
```

Test it:

```bash
ngrok start dashboard
```

Visit `https://your-static-domain.ngrok-free.app` — you should see the dashboard.

### 5. Run ngrok on boot (macOS)

Create `~/Library/LaunchAgents/com.ngrok.dashboard.plist`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>com.ngrok.dashboard</string>
  <key>ProgramArguments</key>
  <array>
    <string>/opt/homebrew/bin/ngrok</string>
    <string>start</string>
    <string>dashboard</string>
  </array>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <true/>
  <key>StandardOutPath</key>
  <string>/tmp/ngrok.log</string>
  <key>StandardErrorPath</key>
  <string>/tmp/ngrok.err</string>
</dict>
</plist>
```

> If ngrok is not at `/opt/homebrew/bin/ngrok`, find the correct path with `which ngrok` and update the plist.

Load it:

```bash
launchctl load ~/Library/LaunchAgents/com.ngrok.dashboard.plist
```

ngrok will now start automatically on login and restart if it crashes.

---

## Part 3 — Hook installation (each machine)

Repeat this for your local machine and every remote machine you want to track.

### 1. Copy the hook script

**Local machine:**
```bash
mkdir -p ~/.claude/hooks
cp hooks/heartbeat.sh ~/.claude/hooks/heartbeat.sh
chmod +x ~/.claude/hooks/heartbeat.sh
```

**Remote machine (copy over SSH):**
```bash
ssh user@remote "mkdir -p ~/.claude/hooks"
scp hooks/heartbeat.sh user@remote:~/.claude/hooks/heartbeat.sh
ssh user@remote "chmod +x ~/.claude/hooks/heartbeat.sh"
```

### 2. Register the hook in Claude Code settings

Add the following to `~/.claude/settings.json` on each machine:

**Local machine** — use `http://localhost:3000`:
```json
{
  "hooks": {
    "Notification": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "DASHBOARD_URL=http://localhost:3000 DASHBOARD_TOKEN=your-secret ~/.claude/hooks/heartbeat.sh"
          }
        ]
      }
    ]
  }
}
```

**Remote machine** — use your ngrok URL:
```json
{
  "hooks": {
    "Notification": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "DASHBOARD_URL=https://your-static-domain.ngrok-free.app DASHBOARD_TOKEN=your-secret ~/.claude/hooks/heartbeat.sh"
          }
        ]
      }
    ]
  }
}
```

Use the same `DASHBOARD_TOKEN` on every machine — it must match the value in your `.env`.

---

## Environment variables

| Variable | Default | Description |
|---|---|---|
| `DASHBOARD_TOKEN` | required | Shared secret — must match the token in every hook command |
| `SESSION_TTL_MINUTES` | `5` | Minutes of silence before a session is marked stopped |
| `PORT` | `3000` | HTTP port (change in both `.env` and `docker-compose.yml`) |

---

## Troubleshooting

**Sessions not appearing**
- Check the hook is executable: `ls -la ~/.claude/hooks/heartbeat.sh`
- Verify `~/.claude/settings.json` has no JSON syntax errors
- Confirm `DASHBOARD_TOKEN` matches exactly in `.env` and the hook command

**Remote sessions not appearing**
- Confirm ngrok is running: `curl https://your-static-domain.ngrok-free.app/api/sessions -H "Authorization: Bearer your-token"`
- Check ngrok logs: `tail /tmp/ngrok.log`
- Verify the remote machine can reach the ngrok URL: `curl -I https://your-static-domain.ngrok-free.app`

**Stale sessions stuck as active**
- The server marks sessions stopped after `SESSION_TTL_MINUTES` of no heartbeat (cleanup runs every 60s)
- Reduce `SESSION_TTL_MINUTES` in `.env` and restart the container if needed

**ngrok not starting on boot**
- Check launchd status: `launchctl list | grep ngrok`
- Check error log: `cat /tmp/ngrok.err`
- Verify the binary path in the plist matches `which ngrok`
