import express, { Express, Request, Response } from 'express';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Import routes
import oauthRoutes from './routes/oauth';
import usageEventsRoutes from './routes/usageEvents';
import scoresRoutes from './routes/scores';
import crmCardRoutes from './routes/crmCard';
import hubspotRoutes from './routes/hubspot';
import intelligenceRoutes from './routes/intelligence';

// Import middleware
import { errorHandler } from './middleware';

const app: Express = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (_req: Request, res: Response) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0'
  });
});

// Routes
app.use('/oauth', oauthRoutes);
app.use('/api/usage-events', usageEventsRoutes);
app.use('/api/scores', scoresRoutes);
app.use('/api/crm-card', crmCardRoutes);
app.use('/api/hubspot', hubspotRoutes);
app.use('/api/intelligence', intelligenceRoutes);

// Root endpoint
app.get('/', (_req: Request, res: Response) => {
  res.json({
    name: 'HubSpot Customer Intelligence Suite',
    description: 'Ingest product-usage events, calculate renewal health scores, and surface 360° customer insights in HubSpot',
    version: '2.0.0',
    endpoints: {
      health: 'GET /health',
      oauth: {
        authorize: 'GET /oauth/authorize',
        callback: 'GET /oauth/callback',
        status: 'GET /oauth/status/:portalId',
        disconnect: 'DELETE /oauth/disconnect/:portalId'
      },
      usageEvents: {
        create: 'POST /api/usage-events',
        batchCreate: 'POST /api/usage-events/batch',
        get: 'GET /api/usage-events/:companyId',
        trends: 'GET /api/usage-events/:companyId/trends',
        features: 'GET /api/usage-events/:companyId/features'
      },
      scores: {
        get: 'GET /api/scores/:companyId',
        batch: 'GET /api/scores?companyIds=id1,id2,id3'
      },
      intelligence: {
        suite: 'GET /api/intelligence/suite/:companyId',
        mlTrend: {
          get: 'GET /api/intelligence/ml-trend/:companyId',
          batch: 'GET /api/intelligence/ml-trend?companyIds=id1,id2,id3'
        },
        onboarding: {
          get: 'GET /api/intelligence/onboarding/:companyId',
          setStartDate: 'POST /api/intelligence/onboarding/:companyId/start-date',
          batch: 'GET /api/intelligence/onboarding?companyIds=id1,id2,id3'
        },
        expansion: {
          get: 'GET /api/intelligence/expansion/:companyId',
          setSeats: 'POST /api/intelligence/expansion/:companyId/seats',
          batch: 'GET /api/intelligence/expansion?companyIds=id1,id2,id3'
        }
      },
      crmCard: {
        card: 'GET /api/crm-card',
        details: 'GET /api/crm-card/details'
      },
      hubspot: {
        setup: 'POST /api/hubspot/setup/:portalId',
        sync: 'POST /api/hubspot/sync/:portalId/:companyId',
        syncBatch: 'POST /api/hubspot/sync-batch/:portalId',
        getCompany: 'GET /api/hubspot/company/:portalId/:companyId',
        search: 'GET /api/hubspot/search/:portalId?domain=example.com'
      }
    }
  });
});

// Error handling middleware
app.use(errorHandler);

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'Not Found',
    message: 'The requested endpoint does not exist'
  });
});

export default app;
