import { Router } from 'express';
import { env } from '../../config/env';

export const authRouter = Router();

authRouter.get('/github/login', (_req, res) => {
  const authUrl = new URL('https://github.com/login/oauth/authorize');
  authUrl.searchParams.set('client_id', env.GITHUB_CLIENT_ID);
  authUrl.searchParams.set('redirect_uri', env.GITHUB_CALLBACK_URL);
  authUrl.searchParams.set('scope', 'read:user repo');

  res.redirect(authUrl.toString());
});

authRouter.get('/github/callback', async (req, res) => {
  const code = req.query.code;

  if (!code || typeof code !== 'string') {
    return res.status(400).json({ error: 'Missing authorization code' });
  }

  const response = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json'
    },
    body: JSON.stringify({
      client_id: env.GITHUB_CLIENT_ID,
      client_secret: env.GITHUB_CLIENT_SECRET,
      code,
      redirect_uri: env.GITHUB_CALLBACK_URL
    })
  });

  const data = (await response.json()) as { access_token?: string };

  if (!data.access_token) {
    return res.status(401).json({ error: 'GitHub token exchange failed' });
  }

  const frontendRedirect = new URL(env.FRONTEND_ORIGIN);
  frontendRedirect.searchParams.set('token', data.access_token);

  return res.redirect(frontendRedirect.toString());
});
