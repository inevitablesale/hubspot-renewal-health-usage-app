import { Router, Request, Response } from 'express';
import { validateRequest, authenticateApiKey } from '../middleware';
import { calculateMLUsageTrend, batchCalculateMLTrends } from '../services/mlTrendService';
import { 
  calculateOnboardingHealthScore, 
  batchCalculateOnboardingScores,
  setOnboardingStartDate 
} from '../services/onboardingService';
import { 
  calculateExpansionPrediction, 
  batchCalculateExpansionPredictions,
  setSeatData 
} from '../services/expansionService';
import { calculateRenewalHealthScore } from '../services/scoringService';
import { query, body } from 'express-validator';
import { 
  ApiResponse, 
  MLUsageTrend, 
  OnboardingHealthScore, 
  ExpansionPrediction,
  CustomerIntelligenceSuite 
} from '../types';

const router = Router();

/**
 * GET /api/intelligence/ml-trend/:companyId
 * Get ML-based usage trend analysis for a company
 */
router.get(
  '/ml-trend/:companyId',
  authenticateApiKey,
  (req: Request<{ companyId: string }>, res: Response<ApiResponse<MLUsageTrend>>) => {
    try {
      const { companyId } = req.params;
      const trend = calculateMLUsageTrend(companyId);

      res.json({
        success: true,
        data: trend,
        message: `ML trend analysis calculated for company ${companyId}`
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Server Error',
        message: error instanceof Error ? error.message : 'Failed to calculate ML trend'
      });
    }
  }
);

/**
 * GET /api/intelligence/ml-trend
 * Get ML trends for multiple companies
 */
router.get(
  '/ml-trend',
  authenticateApiKey,
  [
    query('companyIds').isString().notEmpty().withMessage('companyIds query parameter is required')
  ],
  validateRequest,
  (req: Request<object, ApiResponse<MLUsageTrend[]>, object, { companyIds: string }>, res: Response<ApiResponse<MLUsageTrend[]>>) => {
    try {
      const companyIds = req.query.companyIds.split(',').map(id => id.trim());
      
      if (companyIds.length > 50) {
        res.status(400).json({
          success: false,
          error: 'Validation Error',
          message: 'Maximum 50 company IDs allowed per request'
        });
        return;
      }

      const trends = batchCalculateMLTrends(companyIds);

      res.json({
        success: true,
        data: trends,
        message: `Calculated ML trends for ${trends.length} companies`
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Server Error',
        message: error instanceof Error ? error.message : 'Failed to calculate ML trends'
      });
    }
  }
);

/**
 * GET /api/intelligence/onboarding/:companyId
 * Get onboarding health score for a company
 */
router.get(
  '/onboarding/:companyId',
  authenticateApiKey,
  (req: Request<{ companyId: string }, object, object, { startDate?: string }>, res: Response<ApiResponse<OnboardingHealthScore>>) => {
    try {
      const { companyId } = req.params;
      const { startDate } = req.query;
      const score = calculateOnboardingHealthScore(companyId, startDate);

      res.json({
        success: true,
        data: score,
        message: `Onboarding health score calculated for company ${companyId}`
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Server Error',
        message: error instanceof Error ? error.message : 'Failed to calculate onboarding score'
      });
    }
  }
);

/**
 * POST /api/intelligence/onboarding/:companyId/start-date
 * Set the onboarding start date for a company
 */
router.post(
  '/onboarding/:companyId/start-date',
  authenticateApiKey,
  [
    body('startDate').isISO8601().withMessage('startDate must be a valid ISO 8601 date')
  ],
  validateRequest,
  (req: Request<{ companyId: string }, ApiResponse<{ companyId: string; startDate: string }>, { startDate: string }>, res: Response<ApiResponse<{ companyId: string; startDate: string }>>) => {
    try {
      const { companyId } = req.params;
      const { startDate } = req.body;
      
      setOnboardingStartDate(companyId, startDate);

      res.json({
        success: true,
        data: { companyId, startDate },
        message: `Onboarding start date set for company ${companyId}`
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Server Error',
        message: error instanceof Error ? error.message : 'Failed to set onboarding start date'
      });
    }
  }
);

/**
 * GET /api/intelligence/onboarding
 * Get onboarding scores for multiple companies
 */
router.get(
  '/onboarding',
  authenticateApiKey,
  [
    query('companyIds').isString().notEmpty().withMessage('companyIds query parameter is required')
  ],
  validateRequest,
  (req: Request<object, ApiResponse<OnboardingHealthScore[]>, object, { companyIds: string }>, res: Response<ApiResponse<OnboardingHealthScore[]>>) => {
    try {
      const companyIds = req.query.companyIds.split(',').map(id => id.trim());
      
      if (companyIds.length > 50) {
        res.status(400).json({
          success: false,
          error: 'Validation Error',
          message: 'Maximum 50 company IDs allowed per request'
        });
        return;
      }

      const scores = batchCalculateOnboardingScores(companyIds);

      res.json({
        success: true,
        data: scores,
        message: `Calculated onboarding scores for ${scores.length} companies`
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Server Error',
        message: error instanceof Error ? error.message : 'Failed to calculate onboarding scores'
      });
    }
  }
);

/**
 * GET /api/intelligence/expansion/:companyId
 * Get expansion prediction for a company
 */
router.get(
  '/expansion/:companyId',
  authenticateApiKey,
  (req: Request<{ companyId: string }>, res: Response<ApiResponse<ExpansionPrediction>>) => {
    try {
      const { companyId } = req.params;
      const prediction = calculateExpansionPrediction(companyId);

      res.json({
        success: true,
        data: prediction,
        message: `Expansion prediction calculated for company ${companyId}`
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Server Error',
        message: error instanceof Error ? error.message : 'Failed to calculate expansion prediction'
      });
    }
  }
);

/**
 * POST /api/intelligence/expansion/:companyId/seats
 * Set seat licensing data for a company
 */
router.post(
  '/expansion/:companyId/seats',
  authenticateApiKey,
  [
    body('licensedSeats').isInt({ min: 1 }).withMessage('licensedSeats must be a positive integer')
  ],
  validateRequest,
  (req: Request<{ companyId: string }, ApiResponse<{ companyId: string; licensedSeats: number }>, { licensedSeats: number; metadata?: Record<string, unknown> }>, res: Response<ApiResponse<{ companyId: string; licensedSeats: number }>>) => {
    try {
      const { companyId } = req.params;
      const { licensedSeats, metadata } = req.body;
      
      setSeatData(companyId, licensedSeats, metadata);

      res.json({
        success: true,
        data: { companyId, licensedSeats },
        message: `Seat data set for company ${companyId}`
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Server Error',
        message: error instanceof Error ? error.message : 'Failed to set seat data'
      });
    }
  }
);

/**
 * GET /api/intelligence/expansion
 * Get expansion predictions for multiple companies
 */
router.get(
  '/expansion',
  authenticateApiKey,
  [
    query('companyIds').isString().notEmpty().withMessage('companyIds query parameter is required')
  ],
  validateRequest,
  (req: Request<object, ApiResponse<ExpansionPrediction[]>, object, { companyIds: string }>, res: Response<ApiResponse<ExpansionPrediction[]>>) => {
    try {
      const companyIds = req.query.companyIds.split(',').map(id => id.trim());
      
      if (companyIds.length > 50) {
        res.status(400).json({
          success: false,
          error: 'Validation Error',
          message: 'Maximum 50 company IDs allowed per request'
        });
        return;
      }

      const predictions = batchCalculateExpansionPredictions(companyIds);

      res.json({
        success: true,
        data: predictions,
        message: `Calculated expansion predictions for ${predictions.length} companies`
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Server Error',
        message: error instanceof Error ? error.message : 'Failed to calculate expansion predictions'
      });
    }
  }
);

/**
 * GET /api/intelligence/suite/:companyId
 * Get complete customer intelligence suite for a company
 */
router.get(
  '/suite/:companyId',
  authenticateApiKey,
  (req: Request<{ companyId: string }>, res: Response<ApiResponse<CustomerIntelligenceSuite>>) => {
    try {
      const { companyId } = req.params;
      
      const renewalHealth = calculateRenewalHealthScore(companyId);
      const mlTrend = calculateMLUsageTrend(companyId);
      const onboardingHealth = calculateOnboardingHealthScore(companyId);
      const expansionPrediction = calculateExpansionPrediction(companyId);

      const suite: CustomerIntelligenceSuite = {
        companyId,
        renewalHealth,
        mlTrend,
        onboardingHealth,
        expansionPrediction,
        calculatedAt: new Date().toISOString()
      };

      res.json({
        success: true,
        data: suite,
        message: `Customer intelligence suite calculated for company ${companyId}`
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Server Error',
        message: error instanceof Error ? error.message : 'Failed to calculate intelligence suite'
      });
    }
  }
);

export default router;
