import { Router, Request, Response } from 'express';
import { body, query } from 'express-validator';
import { validateRequest, authenticateApiKey } from '../middleware';
import { 
  storeUsageEvent, 
  getUsageEvents, 
  batchStoreUsageEvents,
  calculateUsageTrends,
  calculateFeatureAdoption
} from '../services/usageEventsService';
import { ApiResponse, UsageEvent, UsageEventInput } from '../types';

const router = Router();

/**
 * POST /api/usage-events
 * Ingest a single usage event
 */
router.post(
  '/',
  authenticateApiKey,
  [
    body('eventType').isString().notEmpty().withMessage('eventType is required'),
    body('companyId').optional().isString(),
    body('externalCompanyId').optional().isString(),
    body('featureName').optional().isString(),
    body('timestamp').optional().isISO8601(),
    body('metadata').optional().isObject()
  ],
  validateRequest,
  (req: Request<object, ApiResponse<UsageEvent>, UsageEventInput>, res: Response<ApiResponse<UsageEvent>>) => {
    try {
      const { companyId, externalCompanyId, eventType, featureName, timestamp, metadata } = req.body;
      
      if (!companyId && !externalCompanyId) {
        res.status(400).json({
          success: false,
          error: 'Validation Error',
          message: 'Either companyId or externalCompanyId is required'
        });
        return;
      }

      const event = storeUsageEvent({
        companyId,
        externalCompanyId,
        eventType,
        featureName,
        timestamp,
        metadata
      });

      res.status(201).json({
        success: true,
        data: event,
        message: 'Usage event recorded successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Server Error',
        message: error instanceof Error ? error.message : 'Failed to store usage event'
      });
    }
  }
);

/**
 * POST /api/usage-events/batch
 * Ingest multiple usage events
 */
router.post(
  '/batch',
  authenticateApiKey,
  [
    body('events').isArray({ min: 1, max: 100 }).withMessage('events array is required (1-100 items)'),
    body('events.*.eventType').isString().notEmpty(),
    body('events.*.companyId').optional().isString(),
    body('events.*.externalCompanyId').optional().isString(),
    body('events.*.featureName').optional().isString(),
    body('events.*.timestamp').optional().isISO8601(),
    body('events.*.metadata').optional().isObject()
  ],
  validateRequest,
  (req: Request<object, ApiResponse<UsageEvent[]>, { events: UsageEventInput[] }>, res: Response<ApiResponse<UsageEvent[]>>) => {
    try {
      const { events } = req.body;
      
      // Validate each event has companyId or externalCompanyId
      for (const event of events) {
        if (!event.companyId && !event.externalCompanyId) {
          res.status(400).json({
            success: false,
            error: 'Validation Error',
            message: 'Each event must have either companyId or externalCompanyId'
          });
          return;
        }
      }

      const storedEvents = batchStoreUsageEvents(events);

      res.status(201).json({
        success: true,
        data: storedEvents,
        message: `${storedEvents.length} usage events recorded successfully`
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Server Error',
        message: error instanceof Error ? error.message : 'Failed to store usage events'
      });
    }
  }
);

/**
 * GET /api/usage-events/:companyId
 * Get usage events for a company
 */
router.get(
  '/:companyId',
  authenticateApiKey,
  [
    query('days').optional().isInt({ min: 1, max: 365 }).toInt()
  ],
  validateRequest,
  (req: Request<{ companyId: string }, ApiResponse<UsageEvent[]>, object, { days?: number }>, res: Response<ApiResponse<UsageEvent[]>>) => {
    try {
      const { companyId } = req.params;
      const days = req.query.days || 30;

      const events = getUsageEvents(companyId, days);

      res.json({
        success: true,
        data: events,
        message: `Found ${events.length} events in the last ${days} days`
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Server Error',
        message: error instanceof Error ? error.message : 'Failed to retrieve usage events'
      });
    }
  }
);

/**
 * GET /api/usage-events/:companyId/trends
 * Get usage trends for a company
 */
router.get(
  '/:companyId/trends',
  authenticateApiKey,
  (req: Request<{ companyId: string }>, res: Response) => {
    try {
      const { companyId } = req.params;
      const trends = calculateUsageTrends(companyId);

      res.json({
        success: true,
        data: trends,
        message: `Found ${trends.length} trend periods`
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Server Error',
        message: error instanceof Error ? error.message : 'Failed to calculate trends'
      });
    }
  }
);

/**
 * GET /api/usage-events/:companyId/features
 * Get feature adoption for a company
 */
router.get(
  '/:companyId/features',
  authenticateApiKey,
  (req: Request<{ companyId: string }>, res: Response) => {
    try {
      const { companyId } = req.params;
      const features = calculateFeatureAdoption(companyId);

      res.json({
        success: true,
        data: features,
        message: `Found ${features.length} features`
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Server Error',
        message: error instanceof Error ? error.message : 'Failed to calculate feature adoption'
      });
    }
  }
);

export default router;
