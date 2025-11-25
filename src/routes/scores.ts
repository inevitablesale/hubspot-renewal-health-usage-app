import { Router, Request, Response } from 'express';
import { query } from 'express-validator';
import { validateRequest, authenticateApiKey } from '../middleware';
import { calculateRenewalHealthScore, batchCalculateScores } from '../services/scoringService';
import { ApiResponse, RenewalHealthScore } from '../types';

const router = Router();

/**
 * GET /api/scores/:companyId
 * Get the renewal health score for a company
 */
router.get(
  '/:companyId',
  authenticateApiKey,
  (req: Request<{ companyId: string }>, res: Response<ApiResponse<RenewalHealthScore>>) => {
    try {
      const { companyId } = req.params;
      const score = calculateRenewalHealthScore(companyId);

      res.json({
        success: true,
        data: score,
        message: `Health score calculated for company ${companyId}`
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Server Error',
        message: error instanceof Error ? error.message : 'Failed to calculate health score'
      });
    }
  }
);

/**
 * GET /api/scores
 * Get scores for multiple companies
 */
router.get(
  '/',
  authenticateApiKey,
  [
    query('companyIds').isString().notEmpty().withMessage('companyIds query parameter is required')
  ],
  validateRequest,
  (req: Request<object, ApiResponse<RenewalHealthScore[]>, object, { companyIds: string }>, res: Response<ApiResponse<RenewalHealthScore[]>>) => {
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

      const scores = batchCalculateScores(companyIds);

      res.json({
        success: true,
        data: scores,
        message: `Calculated scores for ${scores.length} companies`
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Server Error',
        message: error instanceof Error ? error.message : 'Failed to calculate health scores'
      });
    }
  }
);

export default router;
