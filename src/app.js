import { getUser, login, logout } from './auth';

async function init() {
  // Check if we're coming back from Cognito (callback with ?code=...)
  const params = new URLSearchParams(window.location.search);
  if (params.has('code')) {
    console.log('Handling Cognito callback...');
    // Let oidc-client-ts process the callback
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
      console.log('Callback handled successfully');
      // Remove the ?code=... from URL
      window.history.replaceState({}, document.title, '/');
    } catch (err) {
      console.error('Callback error:', err);
    }
  }

  // Now check if user is logged in
  const user = await getUser();
  window.user = user;

  if (user) {
    console.log('User is logged in', user);
    document.getElementById('login').style.display = 'none';
    document.getElementById('logout').style.display = 'block';
    document.getElementById('fragmentControls').style.display = 'block';
  } else {
    console.log('User is not logged in');
    document.getElementById('login').style.display = 'block';
    document.getElementById('logout').style.display = 'none';
    document.getElementById('fragmentControls').style.display = 'none';
  }

  // Attach event listeners
  document.getElementById('login').onclick = () => {
    console.log('Login button clicked');
    login();
  };

  document.getElementById('logout').onclick = () => {
    logout();
  };

  document.getElementById('createFragment').onclick = async () => {
    const text = document.getElementById('fragmentText').value;
    if (!text) {
      alert('Please enter some text');
      return;
    }
    await createFragment(text);
  };

  document.getElementById('listFragments').onclick = async () => {
    await listFragments();
  };
}

// Create a new text fragment
async function createFragment(text) {
  const user = await getUser();
  if (!user) {
    alert('You must be logged in');
    return;
  }

  try {
    const res = await fetch(`${process.env.API_URL}/v1/fragments`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${user.id_token}`,
        'Content-Type': 'text/plain',
      },
      body: text,
    });

    if (!res.ok) {
      throw new Error(`${res.status} ${res.statusText}`);
    }

    const data = await res.json();
    console.log('Created fragment:', data);
    
    document.getElementById('output').innerHTML = `
      <h3>Fragment Created!</h3>
      <pre>${JSON.stringify(data, null, 2)}</pre>
    `;
  } catch (err) {
    console.error('Error creating fragment:', err);
    document.getElementById('output').innerHTML = `<p style="color: red;">Error: ${err.message}</p>`;
  }
}

// List all fragments for the current user
async function listFragments() {
  const user = await getUser();
  if (!user) {
    alert('You must be logged in');
    return;
  }

  try {
    const res = await fetch(`${process.env.API_URL}/v1/fragments`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${user.id_token}`,
      },
    });

    if (!res.ok) {
      throw new Error(`${res.status} ${res.statusText}`);
    }

    const data = await res.json();
    console.log('Fragments:', data);
    
    document.getElementById('output').innerHTML = `
      <h3>Your Fragments</h3>
      <pre>${JSON.stringify(data, null, 2)}</pre>
    `;
  } catch (err) {
    console.error('Error listing fragments:', err);
    document.getElementById('output').innerHTML = `<p style="color: red;">Error: ${err.message}</p>`;
  }
}

init();