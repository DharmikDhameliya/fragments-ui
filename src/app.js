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
  } else {
    console.log('User is not logged in');
    document.getElementById('login').style.display = 'block';
    document.getElementById('logout').style.display = 'none';
  }

  // Attach event listeners
  document.getElementById('login').onclick = () => {
    console.log('Login button clicked');
    login();
  };

  document.getElementById('logout').onclick = () => {
    logout();
  };
}

init();