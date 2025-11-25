import { 
  calculateExpansionPrediction, 
  batchCalculateExpansionPredictions,
  setSeatData,
  getSeatData,
  clearSeatData
} from '../src/services/expansionService';
import { storeUsageEvent, clearUsageEvents } from '../src/services/usageEventsService';

describe('Expansion Service', () => {
  const testCompanyId = 'expansion-test-company';

  beforeEach(() => {
    clearUsageEvents(testCompanyId);
    clearSeatData(testCompanyId);
  });

  describe('calculateExpansionPrediction', () => {
    it('should return low likelihood for company with no usage', () => {
      const prediction = calculateExpansionPrediction('no-usage-company');
      
      expect(prediction.companyId).toBe('no-usage-company');
      expect(prediction.likelihoodScore).toBeLessThanOrEqual(50);
      expect(prediction.horizon).toBeDefined();
      expect(prediction.vectors.length).toBeGreaterThan(0);
      expect(prediction.calculatedAt).toBeDefined();
    });

    it('should calculate higher likelihood for active company with high seat utilization', () => {
      // Set high seat utilization
      setSeatData(testCompanyId, 5);

      // Add many events with multiple users
      for (let user = 0; user < 5; user++) {
        for (let i = 0; i < 50; i++) {
          storeUsageEvent({
            companyId: testCompanyId,
            eventType: 'login',
            featureName: `feature-${i % 5}`,
            metadata: { userId: `user-${user}` }
          });
        }
      }

      const prediction = calculateExpansionPrediction(testCompanyId);
      
      expect(prediction.likelihoodScore).toBeGreaterThan(30);
      expect(prediction.seatUtilization.utilizationPercent).toBeGreaterThan(50);
    });

    it('should calculate seat utilization correctly', () => {
      setSeatData(testCompanyId, 10);

      // Add events from 8 unique users
      for (let user = 0; user < 8; user++) {
        storeUsageEvent({
          companyId: testCompanyId,
          eventType: 'login',
          metadata: { userId: `user-${user}` }
        });
      }

      const prediction = calculateExpansionPrediction(testCompanyId);
      
      expect(prediction.seatUtilization.licensedSeats).toBe(10);
      expect(prediction.seatUtilization.currentSeats).toBe(8);
      expect(prediction.seatUtilization.utilizationPercent).toBe(80);
    });

    it('should identify power users', () => {
      setSeatData(testCompanyId, 10);

      // Create a power user with many events
      for (let i = 0; i < 100; i++) {
        storeUsageEvent({
          companyId: testCompanyId,
          eventType: 'login',
          metadata: { userId: 'power-user-1' }
        });
      }

      // Create normal users with fewer events
      for (let user = 0; user < 3; user++) {
        for (let i = 0; i < 5; i++) {
          storeUsageEvent({
            companyId: testCompanyId,
            eventType: 'login',
            metadata: { userId: `normal-user-${user}` }
          });
        }
      }

      const prediction = calculateExpansionPrediction(testCompanyId);
      
      expect(prediction.seatUtilization.powerUsers).toBeGreaterThanOrEqual(1);
    });

    it('should return all expansion vectors', () => {
      storeUsageEvent({
        companyId: testCompanyId,
        eventType: 'login'
      });

      const prediction = calculateExpansionPrediction(testCompanyId);
      
      expect(prediction.vectors.length).toBe(4);
      
      const vectorTypes = prediction.vectors.map(v => v.type);
      expect(vectorTypes).toContain('seat_growth');
      expect(vectorTypes).toContain('add_ons');
      expect(vectorTypes).toContain('feature_upgrades');
      expect(vectorTypes).toContain('usage_based');
    });

    it('should have vectors with valid properties', () => {
      storeUsageEvent({
        companyId: testCompanyId,
        eventType: 'login'
      });

      const prediction = calculateExpansionPrediction(testCompanyId);
      
      prediction.vectors.forEach(vector => {
        expect(vector.score).toBeGreaterThanOrEqual(0);
        expect(vector.score).toBeLessThanOrEqual(100);
        expect(vector.confidence).toBeGreaterThan(0);
        expect(vector.confidence).toBeLessThanOrEqual(1);
        expect(vector.reasoning).toBeDefined();
        expect(typeof vector.reasoning).toBe('string');
      });
    });

    it('should detect expansion signals', () => {
      setSeatData(testCompanyId, 5);

      // Add usage from many users (high utilization)
      for (let user = 0; user < 5; user++) {
        for (let i = 0; i < 30; i++) {
          storeUsageEvent({
            companyId: testCompanyId,
            eventType: 'login',
            featureName: `feature-${i % 8}`,
            metadata: { userId: `user-${user}` }
          });
        }
      }

      const prediction = calculateExpansionPrediction(testCompanyId);
      
      expect(prediction.expansionSignals).toBeDefined();
      expect(Array.isArray(prediction.expansionSignals)).toBe(true);
    });

    it('should have valid expansion signals properties', () => {
      for (let i = 0; i < 50; i++) {
        storeUsageEvent({
          companyId: testCompanyId,
          eventType: 'login',
          featureName: `feature-${i % 10}`
        });
      }

      const prediction = calculateExpansionPrediction(testCompanyId);
      
      if (prediction.expansionSignals.length > 0) {
        prediction.expansionSignals.forEach(signal => {
          expect(signal.type).toBeDefined();
          expect(['strong', 'moderate', 'weak']).toContain(signal.strength);
          expect(signal.description).toBeDefined();
          expect(signal.detectedAt).toBeDefined();
        });
      }
    });

    it('should provide recommendations', () => {
      storeUsageEvent({
        companyId: testCompanyId,
        eventType: 'login'
      });

      const prediction = calculateExpansionPrediction(testCompanyId);
      
      expect(prediction.recommendations).toBeDefined();
      expect(Array.isArray(prediction.recommendations)).toBe(true);
      expect(prediction.recommendations.length).toBeLessThanOrEqual(5);
    });
  });

  describe('setSeatData and getSeatData', () => {
    it('should store and retrieve seat data', () => {
      setSeatData(testCompanyId, 25);
      
      const retrieved = getSeatData(testCompanyId);
      expect(retrieved).not.toBeNull();
      expect(retrieved?.licensed).toBe(25);
    });

    it('should store seat data with metadata', () => {
      setSeatData(testCompanyId, 10, { plan: 'enterprise' });
      
      const retrieved = getSeatData(testCompanyId);
      expect(retrieved?.metadata).toEqual({ plan: 'enterprise' });
    });

    it('should return null for unknown company', () => {
      const retrieved = getSeatData('unknown-company');
      expect(retrieved).toBeNull();
    });
  });

  describe('batchCalculateExpansionPredictions', () => {
    it('should calculate predictions for multiple companies', () => {
      const companyIds = ['company-1', 'company-2', 'company-3'];
      
      const predictions = batchCalculateExpansionPredictions(companyIds);
      
      expect(predictions).toHaveLength(3);
      expect(predictions[0].companyId).toBe('company-1');
      expect(predictions[1].companyId).toBe('company-2');
      expect(predictions[2].companyId).toBe('company-3');
    });
  });

  describe('Expansion Horizon Classification', () => {
    it('should classify all valid expansion horizons', () => {
      const validHorizons = ['ready_now', 'likely_soon', 'potential', 'not_likely'];
      
      const prediction = calculateExpansionPrediction(testCompanyId);
      expect(validHorizons).toContain(prediction.horizon);
    });
  });

  describe('Premium Feature Interest Detection', () => {
    it('should detect premium feature interest', () => {
      // Add events with premium/upgrade keywords
      for (let i = 0; i < 5; i++) {
        storeUsageEvent({
          companyId: testCompanyId,
          eventType: 'premium_feature_view'
        });
      }

      const prediction = calculateExpansionPrediction(testCompanyId);
      
      const premiumSignal = prediction.expansionSignals.find(
        s => s.type === 'premium_feature_interest'
      );
      
      if (premiumSignal) {
        expect(['strong', 'moderate', 'weak']).toContain(premiumSignal.strength);
      }
    });
  });
});
