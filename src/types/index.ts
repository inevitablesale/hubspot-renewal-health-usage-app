/**
 * Usage Event Types
 */
export interface UsageEvent {
  eventId: string;
  companyId: string;
  externalCompanyId?: string;
  eventType: string;
  featureName?: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface UsageEventInput {
  companyId?: string;
  externalCompanyId?: string;
  eventType: string;
  featureName?: string;
  timestamp?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Renewal Health Score Types
 */
export interface RenewalHealthScore {
  companyId: string;
  score: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  factors: ScoreFactor[];
  recommendations: string[];
  calculatedAt: string;
}

export interface ScoreFactor {
  name: string;
  value: number;
  weight: number;
  impact: 'positive' | 'negative' | 'neutral';
  description: string;
}

/**
 * Usage Analytics Types
 */
export interface UsageTrend {
  period: string;
  eventCount: number;
  activeUsers: number;
  featuresUsed: number;
  trend: 'increasing' | 'decreasing' | 'stable';
}

export interface FeatureAdoption {
  featureName: string;
  usageCount: number;
  lastUsed: string;
  adoptionRate: number;
}

/**
 * CRM Card Response Types
 */
export interface CRMCardResponse {
  results: CRMCardSection[];
}

export interface CRMCardSection {
  objectId: number;
  title: string;
  link?: string;
  linkLabel?: string;
  properties: CRMCardProperty[];
  actions?: CRMCardAction[];
}

export interface CRMCardProperty {
  label: string;
  dataType: 'STRING' | 'NUMBER' | 'DATE' | 'STATUS' | 'CURRENCY';
  value: string | number;
}

export interface CRMCardAction {
  type: 'IFRAME' | 'CONFIRMATION_ACTION_HOOK' | 'ACTION_HOOK';
  width: number;
  height: number;
  uri: string;
  label: string;
  associatedObjectProperties?: string[];
}

/**
 * OAuth Types
 */
export interface OAuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
  expiresAt: number;
}

export interface OAuthState {
  portalId: string;
  tokens: OAuthTokens;
}

/**
 * Timeline Event Types
 */
export interface TimelineEvent {
  eventTemplateId: string;
  email?: string;
  objectId?: string;
  tokens: Record<string, string>;
  extraData?: Record<string, unknown>;
  timestamp?: number;
}

/**
 * API Response Types
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/**
 * ML Usage Trend Detection Types
 */
export type BehavioralTrendClassification = 
  | 'accelerating_usage'
  | 'healthy_growth'
  | 'stabilizing'
  | 'soft_decline'
  | 'sharp_decline'
  | 'near_abandonment';

export interface MLUsageTrend {
  companyId: string;
  trendScore: number; // 0-100
  classification: BehavioralTrendClassification;
  volatilityIndex: number; // Standard deviation of engagement
  trendDirection: number; // Linear regression slope (positive = increasing)
  trendStrength: number; // RMSE-normalized magnitude
  usageSignature: string; // Cluster identifier
  cohortDrift: {
    previousCohort: string;
    currentCohort: string;
    driftDetected: boolean;
  };
  weeklyDeltas: number[]; // Week-over-week change percentages
  movingAverage: number; // 7-day moving average
  featureBreakdown: FeatureTrendBreakdown[];
  calculatedAt: string;
}

export interface FeatureTrendBreakdown {
  featureName: string;
  slope: number;
  usageCount: number;
  trendDirection: 'up' | 'down' | 'stable';
}

/**
 * Onboarding Health Score Types
 */
export type OnboardingStatus = 
  | 'on_track'
  | 'behind'
  | 'blocked'
  | 'at_risk';

export interface OnboardingMilestone {
  name: string;
  completed: boolean;
  completedAt?: string;
  expectedByDay: number; // Days after onboarding start
  expectedDate: string;  // ISO date string
  isAhaMoment: boolean;
  weight: number;
}

export interface OnboardingHealthScore {
  companyId: string;
  score: number; // 0-100
  status: OnboardingStatus;
  milestoneCoverageScore: number;
  timeToFirstValue: number | null; // Days, null if not achieved
  ahaMomentsReached: number;
  ahaMomentsTotal: number;
  onboardingForecastScore: number; // Predicted activation at Day 30
  milestones: OnboardingMilestone[];
  daysSinceOnboarding: number;
  recommendations: string[];
  calculatedAt: string;
}

/**
 * Expansion Prediction Types
 */
export type ExpansionHorizon = 
  | 'ready_now'      // <30 days
  | 'likely_soon'    // 30-60 days
  | 'potential'      // 60-90 days
  | 'not_likely';    // >90 days or unlikely

export type ExpansionVector = 
  | 'seat_growth'
  | 'add_ons'
  | 'feature_upgrades'
  | 'usage_based';

export interface ExpansionPrediction {
  companyId: string;
  likelihoodScore: number; // 0-100
  horizon: ExpansionHorizon;
  vectors: ExpansionVectorDetail[];
  seatUtilization: {
    currentSeats: number;
    licensedSeats: number;
    utilizationPercent: number;
    powerUsers: number;
  };
  expansionSignals: ExpansionSignal[];
  recommendations: string[];
  calculatedAt: string;
}

export interface ExpansionVectorDetail {
  type: ExpansionVector;
  score: number;
  confidence: number;
  reasoning: string;
}

export interface ExpansionSignal {
  type: string;
  strength: 'strong' | 'moderate' | 'weak';
  description: string;
  detectedAt: string;
}

/**
 * Customer Intelligence Suite Combined Types
 */
export interface CustomerIntelligenceSuite {
  companyId: string;
  renewalHealth: RenewalHealthScore;
  mlTrend?: MLUsageTrend;
  onboardingHealth?: OnboardingHealthScore;
  expansionPrediction?: ExpansionPrediction;
  calculatedAt: string;
}
