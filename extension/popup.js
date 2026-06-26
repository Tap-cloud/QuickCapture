let session = null;
let currentTab = null;

const STOP_WORDS = new Set(['the','a','an','and','or','but','in','on','at','to','for','of','is','are','was','were','this','that','it','with','from','by','as','i','you','we','they','http','https','www','com']);

function extractKeywords(text) {
  const words = text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(w => w.length > 3 && !STOP_WORDS.has(w));
  const freq = {};
  words.forEach(w => freq[w] = (freq[w] || 0) + 1);
  return Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([w]) => w);
}

async function signIn(email, password) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { 'apikey': SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error_description || data.msg || 'Sign in failed');
  return data;
}

async function saveCapture(content, tags) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/captures`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal',
    },
    body: JSON.stringify({ content, tags, user_id: session.user.id }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to save');
  }
}

function showLoginView() {
  document.getElementById('login-view').style.display = 'flex';
  document.getElementById('save-view').style.display = 'none';
}

function showSaveView() {
  document.getElementById('login-view').style.display = 'none';
  document.getElementById('save-view').style.display = 'flex';
  if (currentTab) {
    document.getElementById('page-title').textContent = currentTab.title || '';
    document.getElementById('page-url').textContent = currentTab.url || '';
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  // Get current tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  currentTab = tab;

  // Check stored session
  const stored = await chrome.storage.local.get(['qc_session']);
  if (stored.qc_session) {
    session = stored.qc_session;
    showSaveView();
  } else {
    showLoginView();
  }

  // Sign in button
  document.getElementById('signin-btn').addEventListener('click', async () => {
    const username = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const errorEl = document.getElementById('auth-error');
    const btn = document.getElementById('signin-btn');

    if (!username || !password) { errorEl.textContent = 'Enter your username and password.'; return; }

    btn.disabled = true;
    btn.textContent = 'Signing in...';
    errorEl.textContent = '';

    const email = username.toLowerCase() + '@quickcapture.app';

    try {
      session = await signIn(email, password);
      await chrome.storage.local.set({ qc_session: session });
      showSaveView();
    } catch (e) {
      errorEl.textContent = e.message;
      btn.disabled = false;
      btn.textContent = 'Sign In';
    }
  });

  // Sign out button
  document.getElementById('signout-btn').addEventListener('click', async () => {
    session = null;
    await chrome.storage.local.remove('qc_session');
    showLoginView();
  });

  // Save button
  document.getElementById('save-btn').addEventListener('click', async () => {
    const note = document.getElementById('note').value.trim();
    const statusEl = document.getElementById('save-status');
    const btn = document.getElementById('save-btn');

    const content = [
      currentTab?.title,
      currentTab?.url,
      note,
    ].filter(Boolean).join('\n');

    const tags = extractKeywords(content);

    btn.disabled = true;
    btn.textContent = 'Saving...';
    statusEl.textContent = '';

    try {
      await saveCapture(content, tags);
      statusEl.textContent = '✓ Saved!';
      document.getElementById('note').value = '';
      setTimeout(() => window.close(), 1000);
    } catch (e) {
      if (e.message.includes('401') || e.message.includes('JWT')) {
        session = null;
        await chrome.storage.local.remove('qc_session');
        showLoginView();
      } else {
        statusEl.style.color = '#E53E3E';
        statusEl.textContent = 'Error: ' + e.message;
      }
    } finally {
      btn.disabled = false;
      btn.textContent = '✨ Save to QuickCapture';
    }
  });

  // Allow pressing Enter in password field to submit
  document.getElementById('password').addEventListener('keydown', e => {
    if (e.key === 'Enter') document.getElementById('signin-btn').click();
  });
});
