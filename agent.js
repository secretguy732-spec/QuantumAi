/**
 * QuantumAI / QA-AGENT — server/agent.js
 * Modular AI Agent — processes messages and routes to tools.
 *
 * Architecture designed for future expansion:
 *   - AI Memory Database
 *   - Plugin system
 *   - Automation tools
 *   - Voice input processing
 *   - Image generation
 *   - Multi-user sessions
 */

const { search, formatSearchResult } = require('../tools/browser');

// ============================================================
// TOOL DEFINITIONS
// Each tool has: name, keywords, handler
// ============================================================
const tools = {
  search: {
    name: 'search',
    description: 'Search the internet using DuckDuckGo',
    keywords: ['search', 'look up', 'find', 'google', 'internet', 'web', 'what is', 'who is', 'where is', 'news'],
    handler: handleSearch,
  },
  code: {
    name: 'code',
    description: 'Code assistance and generation',
    keywords: ['code', 'script', 'function', 'program', 'debug', 'javascript', 'python', 'html', 'css', 'fix this', 'write a'],
    handler: handleCode,
  },
  task: {
    name: 'task',
    description: 'AI task simulation and planning',
    keywords: ['task', 'todo', 'remind', 'plan', 'schedule', 'automate', 'workflow', 'step by step', 'how to', 'create a plan'],
    handler: handleTask,
  },
  math: {
    name: 'math',
    description: 'Mathematical calculations',
    keywords: ['calculate', 'math', 'solve', 'equation', 'formula', 'compute', '%', '+ ', '- ', '* ', '/ '],
    handler: handleMath,
  },
};

// ============================================================
// MAIN ENTRY POINT
// ============================================================
/**
 * Process a user message and return an agent response.
 * @param {string} message - User input
 * @param {Object} context - Request context (key, session, etc.)
 * @returns {Promise<{text: string, tool: string|null}>}
 */
async function processMessage(message, context = {}) {
  if (!message || typeof message !== 'string') {
    return { text: 'Invalid message format.', tool: null };
  }

  const msg = message.trim();
  if (msg.length === 0) {
    return { text: 'Please enter a message.', tool: null };
  }

  console.log(`[Agent] Processing: "${msg.substring(0, 60)}..."`);

  // Detect which tool to use
  const detectedTool = detectTool(msg);

  if (detectedTool) {
    try {
      const result = await detectedTool.handler(msg, context);
      return { text: result, tool: detectedTool.name };
    } catch (err) {
      console.error(`[Agent] Tool "${detectedTool.name}" error:`, err.message);
      return {
        text: `⚠ The ${detectedTool.name} tool encountered an error: ${err.message}\n\nLet me try to answer directly:\n\n${generateFallbackResponse(msg)}`,
        tool: detectedTool.name,
      };
    }
  }

  // Default response
  return { text: generateFallbackResponse(msg), tool: null };
}

// ============================================================
// TOOL DETECTION
// ============================================================
function detectTool(message) {
  const lower = message.toLowerCase();

  // Explicit prefix check (highest priority)
  for (const [name, tool] of Object.entries(tools)) {
    if (lower.startsWith(name + ':') || lower.startsWith(name + ' ')) {
      // Check if it really matches (not just coincidence)
      const firstWord = lower.split(/[\s:]/)[0];
      if (firstWord === name) return tool;
    }
  }

  // Keyword scoring
  let bestTool = null;
  let bestScore = 0;

  for (const tool of Object.values(tools)) {
    let score = 0;
    for (const kw of tool.keywords) {
      if (lower.includes(kw)) {
        score += kw.length; // Longer keyword = more specific = higher score
      }
    }
    if (score > bestScore) {
      bestScore = score;
      bestTool = tool;
    }
  }

  // Require minimum score to avoid false positives
  if (bestScore >= 4) return bestTool;

  return null;
}

// ============================================================
// TOOL HANDLERS
// ============================================================

/** Search handler */
async function handleSearch(message) {
  // Extract query — strip prefix if present
  let query = message
    .replace(/^search:?\s*/i, '')
    .replace(/^look up:?\s*/i, '')
    .replace(/^find:?\s*/i, '')
    .trim();

  if (!query) query = message;

  const result = await search(query);
  return formatSearchResult(result);
}

/** Code assistance handler */
async function handleCode(message) {
  const lower = message.toLowerCase();

  // Detect language/topic
  let topic = 'general programming';
  const langs = ['javascript', 'python', 'html', 'css', 'node', 'react', 'php', 'java', 'typescript', 'bash', 'sql'];
  for (const lang of langs) {
    if (lower.includes(lang)) { topic = lang; break; }
  }

  // Detect task type
  let taskType = 'write';
  if (lower.includes('debug') || lower.includes('fix') || lower.includes('error')) taskType = 'debug';
  else if (lower.includes('explain') || lower.includes('how does')) taskType = 'explain';
  else if (lower.includes('optimize') || lower.includes('improve')) taskType = 'optimize';

  const responses = {
    write: `💻 **Code Assistance — ${topic.toUpperCase()}**\n\nI can help you write ${topic} code. Here's a structured approach:\n\n1. Define the requirements clearly\n2. Break down the problem into smaller parts\n3. Write the core logic first\n4. Handle edge cases and errors\n5. Test and refine\n\n**To get better code assistance**, please describe:\n• What the code should **do**\n• What **inputs** it takes\n• What **output** is expected\n• Any specific libraries or constraints\n\nExample: "code: write a JavaScript function that sorts an array of objects by a key name"`,

    debug: `🐛 **Debug Mode — ${topic.toUpperCase()}**\n\nTo help debug your code effectively:\n\n1. **Share the code** that's causing issues\n2. **Describe the error** message you're seeing\n3. **Explain expected vs actual** behavior\n\nCommon debugging strategies:\n• Check for syntax errors first\n• Add console.log / print statements\n• Verify input data types\n• Check API/function return values\n• Look for off-by-one errors in loops\n\nPaste your code and I'll analyze it.`,

    explain: `📖 **Code Explanation — ${topic.toUpperCase()}**\n\nShare the code snippet you want explained and I'll break it down:\n• What each section does\n• Why it works that way\n• Potential improvements\n• Best practices for this pattern`,

    optimize: `⚡ **Code Optimization — ${topic.toUpperCase()}**\n\nTo optimize your code, share it and I'll suggest:\n• Performance improvements\n• Reduced complexity\n• Better algorithms\n• Memory efficiency\n• Cleaner patterns`,
  };

  return responses[taskType] || responses.write;
}

/** Task processing handler */
async function handleTask(message) {
  const lower = message.toLowerCase();
  const taskMsg = message.replace(/^task:?\s*/i, '').trim() || message;

  // Simulate task planning
  const timestamp = new Date().toISOString();
  const taskId = 'QA-' + Date.now().toString(36).toUpperCase();

  let steps = [];

  if (lower.includes('remind') || lower.includes('schedule')) {
    steps = [
      'Parse the reminder details',
      'Extract date and time information',
      'Store task in memory queue',
      'Set notification trigger',
      'Confirm task created'
    ];
  } else if (lower.includes('automate') || lower.includes('workflow')) {
    steps = [
      'Analyze workflow requirements',
      'Map input → process → output chain',
      'Identify automation points',
      'Define trigger conditions',
      'Build action sequence',
      'Test and validate workflow',
      'Deploy automation'
    ];
  } else {
    // Generic task breakdown
    const words = taskMsg.split(' ').slice(0, 5).join(' ');
    steps = [
      `Analyze task: "${words}..."`,
      'Identify required resources',
      'Break down into subtasks',
      'Prioritize by dependency',
      'Execute in sequence',
      'Verify completion'
    ];
  }

  let response = `⚙ **Task Processor — ID: ${taskId}**\n\n`;
  response += `📋 **Task:** ${taskMsg}\n`;
  response += `🕐 **Queued:** ${timestamp}\n\n`;
  response += `**Execution Plan:**\n`;

  steps.forEach((step, i) => {
    response += `\n${i + 1}. ${step}`;
  });

  response += `\n\n✅ Task plan generated. In a full QA-AGENT deployment with automation plugins, this task would be executed automatically.\n\n*Note: Task automation plugins are on the roadmap for v2.0*`;

  return response;
}

/** Math handler */
async function handleMath(message) {
  // Safe expression evaluation
  const expr = message
    .replace(/^(calculate|compute|solve|math):?\s*/i, '')
    .replace(/×/g, '*')
    .replace(/÷/g, '/')
    .replace(/[^0-9+\-*/.() %^]/g, '')
    .trim();

  if (!expr) {
    return '🧮 Please provide a mathematical expression. Example: `calculate 25 * 4 + 10`';
  }

  try {
    // Safe eval using Function constructor (sandboxed)
    const result = Function('"use strict"; return (' + expr + ')')();
    if (typeof result !== 'number' || !isFinite(result)) {
      throw new Error('Result is not a valid number');
    }
    return `🧮 **Calculation Result**\n\n\`${expr}\` = **${result}**`;
  } catch (e) {
    return `🧮 Could not evaluate: \`${expr}\`\n\nPlease check your expression syntax. Supported: +, -, *, /, (), %`;
  }
}

// ============================================================
// FALLBACK RESPONSES
// ============================================================
const qaResponses = [
  "I'm QA-AGENT, your QuantumAI assistant. I can help with web searches, code assistance, task planning, and general questions. What would you like to explore?",
  "Understood. I'm processing your request. For more powerful responses, try using the **search**, **code**, or **task** prefixes!",
  "I'm here and ready to assist. Ask me anything — or use specific commands like `search: topic`, `code: description`, or `task: what to do`.",
  "Acknowledged. As an AI agent, I'm optimized for web research, development assistance, and workflow automation. How can I help you today?",
];

const greetResponses = [
  "⬡ QA-AGENT online. QuantumAI systems initialized. How can I assist you today?",
  "System ready. QuantumAI QA-AGENT at your service. What's your query?",
  "Hello! I'm QA-AGENT, your QuantumAI assistant. Ready to help with searches, code, tasks, and more.",
];

function generateFallbackResponse(message) {
  const lower = message.toLowerCase();

  // Greetings
  if (/^(hello|hi|hey|greetings|yo|sup|howdy)/i.test(lower)) {
    return greetResponses[Math.floor(Math.random() * greetResponses.length)];
  }

  // Identity questions
  if (lower.includes('who are you') || lower.includes('what are you') || lower.includes('your name')) {
    return `I'm **QA-AGENT**, the AI assistant powering **QuantumAI**.\n\n**Capabilities:**\n• 🔍 Web search via DuckDuckGo\n• 💻 Code assistance and debugging\n• ⚙ Task planning and simulation\n• 🧮 Mathematical calculations\n• 💬 General conversation\n\n**Usage tips:**\n• \`search: query\` — Search the web\n• \`code: description\` — Get code help\n• \`task: what to do\` — Plan a task\n\n*QuantumAI QA-AGENT v1.0.0*`;
  }

  // Help
  if (lower.includes('help') || lower.includes('commands') || lower.includes('what can you do')) {
    return `**QA-AGENT Commands:**\n\n🔍 \`search: [query]\` — Search the internet\n💻 \`code: [description]\` — Code assistance\n⚙ \`task: [task description]\` — Task planning\n🧮 \`calculate: [expression]\` — Math\n\n**Examples:**\n• \`search: latest AI news\`\n• \`code: write a Python web scraper\`\n• \`task: create a workflow for data backup\`\n• \`calculate: 15% of 2500\`\n\nYou can also ask naturally — I'll detect the right tool automatically!`;
  }

  // Version/status
  if (lower.includes('version') || lower.includes('status') || lower.includes('system')) {
    return `**QuantumAI QA-AGENT Status**\n\n\`\`\`\nSystem: QA-AGENT v1.0.0\nStatus: ONLINE\nMode: Standard\nTools: Search, Code, Task, Math\nMemory: Session-based\nUptime: Active\n\`\`\`\n\n*Future expansions: Memory DB, Voice Input, Image Gen, Multi-User, Plugin System*`;
  }

  // Default
  return qaResponses[Math.floor(Math.random() * qaResponses.length)] +
    `\n\nYou said: *"${message.substring(0, 80)}${message.length > 80 ? '...' : ''}"*`;
}

// ============================================================
// FUTURE EXPANSION HOOKS
// (Placeholder interfaces for planned features)
// ============================================================

/**
 * [FUTURE] Load plugin by name.
 * @param {string} pluginName
 */
function loadPlugin(pluginName) {
  // TODO: Dynamic plugin loader
  console.log(`[Agent] Plugin requested: ${pluginName} (not yet implemented)`);
}

/**
 * [FUTURE] Store/retrieve AI memory.
 * @param {string} key
 * @param {*} value
 */
function memory(key, value = undefined) {
  // TODO: Connect to persistent memory database
  console.log(`[Agent] Memory operation: ${key} (not yet implemented)`);
}

/**
 * [FUTURE] Process voice input (transcribed text).
 * @param {string} transcription
 */
async function processVoiceInput(transcription) {
  return processMessage(transcription, { source: 'voice' });
}

module.exports = {
  processMessage,
  detectTool,
  tools,
  // Future expansion exports
  loadPlugin,
  memory,
  processVoiceInput,
};
