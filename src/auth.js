import { UserManager } from 'oidc-client-ts';

const cognitoAuthConfig = {
  authority: `https://cognito-idp.us-east-2.amazonaws.com/${process.env.AWS_COGNITO_POOL_ID}`,
  client_id: process.env.AWS_COGNITO_CLIENT_ID,
  redirect_uri: process.env.OAUTH_SIGN_IN_REDIRECT_URL,
  response_type: 'code',
  scope: 'phone openid email',
  revokeTokenTypes: ['refresh_token'],
  automaticSilentRenew: false,
};

const userManager = new UserManager(cognitoAuthConfig);

export async function login() {
  await userManager.signinRedirect();
}

export async function logout() {
  await userManager.signoutRedirect();
}

export async function getUser() {
  return userManager.getUser();
}