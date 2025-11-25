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
