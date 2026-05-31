const TOKEN_KEY = 'auth_token';
const USER_KEY = 'auth_user';

export interface AuthUser {
  id: number;
  username: string;
  email: string;
}

export function saveAuth(token: string, user: AuthUser) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function loadAuthToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function loadAuthUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function clearAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function isLoggedIn(): boolean {
  return !!loadAuthToken();
}

/** 封装带鉴权的 fetch，401 时自动跳转登录页 */
export async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = loadAuthToken();
  const resp = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
  });
  if (resp.status === 401) {
    clearAuth();
    window.location.hash = '#/login';
    throw new Error('请先登录');
  }
  return resp;
}
