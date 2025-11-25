import { 
  ExpansionPrediction, 
  ExpansionHorizon, 
  ExpansionVectorDetail, 
  ExpansionSignal,
  ExpansionVector 
} from '../types';
import { getUsageEvents, calculateFeatureAdoption } from './usageEventsService';
import { calculateMLUsageTrend } from './mlTrendService';

/**
 * Configuration for expansion prediction thresholds
 */
const EXPANSION_CONFIG = {
  seatUtilization: {
    high: 80,      // >80% utilization suggests seat expansion needed
    medium: 60,    // >60% indicates growing need
  },
  featureAdoption: {
    high: 8,       // 8+ features = power user territory
    medium: 5,     // 5+ features = engaged user
  },
  powerUserThreshold: 10, // Events per week to qualify as power user
  usageGrowthThreshold: 20, // 20% growth indicates expansion potential
};

/**
 * In-memory storage for seat data
 * In production, this would come from your licensing system
 */
const seatData: Map<string, { licensed: number; metadata?: Record<string, unknown> }> = new Map();

/**
 * Set seat licensing data for a company
 */
export function setSeatData(companyId: string, licensedSeats: number, metadata?: Record<string, unknown>): void {
  seatData.set(companyId, { licensed: licensedSeats, metadata });
}

/**
 * Get seat data for a company
 */
export function getSeatData(companyId: string): { licensed: number; metadata?: Record<string, unknown> } | null {
  return seatData.get(companyId) || null;
}

/**
 * Calculate Expansion Prediction for a company
 */
export function calculateExpansionPrediction(companyId: string): ExpansionPrediction {
  const events = getUsageEvents(companyId, 90);
  const features = calculateFeatureAdoption(companyId);
  const mlTrend = calculateMLUsageTrend(companyId);
  
  // Calculate seat utilization
  const seatUtilization = calculateSeatUtilization(companyId, events);
  
  // Calculate expansion vectors
  const vectors = calculateExpansionVectors(companyId, events, features, mlTrend, seatUtilization);
  
  // Detect expansion signals
  const expansionSignals = detectExpansionSignals(companyId, events, features, mlTrend, seatUtilization);
  
  // Calculate overall likelihood score
  const likelihoodScore = calculateLikelihoodScore(vectors, expansionSignals, mlTrend);
  
  // Determine expansion horizon
  const horizon = determineExpansionHorizon(likelihoodScore, expansionSignals, seatUtilization);
  
  // Generate recommendations
  const recommendations = generateExpansionRecommendations(vectors, expansionSignals, seatUtilization, horizon);
  
  return {
    companyId,
    likelihoodScore,
    horizon,
    vectors,
    seatUtilization,
    expansionSignals,
    recommendations,
    calculatedAt: new Date().toISOString()
  };
}

/**
 * Calculate seat utilization metrics
 */
function calculateSeatUtilization(
  companyId: string, 
  events: { metadata?: Record<string, unknown>; timestamp: string }[]
): ExpansionPrediction['seatUtilization'] {
  const seat = getSeatData(companyId);
  const licensedSeats = seat?.licensed || 10; // Default to 10 if not set
  
  // Count unique users in last 30 days
  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const recentEvents = events.filter(e => new Date(e.timestamp).getTime() >= thirtyDaysAgo);
  
  const uniqueUsers = new Set<string>();
  recentEvents.forEach(event => {
    const userId = event.metadata?.userId as string;
    if (userId) {
      uniqueUsers.add(userId);
    }
  });
  
  const currentSeats = uniqueUsers.size || 1; // At least 1 if there are events
  const utilizationPercent = Math.min(100, Math.round((currentSeats / licensedSeats) * 100));
  
  // Count power users (users with high activity)
  const userActivityMap = new Map<string, number>();
  recentEvents.forEach(event => {
    const userId = event.metadata?.userId as string;
    if (userId) {
      userActivityMap.set(userId, (userActivityMap.get(userId) || 0) + 1);
    }
  });
  
  const powerUserThreshold = EXPANSION_CONFIG.powerUserThreshold * 4; // Over 4 weeks
  const powerUsers = Array.from(userActivityMap.values()).filter(count => count >= powerUserThreshold).length;
  
  return {
    currentSeats,
    licensedSeats,
    utilizationPercent,
    powerUsers
  };
}

/**
 * Calculate expansion vectors with scores and confidence
 */
function calculateExpansionVectors(
  companyId: string,
  events: { timestamp: string; eventType: string; featureName?: string; metadata?: Record<string, unknown> }[],
  features: { featureName: string; usageCount: number }[],
  mlTrend: { trendDirection: number; classification: string; weeklyDeltas: number[] },
  seatUtilization: ExpansionPrediction['seatUtilization']
): ExpansionVectorDetail[] {
  const vectors: ExpansionVectorDetail[] = [];
  
  // 1. Seat Growth Vector
  const seatGrowthScore = calculateSeatGrowthScore(seatUtilization);
  vectors.push({
    type: 'seat_growth',
    score: seatGrowthScore,
    confidence: calculateConfidence(seatUtilization.utilizationPercent > 70 ? 0.8 : 0.5, seatGrowthScore),
    reasoning: getSeatGrowthReasoning(seatUtilization)
  });
  
  // 2. Add-Ons Vector
  const addOnScore = calculateAddOnScore(features, events);
  vectors.push({
    type: 'add_ons',
    score: addOnScore,
    confidence: calculateConfidence(features.length > 5 ? 0.7 : 0.4, addOnScore),
    reasoning: getAddOnReasoning(features)
  });
  
  // 3. Feature Upgrades Vector
  const featureUpgradeScore = calculateFeatureUpgradeScore(features, mlTrend);
  vectors.push({
    type: 'feature_upgrades',
    score: featureUpgradeScore,
    confidence: calculateConfidence(mlTrend.trendDirection > 0 ? 0.75 : 0.45, featureUpgradeScore),
    reasoning: getFeatureUpgradeReasoning(features, mlTrend)
  });
  
  // 4. Usage-Based Expansion Vector
  const usageBasedScore = calculateUsageBasedScore(events, mlTrend);
  vectors.push({
    type: 'usage_based',
    score: usageBasedScore,
    confidence: calculateConfidence(events.length > 50 ? 0.8 : 0.5, usageBasedScore),
    reasoning: getUsageBasedReasoning(events, mlTrend)
  });
  
  // Sort by score descending
  return vectors.sort((a, b) => b.score - a.score);
}

/**
 * Calculate seat growth expansion score
 */
function calculateSeatGrowthScore(seatUtilization: ExpansionPrediction['seatUtilization']): number {
  const { utilizationPercent, powerUsers, currentSeats, licensedSeats } = seatUtilization;
  
  let score = 0;
  
  // High utilization strongly indicates seat expansion need
  if (utilizationPercent >= EXPANSION_CONFIG.seatUtilization.high) {
    score += 40;
  } else if (utilizationPercent >= EXPANSION_CONFIG.seatUtilization.medium) {
    score += 25;
  } else {
    score += Math.max(0, utilizationPercent / 10);
  }
  
  // Power users indicate expansion potential
  const powerUserRatio = currentSeats > 0 ? powerUsers / currentSeats : 0;
  score += powerUserRatio * 30;
  
  // Already using most seats
  if (currentSeats >= licensedSeats * 0.9) {
    score += 20;
  }
  
  // Growing team (more users than expected)
  if (currentSeats > licensedSeats) {
    score += 10;
  }
  
  return Math.min(100, Math.round(score));
}

/**
 * Calculate add-on expansion score
 */
function calculateAddOnScore(
  features: { featureName: string; usageCount: number }[],
  events: { eventType: string }[]
): number {
  let score = 0;
  
  // Feature depth indicates add-on potential
  const featureCount = features.length;
  if (featureCount >= EXPANSION_CONFIG.featureAdoption.high) {
    score += 35;
  } else if (featureCount >= EXPANSION_CONFIG.featureAdoption.medium) {
    score += 20;
  }
  
  // Look for add-on interest signals
  const addOnEvents = events.filter(e => 
    e.eventType.includes('premium') || 
    e.eventType.includes('upgrade') ||
    e.eventType.includes('explore') ||
    e.eventType.includes('trial')
  );
  score += Math.min(30, addOnEvents.length * 5);
  
  // Heavy usage of core features suggests need for add-ons
  const heavyFeatures = features.filter(f => f.usageCount > 20);
  score += Math.min(35, heavyFeatures.length * 7);
  
  return Math.min(100, Math.round(score));
}

/**
 * Calculate feature upgrade score
 */
function calculateFeatureUpgradeScore(
  features: { featureName: string; usageCount: number }[],
  mlTrend: { trendDirection: number; classification: string }
): number {
  let score = 0;
  
  // Growing usage trend
  if (mlTrend.trendDirection > 1) {
    score += 30;
  } else if (mlTrend.trendDirection > 0) {
    score += 15;
  }
  
  // Healthy classification
  if (mlTrend.classification === 'accelerating_usage') {
    score += 25;
  } else if (mlTrend.classification === 'healthy_growth') {
    score += 20;
  } else if (mlTrend.classification === 'stabilizing') {
    score += 10;
  }
  
  // Feature breadth
  if (features.length >= 8) {
    score += 20;
  } else if (features.length >= 5) {
    score += 10;
  }
  
  // Heavy feature usage
  const intensiveFeatures = features.filter(f => f.usageCount > 30);
  score += Math.min(25, intensiveFeatures.length * 5);
  
  return Math.min(100, Math.round(score));
}

/**
 * Calculate usage-based expansion score
 */
function calculateUsageBasedScore(
  events: { timestamp: string }[],
  mlTrend: { trendDirection: number; weeklyDeltas: number[] }
): number {
  let score = 0;
  
  // Volume of usage
  if (events.length >= 200) {
    score += 30;
  } else if (events.length >= 100) {
    score += 20;
  } else if (events.length >= 50) {
    score += 10;
  }
  
  // Growth rate
  const recentDeltas = mlTrend.weeklyDeltas.slice(-4);
  const avgGrowth = recentDeltas.length > 0 
    ? recentDeltas.reduce((a, b) => a + b, 0) / recentDeltas.length 
    : 0;
  
  if (avgGrowth > EXPANSION_CONFIG.usageGrowthThreshold) {
    score += 40;
  } else if (avgGrowth > 10) {
    score += 25;
  } else if (avgGrowth > 0) {
    score += 10;
  }
  
  // Acceleration (positive second derivative)
  if (recentDeltas.length >= 2) {
    const recentGrowth = recentDeltas.slice(-2).reduce((a, b) => a + b, 0) / 2;
    const olderGrowth = recentDeltas.slice(0, 2).reduce((a, b) => a + b, 0) / 2;
    if (recentGrowth > olderGrowth + 5) {
      score += 20;
    }
  }
  
  // Consistent positive trend
  const positiveDeltas = recentDeltas.filter(d => d > 0).length;
  score += positiveDeltas * 5;
  
  return Math.min(100, Math.round(score));
}

/**
 * Calculate confidence score
 */
function calculateConfidence(baseConfidence: number, score: number): number {
  // Confidence increases with score strength
  const scoreMultiplier = score / 100;
  return Math.round((baseConfidence + scoreMultiplier * 0.3) * 100) / 100;
}

/**
 * Detect expansion signals from usage patterns
 */
function detectExpansionSignals(
  companyId: string,
  events: { timestamp: string; eventType: string; featureName?: string; metadata?: Record<string, unknown> }[],
  features: { featureName: string; usageCount: number; lastUsed: string }[],
  mlTrend: { trendDirection: number; classification: string; weeklyDeltas: number[] },
  seatUtilization: ExpansionPrediction['seatUtilization']
): ExpansionSignal[] {
  const signals: ExpansionSignal[] = [];
  const now = new Date().toISOString();
  
  // Signal: High seat utilization
  if (seatUtilization.utilizationPercent >= 85) {
    signals.push({
      type: 'high_seat_utilization',
      strength: seatUtilization.utilizationPercent >= 95 ? 'strong' : 'moderate',
      description: `Seat utilization at ${seatUtilization.utilizationPercent}% - team growth likely`,
      detectedAt: now
    });
  }
  
  // Signal: Usage spike
  const recentDelta = mlTrend.weeklyDeltas.slice(-1)[0] || 0;
  if (recentDelta > 30) {
    signals.push({
      type: 'usage_spike',
      strength: recentDelta > 50 ? 'strong' : 'moderate',
      description: `${Math.round(recentDelta)}% usage increase this week`,
      detectedAt: now
    });
  }
  
  // Signal: Feature adoption milestone
  if (features.length >= 8) {
    signals.push({
      type: 'feature_adoption_milestone',
      strength: features.length >= 12 ? 'strong' : 'moderate',
      description: `Using ${features.length} features - power user territory`,
      detectedAt: now
    });
  }
  
  // Signal: Accelerating usage
  if (mlTrend.classification === 'accelerating_usage') {
    signals.push({
      type: 'accelerating_usage',
      strength: 'strong',
      description: 'Usage growth is accelerating',
      detectedAt: now
    });
  } else if (mlTrend.classification === 'healthy_growth') {
    signals.push({
      type: 'healthy_growth',
      strength: 'moderate',
      description: 'Consistent healthy usage growth',
      detectedAt: now
    });
  }
  
  // Signal: Multiple power users
  if (seatUtilization.powerUsers >= 3) {
    signals.push({
      type: 'multiple_power_users',
      strength: seatUtilization.powerUsers >= 5 ? 'strong' : 'moderate',
      description: `${seatUtilization.powerUsers} power users identified`,
      detectedAt: now
    });
  }
  
  // Signal: Premium feature interest
  const premiumEvents = events.filter(e => 
    e.eventType.includes('premium') || 
    e.eventType.includes('upgrade') ||
    e.featureName?.includes('premium') ||
    e.featureName?.includes('advanced')
  );
  if (premiumEvents.length > 0) {
    signals.push({
      type: 'premium_feature_interest',
      strength: premiumEvents.length >= 5 ? 'strong' : premiumEvents.length >= 2 ? 'moderate' : 'weak',
      description: `${premiumEvents.length} interactions with premium features`,
      detectedAt: now
    });
  }
  
  // Signal: API usage (integration potential)
  const apiEvents = events.filter(e => 
    e.eventType.includes('api') || 
    e.featureName?.includes('api')
  );
  if (apiEvents.length > 10) {
    signals.push({
      type: 'api_heavy_usage',
      strength: apiEvents.length >= 50 ? 'strong' : 'moderate',
      description: 'Heavy API usage suggests integration/automation needs',
      detectedAt: now
    });
  }
  
  // Sort by strength
  const strengthOrder = { strong: 0, moderate: 1, weak: 2 };
  return signals.sort((a, b) => strengthOrder[a.strength] - strengthOrder[b.strength]);
}

/**
 * Calculate overall likelihood score
 */
function calculateLikelihoodScore(
  vectors: ExpansionVectorDetail[],
  signals: ExpansionSignal[],
  mlTrend: { trendDirection: number; classification: string }
): number {
  // Base score from top vectors (weighted average)
  const topVectors = vectors.slice(0, 3);
  let vectorScore = 0;
  let totalWeight = 0;
  
  topVectors.forEach((v, i) => {
    const weight = 1 / (i + 1); // First vector weighted more
    vectorScore += v.score * v.confidence * weight;
    totalWeight += weight;
  });
  
  const baseScore = totalWeight > 0 ? vectorScore / totalWeight : 0;
  
  // Signal boost
  const strongSignals = signals.filter(s => s.strength === 'strong').length;
  const moderateSignals = signals.filter(s => s.strength === 'moderate').length;
  const signalBoost = Math.min(20, strongSignals * 8 + moderateSignals * 3);
  
  // Trend adjustment
  let trendAdjustment = 0;
  if (mlTrend.classification === 'accelerating_usage') {
    trendAdjustment = 10;
  } else if (mlTrend.classification === 'healthy_growth') {
    trendAdjustment = 5;
  } else if (mlTrend.classification === 'soft_decline' || mlTrend.classification === 'sharp_decline') {
    trendAdjustment = -15;
  }
  
  return Math.max(0, Math.min(100, Math.round(baseScore + signalBoost + trendAdjustment)));
}

/**
 * Determine expansion horizon based on metrics
 */
function determineExpansionHorizon(
  likelihoodScore: number,
  signals: ExpansionSignal[],
  seatUtilization: ExpansionPrediction['seatUtilization']
): ExpansionHorizon {
  const strongSignalCount = signals.filter(s => s.strength === 'strong').length;
  
  // Ready Now: High score + strong signals + immediate need
  if (likelihoodScore >= 75 && strongSignalCount >= 2) {
    return 'ready_now';
  }
  
  // Also Ready Now if seat utilization is critical
  if (seatUtilization.utilizationPercent >= 95 && likelihoodScore >= 60) {
    return 'ready_now';
  }
  
  // Likely Soon: Good score with some strong signals
  if (likelihoodScore >= 55 && strongSignalCount >= 1) {
    return 'likely_soon';
  }
  
  // Also Likely Soon with high utilization
  if (seatUtilization.utilizationPercent >= 80 && likelihoodScore >= 45) {
    return 'likely_soon';
  }
  
  // Potential: Moderate score
  if (likelihoodScore >= 35) {
    return 'potential';
  }
  
  return 'not_likely';
}

/**
 * Generate expansion recommendations
 */
function generateExpansionRecommendations(
  vectors: ExpansionVectorDetail[],
  signals: ExpansionSignal[],
  seatUtilization: ExpansionPrediction['seatUtilization'],
  horizon: ExpansionHorizon
): string[] {
  const recommendations: string[] = [];
  
  // Horizon-specific recommendations
  if (horizon === 'ready_now') {
    recommendations.push('Schedule expansion conversation with decision maker');
    recommendations.push('Prepare ROI analysis based on current usage patterns');
  } else if (horizon === 'likely_soon') {
    recommendations.push('Begin nurturing conversations about growth plans');
    recommendations.push('Share customer success stories about expansion benefits');
  }
  
  // Vector-specific recommendations
  const topVector = vectors[0];
  if (topVector && topVector.score >= 50) {
    switch (topVector.type) {
      case 'seat_growth':
        recommendations.push('Discuss team growth and additional user licensing');
        if (seatUtilization.utilizationPercent >= 90) {
          recommendations.push('Offer volume discount for seat bundle');
        }
        break;
      case 'add_ons':
        recommendations.push('Demo relevant add-on features based on usage patterns');
        recommendations.push('Provide trial access to premium add-ons');
        break;
      case 'feature_upgrades':
        recommendations.push('Highlight advanced features that match their use case');
        recommendations.push('Offer upgrade to next tier with feature preview');
        break;
      case 'usage_based':
        recommendations.push('Review usage patterns and recommend appropriate tier');
        recommendations.push('Discuss predictable billing options for heavy usage');
        break;
    }
  }
  
  // Signal-specific recommendations
  const strongSignals = signals.filter(s => s.strength === 'strong');
  if (strongSignals.some(s => s.type === 'multiple_power_users')) {
    recommendations.push('Identify power users for champion program');
  }
  if (strongSignals.some(s => s.type === 'api_heavy_usage')) {
    recommendations.push('Discuss enterprise API tier or dedicated support');
  }
  
  return recommendations.slice(0, 5);
}

/**
 * Reasoning helper functions
 */
function getSeatGrowthReasoning(seatUtilization: ExpansionPrediction['seatUtilization']): string {
  const { utilizationPercent, powerUsers, currentSeats, licensedSeats } = seatUtilization;
  
  if (utilizationPercent >= 90) {
    return `Near capacity (${utilizationPercent}% utilization) with ${powerUsers} power users`;
  }
  if (utilizationPercent >= 70) {
    return `Strong utilization (${utilizationPercent}%) suggests team growth`;
  }
  return `Current utilization at ${utilizationPercent}% (${currentSeats}/${licensedSeats} seats)`;
}

function getAddOnReasoning(features: { featureName: string; usageCount: number }[]): string {
  if (features.length >= 8) {
    return `Heavy feature adoption (${features.length} features) indicates add-on readiness`;
  }
  if (features.length >= 5) {
    return `Good feature breadth (${features.length} features) - potential for add-ons`;
  }
  return `Using ${features.length} features - build adoption before add-on discussion`;
}

function getFeatureUpgradeReasoning(
  features: { featureName: string; usageCount: number }[],
  mlTrend: { trendDirection: number; classification: string }
): string {
  if (mlTrend.classification === 'accelerating_usage') {
    return 'Rapidly growing usage suggests readiness for advanced features';
  }
  if (mlTrend.classification === 'healthy_growth') {
    return 'Consistent growth pattern indicates upgrade potential';
  }
  const heavyFeatures = features.filter(f => f.usageCount > 30);
  if (heavyFeatures.length > 0) {
    return `Intensive use of ${heavyFeatures.length} features suggests tier upgrade`;
  }
  return 'Monitor usage growth for upgrade timing';
}

function getUsageBasedReasoning(
  events: { timestamp: string }[],
  mlTrend: { trendDirection: number }
): string {
  if (events.length >= 200 && mlTrend.trendDirection > 0) {
    return 'High volume with positive trend - strong usage-based expansion candidate';
  }
  if (events.length >= 100) {
    return `Significant usage volume (${events.length} events) with growth potential`;
  }
  return `Current usage at ${events.length} events - monitor for growth`;
}

/**
 * Batch calculate expansion predictions for multiple companies
 */
export function batchCalculateExpansionPredictions(companyIds: string[]): ExpansionPrediction[] {
  return companyIds.map(id => calculateExpansionPrediction(id));
}

/**
 * Clear seat data for a company (useful for testing)
 */
export function clearSeatData(companyId: string): void {
  seatData.delete(companyId);
}
