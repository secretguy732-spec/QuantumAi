# ⬡ QuantumAI — QA-AGENT

> A futuristic AI Agent web platform. Frontend on GitHub Pages. Backend on Termux.

---

## 📁 Project Structure

```
QuantumAI/
├── server/
│   ├── server.js       — Express API server
│   ├── agent.js        — AI agent logic & tool routing
│   └── apiKey.js       — API key generation & validation
├── tools/
│   └── browser.js      — DuckDuckGo internet search tool
├── website/
│   ├── index.html      — Device selector landing page
│   ├── desktop.html    — Desktop chat interface
│   ├── tablet.html     — Tablet chat interface
│   ├── mobile.html     — Mobile chat interface
│   ├── chat.js         — Shared frontend chat logic
│   └── style.css       — Global styles (JARVIS-inspired)
├── package.json
└── README.md
```

---

## 🚀 Quick Start

### 1. Backend (Termux / Node.js)

**Install Termux packages:**
```bash
pkg update && pkg upgrade
pkg install nodejs
```

**Clone/copy files to Termux:**
```bash
cd ~
mkdir QuantumAI && cd QuantumAI
# Copy project files here
```

**Install dependencies:**
```bash
npm install
```

**Start the server:**
```bash
npm start
# or
node server/server.js
```

Server runs on: `http://localhost:3000`

---

### 2. Expose to Internet (Required for GitHub Pages)

**Option A — ngrok (recommended):**
```bash
# Install ngrok
npm install -g ngrok
# Or download from ngrok.com

# Expose port 3000
ngrok http 3000

# Copy the https:// URL shown (e.g. https://abc123.ngrok.io)
```

**Option B — cloudflared:**
```bash
pkg install cloudflared
cloudflared tunnel --url http://localhost:3000
```

**Option C — localhost.run (no install):**
```bash
ssh -R 80:localhost:3000 localhost.run
```

---

### 3. Frontend (GitHub Pages)

1. Upload the `/website` folder contents to your GitHub repository
2. Enable GitHub Pages (Settings → Pages → Deploy from branch)
3. Open your site and click **Desktop / Tablet / Mobile**
4. In the **Server URL** bar, enter your tunnel URL (e.g. `https://abc123.ngrok.io`)
5. Click **PING** to verify connection

---

## 🔑 API Key System

Keys follow the format: `qa-xxxxxxxxxxxx`

**Generate a key:**
```
GET https://your-server/generate-key
```

**Default test key:** `qa-demo0000key0`

**Use in requests:**
```
Authorization: qa-xxxxxxxxxxxx
```

---

## 📡 API Reference

### Health Check
```
GET /health

Response: { "status": "online", "system": "QA-AGENT", "version": "1.0.0" }
```

### Generate Key
```
GET /generate-key

Response: { "key": "qa-xxxxxxxxxxxx" }
```

### Chat with Agent
```
POST /qa-agent
Authorization: qa-xxxxxxxxxxxx
Content-Type: application/json

Body: { "message": "search: latest AI news" }

Response: {
  "text": "...",
  "tool": "search",
  "agent": "QA-AGENT",
  "version": "1.0.0"
}
```

---

## 🛠 Agent Tools

| Command | Tool | Description |
|---------|------|-------------|
| `search: query` | Browser | DuckDuckGo web search |
| `code: description` | Code Assist | Programming help |
| `task: description` | Task Processor | Planning & automation |
| `calculate: expression` | Math | Calculations |

Tools are also auto-detected from natural language.

---

## 🔮 Future Roadmap (v2.0)

- [ ] AI Memory Database (SQLite / MongoDB)
- [ ] Plugin system (hot-loadable modules)
- [ ] Voice input (Web Speech API)
- [ ] Image generation tool
- [ ] Multi-user dashboard
- [ ] Automation workflows
- [ ] WebSocket real-time streaming

---

## ⚙ Environment Variables

```bash
PORT=3000          # Server port (default: 3000)
```

---

## 📱 Supported Interfaces

| Mode | File | Optimized For |
|------|------|---------------|
| Desktop | `desktop.html` | Wide screens, sidebar nav |
| Tablet | `tablet.html` | Mid-size, collapsible sidebar |
| Mobile | `mobile.html` | Small screens, bottom nav |

---

## 🛡 Security Notes

- Change the default demo key in production
- Restrict CORS origin to your GitHub Pages URL
- Add authentication to `/generate-key` in production
- Rate limiting is 30 requests/minute per key

---

*QuantumAI QA-AGENT v1.0.0 — Built for Termux + GitHub Pages*
