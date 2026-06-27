let session = null;
let currentTab = null;
let pageMeta = {};

// ── Helpers ───────────────────────────────────────────────

function getDomain(url) {
  try { return new URL(url).hostname.replace('www.', ''); } catch { return ''; }
}

function extractKeywords(text) {
  const STOP = new Set(['the','a','an','and','or','but','in','on','at','to','for','of','is','are','was','were','this','that','it','with','from','by','as','i','you','we','they','http','https','www','com','not','be','have','has','had','do','does','did','will','would','could','should']);
  const words = text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(w => w.length > 3 && !STOP.has(w));
  const freq = {};
  words.forEach(w => freq[w] = (freq[w] || 0) + 1);
  return Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([w]) => w);
}

// ── Page data extraction ──────────────────────────────────

async function fetchPageMeta(tab) {
  const domain = getDomain(tab.url);
  let thumbnail = '';
  let description = '';
  let siteName = '';
  let bodyText = '';

  // Try noembed first — gives high-quality thumbnails for YouTube, Vimeo, Twitter, etc.
  try {
    const res = await fetch(`https://noembed.com/embed?url=${encodeURIComponent(tab.url)}`);
    if (res.ok) {
      const data = await res.json();
      if (data.thumbnail_url && !data.error) {
        thumbnail = data.thumbnail_url;
      }
      if (data.provider_name) siteName = data.provider_name;
    }
  } catch {}

  // Fall back to scripting to get og: tags from the page
  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        const get = (sel) => document.querySelector(sel)?.content || '';
        return {
          ogDescription: get('meta[property="og:description"]') || get('meta[name="description"]'),
          ogSiteName: get('meta[property="og:site_name"]'),
          ogImage: get('meta[property="og:image"]') || get('meta[name="twitter:image"]'),
          bodyText: (document.body?.innerText || '').slice(0, 1200),
        };
      },
    });
    const extra = results[0]?.result || {};
    if (!thumbnail) thumbnail = extra.ogImage || '';
    if (!description) description = extra.ogDescription || '';
    if (!siteName) siteName = extra.ogSiteName || '';
    bodyText = extra.bodyText || '';
  } catch {}

  return {
    title: tab.title || '',
    url: tab.url || '',
    domain,
    favicon: tab.favIconUrl || '',
    thumbnail,
    description,
    siteName: siteName || domain,
    bodyText,
  };
}

// ── AI processing ─────────────────────────────────────────

async function generateAIMeta(meta, note) {
  const hasClaude = typeof CLAUDE_API_KEY !== 'undefined' && CLAUDE_API_KEY?.trim();

  if (!hasClaude) {
    const tagSource = [meta.title, meta.description, note].filter(Boolean).join(' ');
    return {
      summary: meta.description || '',
      category: '',
      tags: extractKeywords(tagSource),
    };
  }

  try {
    const prompt = `Analyze this saved web page and return a JSON object with exactly these fields:
- "summary": 1-2 sentence description of what this content is about
- "category": one word (e.g. recipe, video, article, tutorial, news, product, tool)
- "tags": array of 4-8 lowercase tags someone would search to find this later

Page info:
Title: ${meta.title}
URL: ${meta.url}
Site: ${meta.siteName}
Description: ${meta.description}
User note: ${note || 'none'}
Page text: ${meta.bodyText.slice(0, 600)}

Return ONLY valid JSON, no explanation.`;

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5',
        max_tokens: 300,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!res.ok) throw new Error('AI request failed');

    const data = await res.json();
    const text = data?.content?.[0]?.text ?? '';
    const match = text.match(/\{[\s\S]*?\}/);
    if (match) {
      const parsed = JSON.parse(match[0]);
      return {
        summary: parsed.summary || meta.description || '',
        category: parsed.category || '',
        tags: Array.isArray(parsed.tags) ? parsed.tags.map(t => t.toLowerCase().trim()) : extractKeywords(meta.title),
      };
    }
  } catch {}

  // Fallback
  return {
    summary: meta.description || '',
    category: '',
    tags: extractKeywords([meta.title, meta.description, note].filter(Boolean).join(' ')),
  };
}

// ── Supabase ──────────────────────────────────────────────

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

async function saveToSupabase({ content, tags, summary, category, url, title, thumbnailUrl, description, siteName }) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/captures`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal',
    },
    body: JSON.stringify({
      content,
      tags,
      user_id: session.user.id,
      url: url || null,
      title: title || null,
      thumbnail_url: thumbnailUrl || null,
      description: description || null,
      summary: summary || null,
      category: category || null,
      site_name: siteName || null,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to save');
  }
}

// ── Views ─────────────────────────────────────────────────

function showView(id) {
  ['login-view', 'save-view', 'confirm-view'].forEach(v => {
    document.getElementById(v).style.display = v === id ? 'flex' : 'none';
  });
}

function populateSaveView() {
  document.getElementById('page-title').textContent = pageMeta.title;
  document.getElementById('page-domain').textContent = pageMeta.siteName || pageMeta.domain;

  const thumb = document.getElementById('thumbnail');
  if (pageMeta.thumbnail) {
    thumb.src = pageMeta.thumbnail;
    thumb.style.display = 'block';
  } else {
    thumb.style.display = 'none';
  }

  const fav = document.getElementById('favicon');
  if (pageMeta.favicon) {
    fav.src = pageMeta.favicon;
    fav.style.display = 'block';
  } else {
    fav.style.display = 'none';
  }
}

// ── Init ──────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  currentTab = tab;

  const stored = await chrome.storage.local.get(['qc_session']);
  if (stored.qc_session) {
    session = stored.qc_session;
    pageMeta = await fetchPageMeta(tab);
    populateSaveView();
    showView('save-view');
  } else {
    showView('login-view');
  }

  // Sign in
  document.getElementById('signin-btn').addEventListener('click', async () => {
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const errorEl = document.getElementById('auth-error');
    const btn = document.getElementById('signin-btn');

    if (!email || !password) { errorEl.textContent = 'Enter your email and password.'; return; }

    btn.disabled = true;
    btn.textContent = 'Signing in...';
    errorEl.textContent = '';

    try {
      session = await signIn(email, password);
      await chrome.storage.local.set({ qc_session: session });
      pageMeta = await fetchPageMeta(currentTab);
      populateSaveView();
      showView('save-view');
    } catch (e) {
      errorEl.textContent = e.message;
      btn.disabled = false;
      btn.textContent = 'Sign In';
    }
  });

  // Sign out
  document.getElementById('signout-btn').addEventListener('click', async () => {
    session = null;
    await chrome.storage.local.remove('qc_session');
    showView('login-view');
  });

  // Save
  document.getElementById('save-btn').addEventListener('click', async () => {
    const note = document.getElementById('note').value.trim();
    const errorEl = document.getElementById('save-error');
    const btn = document.getElementById('save-btn');

    btn.disabled = true;
    btn.textContent = '✦ Organizing...';
    errorEl.textContent = '';

    try {
      // AI generates summary, category, tags
      const aiMeta = await generateAIMeta(pageMeta, note);

      // Content stored is the user's note or the AI summary
      const content = note || aiMeta.summary || pageMeta.title;

      await saveToSupabase({
        content,
        tags: aiMeta.tags,
        summary: aiMeta.summary,
        category: aiMeta.category,
        url: pageMeta.url,
        title: pageMeta.title,
        thumbnailUrl: pageMeta.thumbnail,
        description: pageMeta.description,
        siteName: pageMeta.siteName,
      });

      showView('confirm-view');
      setTimeout(() => window.close(), 1800);
    } catch (e) {
      if (e.message.includes('401') || e.message.includes('JWT')) {
        session = null;
        await chrome.storage.local.remove('qc_session');
        showView('login-view');
      } else {
        errorEl.textContent = e.message;
        btn.disabled = false;
        btn.textContent = '✨ Save to Later';
      }
    }
  });

  document.getElementById('password').addEventListener('keydown', e => {
    if (e.key === 'Enter') document.getElementById('signin-btn').click();
  });

  document.getElementById('note')?.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); document.getElementById('save-btn').click(); }
  });
});
