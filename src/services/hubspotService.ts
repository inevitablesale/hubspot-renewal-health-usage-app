import { Client } from '@hubspot/api-client';
import axios from 'axios';
import { getTokens, setTokens, isTokenExpired } from '../utils/tokenStore';
import { OAuthTokens } from '../types';

const HUBSPOT_CLIENT_ID = process.env.HUBSPOT_CLIENT_ID || '';
const HUBSPOT_CLIENT_SECRET = process.env.HUBSPOT_CLIENT_SECRET || '';
const HUBSPOT_REDIRECT_URI = process.env.HUBSPOT_REDIRECT_URI || 'http://localhost:3000/oauth/callback';

// Required scopes for the app
const SCOPES = [
  'crm.objects.companies.read',
  'crm.objects.companies.write',
  'timeline',
  'crm.schemas.custom.read'
];

/**
 * Generate the OAuth authorization URL
 */
export function getAuthorizationUrl(): string {
  const scopeString = encodeURIComponent(SCOPES.join(' '));
  return `https://app.hubspot.com/oauth/authorize?client_id=${HUBSPOT_CLIENT_ID}&redirect_uri=${encodeURIComponent(HUBSPOT_REDIRECT_URI)}&scope=${scopeString}`;
}

/**
 * Exchange authorization code for access tokens
 */
export async function exchangeCodeForTokens(code: string): Promise<OAuthTokens> {
  const response = await axios.post(
    'https://api.hubapi.com/oauth/v1/token',
    new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: HUBSPOT_CLIENT_ID,
      client_secret: HUBSPOT_CLIENT_SECRET,
      redirect_uri: HUBSPOT_REDIRECT_URI,
      code
    }),
    {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    }
  );

  const tokens: OAuthTokens = {
    accessToken: response.data.access_token,
    refreshToken: response.data.refresh_token,
    expiresIn: response.data.expires_in,
    tokenType: response.data.token_type,
    expiresAt: Date.now() + response.data.expires_in * 1000
  };

  return tokens;
}

/**
 * Refresh access token using refresh token
 */
export async function refreshAccessToken(refreshToken: string): Promise<OAuthTokens> {
  const response = await axios.post(
    'https://api.hubapi.com/oauth/v1/token',
    new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: HUBSPOT_CLIENT_ID,
      client_secret: HUBSPOT_CLIENT_SECRET,
      refresh_token: refreshToken
    }),
    {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    }
  );

  return {
    accessToken: response.data.access_token,
    refreshToken: response.data.refresh_token,
    expiresIn: response.data.expires_in,
    tokenType: response.data.token_type,
    expiresAt: Date.now() + response.data.expires_in * 1000
  };
}

/**
 * Get HubSpot API client for a portal
 */
export async function getHubSpotClient(portalId: string): Promise<Client> {
  const tokens = getTokens(portalId);
  
  if (!tokens) {
    throw new Error(`No tokens found for portal ${portalId}. Please re-authenticate.`);
  }

  // Check if token needs refresh
  if (isTokenExpired(portalId)) {
    const newTokens = await refreshAccessToken(tokens.refreshToken);
    setTokens(portalId, newTokens);
    return new Client({ accessToken: newTokens.accessToken });
  }

  return new Client({ accessToken: tokens.accessToken });
}

/**
 * Get portal info from access token
 */
export async function getPortalInfo(accessToken: string): Promise<{ portalId: string; hubDomain: string }> {
  const response = await axios.get('https://api.hubapi.com/oauth/v1/access-tokens/' + accessToken);
  return {
    portalId: response.data.hub_id.toString(),
    hubDomain: response.data.hub_domain
  };
}

/**
 * Verify the OAuth connection is valid
 */
export async function verifyConnection(portalId: string): Promise<boolean> {
  try {
    const client = await getHubSpotClient(portalId);
    await client.crm.companies.basicApi.getPage(1);
    return true;
  } catch {
    return false;
  }
}
