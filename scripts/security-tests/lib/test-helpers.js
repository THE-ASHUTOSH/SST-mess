const fs = require('node:fs');
const path = require('node:path');

const BASE_URL = (process.env.SECURITY_BASE_URL || 'http://localhost:3000').replace(/\/$/, '');

const ROLE_PREFIX = {
  student: 'STUDENT',
  vendor: 'VENDOR',
  admin: 'ADMIN',
  outsider: 'OUTSIDER',
};

function getAuthConfig(role) {
  if (!role) {
    return null;
  }

  const prefix = ROLE_PREFIX[role];
  if (!prefix) {
    throw new Error(`Unknown role: ${role}`);
  }

  return {
    cookie: process.env[`${prefix}_COOKIE`] || '',
    bearerToken: process.env[`${prefix}_BEARER_TOKEN`] || '',
  };
}

function buildHeaders(role, extraHeaders = {}, hasFormData = false) {
  const headers = { Accept: 'application/json', ...extraHeaders };
  const auth = getAuthConfig(role);

  if (auth?.cookie) {
    headers.Cookie = auth.cookie;
  }

  if (auth?.bearerToken) {
    headers.Authorization = `Bearer ${auth.bearerToken}`;
  }

  if (!hasFormData && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  return headers;
}

async function request(options) {
  const {
    role,
    path: requestPath,
    method = 'GET',
    json,
    formData,
    headers = {},
    redirect = 'manual',
  } = options;

  const hasFormData = Boolean(formData);
  const response = await fetch(`${BASE_URL}${requestPath}`, {
    method,
    headers: buildHeaders(role, headers, hasFormData),
    body: formData || (json !== undefined ? JSON.stringify(json) : undefined),
    redirect,
  });

  const text = await response.text();
  let body = text;

  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }

  return {
    status: response.status,
    ok: response.ok,
    headers: Object.fromEntries(response.headers.entries()),
    body,
    text,
  };
}

function buildFormData({ fields = {}, files = [] } = {}) {
  const formData = new FormData();

  for (const [key, value] of Object.entries(fields)) {
    if (value !== undefined && value !== null) {
      formData.append(key, String(value));
    }
  }

  for (const file of files) {
    const buffer = fs.readFileSync(file.filePath);
    const blob = new Blob([buffer], { type: file.contentType || 'application/octet-stream' });
    formData.append(file.fieldName, blob, file.fileName || path.basename(file.filePath));
  }

  return formData;
}

function parseCsvList(rawValue) {
  if (!rawValue) {
    return [];
  }

  return rawValue
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
}

function mutateToken(token) {
  if (!token || token.length < 8) {
    return token;
  }

  const lastChar = token[token.length - 1];
  const replacement = lastChar === 'a' ? 'b' : 'a';
  return `${token.slice(0, -1)}${replacement}`;
}

function summarize(value) {
  if (value === null || value === undefined) {
    return String(value);
  }

  if (typeof value === 'string') {
    return value.slice(0, 240);
  }

  return JSON.stringify(value).slice(0, 240);
}

class Report {
  constructor(suiteName) {
    this.suiteName = suiteName;
    this.results = [];
  }

  add(outcome, id, title, details) {
    this.results.push({ outcome, id, title, details });
    console.log(`[${outcome.toUpperCase()}] ${id} ${title}`);
    if (details) {
      console.log(`  ${details}`);
    }
  }

  secure(id, title, details) {
    this.add('secure', id, title, details);
  }

  vulnerable(id, title, details) {
    this.add('vulnerable', id, title, details);
  }

  skipped(id, title, details) {
    this.add('skipped', id, title, details);
  }

  error(id, title, details) {
    this.add('error', id, title, details);
  }

  summary() {
    const counts = this.results.reduce(
      (accumulator, result) => {
        accumulator[result.outcome] = (accumulator[result.outcome] || 0) + 1;
        return accumulator;
      },
      { secure: 0, vulnerable: 0, skipped: 0, error: 0 },
    );

    console.log(`\nSuite: ${this.suiteName}`);
    console.log(`  Secure: ${counts.secure}`);
    console.log(`  Vulnerable: ${counts.vulnerable}`);
    console.log(`  Skipped: ${counts.skipped}`);
    console.log(`  Errors: ${counts.error}`);

    return counts;
  }

  hasFailures() {
    return this.results.some((result) => result.outcome === 'vulnerable' || result.outcome === 'error');
  }
}

module.exports = {
  BASE_URL,
  Report,
  buildFormData,
  mutateToken,
  parseCsvList,
  request,
  summarize,
};