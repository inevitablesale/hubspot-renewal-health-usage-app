import { 
  MLUsageTrend, 
  BehavioralTrendClassification, 
  FeatureTrendBreakdown 
} from '../types';
import { getUsageEvents, calculateFeatureAdoption } from './usageEventsService';

/**
 * Cohort definitions for customer classification
 */
const COHORTS = {
  power_user: 'Power User',
  active: 'Active',
  casual: 'Casual',
  at_risk: 'At Risk',
  dormant: 'Dormant'
};

/**
 * Calculate ML-based usage trend analysis for a company
 */
export function calculateMLUsageTrend(companyId: string): MLUsageTrend {
  const events = getUsageEvents(companyId, 90);
  
  // Calculate weekly event counts for the last 12 weeks
  const weeklyData = getWeeklyEventCounts(events);
  
  // Calculate linear regression slope (trend direction)
  const { slope, rSquared } = calculateLinearRegression(weeklyData);
  
  // Calculate volatility index (coefficient of variation)
  const volatilityIndex = calculateVolatilityIndex(weeklyData);
  
  // Calculate trend strength (RMSE-normalized)
  const trendStrength = calculateTrendStrength(weeklyData, slope);
  
  // Calculate week-over-week deltas
  const weeklyDeltas = calculateWeeklyDeltas(weeklyData);
  
  // Calculate 7-day moving average (as percentage of baseline)
  const movingAverage = calculate7DayMovingAverage(events);
  
  // Determine behavioral classification
  const classification = classifyBehavioralTrend(slope, volatilityIndex, weeklyData);
  
  // Calculate trend score (0-100)
  const trendScore = calculateTrendScore(slope, volatilityIndex, weeklyData, rSquared);
  
  // Determine usage signature (cluster)
  const usageSignature = determineUsageSignature(weeklyData, volatilityIndex, slope);
  
  // Calculate feature-level trends
  const featureBreakdown = calculateFeatureTrends(companyId);
  
  // Detect cohort drift
  const cohortDrift = detectCohortDrift(companyId, weeklyData, slope);
  
  return {
    companyId,
    trendScore,
    classification,
    volatilityIndex,
    trendDirection: slope,
    trendStrength,
    usageSignature,
    cohortDrift,
    weeklyDeltas,
    movingAverage,
    featureBreakdown,
    calculatedAt: new Date().toISOString()
  };
}

/**
 * Get weekly event counts for the last N weeks
 */
function getWeeklyEventCounts(events: { timestamp: string }[]): number[] {
  const weeks: number[] = new Array(12).fill(0);
  const now = Date.now();
  const msPerWeek = 7 * 24 * 60 * 60 * 1000;
  
  events.forEach(event => {
    const eventTime = new Date(event.timestamp).getTime();
    const weeksAgo = Math.floor((now - eventTime) / msPerWeek);
    if (weeksAgo >= 0 && weeksAgo < 12) {
      weeks[11 - weeksAgo]++; // Most recent week at the end
    }
  });
  
  return weeks;
}

/**
 * Calculate linear regression slope and R-squared
 */
function calculateLinearRegression(data: number[]): { slope: number; rSquared: number } {
  const n = data.length;
  if (n < 2) return { slope: 0, rSquared: 0 };
  
  // x values: 0, 1, 2, ..., n-1
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0, sumY2 = 0;
  
  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += data[i];
    sumXY += i * data[i];
    sumX2 += i * i;
    sumY2 += data[i] * data[i];
  }
  
  const denominator = n * sumX2 - sumX * sumX;
  if (denominator === 0) return { slope: 0, rSquared: 0 };
  
  const slope = (n * sumXY - sumX * sumY) / denominator;
  
  // Calculate R-squared
  const yMean = sumY / n;
  let ssRes = 0, ssTot = 0;
  
  for (let i = 0; i < n; i++) {
    const yPred = yMean + slope * (i - (n - 1) / 2);
    ssRes += Math.pow(data[i] - yPred, 2);
    ssTot += Math.pow(data[i] - yMean, 2);
  }
  
  const rSquared = ssTot === 0 ? 0 : 1 - ssRes / ssTot;
  
  return { slope, rSquared: Math.max(0, Math.min(1, rSquared)) };
}

/**
 * Calculate volatility index (coefficient of variation)
 */
function calculateVolatilityIndex(data: number[]): number {
  if (data.length < 2) return 0;
  
  const mean = data.reduce((a, b) => a + b, 0) / data.length;
  if (mean === 0) return 0;
  
  const variance = data.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / data.length;
  const stdDev = Math.sqrt(variance);
  
  // Coefficient of variation (0-1 scale, capped at 1)
  return Math.min(stdDev / mean, 1);
}

/**
 * Calculate trend strength (RMSE-normalized magnitude)
 */
function calculateTrendStrength(data: number[], slope: number): number {
  if (data.length < 2) return 0;
  
  const mean = data.reduce((a, b) => a + b, 0) / data.length;
  if (mean === 0) return 0;
  
  // Normalize slope by the mean to get relative trend strength
  const relativeTrend = Math.abs(slope) / mean;
  
  // Scale to 0-100
  return Math.min(relativeTrend * 100, 100);
}

/**
 * Calculate week-over-week change percentages
 */
function calculateWeeklyDeltas(data: number[]): number[] {
  const deltas: number[] = [];
  
  for (let i = 1; i < data.length; i++) {
    const previous = data[i - 1];
    const current = data[i];
    
    if (previous === 0) {
      deltas.push(current > 0 ? 100 : 0);
    } else {
      deltas.push(((current - previous) / previous) * 100);
    }
  }
  
  return deltas;
}

/**
 * Calculate 7-day moving average as percentage of baseline
 */
function calculate7DayMovingAverage(events: { timestamp: string }[]): number {
  const now = Date.now();
  const msPerDay = 24 * 60 * 60 * 1000;
  
  // Count events in last 7 days
  const recent = events.filter(e => {
    const eventTime = new Date(e.timestamp).getTime();
    return now - eventTime <= 7 * msPerDay;
  }).length;
  
  // Calculate baseline (average of previous 83 days, excluding last 7)
  const older = events.filter(e => {
    const eventTime = new Date(e.timestamp).getTime();
    const daysAgo = (now - eventTime) / msPerDay;
    return daysAgo > 7 && daysAgo <= 90;
  }).length;
  
  const baselineDaily = older / 83;
  const recentDaily = recent / 7;
  
  if (baselineDaily === 0) return recentDaily > 0 ? 100 : 0;
  
  return (recentDaily / baselineDaily) * 100;
}

/**
 * Classify behavioral trend based on metrics
 */
function classifyBehavioralTrend(
  slope: number, 
  volatility: number, 
  weeklyData: number[]
): BehavioralTrendClassification {
  const mean = weeklyData.reduce((a, b) => a + b, 0) / weeklyData.length;
  const recentWeeks = weeklyData.slice(-4);
  const recentMean = recentWeeks.reduce((a, b) => a + b, 0) / recentWeeks.length;
  
  // Near abandonment: Very low recent activity
  if (recentMean < 2 && mean < 5) {
    return 'near_abandonment';
  }
  
  // Sharp decline: Strong negative slope with significant drop
  if (slope < -2 && recentMean < mean * 0.5) {
    return 'sharp_decline';
  }
  
  // Soft decline: Moderate negative slope
  if (slope < -0.5 && recentMean < mean * 0.8) {
    return 'soft_decline';
  }
  
  // Accelerating usage: Strong positive slope
  if (slope > 2 && recentMean > mean * 1.3) {
    return 'accelerating_usage';
  }
  
  // Healthy growth: Positive slope with consistent usage
  if (slope > 0.5 && volatility < 0.5) {
    return 'healthy_growth';
  }
  
  // Stabilizing: Low volatility, minimal slope
  return 'stabilizing';
}

/**
 * Calculate overall trend score (0-100)
 */
function calculateTrendScore(
  slope: number, 
  volatility: number, 
  weeklyData: number[],
  rSquared: number
): number {
  const mean = weeklyData.reduce((a, b) => a + b, 0) / weeklyData.length;
  const recentWeeks = weeklyData.slice(-4);
  const recentMean = recentWeeks.reduce((a, b) => a + b, 0) / recentWeeks.length;
  
  let score = 50; // Base score
  
  // Adjust for trend direction (+/- 30 points)
  if (slope > 0) {
    score += Math.min(slope * 10, 30);
  } else {
    score += Math.max(slope * 10, -30);
  }
  
  // Adjust for volatility (-20 points for high volatility)
  score -= volatility * 20;
  
  // Adjust for recent activity level (+/- 20 points)
  if (mean > 0) {
    const recentRatio = recentMean / mean;
    if (recentRatio > 1) {
      score += Math.min((recentRatio - 1) * 20, 20);
    } else {
      score -= Math.min((1 - recentRatio) * 20, 20);
    }
  }
  
  // Bonus for consistent trend (R-squared)
  score += rSquared * 10;
  
  return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * Determine usage signature (cluster identifier)
 */
function determineUsageSignature(
  weeklyData: number[], 
  volatility: number, 
  slope: number
): string {
  const mean = weeklyData.reduce((a, b) => a + b, 0) / weeklyData.length;
  
  // Simple clustering based on usage volume, volatility, and trend
  if (mean >= 20 && volatility < 0.3 && slope >= 0) {
    return 'cluster_power_stable';
  }
  if (mean >= 20 && volatility >= 0.3) {
    return 'cluster_power_volatile';
  }
  if (mean >= 10 && slope > 0) {
    return 'cluster_growing';
  }
  if (mean >= 10 && slope < 0) {
    return 'cluster_declining';
  }
  if (mean >= 5 && volatility < 0.5) {
    return 'cluster_casual_stable';
  }
  if (mean >= 5) {
    return 'cluster_casual_volatile';
  }
  if (mean > 0) {
    return 'cluster_minimal';
  }
  return 'cluster_inactive';
}

/**
 * Calculate feature-level trend breakdown
 */
function calculateFeatureTrends(companyId: string): FeatureTrendBreakdown[] {
  const events = getUsageEvents(companyId, 90);
  const featureMap = new Map<string, { timestamps: number[]; count: number }>();
  
  events.forEach(event => {
    if (event.featureName) {
      const existing = featureMap.get(event.featureName) || { timestamps: [], count: 0 };
      existing.timestamps.push(new Date(event.timestamp).getTime());
      existing.count++;
      featureMap.set(event.featureName, existing);
    }
  });
  
  const breakdown: FeatureTrendBreakdown[] = [];
  const now = Date.now();
  const msPerWeek = 7 * 24 * 60 * 60 * 1000;
  
  featureMap.forEach((data, featureName) => {
    // Create weekly buckets for this feature
    const weeklyData = new Array(12).fill(0);
    data.timestamps.forEach(ts => {
      const weeksAgo = Math.floor((now - ts) / msPerWeek);
      if (weeksAgo >= 0 && weeksAgo < 12) {
        weeklyData[11 - weeksAgo]++;
      }
    });
    
    const { slope } = calculateLinearRegression(weeklyData);
    
    breakdown.push({
      featureName,
      slope,
      usageCount: data.count,
      trendDirection: slope > 0.3 ? 'up' : slope < -0.3 ? 'down' : 'stable'
    });
  });
  
  // Sort by usage count descending
  return breakdown.sort((a, b) => b.usageCount - a.usageCount).slice(0, 10);
}

/**
 * Detect cohort drift (when customer shifts to a different risk cohort)
 */
function detectCohortDrift(
  companyId: string,
  weeklyData: number[],
  slope: number
): { previousCohort: string; currentCohort: string; driftDetected: boolean } {
  // Determine previous cohort (based on older data)
  const olderWeeks = weeklyData.slice(0, 8);
  const previousMean = olderWeeks.reduce((a, b) => a + b, 0) / olderWeeks.length;
  
  // Determine current cohort (based on recent data)
  const recentWeeks = weeklyData.slice(-4);
  const currentMean = recentWeeks.reduce((a, b) => a + b, 0) / recentWeeks.length;
  
  const previousCohort = determineCohort(previousMean);
  const currentCohort = determineCohort(currentMean);
  
  const cohortRank: Record<string, number> = {
    [COHORTS.power_user]: 4,
    [COHORTS.active]: 3,
    [COHORTS.casual]: 2,
    [COHORTS.at_risk]: 1,
    [COHORTS.dormant]: 0
  };
  
  // Drift detected if cohort changed by more than 1 level or moved to at_risk/dormant
  const previousRank = cohortRank[previousCohort] ?? 0;
  const currentRank = cohortRank[currentCohort] ?? 0;
  const driftDetected = Math.abs(previousRank - currentRank) >= 1 && currentRank < previousRank;
  
  return { previousCohort, currentCohort, driftDetected };
}

/**
 * Determine cohort based on mean weekly activity
 */
function determineCohort(meanWeeklyActivity: number): string {
  if (meanWeeklyActivity >= 20) return COHORTS.power_user;
  if (meanWeeklyActivity >= 10) return COHORTS.active;
  if (meanWeeklyActivity >= 5) return COHORTS.casual;
  if (meanWeeklyActivity >= 1) return COHORTS.at_risk;
  return COHORTS.dormant;
}

/**
 * Batch calculate ML trends for multiple companies
 */
export function batchCalculateMLTrends(companyIds: string[]): MLUsageTrend[] {
  return companyIds.map(id => calculateMLUsageTrend(id));
}
