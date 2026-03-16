/**
 * QuantumAI / QA-AGENT — tools/browser.js
 * Internet search tool using DuckDuckGo Instant Answer API.
 * No API key required.
 */

const https = require('https');
const http = require('http');

/**
 * Search DuckDuckGo Instant Answer API.
 * @param {string} query - Search query string
 * @returns {Promise<{summary: string, source: string, results: Array}>}
 */
async function search(query) {
  const encoded = encodeURIComponent(query);
  const url = `https://api.duckduckgo.com/?q=${encoded}&format=json&no_html=1&skip_disambig=1`;

  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      headers: {
        'User-Agent': 'QuantumAI-QA-Agent/1.0'
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          const result = parseDDGResponse(json, query);
          resolve(result);
        } catch (e) {
          reject(new Error('Failed to parse search response: ' + e.message));
        }
      });
    });

    req.on('error', reject);
    req.setTimeout(8000, () => {
      req.destroy();
      reject(new Error('Search request timed out'));
    });
  });
}

/**
 * Parse DuckDuckGo API response into a clean summary.
 */
function parseDDGResponse(json, query) {
  let summary = '';
  let source = '';
  const results = [];

  // Abstract (best source)
  if (json.Abstract && json.Abstract.trim()) {
    summary = json.Abstract.trim();
    source = json.AbstractSource || 'DuckDuckGo';
    if (json.AbstractURL) source += ` (${json.AbstractURL})`;
  }

  // Answer (short definitive answer)
  if (!summary && json.Answer) {
    summary = json.Answer.trim();
    source = 'DuckDuckGo Instant Answer';
  }

  // Definition
  if (!summary && json.Definition) {
    summary = json.Definition.trim();
    source = json.DefinitionSource || 'DuckDuckGo';
  }

  // Related topics
  if (json.RelatedTopics && json.RelatedTopics.length > 0) {
    json.RelatedTopics.slice(0, 4).forEach(topic => {
      if (topic.Text) {
        results.push({
          text: topic.Text,
          url: topic.FirstURL || ''
        });
      }
    });
  }

  // If no summary found, use first related topic
  if (!summary && results.length > 0) {
    summary = results[0].text;
    source = results[0].url || 'DuckDuckGo';
  }

  // Fallback
  if (!summary) {
    summary = `No direct answer found for "${query}". Try refining your search query.`;
    source = 'DuckDuckGo';
  }

  return { summary, source, results, query };
}

/**
 * Format search result as a user-friendly response string.
 */
function formatSearchResult(result) {
  let output = `🔍 **Search: ${result.query}**\n\n`;
  output += result.summary;

  if (result.source) {
    output += `\n\n📌 Source: ${result.source}`;
  }

  if (result.results.length > 1) {
    output += '\n\n**Related:**';
    result.results.slice(1, 4).forEach(r => {
      const text = r.text.length > 100 ? r.text.substring(0, 100) + '...' : r.text;
      output += `\n• ${text}`;
    });
  }

  return output;
}

module.exports = { search, formatSearchResult, parseDDGResponse };
