/**
 * In-memory token store for OAuth tokens
 * In production, use a persistent store like Redis or a database
 */
const tokenStore: Map<string, {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}> = new Map();

export function getTokens(portalId: string) {
  return tokenStore.get(portalId);
}

export function setTokens(
  portalId: string, 
  tokens: { accessToken: string; refreshToken: string; expiresIn: number }
) {
  tokenStore.set(portalId, {
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    expiresAt: Date.now() + tokens.expiresIn * 1000
  });
}

export function deleteTokens(portalId: string) {
  tokenStore.delete(portalId);
}

export function isTokenExpired(portalId: string): boolean {
  const tokens = tokenStore.get(portalId);
  if (!tokens) return true;
  // Add 5 minute buffer for token refresh
  return tokens.expiresAt < Date.now() + 5 * 60 * 1000;
}
