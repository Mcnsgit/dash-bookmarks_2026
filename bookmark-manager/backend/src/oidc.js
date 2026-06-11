// OIDC helper: discovery + client init + sign-in / callback handling.
// Works with any OIDC-compliant provider (Google, Authentik, Keycloak, Auth0, Zitadel, etc.)
import { Issuer, generators } from 'openid-client';

const cfg = () => ({
  enabled:        process.env.OIDC_ENABLED === 'true',
  issuerUrl:      process.env.OIDC_ISSUER_URL || '',
  clientId:       process.env.OIDC_CLIENT_ID || '',
  clientSecret:   process.env.OIDC_CLIENT_SECRET || '',
  redirectUri:    process.env.OIDC_REDIRECT_URI || '',
  scopes:         process.env.OIDC_SCOPES || 'openid email profile',
  providerName:   process.env.OIDC_PROVIDER_NAME || 'SSO',
  allowedEmails:  (process.env.OIDC_ALLOWED_EMAILS || '')
                    .split(',').map((s) => s.trim().toLowerCase()).filter(Boolean),
});

let client = null;
let initPromise = null;

export function oidcEnabled() {
  const c = cfg();
  return !!(c.enabled && c.issuerUrl && c.clientId && c.clientSecret && c.redirectUri);
}

export function oidcProviderName() {
  return cfg().providerName;
}

export function isEmailAllowed(email) {
  const list = cfg().allowedEmails;
  if (list.length === 0) return true;     // no allow-list => any email allowed
  return list.includes(String(email || '').toLowerCase());
}

export async function getClient() {
  if (!oidcEnabled()) throw new Error('OIDC is not enabled');
  if (client) return client;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const c = cfg();
    const issuer = await Issuer.discover(c.issuerUrl);
    client = new issuer.Client({
      client_id: c.clientId,
      client_secret: c.clientSecret,
      redirect_uris: [c.redirectUri],
      response_types: ['code'],
    });
    console.log('[oidc] discovered', issuer.metadata.issuer);
    return client;
  })().catch((e) => {
    initPromise = null;        // allow retry
    throw e;
  });
  return initPromise;
}

// In-memory state store for the OIDC flow (state -> { code_verifier, nonce, expires_at })
const states = new Map();
const STATE_TTL_MS = 10 * 60 * 1000;

export function newAuthRequest() {
  const state         = generators.state();
  const nonce         = generators.nonce();
  const code_verifier = generators.codeVerifier();
  states.set(state, { nonce, code_verifier, expires_at: Date.now() + STATE_TTL_MS });
  // GC
  for (const [k, v] of states) if (v.expires_at < Date.now()) states.delete(k);
  return { state, nonce, code_verifier };
}

export function consumeState(state) {
  const entry = states.get(state);
  if (!entry) return null;
  states.delete(state);
  if (entry.expires_at < Date.now()) return null;
  return entry;
}

export function authUrl() {
  if (!oidcEnabled()) throw new Error('OIDC is not enabled');
  if (!client) throw new Error('OIDC client not initialised');
  const { state, nonce, code_verifier } = newAuthRequest();
  const code_challenge = generators.codeChallenge(code_verifier);
  return client.authorizationUrl({
    scope: cfg().scopes,
    state,
    nonce,
    code_challenge,
    code_challenge_method: 'S256',
  });
}

export async function buildAuthorizationUrl() {
  await getClient();
  return authUrl();
}

export async function exchangeCallback(query) {
  await getClient();
  const state = query.state;
  const entry = consumeState(state);
  if (!entry) throw new Error('Invalid or expired OIDC state');
  const params = client.callbackParams({ query });
  const tokenSet = await client.callback(cfg().redirectUri, params, {
    state, nonce: entry.nonce, code_verifier: entry.code_verifier,
  });
  const claims = tokenSet.claims();
  return {
    sub:    claims.sub,
    email:  (claims.email || '').toLowerCase(),
    name:   claims.name || claims.preferred_username || null,
    issuer: claims.iss,
  };
}
