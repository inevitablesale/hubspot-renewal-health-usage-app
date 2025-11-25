import { RenewalHealthScore, ScoreFactor } from '../types';
import { getUsageEvents, calculateUsageTrends, calculateFeatureAdoption } from './usageEventsService';

/**
 * Score configuration weights
 */
const SCORE_WEIGHTS = {
  usageFrequency: 0.25,
  featureAdoption: 0.25,
  usageTrend: 0.20,
  recency: 0.15,
  consistency: 0.15
};

/**
 * Calculate the Renewal Health Score for a company
 */
export function calculateRenewalHealthScore(companyId: string): RenewalHealthScore {
  const events = getUsageEvents(companyId, 90);
  const trends = calculateUsageTrends(companyId);
  const featureAdoption = calculateFeatureAdoption(companyId);
  
  const factors: ScoreFactor[] = [];
  let totalScore = 0;

  // 1. Usage Frequency Score (0-100)
  const usageFrequencyScore = calculateUsageFrequencyScore(events.length);
  factors.push({
    name: 'Usage Frequency',
    value: usageFrequencyScore,
    weight: SCORE_WEIGHTS.usageFrequency,
    impact: usageFrequencyScore >= 70 ? 'positive' : usageFrequencyScore >= 40 ? 'neutral' : 'negative',
    description: `${events.length} events in the last 90 days`
  });
  totalScore += usageFrequencyScore * SCORE_WEIGHTS.usageFrequency;

  // 2. Feature Adoption Score (0-100)
  const featureAdoptionScore = calculateFeatureAdoptionScore(featureAdoption.length);
  factors.push({
    name: 'Feature Adoption',
    value: featureAdoptionScore,
    weight: SCORE_WEIGHTS.featureAdoption,
    impact: featureAdoptionScore >= 70 ? 'positive' : featureAdoptionScore >= 40 ? 'neutral' : 'negative',
    description: `${featureAdoption.length} features adopted`
  });
  totalScore += featureAdoptionScore * SCORE_WEIGHTS.featureAdoption;

  // 3. Usage Trend Score (0-100)
  const usageTrendScore = calculateTrendScore(trends);
  factors.push({
    name: 'Usage Trend',
    value: usageTrendScore,
    weight: SCORE_WEIGHTS.usageTrend,
    impact: usageTrendScore >= 70 ? 'positive' : usageTrendScore >= 40 ? 'neutral' : 'negative',
    description: getTrendDescription(trends)
  });
  totalScore += usageTrendScore * SCORE_WEIGHTS.usageTrend;

  // 4. Recency Score (0-100)
  const recencyScore = calculateRecencyScore(events);
  factors.push({
    name: 'Recency',
    value: recencyScore,
    weight: SCORE_WEIGHTS.recency,
    impact: recencyScore >= 70 ? 'positive' : recencyScore >= 40 ? 'neutral' : 'negative',
    description: getRecencyDescription(events)
  });
  totalScore += recencyScore * SCORE_WEIGHTS.recency;

  // 5. Consistency Score (0-100)
  const consistencyScore = calculateConsistencyScore(trends);
  factors.push({
    name: 'Usage Consistency',
    value: consistencyScore,
    weight: SCORE_WEIGHTS.consistency,
    impact: consistencyScore >= 70 ? 'positive' : consistencyScore >= 40 ? 'neutral' : 'negative',
    description: getConsistencyDescription(consistencyScore)
  });
  totalScore += consistencyScore * SCORE_WEIGHTS.consistency;

  // Determine risk level based on total score
  const riskLevel = determineRiskLevel(totalScore);
  
  // Generate recommendations based on factors
  const recommendations = generateRecommendations(factors, riskLevel);

  return {
    companyId,
    score: Math.round(totalScore),
    riskLevel,
    factors,
    recommendations,
    calculatedAt: new Date().toISOString()
  };
}

/**
 * Calculate usage frequency score
 */
function calculateUsageFrequencyScore(eventCount: number): number {
  // Assuming 100+ events in 90 days is excellent usage
  if (eventCount >= 100) return 100;
  if (eventCount >= 50) return 80;
  if (eventCount >= 20) return 60;
  if (eventCount >= 10) return 40;
  if (eventCount >= 5) return 20;
  return eventCount > 0 ? 10 : 0;
}

/**
 * Calculate feature adoption score
 */
function calculateFeatureAdoptionScore(featuresUsed: number): number {
  // Assuming 10+ features is excellent adoption
  if (featuresUsed >= 10) return 100;
  if (featuresUsed >= 7) return 80;
  if (featuresUsed >= 5) return 60;
  if (featuresUsed >= 3) return 40;
  if (featuresUsed >= 1) return 20;
  return 0;
}

/**
 * Calculate trend score based on recent usage patterns
 */
function calculateTrendScore(trends: { trend: string }[]): number {
  if (trends.length === 0) return 0;
  
  const recentTrends = trends.slice(-4); // Last 4 weeks
  const increasingCount = recentTrends.filter(t => t.trend === 'increasing').length;
  const decreasingCount = recentTrends.filter(t => t.trend === 'decreasing').length;
  
  if (increasingCount >= 3) return 100;
  if (increasingCount >= 2) return 80;
  if (decreasingCount <= 1 && increasingCount >= 1) return 60;
  if (decreasingCount >= 2) return 30;
  if (decreasingCount >= 3) return 10;
  return 50; // Stable
}

/**
 * Calculate recency score based on last activity
 */
function calculateRecencyScore(events: { timestamp: string }[]): number {
  if (events.length === 0) return 0;
  
  const sortedEvents = events.sort((a, b) => 
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
  
  const lastEventDate = new Date(sortedEvents[0].timestamp);
  const daysSinceLastEvent = Math.floor(
    (Date.now() - lastEventDate.getTime()) / (1000 * 60 * 60 * 24)
  );
  
  if (daysSinceLastEvent <= 1) return 100;
  if (daysSinceLastEvent <= 3) return 90;
  if (daysSinceLastEvent <= 7) return 75;
  if (daysSinceLastEvent <= 14) return 50;
  if (daysSinceLastEvent <= 30) return 25;
  return 10;
}

/**
 * Calculate consistency score based on usage patterns
 */
function calculateConsistencyScore(trends: { eventCount: number }[]): number {
  if (trends.length < 2) return 50;
  
  const eventCounts = trends.map(t => t.eventCount);
  const avg = eventCounts.reduce((a, b) => a + b, 0) / eventCounts.length;
  
  if (avg === 0) return 0;
  
  const variance = eventCounts.reduce((sum, count) => 
    sum + Math.pow(count - avg, 2), 0
  ) / eventCounts.length;
  
  const coefficientOfVariation = Math.sqrt(variance) / avg;
  
  // Lower variation = more consistent
  if (coefficientOfVariation <= 0.2) return 100;
  if (coefficientOfVariation <= 0.4) return 80;
  if (coefficientOfVariation <= 0.6) return 60;
  if (coefficientOfVariation <= 0.8) return 40;
  return 20;
}

/**
 * Determine risk level from score
 */
function determineRiskLevel(score: number): 'low' | 'medium' | 'high' | 'critical' {
  if (score >= 75) return 'low';
  if (score >= 50) return 'medium';
  if (score >= 25) return 'high';
  return 'critical';
}

/**
 * Generate actionable recommendations
 */
function generateRecommendations(factors: ScoreFactor[], riskLevel: string): string[] {
  const recommendations: string[] = [];
  
  factors.forEach(factor => {
    if (factor.impact === 'negative') {
      switch (factor.name) {
        case 'Usage Frequency':
          recommendations.push('Schedule a check-in call to understand usage blockers');
          recommendations.push('Share product tips and best practices');
          break;
        case 'Feature Adoption':
          recommendations.push('Offer personalized training on advanced features');
          recommendations.push('Share relevant use cases and success stories');
          break;
        case 'Usage Trend':
          recommendations.push('Investigate recent changes in account status');
          recommendations.push('Reach out to understand declining usage');
          break;
        case 'Recency':
          recommendations.push('Send re-engagement email with new features');
          recommendations.push('Schedule urgent account review');
          break;
        case 'Usage Consistency':
          recommendations.push('Help establish regular usage workflows');
          recommendations.push('Identify and remove friction points');
          break;
      }
    }
  });
  
  // Add risk-level specific recommendations
  if (riskLevel === 'critical') {
    recommendations.unshift('URGENT: Immediate executive outreach required');
  } else if (riskLevel === 'high') {
    recommendations.unshift('Priority: Schedule renewal discussion soon');
  }
  
  return recommendations.slice(0, 5); // Max 5 recommendations
}

/**
 * Helper functions for descriptions
 */
function getTrendDescription(trends: { trend: string }[]): string {
  if (trends.length === 0) return 'No usage data available';
  const recentTrend = trends[trends.length - 1];
  if (!recentTrend) return 'No usage data available';
  return `Recent usage is ${recentTrend.trend}`;
}

function getRecencyDescription(events: { timestamp: string }[]): string {
  if (events.length === 0) return 'No recent activity';
  const sortedEvents = events.sort((a, b) => 
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
  const lastEventDate = new Date(sortedEvents[0].timestamp);
  const daysSince = Math.floor(
    (Date.now() - lastEventDate.getTime()) / (1000 * 60 * 60 * 24)
  );
  if (daysSince === 0) return 'Active today';
  if (daysSince === 1) return 'Active yesterday';
  return `Last active ${daysSince} days ago`;
}

function getConsistencyDescription(score: number): string {
  if (score >= 80) return 'Very consistent usage pattern';
  if (score >= 60) return 'Mostly consistent usage';
  if (score >= 40) return 'Somewhat irregular usage';
  return 'Highly irregular usage pattern';
}

/**
 * Batch calculate scores for multiple companies
 */
export function batchCalculateScores(companyIds: string[]): RenewalHealthScore[] {
  return companyIds.map(id => calculateRenewalHealthScore(id));
}
