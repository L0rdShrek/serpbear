#!/usr/bin/env node
/**
 * SerpBear MCP Server
 *
 * Exposes SerpBear data (domains, keywords, backlinks, search console)
 * via the Model Context Protocol (MCP) for use with AI assistants.
 *
 * Usage:
 *   node mcp-server.js
 *
 * Environment variables:
 *   SERPBEAR_API_URL  - Base URL of the SerpBear instance (default: http://localhost:3000)
 *   SERPBEAR_API_KEY  - API key for authentication (same as APIKEY env var in SerpBear)
 */

const { McpServer } = require('@modelcontextprotocol/sdk/server/mcp.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const { z } = require('zod');

const API_URL = process.env.SERPBEAR_API_URL || 'http://localhost:3000';
const API_KEY = process.env.SERPBEAR_API_KEY || process.env.APIKEY || '';

async function apiRequest(method, path, body) {
   const url = `${API_URL}${path}`;
   const options = {
      method,
      headers: {
         'Content-Type': 'application/json',
         Authorization: `Bearer ${API_KEY}`,
      },
   };
   if (body) {
      options.body = JSON.stringify(body);
   }
   const res = await fetch(url, options);
   if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`API request failed: ${res.status} ${res.statusText} - ${text}`);
   }
   return res.json();
}

const server = new McpServer(
   {
      name: 'serpbear',
      version: '1.0.0',
   },
   {
      capabilities: {
         tools: {},
         resources: {},
      },
      instructions: 'SerpBear SEO tool - track keyword rankings, discover backlinks, and analyze search console data.',
   },
);

// ─── Tools ───

server.tool(
   'list-domains',
   'List all tracked domains with their keyword counts and statistics',
   {},
   async () => {
      const data = await apiRequest('GET', '/api/domains');
      return {
         content: [{
            type: 'text',
            text: JSON.stringify(data.domains || [], null, 2),
         }],
      };
   },
);

server.tool(
   'get-keywords',
   'Get all tracked keywords for a specific domain',
   { domain: z.string().describe('Domain slug (e.g. "example-com")') },
   async ({ domain }) => {
      const data = await apiRequest('GET', `/api/keywords?domain=${encodeURIComponent(domain)}`);
      const keywords = (data.keywords || []).map((k) => ({
         keyword: k.keyword,
         position: k.position,
         device: k.device,
         country: k.country,
         volume: k.volume,
         url: k.url,
         lastUpdated: k.lastUpdated,
         tags: k.tags,
      }));
      return {
         content: [{
            type: 'text',
            text: JSON.stringify(keywords, null, 2),
         }],
      };
   },
);

server.tool(
   'get-keyword-detail',
   'Get detailed information about a specific keyword including position history',
   { id: z.number().describe('Keyword ID') },
   async ({ id }) => {
      const data = await apiRequest('GET', `/api/keyword?id=${id}`);
      return {
         content: [{
            type: 'text',
            text: JSON.stringify(data.keyword || data, null, 2),
         }],
      };
   },
);

server.tool(
   'get-backlinks',
   'Get discovered backlinks for a domain (pages that link to the domain)',
   { domain: z.string().describe('Domain slug (e.g. "example-com")') },
   async ({ domain }) => {
      const data = await apiRequest('GET', `/api/backlinks?domain=${encodeURIComponent(domain)}`);
      return {
         content: [{
            type: 'text',
            text: JSON.stringify(data.data || { backlinks: [] }, null, 2),
         }],
      };
   },
);

server.tool(
   'refresh-backlinks',
   'Search for new backlinks for a domain by scraping Google',
   { domain: z.string().describe('Full domain name (e.g. "example.com")') },
   async ({ domain }) => {
      const data = await apiRequest('POST', '/api/backlinks', { domain });
      return {
         content: [{
            type: 'text',
            text: JSON.stringify(data.data || { backlinks: [] }, null, 2),
         }],
      };
   },
);

server.tool(
   'refresh-keywords',
   'Refresh keyword positions for a domain by scraping Google',
   { domain: z.string().describe('Full domain name (e.g. "example.com")') },
   async ({ domain }) => {
      const data = await apiRequest('POST', '/api/refresh', { ids: [], domain });
      return {
         content: [{
            type: 'text',
            text: JSON.stringify(data, null, 2),
         }],
      };
   },
);

server.tool(
   'get-search-console-data',
   'Get Google Search Console analytics data for a domain',
   { domain: z.string().describe('Domain slug (e.g. "example-com")') },
   async ({ domain }) => {
      const data = await apiRequest('GET', `/api/searchconsole?domain=${encodeURIComponent(domain)}`);
      return {
         content: [{
            type: 'text',
            text: JSON.stringify(data.data || {}, null, 2),
         }],
      };
   },
);

server.tool(
   'get-insights',
   'Get Search Console insights (top keywords, countries, pages) for a domain',
   { domain: z.string().describe('Domain slug (e.g. "example-com")') },
   async ({ domain }) => {
      const data = await apiRequest('GET', `/api/insight?domain=${encodeURIComponent(domain)}`);
      return {
         content: [{
            type: 'text',
            text: JSON.stringify(data.data || {}, null, 2),
         }],
      };
   },
);

// ─── Resources ───

server.resource(
   'domains',
   'serpbear://domains',
   { description: 'List of all tracked domains', mimeType: 'application/json' },
   async () => {
      const data = await apiRequest('GET', '/api/domains');
      return {
         contents: [{
            uri: 'serpbear://domains',
            mimeType: 'application/json',
            text: JSON.stringify(data.domains || [], null, 2),
         }],
      };
   },
);

// ─── Start ───

async function main() {
   const transport = new StdioServerTransport();
   await server.connect(transport);
}

main().catch((err) => {
   process.stderr.write(`MCP server error: ${err.message}\n`);
   process.exit(1);
});
