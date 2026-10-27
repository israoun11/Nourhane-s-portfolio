// Talks to the server. Every request sends the session cookie (same site only)
// and the custom header the server requires for protection against CSRF.

export class ApiError extends Error {
  constructor(status, message, body = {}) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

const listeners = new Set();
/** Called when the server says the session is over (so the UI can ask to log in again). */
export const onSessionExpired = (fn) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

export async function api(path, { method = 'GET', json } = {}) {
  let res;
  try {
    res = await fetch(path, {
      method,
      credentials: 'same-origin',
      headers: {
        'X-Requested-With': 'nt-admin',
        ...(json !== undefined ? { 'Content-Type': 'application/json' } : {}),
      },
      body: json !== undefined ? JSON.stringify(json) : undefined,
    });
  } catch {
    throw new ApiError(0, 'Could not reach the server. Check your internet connection and try again.');
  }
  let body = {};
  try {
    body = await res.json();
  } catch {
    /* no body */
  }
  if (!res.ok) {
    if (res.status === 401 && body.code === 'SESSION') listeners.forEach((fn) => fn());
    throw new ApiError(res.status, body.error || `Request failed (${res.status}).`, body);
  }
  return body;
}

/** Uploads an image with progress (0–100). Returns { url }. */
export function uploadImage(file, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/admin/upload');
    xhr.withCredentials = true;
    xhr.setRequestHeader('X-Requested-With', 'nt-admin');
    xhr.setRequestHeader('Content-Type', file.type);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress && onProgress(Math.round((e.loaded / e.total) * 100));
    xhr.onload = () => {
      let body = {};
      try {
        body = JSON.parse(xhr.responseText);
      } catch {
        /* ignore */
      }
      if (xhr.status >= 200 && xhr.status < 300) return resolve(body);
      if (xhr.status === 401 && body.code === 'SESSION') listeners.forEach((fn) => fn());
      reject(new ApiError(xhr.status, body.error || `Upload failed (${xhr.status}).`, body));
    };
    xhr.onerror = () => reject(new ApiError(0, 'Upload failed — could not reach the server.'));
    xhr.send(file);
  });
}

// ── tiny immutable helpers for editing nested content ──
export const getIn = (obj, path) => path.reduce((o, k) => (o == null ? o : o[k]), obj);
export function setIn(obj, path, value) {
  if (!path.length) return value;
  const [k, ...rest] = path;
  const copy = Array.isArray(obj) ? [...obj] : { ...obj };
  copy[k] = setIn(obj == null ? undefined : obj[k], rest, value);
  return copy;
}
export const pathKey = (path) => path.reduce((s, k) => (typeof k === 'number' ? `${s}[${k}]` : s ? `${s}.${k}` : k), '');
