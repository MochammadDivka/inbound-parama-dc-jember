/**
 * GAS Client — Hybrid adapter for IITS backend
 * =============================================
 * Automatically switches between:
 * - Mock data (in-memory) when GOOGLE_APPS_SCRIPT_URL is not set
 * - Google Apps Script (production) when GOOGLE_APPS_SCRIPT_URL is set
 *
 * This allows development without GAS while keeping API routes identical.
 */

const GAS_URL = process.env.GOOGLE_APPS_SCRIPT_URL;
const GAS_SECRET = process.env.GAS_SECRET_KEY ?? '';
const GAS_TIMEOUT_MS = 30_000; // 30 seconds per PRD

export const isGASEnabled = !!GAS_URL;

// ─── HTTP request to GAS ─────────────────────────────────────────

interface GASRequestOptions {
  action: string;
  method?: 'GET' | 'POST';
  params?: Record<string, string | number | boolean | undefined>;
  body?: Record<string, unknown>;
}

export async function gasRequest<T = unknown>(
  options: GASRequestOptions
): Promise<{ success: boolean; data?: T; error?: { code: string; message: string; details?: unknown }; total?: number; page?: number; limit?: number; totalPages?: number; message?: string }> {
  if (!GAS_URL) {
    throw new Error('GAS_URL not configured. Set GOOGLE_APPS_SCRIPT_URL in .env.local');
  }

  const { action, method = 'GET', params = {}, body } = options;

  // Build query string (always include action and secret)
  const queryParams = new URLSearchParams({
    action,
    secret: GAS_SECRET,
    ...Object.fromEntries(
      Object.entries(params)
        .filter(([, v]) => v !== undefined && v !== '')
        .map(([k, v]) => [k, String(v)])
    ),
  });

  const url = `${GAS_URL}?${queryParams.toString()}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), GAS_TIMEOUT_MS);

  try {
    const fetchOptions: RequestInit = {
      method,
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json' },
    };

    if (method === 'POST' && body) {
      fetchOptions.body = JSON.stringify({ ...body, action, secret: GAS_SECRET });
    }

    // GAS always redirects — follow redirect
    const response = await fetch(url, { ...fetchOptions, redirect: 'follow' });

    if (!response.ok) {
      return {
        success: false,
        error: { code: 'GAS_HTTP_ERROR', message: `GAS returned ${response.status}` },
      };
    }

    const json = await response.json();
    return json;
  } catch (err) {
    if ((err as Error).name === 'AbortError') {
      return {
        success: false,
        error: { code: 'GAS_TIMEOUT', message: 'GAS request timeout (>30s)' },
      };
    }
    return {
      success: false,
      error: { code: 'GAS_NETWORK_ERROR', message: (err as Error).message },
    };
  } finally {
    clearTimeout(timeout);
  }
}

// ─── Typed GAS Helpers ────────────────────────────────────────────
// These mirror the mock-data functions but call GAS instead.
// API routes can import these when GAS is enabled.

export const gas = {
  // Issues
  getIssues: (params: Record<string, string | number>) =>
    gasRequest({ action: 'getIssues', method: 'GET', params: params as Record<string, string> }),

  getIssue: (id: string) =>
    gasRequest({ action: 'getIssue', method: 'GET', params: { id } }),

  checkDuplicateIssue: (sku: string, batch: string, exclude_id?: string) =>
    gasRequest({ action: 'checkDuplicateIssue', method: 'GET', params: { sku, batch, exclude_id } }),

  createIssue: (data: Record<string, unknown>) =>
    gasRequest({ action: 'createIssue', method: 'POST', body: data }),

  updateIssue: (id: string, data: Record<string, unknown>) =>
    gasRequest({ action: 'updateIssue', method: 'POST', body: { ...data, id } }),

  solveIssue: (id: string, data: Record<string, unknown>) =>
    gasRequest({ action: 'solveIssue', method: 'POST', body: { ...data, id } }),

  cancelIssue: (id: string, data: Record<string, unknown>) =>
    gasRequest({ action: 'cancelIssue', method: 'POST', body: { ...data, id } }),

  requestSolved: (id: string, data: Record<string, unknown>) =>
    gasRequest({ action: 'requestSolved', method: 'POST', body: { ...data, id } }),

  rejectSolved: (id: string, data: Record<string, unknown>) =>
    gasRequest({ action: 'rejectSolved', method: 'POST', body: { ...data, id } }),

  // CZ
  getCZ: (params: Record<string, string | number>) =>
    gasRequest({ action: 'getCZ', method: 'GET', params: params as Record<string, string> }),

  getCZRecord: (id: string) =>
    gasRequest({ action: 'getCZRecord', method: 'GET', params: { id } }),

  checkDuplicateCZ: (sku: string, batch: string, exclude_id?: string) =>
    gasRequest({ action: 'checkDuplicateCZ', method: 'GET', params: { sku, batch, exclude_id } }),

  createCZ: (data: Record<string, unknown>) =>
    gasRequest({ action: 'createCZ', method: 'POST', body: data }),

  solveCZ: (id: string, data: Record<string, unknown>) =>
    gasRequest({ action: 'solveCZ', method: 'POST', body: { ...data, id } }),

  updateCZ: (id: string, data: Record<string, unknown>) =>
    gasRequest({ action: 'updateCZ', method: 'POST', body: { ...data, id } }),

  deleteCZ: (id: string, data: Record<string, unknown>) =>
    gasRequest({ action: 'deleteCZ', method: 'POST', body: { ...data, id } }),

  // Users
  getUsers: (params?: Record<string, string>) =>
    gasRequest({ action: 'getUsers', method: 'GET', params }),

  getUser: (id: string) =>
    gasRequest({ action: 'getUser', method: 'GET', params: { id } }),

  createUser: (data: Record<string, unknown>) =>
    gasRequest({ action: 'createUser', method: 'POST', body: data }),

  resetPin: (id: string, data: Record<string, unknown>) =>
    gasRequest({ action: 'resetPin', method: 'POST', body: { ...data, id } }),

  toggleStatus: (id: string, data: Record<string, unknown>) =>
    gasRequest({ action: 'toggleStatus', method: 'POST', body: { ...data, id } }),

  // Auth (server-side only — returns sensitive credential data, never call from client)
  getUserForAuth: (username: string) =>
    gasRequest({ action: 'getUserForAuth', method: 'GET', params: { username } }),

  getAdminForAuth: (email: string) =>
    gasRequest({ action: 'getAdminForAuth', method: 'GET', params: { email } }),

  // Dashboard
  getDashboard: () =>
    gasRequest({ action: 'getDashboard', method: 'GET' }),

  // Logs
  getLogs: (params?: Record<string, string | number>) =>
    gasRequest({ action: 'getLogs', method: 'GET', params: params as Record<string, string> }),

  addLog: (data: Record<string, unknown>) =>
    gasRequest({ action: 'addLog', method: 'POST', body: data }),

  // Merge Issue
  mergeIssue: (id: string, data: Record<string, unknown>) =>
    gasRequest({ action: 'mergeIssue', method: 'POST', body: { ...data, id } }),

  // Update photo URL (append ke issue/CZ yang sudah ada)
  updatePhotoUrl: (id: string, data: Record<string, unknown>) =>
    gasRequest({ action: 'updatePhotoUrl', method: 'POST', body: { ...data, id } }),
};
