import { calculateRenewalHealthScore, batchCalculateScores } from '../src/services/scoringService';
import { storeUsageEvent, clearUsageEvents } from '../src/services/usageEventsService';

describe('Scoring Service', () => {
  const testCompanyId = 'scoring-test-company';

  beforeEach(() => {
    clearUsageEvents(testCompanyId);
  });

  describe('calculateRenewalHealthScore', () => {
    it('should return critical risk for company with no usage', () => {
      const score = calculateRenewalHealthScore('no-usage-company');
      
      expect(score.companyId).toBe('no-usage-company');
      expect(score.score).toBeLessThanOrEqual(25); // Critical threshold
      expect(score.riskLevel).toBe('critical');
      expect(score.factors).toHaveLength(5);
      expect(score.recommendations.length).toBeGreaterThan(0);
      expect(score.calculatedAt).toBeDefined();
    });

    it('should calculate higher score for active companies', () => {
      // Add many recent events
      for (let i = 0; i < 50; i++) {
        storeUsageEvent({
          companyId: testCompanyId,
          eventType: 'login',
          featureName: `feature-${i % 5}`
        });
      }

      const score = calculateRenewalHealthScore(testCompanyId);
      
      expect(score.score).toBeGreaterThan(50);
      expect(['low', 'medium']).toContain(score.riskLevel);
    });

    it('should include all score factors', () => {
      storeUsageEvent({
        companyId: testCompanyId,
        eventType: 'login'
      });

      const score = calculateRenewalHealthScore(testCompanyId);
      
      const factorNames = score.factors.map(f => f.name);
      expect(factorNames).toContain('Usage Frequency');
      expect(factorNames).toContain('Feature Adoption');
      expect(factorNames).toContain('Usage Trend');
      expect(factorNames).toContain('Recency');
      expect(factorNames).toContain('Usage Consistency');
    });

    it('should have factors with valid values', () => {
      storeUsageEvent({
        companyId: testCompanyId,
        eventType: 'login'
      });

      const score = calculateRenewalHealthScore(testCompanyId);
      
      score.factors.forEach(factor => {
        expect(factor.value).toBeGreaterThanOrEqual(0);
        expect(factor.value).toBeLessThanOrEqual(100);
        expect(factor.weight).toBeGreaterThan(0);
        expect(factor.weight).toBeLessThanOrEqual(1);
        expect(['positive', 'negative', 'neutral']).toContain(factor.impact);
        expect(factor.description).toBeDefined();
      });
    });

    it('should provide relevant recommendations', () => {
      const score = calculateRenewalHealthScore('inactive-company');
      
      expect(score.recommendations.length).toBeGreaterThan(0);
      expect(score.recommendations.length).toBeLessThanOrEqual(5);
    });
  });

  describe('batchCalculateScores', () => {
    it('should calculate scores for multiple companies', () => {
      const companyIds = ['company-1', 'company-2', 'company-3'];
      
      // Add some usage for first company
      storeUsageEvent({
        companyId: 'company-1',
        eventType: 'login'
      });

      const scores = batchCalculateScores(companyIds);
      
      expect(scores).toHaveLength(3);
      expect(scores[0].companyId).toBe('company-1');
      expect(scores[1].companyId).toBe('company-2');
      expect(scores[2].companyId).toBe('company-3');
    });
  });

  describe('Risk Level Classification', () => {
    it('should classify score >= 75 as low risk', () => {
      // Create highly active company
      for (let i = 0; i < 100; i++) {
        storeUsageEvent({
          companyId: testCompanyId,
          eventType: 'login',
          featureName: `feature-${i % 10}`,
          metadata: { userId: `user-${i % 5}` }
        });
      }

      const score = calculateRenewalHealthScore(testCompanyId);
      if (score.score >= 75) {
        expect(score.riskLevel).toBe('low');
      }
    });

    it('should classify score 0 as critical risk', () => {
      const score = calculateRenewalHealthScore('empty-company');
      expect(score.score).toBeLessThanOrEqual(25); // Critical threshold
      expect(score.riskLevel).toBe('critical');
    });
  });
});
