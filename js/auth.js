// ════════════════════════════════════════════
//  КАНИКУЛЫ С ONE! — AUTH MODULE
//  Supabase Auth via REST API (no SDK)
// ════════════════════════════════════════════

const AUTH_EMAIL_DOMAIN = 'kanikuly.auth';

const AUTH_STORAGE_KEY = {
  access_token: 'kanikuly_access_token',
  refresh_token: 'kanikuly_refresh_token',
  user: 'kanikuly_user',
  profile: 'kanikuly_profile'
};

let _authCache = { user: null, profile: null };

function authBaseUrl() {
  return SUPABASE_URL + '/auth/v1';
}

function authHeaders() {
  return {
    'apikey': SUPABASE_ANON_KEY,
    'Content-Type': 'application/json'
  };
}

function authAuthedHeaders() {
  const token = localStorage.getItem(AUTH_STORAGE_KEY.access_token);
  const h = authHeaders();
  if (token) h['Authorization'] = 'Bearer ' + token;
  return h;
}

function authStoreSession(data) {
  if (data.access_token) localStorage.setItem(AUTH_STORAGE_KEY.access_token, data.access_token);
  if (data.refresh_token) localStorage.setItem(AUTH_STORAGE_KEY.refresh_token, data.refresh_token);
  if (data.user) localStorage.setItem(AUTH_STORAGE_KEY.user, JSON.stringify(data.user));
}

function authClearSession() {
  localStorage.removeItem(AUTH_STORAGE_KEY.access_token);
  localStorage.removeItem(AUTH_STORAGE_KEY.refresh_token);
  localStorage.removeItem(AUTH_STORAGE_KEY.user);
  localStorage.removeItem(AUTH_STORAGE_KEY.profile);
  _authCache = { user: null, profile: null };
}

function usernameToEmail(username) {
  return username.trim().toLowerCase() + '@' + AUTH_EMAIL_DOMAIN;
}

async function authSignUp(username, password, displayName) {
  const email = usernameToEmail(username);
  const res = await fetch(authBaseUrl() + '/signup', {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      email: email,
      password: password,
      data: { username: username, display_name: displayName || username }
    })
  });
  const body = await res.json();
  if (!res.ok) {
    const msg = body.error_description || body.msg || body.message || ('Ошибка ' + res.status);
    throw new Error(msg);
  }
  if (body.access_token) {
    authStoreSession(body);
  }
  return body;
}

async function authSignIn(username, password) {
  const email = usernameToEmail(username);
  const res = await fetch(authBaseUrl() + '/token?grant_type=password', {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ email: email, password: password })
  });
  const body = await res.json();
  if (!res.ok) {
    const msg = body.error_description || body.msg || body.message || ('Ошибка ' + res.status);
    throw new Error(msg);
  }
  authStoreSession(body);
  return body;
}

async function authRefreshToken() {
  const refreshToken = localStorage.getItem(AUTH_STORAGE_KEY.refresh_token);
  if (!refreshToken) return null;
  try {
    const res = await fetch(authBaseUrl() + '/token?grant_type=refresh_token', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ refresh_token: refreshToken })
    });
    const body = await res.json();
    if (!res.ok) return null;
    authStoreSession(body);
    return body;
  } catch (e) {
    return null;
  }
}

async function authSignOut() {
  const token = localStorage.getItem(AUTH_STORAGE_KEY.access_token);
  try {
    await fetch(authBaseUrl() + '/logout', {
      method: 'POST',
      headers: authAuthedHeaders(),
      body: JSON.stringify({})
    });
  } catch (e) { /* ignore */ }
  authClearSession();
  location.reload();
}

async function authGetUser() {
  if (_authCache.user) return _authCache.user;
  const token = localStorage.getItem(AUTH_STORAGE_KEY.access_token);
  if (!token) return null;
  try {
    const res = await fetch(authBaseUrl() + '/user', {
      method: 'GET',
      headers: authAuthedHeaders()
    });
    if (!res.ok) {
      const refreshed = await authRefreshToken();
      if (refreshed && refreshed.user) {
        _authCache.user = refreshed.user;
        return refreshed.user;
      }
      return null;
    }
    const body = await res.json();
    _authCache.user = body;
    return body;
  } catch (e) {
    return null;
  }
}

async function authGetProfile() {
  if (_authCache.profile) return _authCache.profile;
  const user = await authGetUser();
  if (!user) return null;
  try {
    const res = await fetch(SUPABASE_URL + '/rest/v1/profiles?id=eq.' + user.id + '&select=*', {
      method: 'GET',
      headers: authAuthedHeaders()
    });
    if (!res.ok) return null;
    const rows = await res.json();
    if (rows && rows.length > 0) {
      _authCache.profile = rows[0];
      localStorage.setItem(AUTH_STORAGE_KEY.profile, JSON.stringify(rows[0]));
      return rows[0];
    }
    const udata = user.user_metadata || {};
    const username = udata.username || user.email.split('@')[0];
    const displayName = udata.display_name || username;
    const insertRes = await fetch(SUPABASE_URL + '/rest/v1/profiles', {
      method: 'POST',
      headers: authAuthedHeaders(),
      body: JSON.stringify({
        id: user.id,
        username: username,
        display_name: displayName,
        role: 'player'
      })
    });
    if (insertRes.ok) {
      const newProfile = { id: user.id, username: username, display_name: displayName, role: 'player' };
      _authCache.profile = newProfile;
      localStorage.setItem(AUTH_STORAGE_KEY.profile, JSON.stringify(newProfile));
      return newProfile;
    }
    return null;
  } catch (e) {
    const cached = localStorage.getItem(AUTH_STORAGE_KEY.profile);
    return cached ? JSON.parse(cached) : null;
  }
}

async function authGetSession() {
  const token = localStorage.getItem(AUTH_STORAGE_KEY.access_token);
  if (!token) return null;
  const user = await authGetUser();
  if (!user) return null;
  return { user: user, access_token: token };
}

function authIsAdmin() {
  const profile = _authCache.profile;
  return profile && profile.role === 'admin';
}

function authIsLoggedIn() {
  return !!localStorage.getItem(AUTH_STORAGE_KEY.access_token);
}

function authUsername() {
  const profile = _authCache.profile;
  if (profile) return profile.username || profile.display_name || '';
  const user = _authCache.user;
  if (user && user.email) return user.email.split('@')[0];
  return '';
}

window.authSignUp = authSignUp;
window.authSignIn = authSignIn;
window.authSignOut = authSignOut;
window.authGetSession = authGetSession;
window.authGetProfile = authGetProfile;
window.authGetUser = authGetUser;
window.authIsAdmin = authIsAdmin;
window.authIsLoggedIn = authIsLoggedIn;
window.authUsername = authUsername;
window._authCache = _authCache;
