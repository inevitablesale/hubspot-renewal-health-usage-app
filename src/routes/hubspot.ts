import { Router, Request, Response } from 'express';
import { body, param } from 'express-validator';
import { validateRequest, authenticateApiKey } from '../middleware';
import { 
  updateCompanyHealthScore, 
  ensureCustomProperties,
  getCompany,
  searchCompaniesByDomain 
} from '../services/propertyService';
import { calculateRenewalHealthScore } from '../services/scoringService';
import { getUsageEvents, calculateFeatureAdoption } from '../services/usageEventsService';
import { ApiResponse, UsageEvent } from '../types';

const router = Router();

/**
 * Helper function to get last activity timestamp from events
 */
function getLastActivityFromEvents(events: UsageEvent[]): string | null {
  if (events.length === 0) return null;
  
  const sortedEvents = events.sort((a, b) => 
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
  
  return sortedEvents[0]?.timestamp ?? null;
}

/**
 * POST /api/hubspot/setup/:portalId
 * Setup custom properties in HubSpot
 */
router.post(
  '/setup/:portalId',
  authenticateApiKey,
  (req: Request<{ portalId: string }>, res: Response<ApiResponse<null>>) => {
    const { portalId } = req.params;
    
    ensureCustomProperties(portalId)
      .then(() => {
        res.json({
          success: true,
          message: 'Custom properties created successfully'
        });
      })
      .catch((error) => {
        res.status(500).json({
          success: false,
          error: 'Setup Error',
          message: error instanceof Error ? error.message : 'Failed to create custom properties'
        });
      });
  }
);

/**
 * POST /api/hubspot/sync/:portalId/:companyId
 * Sync health score to HubSpot for a specific company
 */
router.post(
  '/sync/:portalId/:companyId',
  authenticateApiKey,
  [
    param('portalId').isString().notEmpty(),
    param('companyId').isString().notEmpty()
  ],
  validateRequest,
  (req: Request<{ portalId: string; companyId: string }>, res: Response<ApiResponse<{ score: number; riskLevel: string }>>) => {
    const { portalId, companyId } = req.params;
    
    // Calculate health score
    const healthScore = calculateRenewalHealthScore(companyId);
    const events = getUsageEvents(companyId, 30);
    const features = calculateFeatureAdoption(companyId);
    
    // Get last activity date using helper function
    const lastActivity = getLastActivityFromEvents(events);
    
    // Update HubSpot
    updateCompanyHealthScore(
      portalId,
      companyId,
      healthScore,
      events.length,
      lastActivity,
      features.length
    )
      .then(() => {
        res.json({
          success: true,
          data: {
            score: healthScore.score,
            riskLevel: healthScore.riskLevel
          },
          message: 'Health score synced to HubSpot successfully'
        });
      })
      .catch((error) => {
        res.status(500).json({
          success: false,
          error: 'Sync Error',
          message: error instanceof Error ? error.message : 'Failed to sync health score'
        });
      });
  }
);

/**
 * POST /api/hubspot/sync-batch/:portalId
 * Batch sync health scores to HubSpot
 */
router.post(
  '/sync-batch/:portalId',
  authenticateApiKey,
  [
    param('portalId').isString().notEmpty(),
    body('companyIds').isArray({ min: 1, max: 100 }).withMessage('companyIds array required (1-100 items)')
  ],
  validateRequest,
  async (req: Request<{ portalId: string }, ApiResponse<{ synced: number; failed: number }>, { companyIds: string[] }>, res: Response<ApiResponse<{ synced: number; failed: number }>>) => {
    try {
      const { portalId } = req.params;
      const { companyIds } = req.body;
      
      let synced = 0;
      let failed = 0;
      
      for (const companyId of companyIds) {
        try {
          const healthScore = calculateRenewalHealthScore(companyId);
          const events = getUsageEvents(companyId, 30);
          const features = calculateFeatureAdoption(companyId);
          
          // Use helper function for getting last activity
          const lastActivity = getLastActivityFromEvents(events);
          
          await updateCompanyHealthScore(
            portalId,
            companyId,
            healthScore,
            events.length,
            lastActivity,
            features.length
          );
          synced++;
        } catch (error) {
          console.error(`Failed to sync company ${companyId}:`, error);
          failed++;
        }
      }
      
      res.json({
        success: true,
        data: { synced, failed },
        message: `Synced ${synced} companies, ${failed} failed`
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Sync Error',
        message: error instanceof Error ? error.message : 'Failed to batch sync'
      });
    }
  }
);

/**
 * GET /api/hubspot/company/:portalId/:companyId
 * Get company details from HubSpot
 */
router.get(
  '/company/:portalId/:companyId',
  authenticateApiKey,
  [
    param('portalId').isString().notEmpty(),
    param('companyId').isString().notEmpty()
  ],
  validateRequest,
  (req: Request<{ portalId: string; companyId: string }>, res: Response) => {
    const { portalId, companyId } = req.params;
    
    getCompany(portalId, companyId)
      .then((company) => {
        res.json({
          success: true,
          data: company
        });
      })
      .catch((error) => {
        res.status(500).json({
          success: false,
          error: 'HubSpot Error',
          message: error instanceof Error ? error.message : 'Failed to get company'
        });
      });
  }
);

/**
 * GET /api/hubspot/search/:portalId
 * Search companies by domain
 */
router.get(
  '/search/:portalId',
  authenticateApiKey,
  [
    param('portalId').isString().notEmpty()
  ],
  validateRequest,
  (req: Request<{ portalId: string }, object, object, { domain?: string }>, res: Response) => {
    const { portalId } = req.params;
    const { domain } = req.query;
    
    if (!domain) {
      res.status(400).json({
        success: false,
        error: 'Validation Error',
        message: 'domain query parameter is required'
      });
      return;
    }
    
    searchCompaniesByDomain(portalId, domain)
      .then((results) => {
        res.json({
          success: true,
          data: results
        });
      })
      .catch((error) => {
        res.status(500).json({
          success: false,
          error: 'HubSpot Error',
          message: error instanceof Error ? error.message : 'Failed to search companies'
        });
      });
  }
);

export default router;
