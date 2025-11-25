import { Router, Request, Response } from 'express';
import { getAuthorizationUrl, exchangeCodeForTokens, getPortalInfo, verifyConnection } from '../services/hubspotService';
import { setTokens, getTokens, deleteTokens } from '../utils/tokenStore';
import { ApiResponse } from '../types';

const router = Router();

/**
 * GET /oauth/authorize
 * Redirect to HubSpot OAuth authorization page
 */
router.get('/authorize', (_req: Request, res: Response) => {
  const authUrl = getAuthorizationUrl();
  res.redirect(authUrl);
});

/**
 * GET /oauth/callback
 * Handle OAuth callback from HubSpot
 */
router.get('/callback', async (req: Request<object, ApiResponse<{ portalId: string }>, object, { code?: string; error?: string }>, res: Response<ApiResponse<{ portalId: string }>>) => {
  try {
    const { code, error } = req.query;

    if (error) {
      res.status(400).json({
        success: false,
        error: 'OAuth Error',
        message: `Authorization failed: ${error}`
      });
      return;
    }

    if (!code) {
      res.status(400).json({
        success: false,
        error: 'OAuth Error',
        message: 'Authorization code not provided'
      });
      return;
    }

    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(code);
    
    // Get portal info
    const portalInfo = await getPortalInfo(tokens.accessToken);
    
    // Store tokens
    setTokens(portalInfo.portalId, tokens);

    res.json({
      success: true,
      data: { portalId: portalInfo.portalId },
      message: `Successfully connected to HubSpot portal ${portalInfo.portalId}`
    });
  } catch (error) {
    console.error('OAuth callback error:', error);
    res.status(500).json({
      success: false,
      error: 'OAuth Error',
      message: error instanceof Error ? error.message : 'Failed to complete OAuth flow'
    });
  }
});

/**
 * GET /oauth/status/:portalId
 * Check OAuth connection status
 */
router.get('/status/:portalId', async (req: Request<{ portalId: string }>, res: Response<ApiResponse<{ connected: boolean; portalId: string }>>) => {
  try {
    const { portalId } = req.params;
    const tokens = getTokens(portalId);

    if (!tokens) {
      res.json({
        success: true,
        data: { connected: false, portalId },
        message: 'Not connected to HubSpot'
      });
      return;
    }

    const isValid = await verifyConnection(portalId);
    
    res.json({
      success: true,
      data: { connected: isValid, portalId },
      message: isValid ? 'Connected to HubSpot' : 'Connection expired, please re-authenticate'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Server Error',
      message: error instanceof Error ? error.message : 'Failed to check connection status'
    });
  }
});

/**
 * DELETE /oauth/disconnect/:portalId
 * Disconnect from HubSpot portal
 */
router.delete('/disconnect/:portalId', (req: Request<{ portalId: string }>, res: Response<ApiResponse<null>>) => {
  try {
    const { portalId } = req.params;
    deleteTokens(portalId);

    res.json({
      success: true,
      message: `Disconnected from HubSpot portal ${portalId}`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Server Error',
      message: error instanceof Error ? error.message : 'Failed to disconnect'
    });
  }
});

export default router;
