import { 
  storeUsageEvent, 
  getUsageEvents, 
  batchStoreUsageEvents,
  calculateUsageTrends,
  calculateFeatureAdoption,
  clearUsageEvents
} from '../src/services/usageEventsService';

describe('Usage Events Service', () => {
  const testCompanyId = 'test-company-123';

  beforeEach(() => {
    clearUsageEvents(testCompanyId);
  });

  describe('storeUsageEvent', () => {
    it('should store a usage event with companyId', () => {
      const event = storeUsageEvent({
        companyId: testCompanyId,
        eventType: 'login',
        featureName: 'dashboard',
        metadata: { userId: 'user-1' }
      });

      expect(event.eventId).toBeDefined();
      expect(event.companyId).toBe(testCompanyId);
      expect(event.eventType).toBe('login');
      expect(event.featureName).toBe('dashboard');
      expect(event.timestamp).toBeDefined();
    });

    it('should store a usage event with externalCompanyId', () => {
      const event = storeUsageEvent({
        externalCompanyId: 'ext-123',
        eventType: 'feature_use'
      });

      expect(event.eventId).toBeDefined();
      expect(event.externalCompanyId).toBe('ext-123');
      expect(event.eventType).toBe('feature_use');
    });

    it('should throw error if neither companyId nor externalCompanyId provided', () => {
      expect(() => storeUsageEvent({
        eventType: 'login'
      })).toThrow('Either companyId or externalCompanyId is required');
    });
  });

  describe('getUsageEvents', () => {
    it('should return events for a company', () => {
      storeUsageEvent({
        companyId: testCompanyId,
        eventType: 'login'
      });
      storeUsageEvent({
        companyId: testCompanyId,
        eventType: 'feature_use'
      });

      const events = getUsageEvents(testCompanyId);
      expect(events).toHaveLength(2);
    });

    it('should return empty array for unknown company', () => {
      const events = getUsageEvents('unknown-company');
      expect(events).toHaveLength(0);
    });

    it('should filter events by date range', () => {
      // Store an old event
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 60);
      storeUsageEvent({
        companyId: testCompanyId,
        eventType: 'old_event',
        timestamp: oldDate.toISOString()
      });

      // Store a recent event
      storeUsageEvent({
        companyId: testCompanyId,
        eventType: 'recent_event'
      });

      const recentEvents = getUsageEvents(testCompanyId, 30);
      expect(recentEvents).toHaveLength(1);
      expect(recentEvents[0].eventType).toBe('recent_event');
    });
  });

  describe('batchStoreUsageEvents', () => {
    it('should store multiple events', () => {
      const events = batchStoreUsageEvents([
        { companyId: testCompanyId, eventType: 'event1' },
        { companyId: testCompanyId, eventType: 'event2' },
        { companyId: testCompanyId, eventType: 'event3' }
      ]);

      expect(events).toHaveLength(3);
      expect(getUsageEvents(testCompanyId)).toHaveLength(3);
    });
  });

  describe('calculateUsageTrends', () => {
    it('should calculate trends from events', () => {
      // Add events spread over multiple weeks
      for (let i = 0; i < 10; i++) {
        const date = new Date();
        date.setDate(date.getDate() - i * 7);
        storeUsageEvent({
          companyId: testCompanyId,
          eventType: 'login',
          timestamp: date.toISOString()
        });
      }

      const trends = calculateUsageTrends(testCompanyId);
      expect(trends.length).toBeGreaterThan(0);
      expect(trends[0]).toHaveProperty('period');
      expect(trends[0]).toHaveProperty('eventCount');
      expect(trends[0]).toHaveProperty('trend');
    });

    it('should return empty array for unknown company', () => {
      const trends = calculateUsageTrends('unknown-company');
      expect(trends).toHaveLength(0);
    });
  });

  describe('calculateFeatureAdoption', () => {
    it('should calculate feature adoption metrics', () => {
      storeUsageEvent({
        companyId: testCompanyId,
        eventType: 'feature_use',
        featureName: 'dashboard'
      });
      storeUsageEvent({
        companyId: testCompanyId,
        eventType: 'feature_use',
        featureName: 'dashboard'
      });
      storeUsageEvent({
        companyId: testCompanyId,
        eventType: 'feature_use',
        featureName: 'reports'
      });

      const adoption = calculateFeatureAdoption(testCompanyId);
      expect(adoption).toHaveLength(2);
      
      const dashboardFeature = adoption.find(f => f.featureName === 'dashboard');
      expect(dashboardFeature?.usageCount).toBe(2);
    });

    it('should return empty array for unknown company', () => {
      const adoption = calculateFeatureAdoption('unknown-company');
      expect(adoption).toHaveLength(0);
    });
  });
});
