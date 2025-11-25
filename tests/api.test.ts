import request from 'supertest';
import app from '../src/app';
import { clearUsageEvents } from '../src/services/usageEventsService';

describe('API Endpoints', () => {
  const testCompanyId = 'api-test-company';

  beforeEach(() => {
    clearUsageEvents(testCompanyId);
  });

  describe('GET /', () => {
    it('should return API documentation', async () => {
      const response = await request(app).get('/');
      
      expect(response.status).toBe(200);
      expect(response.body.name).toBe('HubSpot Renewal Health Usage App');
      expect(response.body.endpoints).toBeDefined();
    });
  });

  describe('GET /health', () => {
    it('should return health status', async () => {
      const response = await request(app).get('/health');
      
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('healthy');
      expect(response.body.timestamp).toBeDefined();
    });
  });

  describe('POST /api/usage-events', () => {
    it('should create a usage event', async () => {
      const response = await request(app)
        .post('/api/usage-events')
        .send({
          companyId: testCompanyId,
          eventType: 'login',
          featureName: 'dashboard'
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.eventId).toBeDefined();
      expect(response.body.data.companyId).toBe(testCompanyId);
    });

    it('should reject request without companyId or externalCompanyId', async () => {
      const response = await request(app)
        .post('/api/usage-events')
        .send({
          eventType: 'login'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should reject request without eventType', async () => {
      const response = await request(app)
        .post('/api/usage-events')
        .send({
          companyId: testCompanyId
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/usage-events/batch', () => {
    it('should create multiple usage events', async () => {
      const response = await request(app)
        .post('/api/usage-events/batch')
        .send({
          events: [
            { companyId: testCompanyId, eventType: 'login' },
            { companyId: testCompanyId, eventType: 'feature_use', featureName: 'reports' }
          ]
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
    });

    it('should reject empty events array', async () => {
      const response = await request(app)
        .post('/api/usage-events/batch')
        .send({
          events: []
        });

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/usage-events/:companyId', () => {
    beforeEach(async () => {
      await request(app)
        .post('/api/usage-events')
        .send({
          companyId: testCompanyId,
          eventType: 'login'
        });
    });

    it('should return events for a company', async () => {
      const response = await request(app)
        .get(`/api/usage-events/${testCompanyId}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
    });

    it('should return empty array for unknown company', async () => {
      const response = await request(app)
        .get('/api/usage-events/unknown-company');

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(0);
    });
  });

  describe('GET /api/usage-events/:companyId/trends', () => {
    it('should return usage trends', async () => {
      await request(app)
        .post('/api/usage-events')
        .send({
          companyId: testCompanyId,
          eventType: 'login'
        });

      const response = await request(app)
        .get(`/api/usage-events/${testCompanyId}/trends`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('GET /api/usage-events/:companyId/features', () => {
    it('should return feature adoption', async () => {
      await request(app)
        .post('/api/usage-events')
        .send({
          companyId: testCompanyId,
          eventType: 'feature_use',
          featureName: 'dashboard'
        });

      const response = await request(app)
        .get(`/api/usage-events/${testCompanyId}/features`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('GET /api/scores/:companyId', () => {
    it('should return health score for a company', async () => {
      const response = await request(app)
        .get(`/api/scores/${testCompanyId}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.companyId).toBe(testCompanyId);
      expect(response.body.data.score).toBeDefined();
      expect(response.body.data.riskLevel).toBeDefined();
      expect(response.body.data.factors).toBeDefined();
      expect(response.body.data.recommendations).toBeDefined();
    });
  });

  describe('GET /api/scores', () => {
    it('should return scores for multiple companies', async () => {
      const response = await request(app)
        .get('/api/scores')
        .query({ companyIds: 'company-1,company-2,company-3' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(3);
    });

    it('should reject request without companyIds', async () => {
      const response = await request(app)
        .get('/api/scores');

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/crm-card', () => {
    it('should return CRM card data', async () => {
      const response = await request(app)
        .get('/api/crm-card')
        .query({ associatedObjectId: testCompanyId, associatedObjectType: 'COMPANY' });

      expect(response.status).toBe(200);
      expect(response.body.results).toBeDefined();
      expect(response.body.results).toHaveLength(1);
      expect(response.body.results[0].title).toBe('Renewal Health');
    });

    it('should handle missing company ID', async () => {
      const response = await request(app)
        .get('/api/crm-card');

      expect(response.status).toBe(200);
      expect(response.body.results[0].title).toBe('Error');
    });
  });

  describe('GET /api/crm-card/details', () => {
    it('should return detailed HTML view', async () => {
      const response = await request(app)
        .get('/api/crm-card/details')
        .query({ companyId: testCompanyId });

      expect(response.status).toBe(200);
      expect(response.type).toBe('text/html');
      expect(response.text).toContain('Renewal Health Score');
    });

    it('should return error for missing company ID', async () => {
      const response = await request(app)
        .get('/api/crm-card/details');

      expect(response.status).toBe(400);
    });
  });

  describe('404 Handler', () => {
    it('should return 404 for unknown endpoints', async () => {
      const response = await request(app).get('/unknown-endpoint');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Not Found');
    });
  });
});
