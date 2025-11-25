import { 
  OnboardingHealthScore, 
  OnboardingStatus, 
  OnboardingMilestone 
} from '../types';
import { getUsageEvents, calculateFeatureAdoption } from './usageEventsService';

/**
 * Default milestone templates for SaaS onboarding
 * These can be customized per-customer or loaded from configuration
 */
interface DefaultMilestone {
  name: string;
  expectedByDay: number;
  isAhaMoment: boolean;
  weight: number;
}

const DEFAULT_MILESTONES: DefaultMilestone[] = [
  { name: 'first_login', expectedByDay: 1, isAhaMoment: false, weight: 0.1 },
  { name: 'profile_setup', expectedByDay: 3, isAhaMoment: false, weight: 0.1 },
  { name: 'first_feature_use', expectedByDay: 3, isAhaMoment: true, weight: 0.15 },
  { name: 'data_import', expectedByDay: 7, isAhaMoment: false, weight: 0.1 },
  { name: 'team_member_invited', expectedByDay: 7, isAhaMoment: false, weight: 0.1 },
  { name: 'integration_connected', expectedByDay: 14, isAhaMoment: true, weight: 0.15 },
  { name: 'first_workflow_created', expectedByDay: 14, isAhaMoment: true, weight: 0.15 },
  { name: 'report_generated', expectedByDay: 21, isAhaMoment: false, weight: 0.1 },
  { name: 'advanced_feature_used', expectedByDay: 30, isAhaMoment: true, weight: 0.05 }
];

/**
 * Event type to milestone mapping
 */
const EVENT_TO_MILESTONE: Record<string, string> = {
  'login': 'first_login',
  'profile_update': 'profile_setup',
  'feature_use': 'first_feature_use',
  'data_import': 'data_import',
  'team_invite': 'team_member_invited',
  'integration_setup': 'integration_connected',
  'workflow_create': 'first_workflow_created',
  'report_generate': 'report_generated',
  'advanced_feature': 'advanced_feature_used'
};

/**
 * In-memory storage for onboarding start dates
 * In production, this should be persisted
 */
const onboardingStartDates: Map<string, string> = new Map();

/**
 * Set the onboarding start date for a company
 */
export function setOnboardingStartDate(companyId: string, startDate: string): void {
  onboardingStartDates.set(companyId, startDate);
}

/**
 * Get the onboarding start date for a company
 */
export function getOnboardingStartDate(companyId: string): string | null {
  return onboardingStartDates.get(companyId) || null;
}

/**
 * Calculate Onboarding Health Score for a company
 */
export function calculateOnboardingHealthScore(
  companyId: string,
  onboardingStartDate?: string
): OnboardingHealthScore {
  // Determine onboarding start date
  let startDate = onboardingStartDate || getOnboardingStartDate(companyId);
  
  // If no start date, try to infer from first event
  if (!startDate) {
    const allEvents = getUsageEvents(companyId, 365);
    if (allEvents.length > 0) {
      const sortedEvents = allEvents.sort((a, b) => 
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
      startDate = sortedEvents[0].timestamp;
      setOnboardingStartDate(companyId, startDate);
    } else {
      startDate = new Date().toISOString();
    }
  }
  
  const startTime = new Date(startDate).getTime();
  const now = Date.now();
  const daysSinceOnboarding = Math.floor((now - startTime) / (24 * 60 * 60 * 1000));
  
  // Get events since onboarding start
  const events = getUsageEvents(companyId, Math.max(daysSinceOnboarding, 30));
  
  // Evaluate milestones
  const milestones = evaluateMilestones(events, startDate);
  
  // Calculate milestone coverage score
  const milestoneCoverageScore = calculateMilestoneCoverage(milestones, daysSinceOnboarding);
  
  // Calculate time to first value (first aha moment)
  const timeToFirstValue = calculateTimeToFirstValue(milestones, startDate);
  
  // Count aha moments reached
  const ahaMomentsReached = milestones.filter(m => m.isAhaMoment && m.completed).length;
  const ahaMomentsTotal = milestones.filter(m => m.isAhaMoment).length;
  
  // Calculate onboarding forecast score
  const onboardingForecastScore = calculateOnboardingForecast(milestones, daysSinceOnboarding, events);
  
  // Determine onboarding status
  const status = determineOnboardingStatus(milestoneCoverageScore, daysSinceOnboarding, milestones);
  
  // Calculate overall score
  const score = calculateOverallOnboardingScore(
    milestoneCoverageScore,
    timeToFirstValue,
    ahaMomentsReached,
    ahaMomentsTotal,
    status,
    daysSinceOnboarding
  );
  
  // Generate recommendations
  const recommendations = generateOnboardingRecommendations(milestones, status, daysSinceOnboarding);
  
  return {
    companyId,
    score,
    status,
    milestoneCoverageScore,
    timeToFirstValue,
    ahaMomentsReached,
    ahaMomentsTotal,
    onboardingForecastScore,
    milestones,
    daysSinceOnboarding,
    recommendations,
    calculatedAt: new Date().toISOString()
  };
}

/**
 * Evaluate milestone completion based on events
 */
function evaluateMilestones(
  events: { eventType: string; timestamp: string }[], 
  startDate: string
): OnboardingMilestone[] {
  const startTime = new Date(startDate).getTime();
  
  // Create milestones with calculated expected dates
  const milestones: OnboardingMilestone[] = DEFAULT_MILESTONES.map(m => {
    const expectedDate = new Date(startTime + m.expectedByDay * 24 * 60 * 60 * 1000);
    return {
      name: m.name,
      completed: false,
      completedAt: undefined,
      expectedByDay: m.expectedByDay,
      expectedDate: expectedDate.toISOString(),
      isAhaMoment: m.isAhaMoment,
      weight: m.weight
    };
  });
  
  // Create a map of milestone completions
  const milestoneCompletions: Map<string, string> = new Map();
  
  events.forEach(event => {
    const milestoneName = EVENT_TO_MILESTONE[event.eventType];
    if (milestoneName && !milestoneCompletions.has(milestoneName)) {
      milestoneCompletions.set(milestoneName, event.timestamp);
    }
    
    // Also check feature name for more specific milestone detection
    const featureEvent = event as { featureName?: string; eventType: string; timestamp: string };
    if (featureEvent.featureName) {
      const featureMilestone = EVENT_TO_MILESTONE[featureEvent.featureName];
      if (featureMilestone && !milestoneCompletions.has(featureMilestone)) {
        milestoneCompletions.set(featureMilestone, event.timestamp);
      }
    }
  });
  
  // Update milestones with completion data
  milestones.forEach(milestone => {
    const completedAt = milestoneCompletions.get(milestone.name);
    if (completedAt) {
      milestone.completed = true;
      milestone.completedAt = completedAt;
    }
  });
  
  return milestones;
}

/**
 * Calculate milestone coverage score (0-100)
 */
function calculateMilestoneCoverage(milestones: OnboardingMilestone[], daysSinceOnboarding: number): number {
  // Filter to milestones that should be completed by now
  const relevantMilestones = milestones.filter(m => {
    return m.expectedByDay <= daysSinceOnboarding || m.completed;
  });
  
  if (relevantMilestones.length === 0) {
    // If no milestones expected yet, give benefit of doubt
    return milestones.some(m => m.completed) ? 70 : 50;
  }
  
  // Weight completed milestones
  let totalWeight = 0;
  let completedWeight = 0;
  
  relevantMilestones.forEach(m => {
    totalWeight += m.weight;
    if (m.completed) {
      completedWeight += m.weight;
      
      // Bonus for completing early
      const completedTime = m.completedAt ? new Date(m.completedAt).getTime() : Date.now();
      const expectedTime = new Date(m.expectedDate).getTime();
      if (completedTime < expectedTime) {
        completedWeight += m.weight * 0.1; // 10% bonus for early completion
      }
    }
  });
  
  if (totalWeight === 0) return 50;
  
  return Math.min(100, Math.round((completedWeight / totalWeight) * 100));
}

/**
 * Calculate time to first value (days until first aha moment)
 */
function calculateTimeToFirstValue(milestones: OnboardingMilestone[], startDate: string): number | null {
  const startTime = new Date(startDate).getTime();
  
  const completedAhaMoments = milestones
    .filter(m => m.isAhaMoment && m.completed && m.completedAt)
    .sort((a, b) => {
      const aTime = a.completedAt ? new Date(a.completedAt).getTime() : Infinity;
      const bTime = b.completedAt ? new Date(b.completedAt).getTime() : Infinity;
      return aTime - bTime;
    });
  
  if (completedAhaMoments.length === 0) return null;
  
  const firstAhaTime = new Date(completedAhaMoments[0].completedAt!).getTime();
  return Math.floor((firstAhaTime - startTime) / (24 * 60 * 60 * 1000));
}

/**
 * Calculate onboarding forecast score (predicted activation at Day 30)
 */
function calculateOnboardingForecast(
  milestones: OnboardingMilestone[],
  daysSinceOnboarding: number,
  events: { timestamp: string }[]
): number {
  const completedCount = milestones.filter(m => m.completed).length;
  const totalMilestones = milestones.length;
  
  // Base forecast on current progress
  let baseProgress = (completedCount / totalMilestones) * 100;
  
  // Adjust based on pace
  const expectedProgressByNow = Math.min(daysSinceOnboarding / 30, 1) * 100;
  const paceMultiplier = expectedProgressByNow > 0 ? baseProgress / expectedProgressByNow : 1;
  
  // Calculate activity trend
  const recentEvents = events.filter(e => {
    const eventAge = (Date.now() - new Date(e.timestamp).getTime()) / (24 * 60 * 60 * 1000);
    return eventAge <= 7;
  }).length;
  
  const olderEvents = events.filter(e => {
    const eventAge = (Date.now() - new Date(e.timestamp).getTime()) / (24 * 60 * 60 * 1000);
    return eventAge > 7 && eventAge <= 14;
  }).length;
  
  const activityTrend = olderEvents > 0 ? recentEvents / olderEvents : recentEvents > 0 ? 1.5 : 0.5;
  
  // Calculate forecast
  let forecast = baseProgress * paceMultiplier * activityTrend;
  
  // Cap forecast based on days remaining
  if (daysSinceOnboarding >= 30) {
    forecast = baseProgress; // Already at or past Day 30
  } else {
    const daysRemaining = 30 - daysSinceOnboarding;
    const projectedAdditionalProgress = (daysRemaining / daysSinceOnboarding || 0) * baseProgress * 0.5;
    forecast = Math.min(100, baseProgress + projectedAdditionalProgress);
  }
  
  return Math.max(0, Math.min(100, Math.round(forecast)));
}

/**
 * Determine onboarding status based on metrics
 */
function determineOnboardingStatus(
  milestoneCoverage: number,
  daysSinceOnboarding: number,
  milestones: OnboardingMilestone[]
): OnboardingStatus {
  const completedCount = milestones.filter(m => m.completed).length;
  
  // Check for blocked status (critical milestones not completed)
  const criticalMilestones = milestones.filter(m => m.weight >= 0.15);
  const criticalBlocked = criticalMilestones.some(m => {
    if (m.completed) return false;
    const expectedTime = new Date(m.expectedDate).getTime();
    const daysPastExpected = (Date.now() - expectedTime) / (24 * 60 * 60 * 1000);
    return daysPastExpected > 7; // More than 7 days past expected
  });
  
  if (criticalBlocked) return 'blocked';
  
  // Determine expected progress based on days
  const expectedProgress = Math.min((daysSinceOnboarding / 30) * 100, 100);
  const actualProgress = (completedCount / milestones.length) * 100;
  
  // On track: within 20% of expected progress
  if (actualProgress >= expectedProgress * 0.8 || milestoneCoverage >= 70) {
    return 'on_track';
  }
  
  // At risk: significantly behind and late in onboarding
  if (daysSinceOnboarding > 14 && actualProgress < expectedProgress * 0.5) {
    return 'at_risk';
  }
  
  // Behind: not meeting expected pace
  return 'behind';
}

/**
 * Calculate overall onboarding score (0-100)
 */
function calculateOverallOnboardingScore(
  milestoneCoverage: number,
  timeToFirstValue: number | null,
  ahaMomentsReached: number,
  ahaMomentsTotal: number,
  status: OnboardingStatus,
  daysSinceOnboarding: number
): number {
  let score = 0;
  
  // Milestone coverage (40% weight)
  score += milestoneCoverage * 0.4;
  
  // Time to first value (20% weight)
  if (timeToFirstValue !== null) {
    // Best: <3 days, Good: <7 days, OK: <14 days
    let ttfvScore = 100;
    if (timeToFirstValue <= 3) ttfvScore = 100;
    else if (timeToFirstValue <= 7) ttfvScore = 80;
    else if (timeToFirstValue <= 14) ttfvScore = 60;
    else if (timeToFirstValue <= 21) ttfvScore = 40;
    else ttfvScore = 20;
    score += ttfvScore * 0.2;
  } else if (daysSinceOnboarding < 7) {
    // Still early, give partial credit
    score += 50 * 0.2;
  }
  
  // Aha moments (25% weight)
  const ahaMomentScore = ahaMomentsTotal > 0 
    ? (ahaMomentsReached / ahaMomentsTotal) * 100 
    : 50;
  score += ahaMomentScore * 0.25;
  
  // Status adjustment (15% weight)
  const statusScores: Record<OnboardingStatus, number> = {
    'on_track': 100,
    'behind': 60,
    'blocked': 30,
    'at_risk': 20
  };
  score += statusScores[status] * 0.15;
  
  return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * Generate onboarding recommendations
 */
function generateOnboardingRecommendations(
  milestones: OnboardingMilestone[],
  status: OnboardingStatus,
  daysSinceOnboarding: number
): string[] {
  const recommendations: string[] = [];
  
  // Status-specific recommendations
  if (status === 'blocked') {
    recommendations.push('URGENT: Schedule a call to identify and remove blockers');
    recommendations.push('Review support tickets for common issues');
  } else if (status === 'at_risk') {
    recommendations.push('Immediate outreach required - customer may abandon onboarding');
    recommendations.push('Consider assigning dedicated onboarding specialist');
  } else if (status === 'behind') {
    recommendations.push('Send reminder emails about incomplete setup steps');
  }
  
  // Milestone-specific recommendations
  const incompleteMilestones = milestones.filter(m => !m.completed);
  
  // Prioritize aha moments
  const incompleteAha = incompleteMilestones.filter(m => m.isAhaMoment);
  if (incompleteAha.length > 0 && incompleteAha[0]) {
    const nextAha = incompleteAha[0];
    recommendations.push(`Focus on achieving "${nextAha.name}" - key activation milestone`);
  }
  
  // Check for overdue milestones
  const overdueMilestones = incompleteMilestones.filter(m => {
    const expectedTime = new Date(m.expectedDate).getTime();
    return Date.now() > expectedTime;
  });
  
  if (overdueMilestones.length > 0 && overdueMilestones[0]) {
    recommendations.push(`Overdue: "${overdueMilestones[0].name}" should have been completed`);
  }
  
  // Time-based recommendations
  if (daysSinceOnboarding < 7) {
    recommendations.push('Schedule kickoff call if not already done');
    recommendations.push('Share quick start guide and video tutorials');
  } else if (daysSinceOnboarding < 14) {
    recommendations.push('Offer live training session');
    recommendations.push('Check in on initial experience and questions');
  } else if (daysSinceOnboarding < 30) {
    recommendations.push('Review feature adoption and suggest advanced use cases');
  }
  
  // Limit to 5 recommendations
  return recommendations.slice(0, 5);
}

/**
 * Batch calculate onboarding scores for multiple companies
 */
export function batchCalculateOnboardingScores(companyIds: string[]): OnboardingHealthScore[] {
  return companyIds.map(id => calculateOnboardingHealthScore(id));
}

/**
 * Clear onboarding data for a company (useful for testing)
 */
export function clearOnboardingData(companyId: string): void {
  onboardingStartDates.delete(companyId);
}
