import { 
  calculateOnboardingHealthScore, 
  batchCalculateOnboardingScores,
  setOnboardingStartDate,
  getOnboardingStartDate,
  clearOnboardingData
} from '../src/services/onboardingService';
import { storeUsageEvent, clearUsageEvents } from '../src/services/usageEventsService';

describe('Onboarding Service', () => {
  const testCompanyId = 'onboarding-test-company';

  beforeEach(() => {
    clearUsageEvents(testCompanyId);
    clearOnboardingData(testCompanyId);
  });

  describe('calculateOnboardingHealthScore', () => {
    it('should return low score for company with no onboarding progress', () => {
      const score = calculateOnboardingHealthScore('no-progress-company');
      
      expect(score.companyId).toBe('no-progress-company');
      expect(score.score).toBeDefined();
      expect(score.status).toBeDefined();
      expect(score.milestones.length).toBeGreaterThan(0);
      expect(score.recommendations.length).toBeGreaterThan(0);
      expect(score.calculatedAt).toBeDefined();
    });

    it('should calculate higher score with completed milestones', () => {
      // Simulate completing some milestones
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7); // 7 days ago
      setOnboardingStartDate(testCompanyId, startDate.toISOString());

      // Add milestone completion events
      storeUsageEvent({
        companyId: testCompanyId,
        eventType: 'login',
        timestamp: new Date(startDate.getTime() + 24 * 60 * 60 * 1000).toISOString()
      });
      storeUsageEvent({
        companyId: testCompanyId,
        eventType: 'profile_update'
      });
      storeUsageEvent({
        companyId: testCompanyId,
        eventType: 'feature_use',
        featureName: 'dashboard'
      });

      const score = calculateOnboardingHealthScore(testCompanyId);
      
      expect(score.score).toBeGreaterThan(30);
    });

    it('should track aha moments', () => {
      setOnboardingStartDate(testCompanyId, new Date().toISOString());
      
      // Add an aha moment event
      storeUsageEvent({
        companyId: testCompanyId,
        eventType: 'feature_use'
      });

      const score = calculateOnboardingHealthScore(testCompanyId);
      
      expect(score.ahaMomentsTotal).toBeGreaterThan(0);
      expect(score.ahaMomentsReached).toBeGreaterThanOrEqual(0);
    });

    it('should calculate milestone coverage', () => {
      storeUsageEvent({
        companyId: testCompanyId,
        eventType: 'login'
      });
      storeUsageEvent({
        companyId: testCompanyId,
        eventType: 'profile_update'
      });

      const score = calculateOnboardingHealthScore(testCompanyId);
      
      expect(score.milestoneCoverageScore).toBeDefined();
      expect(score.milestoneCoverageScore).toBeGreaterThanOrEqual(0);
      expect(score.milestoneCoverageScore).toBeLessThanOrEqual(100);
    });

    it('should calculate onboarding forecast', () => {
      storeUsageEvent({
        companyId: testCompanyId,
        eventType: 'login'
      });

      const score = calculateOnboardingHealthScore(testCompanyId);
      
      expect(score.onboardingForecastScore).toBeDefined();
      expect(score.onboardingForecastScore).toBeGreaterThanOrEqual(0);
      expect(score.onboardingForecastScore).toBeLessThanOrEqual(100);
    });

    it('should calculate time to first value when aha moment reached', () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 10);
      setOnboardingStartDate(testCompanyId, startDate.toISOString());

      // Add first feature use (aha moment) 3 days after start
      storeUsageEvent({
        companyId: testCompanyId,
        eventType: 'feature_use',
        timestamp: new Date(startDate.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString()
      });

      const score = calculateOnboardingHealthScore(testCompanyId);
      
      expect(score.timeToFirstValue).toBeDefined();
      if (score.timeToFirstValue !== null) {
        expect(score.timeToFirstValue).toBeGreaterThanOrEqual(0);
      }
    });

    it('should use provided start date', () => {
      const customStartDate = new Date();
      customStartDate.setDate(customStartDate.getDate() - 14);

      const score = calculateOnboardingHealthScore(testCompanyId, customStartDate.toISOString());
      
      expect(score.daysSinceOnboarding).toBeGreaterThanOrEqual(13);
      expect(score.daysSinceOnboarding).toBeLessThanOrEqual(15);
    });

    it('should include all milestones', () => {
      const score = calculateOnboardingHealthScore(testCompanyId);
      
      expect(score.milestones.length).toBeGreaterThan(0);
      score.milestones.forEach(milestone => {
        expect(milestone).toHaveProperty('name');
        expect(milestone).toHaveProperty('completed');
        expect(milestone).toHaveProperty('expectedByDay');
        expect(milestone).toHaveProperty('expectedDate');
        expect(milestone).toHaveProperty('isAhaMoment');
        expect(milestone).toHaveProperty('weight');
      });
    });
  });

  describe('setOnboardingStartDate and getOnboardingStartDate', () => {
    it('should store and retrieve start date', () => {
      const startDate = '2024-01-15T10:00:00Z';
      setOnboardingStartDate(testCompanyId, startDate);
      
      const retrieved = getOnboardingStartDate(testCompanyId);
      expect(retrieved).toBe(startDate);
    });

    it('should return null for unknown company', () => {
      const retrieved = getOnboardingStartDate('unknown-company');
      expect(retrieved).toBeNull();
    });
  });

  describe('batchCalculateOnboardingScores', () => {
    it('should calculate scores for multiple companies', () => {
      const companyIds = ['company-1', 'company-2', 'company-3'];
      
      const scores = batchCalculateOnboardingScores(companyIds);
      
      expect(scores).toHaveLength(3);
      expect(scores[0].companyId).toBe('company-1');
      expect(scores[1].companyId).toBe('company-2');
      expect(scores[2].companyId).toBe('company-3');
    });
  });

  describe('Onboarding Status Classification', () => {
    it('should classify all valid onboarding statuses', () => {
      const validStatuses = ['on_track', 'behind', 'blocked', 'at_risk'];
      
      const score = calculateOnboardingHealthScore(testCompanyId);
      expect(validStatuses).toContain(score.status);
    });
  });

  describe('Recommendations', () => {
    it('should provide relevant recommendations', () => {
      const score = calculateOnboardingHealthScore(testCompanyId);
      
      expect(score.recommendations.length).toBeGreaterThan(0);
      expect(score.recommendations.length).toBeLessThanOrEqual(5);
      score.recommendations.forEach(rec => {
        expect(typeof rec).toBe('string');
        expect(rec.length).toBeGreaterThan(0);
      });
    });
  });
});
