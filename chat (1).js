/**
 * QuantumAI / QA-AGENT — chat.js
 * Shared chat logic for all interface modes.
 * Handles message sending, API communication, and UI updates.
 */

// ============================================================
// CONFIG
// ============================================================
const QA = {
  // Replace with your Termux server URL (use ngrok/cloudflared tunnel)
  serverUrl: localStorage.getItem('qa_server_url') || 'http://localhost:3000',
  apiKey: localStorage.getItem('qa_api_key') || '',
  version: '1.0.0',
  agentName: 'QuantumAI',
};

// ============================================================
// DOM REFS (resolved after DOMContentLoaded)
// ============================================================
let messagesArea, chatInput, sendBtn, clearBtn, apiStatusEl, serverUrlInput;

// ============================================================
// INIT
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  messagesArea = document.getElementById('messages-area');
  chatInput = document.getElementById('chat-input');
  sendBtn = document.getElementById('send-btn');
  clearBtn = document.getElementById('clear-btn');
  apiStatusEl = document.getElementById('api-status');
  serverUrlInput = document.getElementById('server-url-input');

  // Restore server URL
  if (serverUrlInput) {
    serverUrlInput.value = QA.serverUrl;
    serverUrlInput.addEventListener('change', () => {
      QA.serverUrl = serverUrlInput.value.trim();
      localStorage.setItem('qa_server_url', QA.serverUrl);
      checkApiStatus();
    });
  }

  // Attach event listeners
  if (sendBtn) sendBtn.addEventListener('click', handleSend);
  if (clearBtn) clearBtn.addEventListener('click', clearChat);
  if (chatInput) {
    chatInput.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    });
    // Auto-resize textarea
    chatInput.addEventListener('input', () => {
      chatInput.style.height = 'auto';
      chatInput.style.height = Math.min(chatInput.scrollHeight, 120) + 'px';
    });
  }

  // Clock
  updateClock();
  setInterval(updateClock, 1000);

  // Check API connectivity
  checkApiStatus();

  // Settings modal
  const settingsBtn = document.getElementById('settings-btn');
  if (settingsBtn) settingsBtn.addEventListener('click', () => openModal('settings-modal'));

  // API Key modal
  const apikeyBtn = document.getElementById('apikey-btn');
  if (apikeyBtn) apikeyBtn.addEventListener('click', () => openModal('apikey-modal'));

  const generateKeyBtn = document.getElementById('generate-key-btn');
  if (generateKeyBtn) generateKeyBtn.addEventListener('click', generateApiKey);

  const saveKeyBtn = document.getElementById('save-key-btn');
  if (saveKeyBtn) saveKeyBtn.addEventListener('click', saveApiKey);

  const copyKeyBtn = document.getElementById('copy-key-btn');
  if (copyKeyBtn) copyKeyBtn.addEventListener('click', copyGeneratedKey);

  // Close modals on overlay click
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', e => {
      if (e.target === overlay) closeAllModals();
    });
  });

  // Tool buttons
  document.querySelectorAll('.tool-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tool = btn.dataset.tool;
      activateTool(tool, btn);
    });
  });

  // Load chat history from session
  loadChatHistory();

  console.log('[QA-AGENT] Chat system initialized. Version:', QA.version);
});

// ============================================================
// CLOCK
// ============================================================
function updateClock() {
  const el = document.getElementById('clock-display');
  if (el) {
    const t = new Date().toTimeString().split(' ')[0];
    el.textContent = '◷ ' + t;
  }
}

// ============================================================
// API STATUS CHECK
// ============================================================
async function checkApiStatus() {
  if (!apiStatusEl) return;
  setStatus('checking');
  try {
    const res = await fetch(`${QA.serverUrl}/health`, {
      signal: AbortSignal.timeout(4000)
    });
    if (res.ok) {
      setStatus('online');
    } else {
      setStatus('offline');
    }
  } catch {
    setStatus('offline');
  }
}

function setStatus(state) {
  if (!apiStatusEl) return;
  const dot = apiStatusEl.querySelector('.api-dot');
  const label = apiStatusEl.querySelector('.api-label');
  if (state === 'online') {
    apiStatusEl.className = 'api-status online';
    if (label) label.textContent = 'API ONLINE';
  } else if (state === 'offline') {
    apiStatusEl.className = 'api-status offline';
    if (label) label.textContent = 'API OFFLINE';
  } else {
    apiStatusEl.className = 'api-status';
    if (label) label.textContent = 'CHECKING...';
  }
}

// ============================================================
// SEND MESSAGE
// ============================================================
async function handleSend() {
  if (!chatInput) return;
  const message = chatInput.value.trim();
  if (!message) return;

  // Clear input
  chatInput.value = '';
  chatInput.style.height = 'auto';

  // Disable send
  if (sendBtn) sendBtn.disabled = true;

  // Hide welcome banner
  const welcome = document.getElementById('welcome-banner');
  if (welcome) welcome.style.display = 'none';

  // Add user message
  appendMessage('user', message);

  // Show typing indicator
  const typingId = showTyping();

  // Call API
  try {
    const response = await callAgentAPI(message);
    removeTyping(typingId);
    appendMessage('ai', response.text, response.tool);
    saveChatHistory();
  } catch (err) {
    removeTyping(typingId);
    appendMessage('ai', `⚠ Connection error: ${err.message}\n\nPlease ensure the QA-AGENT server is running and the server URL is configured correctly in settings.`, null, true);
  }

  // Re-enable send
  if (sendBtn) sendBtn.disabled = false;
  if (chatInput) chatInput.focus();
}

// ============================================================
// API CALL
// ============================================================
async function callAgentAPI(message) {
  const apiKey = QA.apiKey || 'qa-demo-key';
  const res = await fetch(`${QA.serverUrl}/qa-agent`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': apiKey,
    },
    body: JSON.stringify({ message }),
    signal: AbortSignal.timeout(15000),
  });

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    throw new Error(errBody.error || `HTTP ${res.status}`);
  }

  return await res.json();
  // Expected: { text: string, tool: string|null }
}

// ============================================================
// APPEND MESSAGE
// ============================================================
function appendMessage(role, text, tool = null, isError = false) {
  if (!messagesArea) return;

  const wrapper = document.createElement('div');
  wrapper.className = `message ${role}`;

  const avatar = document.createElement('div');
  avatar.className = 'msg-avatar';
  avatar.textContent = role === 'ai' ? '⬡' : '◈';

  const content = document.createElement('div');
  content.className = 'msg-content';

  const name = document.createElement('div');
  name.className = 'msg-name';
  name.textContent = role === 'ai' ? 'QA-AGENT' : 'YOU';

  // Tool badge
  let toolBadgeHtml = '';
  if (tool) {
    const toolLabels = {
      search: '🔍 BROWSER SEARCH',
      code: '💻 CODE ASSIST',
      task: '⚙ TASK PROCESSOR',
    };
    toolBadgeHtml = `<div class="tool-badge">${toolLabels[tool] || tool.toUpperCase()}</div>`;
  }

  const bubble = document.createElement('div');
  bubble.className = 'msg-bubble' + (isError ? ' error-bubble' : '');
  if (isError) {
    bubble.style.borderLeftColor = 'var(--red)';
    bubble.style.background = 'rgba(255,51,102,0.05)';
  }

  // Convert markdown-lite to HTML
  const formatted = formatText(text);
  bubble.innerHTML = toolBadgeHtml + formatted;

  content.appendChild(name);
  content.appendChild(bubble);
  wrapper.appendChild(avatar);
  wrapper.appendChild(content);

  messagesArea.appendChild(wrapper);
  scrollToBottom();
}

// ============================================================
// TYPING INDICATOR
// ============================================================
let typingCounter = 0;

function showTyping() {
  const id = 'typing-' + (++typingCounter);
  const wrapper = document.createElement('div');
  wrapper.className = 'message ai';
  wrapper.id = id;

  wrapper.innerHTML = `
    <div class="msg-avatar">⬡</div>
    <div class="msg-content">
      <div class="msg-name">QA-AGENT</div>
      <div class="typing-indicator">
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
      </div>
    </div>`;
  messagesArea.appendChild(wrapper);
  scrollToBottom();
  return id;
}

function removeTyping(id) {
  const el = document.getElementById(id);
  if (el) el.remove();
}

// ============================================================
// FORMAT TEXT (markdown-lite)
// ============================================================
function formatText(text) {
  // Escape HTML
  let t = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Code blocks
  t = t.replace(/```(\w*)\n?([\s\S]*?)```/g, (_, lang, code) =>
    `<pre><code>${code.trim()}</code></pre>`
  );

  // Inline code
  t = t.replace(/`([^`]+)`/g, '<code>$1</code>');

  // Bold
  t = t.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

  // Newlines
  t = t.replace(/\n/g, '<br>');

  return t;
}

// ============================================================
// SCROLL
// ============================================================
function scrollToBottom() {
  if (messagesArea) {
    messagesArea.scrollTop = messagesArea.scrollHeight;
  }
}

// ============================================================
// CLEAR CHAT
// ============================================================
function clearChat() {
  if (!messagesArea) return;
  messagesArea.innerHTML = '';
  const welcome = document.getElementById('welcome-banner');
  if (welcome) welcome.style.display = '';
  sessionStorage.removeItem('qa_chat_history');
  appendSystemMessage('Chat cleared. Ready for new session.');
}

function appendSystemMessage(text) {
  if (!messagesArea) return;
  const el = document.createElement('div');
  el.style.cssText = 'text-align:center;font-family:var(--font-mono);font-size:0.6rem;color:var(--text-dim);letter-spacing:0.15em;padding:0.5rem;';
  el.textContent = '— ' + text.toUpperCase() + ' —';
  messagesArea.appendChild(el);
}

// ============================================================
// TOOL ACTIVATION
// ============================================================
let activeTool = null;

function activateTool(tool, btn) {
  if (activeTool === tool) {
    // Deactivate
    activeTool = null;
    document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
    if (chatInput) chatInput.placeholder = 'Ask QA-AGENT anything...';
  } else {
    activeTool = tool;
    document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const hints = {
      search: 'Search the web for...',
      code: 'Help me write code for...',
      task: 'Create a task to...',
    };
    if (chatInput) chatInput.placeholder = hints[tool] || 'Ask QA-AGENT anything...';

    // Prepend tool hint to input
    const hint = tool === 'search' ? 'search: '
      : tool === 'code' ? 'code: '
      : 'task: ';
    if (chatInput && !chatInput.value.startsWith(hint)) {
      chatInput.value = hint + chatInput.value;
      chatInput.focus();
    }
  }
}

// ============================================================
// MODAL MANAGEMENT
// ============================================================
function openModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.add('open');
}

function closeAllModals() {
  document.querySelectorAll('.modal-overlay').forEach(el => el.classList.remove('open'));
}

// ============================================================
// API KEY MANAGEMENT
// ============================================================
async function generateApiKey() {
  const keyDisplay = document.getElementById('generated-key-display');
  const btn = document.getElementById('generate-key-btn');
  if (!keyDisplay) return;

  // Local generation (client-side, mirrors server format)
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let key = 'qa-';
  for (let i = 0; i < 12; i++) {
    key += chars[Math.floor(Math.random() * chars.length)];
  }

  // Also try to generate via server
  try {
    const res = await fetch(`${QA.serverUrl}/generate-key`, {
      signal: AbortSignal.timeout(4000)
    });
    if (res.ok) {
      const data = await res.json();
      if (data.key) key = data.key;
    }
  } catch {
    // Use local-generated key
  }

  keyDisplay.textContent = key;
  keyDisplay.style.display = 'block';
  keyDisplay.dataset.key = key;
}

function copyGeneratedKey() {
  const el = document.getElementById('generated-key-display');
  if (!el || !el.dataset.key) return;
  navigator.clipboard.writeText(el.dataset.key).then(() => {
    const btn = document.getElementById('copy-key-btn');
    if (btn) {
      const orig = btn.textContent;
      btn.textContent = '✓ COPIED';
      setTimeout(() => btn.textContent = orig, 2000);
    }
  });
}

function saveApiKey() {
  const input = document.getElementById('api-key-input');
  if (!input) return;
  const key = input.value.trim();
  if (!key.startsWith('qa-')) {
    alert('Invalid key format. Key must start with "qa-"');
    return;
  }
  QA.apiKey = key;
  localStorage.setItem('qa_api_key', key);
  closeAllModals();
  checkApiStatus();

  // Show confirmation
  appendSystemMessage('API key updated successfully.');
}

// ============================================================
// SETTINGS SAVE
// ============================================================
function saveSettings() {
  const urlInput = document.getElementById('settings-server-url');
  if (urlInput) {
    QA.serverUrl = urlInput.value.trim();
    localStorage.setItem('qa_server_url', QA.serverUrl);
    if (serverUrlInput) serverUrlInput.value = QA.serverUrl;
  }
  closeAllModals();
  checkApiStatus();
}

// ============================================================
// CHAT HISTORY (session)
// ============================================================
function saveChatHistory() {
  if (!messagesArea) return;
  // Save a lightweight version (just text)
  const msgs = [];
  messagesArea.querySelectorAll('.message').forEach(el => {
    const role = el.classList.contains('user') ? 'user' : 'ai';
    const bubble = el.querySelector('.msg-bubble');
    if (bubble) msgs.push({ role, html: bubble.innerHTML });
  });
  sessionStorage.setItem('qa_chat_history', JSON.stringify(msgs.slice(-50)));
}

function loadChatHistory() {
  const raw = sessionStorage.getItem('qa_chat_history');
  if (!raw || !messagesArea) return;
  try {
    const msgs = JSON.parse(raw);
    if (msgs.length === 0) return;
    const welcome = document.getElementById('welcome-banner');
    if (welcome) welcome.style.display = 'none';
    msgs.forEach(m => {
      const wrapper = document.createElement('div');
      wrapper.className = `message ${m.role}`;
      wrapper.innerHTML = `
        <div class="msg-avatar">${m.role === 'ai' ? '⬡' : '◈'}</div>
        <div class="msg-content">
          <div class="msg-name">${m.role === 'ai' ? 'QA-AGENT' : 'YOU'}</div>
          <div class="msg-bubble">${m.html}</div>
        </div>`;
      messagesArea.appendChild(wrapper);
    });
    scrollToBottom();
  } catch {
    sessionStorage.removeItem('qa_chat_history');
  }
}
