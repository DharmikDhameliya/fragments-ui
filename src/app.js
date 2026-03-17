import { getUser, login, logout } from './auth';

const API_URL = process.env.API_URL || 'http://localhost:8080';

// Helper: get auth headers
function authHeaders(user) {
  return { Authorization: `Bearer ${user.id_token}` };
}

// Helper: display output
function showOutput(html) {
  document.getElementById('output').innerHTML = html;
}

async function init() {
  // Handle Cognito callback
  const params = new URLSearchParams(window.location.search);
  if (params.has('code')) {
    console.log('Handling Cognito callback...');
    const { UserManager } = await import('oidc-client-ts');
    const userManager = new UserManager({
      authority: `https://cognito-idp.us-east-2.amazonaws.com/${process.env.AWS_COGNITO_POOL_ID}`,
      client_id: process.env.AWS_COGNITO_CLIENT_ID,
      redirect_uri: process.env.OAUTH_SIGN_IN_REDIRECT_URL,
      response_type: 'code',
      scope: 'phone openid email',
    });
    try {
      await userManager.signinRedirectCallback();
      window.history.replaceState({}, document.title, '/');
    } catch (err) {
      console.error('Callback error:', err);
    }
  }

  const user = await getUser();
  window.user = user;

  if (user) {
    console.log('User is logged in', user);
    document.getElementById('login').style.display = 'none';
    document.getElementById('logout').style.display = 'block';
    document.getElementById('fragmentControls').style.display = 'block';
    // Auto-load fragments on login
    await listFragments();
  } else {
    console.log('User is not logged in');
    document.getElementById('login').style.display = 'block';
    document.getElementById('logout').style.display = 'none';
    document.getElementById('fragmentControls').style.display = 'none';
  }

  // Auth buttons
  document.getElementById('login').onclick = () => login();
  document.getElementById('logout').onclick = () => logout();

  // Create fragment
  document.getElementById('createFragment').onclick = async () => {
    const text = document.getElementById('fragmentText').value.trim();
    const type = document.getElementById('fragmentType').value;
    if (!text) return alert('Please enter some content');
    await createFragment(text, type);
  };

  // List fragments
  document.getElementById('listFragments').onclick = async () => {
    await listFragments();
  };

  // Get fragment by ID
  document.getElementById('getFragment').onclick = async () => {
    const id = document.getElementById('fragmentId').value.trim();
    const ext = document.getElementById('fragmentExt').value.trim();
    if (!id) return alert('Please enter a fragment ID');
    await getFragment(id, ext);
  };

  // Update fragment
  document.getElementById('updateFragment').onclick = async () => {
    const id = document.getElementById('fragmentId').value.trim();
    const text = document.getElementById('fragmentText').value.trim();
    const type = document.getElementById('fragmentType').value;
    if (!id || !text) return alert('Please enter a fragment ID and new content');
    await updateFragment(id, text, type);
  };

  // Delete fragment
  document.getElementById('deleteFragment').onclick = async () => {
    const id = document.getElementById('fragmentId').value.trim();
    if (!id) return alert('Please enter a fragment ID');
    if (!confirm(`Delete fragment ${id}?`)) return;
    await deleteFragment(id);
  };
}

// ── API Functions ──────────────────────────────────────────────

async function createFragment(text, type = 'text/plain') {
  const user = await getUser();
  if (!user) return alert('You must be logged in');

  try {
    const res = await fetch(`${API_URL}/v1/fragments`, {
      method: 'POST',
      headers: { ...authHeaders(user), 'Content-Type': type },
      body: text,
    });

    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);

    const data = await res.json();
    console.log('Created fragment:', data);
    showOutput(`<h3>✅ Fragment Created</h3><pre>${JSON.stringify(data, null, 2)}</pre>`);
    await listFragments();
  } catch (err) {
    console.error('Error creating fragment:', err);
    showOutput(`<p style="color:red;">❌ Error: ${err.message}</p>`);
  }
}

async function listFragments(expand = false) {
  const user = await getUser();
  if (!user) return;

  try {
    const url = `${API_URL}/v1/fragments${expand ? '?expand=1' : ''}`;
    const res = await fetch(url, { headers: authHeaders(user) });

    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);

    const data = await res.json();
    console.log('Fragments:', data);

    const fragments = data.fragments || [];
    if (fragments.length === 0) {
      document.getElementById('fragmentList').innerHTML = '<li>No fragments yet.</li>';
      return;
    }

    document.getElementById('fragmentList').innerHTML = fragments
      .map((f) => {
        const id = typeof f === 'string' ? f : f.id;
        const meta = typeof f === 'object' ? ` — ${f.type} (${f.size} bytes)` : '';
        return `<li><code>${id}</code>${meta} 
          <button onclick="copyId('${id}')">Copy ID</button>
        </li>`;
      })
      .join('');
  } catch (err) {
    console.error('Error listing fragments:', err);
    showOutput(`<p style="color:red;">❌ Error: ${err.message}</p>`);
  }
}

async function getFragment(id, ext = '') {
  const user = await getUser();
  if (!user) return alert('You must be logged in');

  try {
    const suffix = ext ? `.${ext.replace(/^\./, '')}` : '';
    const res = await fetch(`${API_URL}/v1/fragments/${id}${suffix}`, {
      headers: authHeaders(user),
    });

    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);

    const contentType = res.headers.get('Content-Type') || '';
    let body;

    if (contentType.includes('text/html')) {
      body = `<div style="border:1px solid #ccc;padding:8px;">${await res.text()}</div>`;
    } else {
      body = `<pre>${await res.text()}</pre>`;
    }

    showOutput(`<h3>📄 Fragment: <code>${id}${suffix}</code></h3>
      <p><strong>Content-Type:</strong> ${contentType}</p>
      ${body}`);
  } catch (err) {
    console.error('Error getting fragment:', err);
    showOutput(`<p style="color:red;">❌ Error: ${err.message}</p>`);
  }
}

async function updateFragment(id, text, type = 'text/plain') {
  const user = await getUser();
  if (!user) return alert('You must be logged in');

  try {
    const res = await fetch(`${API_URL}/v1/fragments/${id}`, {
      method: 'PUT',
      headers: { ...authHeaders(user), 'Content-Type': type },
      body: text,
    });

    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);

    const data = await res.json();
    console.log('Updated fragment:', data);
    showOutput(`<h3>✅ Fragment Updated</h3><pre>${JSON.stringify(data, null, 2)}</pre>`);
    await listFragments();
  } catch (err) {
    console.error('Error updating fragment:', err);
    showOutput(`<p style="color:red;">❌ Error: ${err.message}</p>`);
  }
}

async function deleteFragment(id) {
  const user = await getUser();
  if (!user) return alert('You must be logged in');

  try {
    const res = await fetch(`${API_URL}/v1/fragments/${id}`, {
      method: 'DELETE',
      headers: authHeaders(user),
    });

    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);

    console.log('Deleted fragment:', id);
    showOutput(`<h3>🗑️ Fragment Deleted</h3><p><code>${id}</code> has been removed.</p>`);
    await listFragments();
  } catch (err) {
    console.error('Error deleting fragment:', err);
    showOutput(`<p style="color:red;">❌ Error: ${err.message}</p>`);
  }
}

// Copy fragment ID to the ID input field
window.copyId = (id) => {
  document.getElementById('fragmentId').value = id;
};

init();