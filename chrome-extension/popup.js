const statusEl = document.getElementById('status');
const outputEl = document.getElementById('output');
const signinBtn = document.getElementById('signin');
const signoutBtn = document.getElementById('signout');
const fetchBtn = document.getElementById('fetch');
const nextBtn = document.getElementById('next');
const openDashboardBtn = document.getElementById('openDashboard');

function setStatus(text) {
  statusEl.textContent = text;
}

function show(el) { el.classList.remove('hidden'); }
function hide(el) { el.classList.add('hidden'); }

function getClientId() {
  const manifest = chrome.runtime.getManifest();
  return manifest.oauth2 && manifest.oauth2.client_id ? manifest.oauth2.client_id : '';
}

function getScopes() {
  const manifest = chrome.runtime.getManifest();
  const scopes = (manifest.oauth2 && manifest.oauth2.scopes) || [];
  return scopes.join(' ');
}

function getRedirectUri() {
  return `https://${chrome.runtime.id}.chromiumapp.org/`;
}

function parseFragment(fragment) {
  return Object.fromEntries(new URLSearchParams(fragment.startsWith('#') ? fragment.slice(1) : fragment));
}

async function signInViaWebAuthFlow() {
  const clientId = getClientId();
  const redirectUri = getRedirectUri();
  const scope = getScopes();
  if (!clientId) throw new Error('Missing oauth2.client_id in manifest.json');
  if (clientId.includes('REPLACE_ME')) {
    throw new Error(
      `Please set oauth2.client_id in manifest.json to your Google OAuth Client ID.\n` +
      `Extension ID: ${chrome.runtime.id}\n` +
      `Add redirect URI in Google Cloud: ${redirectUri}`
    );
  }

  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('response_type', 'token');
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('scope', scope);
  authUrl.searchParams.set('include_granted_scopes', 'true');
  authUrl.searchParams.set('prompt', 'consent');

  return new Promise((resolve, reject) => {
    chrome.identity.launchWebAuthFlow({ url: authUrl.toString(), interactive: true }, (redirectedTo) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      if (!redirectedTo) {
        reject(new Error('Empty redirect'));
        return;
      }
      try {
        const url = new URL(redirectedTo);
        const params = parseFragment(url.hash);
        if (params.error) {
          reject(new Error(params.error_description || params.error));
          return;
        }
        if (!params.access_token) {
          reject(new Error('No access_token in redirect'));
          return;
        }
        const tokenInfo = {
          accessToken: params.access_token,
          tokenType: params.token_type || 'Bearer',
          expiresIn: Number(params.expires_in || 0),
          obtainedAt: Date.now()
        };
        chrome.storage.local.set({ oauthToken: tokenInfo }, () => resolve(tokenInfo));
      } catch (e) {
        reject(e);
      }
    });
  });
}

async function getStoredToken() {
  return new Promise((resolve) => {
    chrome.storage.local.get('oauthToken', (data) => resolve(data.oauthToken));
  });
}

async function clearStoredToken() {
  return new Promise((resolve) => {
    chrome.storage.local.remove('oauthToken', () => resolve());
  });
}

async function fetchProfile(token) {
  const res = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) throw new Error('Failed to fetch profile');
  return res.json();
}

async function fetchGmailThreads(token) {
  const url = new URL('https://gmail.googleapis.com/gmail/v1/users/me/threads');
  url.searchParams.set('maxResults', '10');
  url.searchParams.set('q', 'subject:(application OR applied)');
  if (window.__nextPageToken) url.searchParams.set('pageToken', window.__nextPageToken);
  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) throw new Error('Failed to fetch Gmail threads');
  return res.json();
}

async function signIn() {
  setStatus('Signing in...');
  try {
    // Prefer Chrome Identity token first (works with Chrome Extension Client ID)
    let tokenInfo;
    try {
      const token = await new Promise((resolve, reject) => {
        chrome.identity.getAuthToken({ interactive: true }, (t) => {
          if (chrome.runtime.lastError || !t) return reject(chrome.runtime.lastError || new Error('No token'));
          resolve(t);
        });
      });
      tokenInfo = { accessToken: token, tokenType: 'Bearer', expiresIn: 0, obtainedAt: Date.now() };
      chrome.storage.local.set({ oauthToken: tokenInfo });
    } catch (_) {
      // Fallback to implicit flow
      tokenInfo = await signInViaWebAuthFlow();
    }
    const profile = await fetchProfile(tokenInfo.accessToken);
    setStatus(`Signed in as ${profile.email}`);
    hide(signinBtn);
    show(signoutBtn);
    show(fetchBtn);
    show(openDashboardBtn);
    outputEl.textContent = '';
    hide(outputEl);
  } catch (e) {
    setStatus(`Sign-in failed: ${e && e.message ? e.message : e}`);
  }
}

async function signOut() {
  setStatus('Signing out...');
  try {
    await clearStoredToken();
  } catch (e) {
    // ignore
  }
  setStatus('Signed out');
  show(signinBtn);
  hide(signoutBtn);
  hide(fetchBtn);
  hide(openDashboardBtn);
}

async function fetchEmails() {
  setStatus('Fetching emails...');
  try {
    let tokenInfo = await getStoredToken();
    if (!tokenInfo) {
      tokenInfo = await signInViaWebAuthFlow();
    }
    const data = await fetchGmailThreads(tokenInfo.accessToken);
    renderThreads(data);
    setStatus('Fetched latest threads.');
  } catch (e) {
    setStatus(`Fetch failed: ${e && e.message ? e.message : e}`);
  }
}

function renderThreads(data) {
  const threads = data.threads || [];
  window.__nextPageToken = data.nextPageToken || '';
  const html = [
    `<div style="margin-top:8px">Total: ${data.resultSizeEstimate ?? threads.length}</div>`,
    '<ul style="padding-left:18px;">',
    ...threads.map(t => {
      const link = `https://mail.google.com/mail/u/0/#inbox/${t.id}`;
      const snippet = (t.snippet || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      return `<li style="margin:6px 0"><a href="${link}" target="_blank">Open</a> — ${snippet}</li>`;
    }),
    '</ul>'
  ].join('\n');
  outputEl.innerHTML = html;
  show(outputEl);
  if (window.__nextPageToken) show(nextBtn); else hide(nextBtn);
}

signinBtn.addEventListener('click', signIn);
signoutBtn.addEventListener('click', signOut);
fetchBtn.addEventListener('click', fetchEmails);
nextBtn.addEventListener('click', fetchEmails);
openDashboardBtn.addEventListener('click', () => {
  chrome.tabs.create({ url: chrome.runtime.getURL('dashboard.html') });
});

// Initialize UI based on token validity
async function init() {
  try {
    const tokenInfo = await getStoredToken();
    if (!tokenInfo) return; // show default sign-in
    // validate
    const res = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokenInfo.accessToken}` }
    });
    if (res.ok) {
      hide(signinBtn);
      show(signoutBtn);
      show(fetchBtn);
      show(openDashboardBtn);
      setStatus('');
    } else if (res.status === 401) {
      await clearStoredToken();
    }
  } catch (_) {
    // ignore and keep sign-in visible
  }
}

document.addEventListener('DOMContentLoaded', init);


