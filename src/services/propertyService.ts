import { getHubSpotClient } from './hubspotService';
import { 
  RenewalHealthScore, 
  MLUsageTrend, 
  OnboardingHealthScore, 
  ExpansionPrediction 
} from '../types';

type PropertyType = 'number' | 'enumeration' | 'datetime' | 'string';
type FieldType = 'number' | 'select' | 'date' | 'text';

interface PropertyDefinition {
  name: string;
  label: string;
  type: PropertyType;
  fieldType: FieldType;
  groupName: string;
  description: string;
  options?: Array<{ label: string; value: string }>;
}

/**
 * Property input structure for HubSpot API
 * Using explicit interface instead of 'any' for type safety
 */
interface HubSpotPropertyInput {
  name: string;
  label: string;
  type: PropertyType;
  fieldType: FieldType;
  groupName: string;
  description: string;
  options?: Array<{ label: string; value: string }>;
}

/**
 * Search request structure for HubSpot API
 */
interface HubSpotSearchRequest {
  filterGroups: Array<{
    filters: Array<{
      propertyName: string;
      operator: string;
      value: string;
    }>;
  }>;
  properties: string[];
  limit: number;
}

/**
 * Custom property definitions for renewal health
 */
const RENEWAL_HEALTH_PROPERTIES: PropertyDefinition[] = [
  {
    name: 'renewal_health_score',
    label: 'Renewal Health Score',
    type: 'number',
    fieldType: 'number',
    groupName: 'companyinformation',
    description: 'Overall renewal health score (0-100)'
  },
  {
    name: 'renewal_risk_level',
    label: 'Renewal Risk Level',
    type: 'enumeration',
    fieldType: 'select',
    groupName: 'companyinformation',
    description: 'Churn risk classification',
    options: [
      { label: 'Low', value: 'low' },
      { label: 'Medium', value: 'medium' },
      { label: 'High', value: 'high' },
      { label: 'Critical', value: 'critical' }
    ]
  },
  {
    name: 'last_product_activity',
    label: 'Last Product Activity',
    type: 'datetime',
    fieldType: 'date',
    groupName: 'companyinformation',
    description: 'Date of most recent product usage'
  },
  {
    name: 'product_usage_30d',
    label: 'Product Usage (30 days)',
    type: 'number',
    fieldType: 'number',
    groupName: 'companyinformation',
    description: 'Number of usage events in last 30 days'
  },
  {
    name: 'features_adopted',
    label: 'Features Adopted',
    type: 'number',
    fieldType: 'number',
    groupName: 'companyinformation',
    description: 'Number of features being used'
  },
  {
    name: 'renewal_health_updated',
    label: 'Health Score Updated',
    type: 'datetime',
    fieldType: 'date',
    groupName: 'companyinformation',
    description: 'When the health score was last calculated'
  }
];

/**
 * ML Usage Trend property definitions
 */
const ML_TREND_PROPERTIES: PropertyDefinition[] = [
  {
    name: 'renewal_usage_trend_ml',
    label: 'ML Usage Trend Classification',
    type: 'enumeration',
    fieldType: 'select',
    groupName: 'companyinformation',
    description: 'ML-based behavioral trend classification',
    options: [
      { label: 'Accelerating Usage', value: 'accelerating_usage' },
      { label: 'Healthy Growth', value: 'healthy_growth' },
      { label: 'Stabilizing', value: 'stabilizing' },
      { label: 'Soft Decline', value: 'soft_decline' },
      { label: 'Sharp Decline', value: 'sharp_decline' },
      { label: 'Near Abandonment', value: 'near_abandonment' }
    ]
  },
  {
    name: 'renewal_trend_score_ml',
    label: 'ML Trend Score',
    type: 'number',
    fieldType: 'number',
    groupName: 'companyinformation',
    description: 'ML-calculated trend score (0-100)'
  },
  {
    name: 'usage_volatility_index',
    label: 'Usage Volatility Index',
    type: 'number',
    fieldType: 'number',
    groupName: 'companyinformation',
    description: 'Standard deviation of engagement (0-1)'
  },
  {
    name: 'usage_signature_cluster',
    label: 'Usage Signature Cluster',
    type: 'string',
    fieldType: 'text',
    groupName: 'companyinformation',
    description: 'Customer usage pattern cluster identifier'
  },
  {
    name: 'cohort_drift_detected',
    label: 'Cohort Drift Detected',
    type: 'enumeration',
    fieldType: 'select',
    groupName: 'companyinformation',
    description: 'Whether customer has shifted to a riskier cohort',
    options: [
      { label: 'Yes', value: 'true' },
      { label: 'No', value: 'false' }
    ]
  }
];

/**
 * Onboarding Health property definitions
 */
const ONBOARDING_PROPERTIES: PropertyDefinition[] = [
  {
    name: 'onboarding_health_score',
    label: 'Onboarding Health Score',
    type: 'number',
    fieldType: 'number',
    groupName: 'companyinformation',
    description: 'Early-stage activation health score (0-100)'
  },
  {
    name: 'onboarding_status',
    label: 'Onboarding Status',
    type: 'enumeration',
    fieldType: 'select',
    groupName: 'companyinformation',
    description: 'Current onboarding progress status',
    options: [
      { label: 'On Track', value: 'on_track' },
      { label: 'Behind', value: 'behind' },
      { label: 'Blocked', value: 'blocked' },
      { label: 'At Risk', value: 'at_risk' }
    ]
  },
  {
    name: 'time_to_first_value',
    label: 'Time to First Value (Days)',
    type: 'number',
    fieldType: 'number',
    groupName: 'companyinformation',
    description: 'Days until first aha-moment milestone achieved'
  },
  {
    name: 'onboarding_forecast_score',
    label: 'Onboarding Forecast Score',
    type: 'number',
    fieldType: 'number',
    groupName: 'companyinformation',
    description: 'Predicted activation level at Day 30'
  },
  {
    name: 'onboarding_milestone_coverage',
    label: 'Milestone Coverage',
    type: 'number',
    fieldType: 'number',
    groupName: 'companyinformation',
    description: 'Percentage of expected milestones completed'
  }
];

/**
 * Expansion Prediction property definitions
 */
const EXPANSION_PROPERTIES: PropertyDefinition[] = [
  {
    name: 'expansion_likelihood_score',
    label: 'Expansion Likelihood Score',
    type: 'number',
    fieldType: 'number',
    groupName: 'companyinformation',
    description: 'Predicted expansion likelihood (0-100)'
  },
  {
    name: 'expansion_prediction_window',
    label: 'Expansion Prediction Window',
    type: 'enumeration',
    fieldType: 'select',
    groupName: 'companyinformation',
    description: 'Expected timeframe for expansion opportunity',
    options: [
      { label: 'Ready Now (<30 days)', value: 'ready_now' },
      { label: 'Likely Soon (30-60 days)', value: 'likely_soon' },
      { label: 'Potential (60-90 days)', value: 'potential' },
      { label: 'Not Likely', value: 'not_likely' }
    ]
  },
  {
    name: 'expansion_recommendation_type',
    label: 'Top Expansion Vector',
    type: 'enumeration',
    fieldType: 'select',
    groupName: 'companyinformation',
    description: 'Primary expansion opportunity type',
    options: [
      { label: 'Seat Growth', value: 'seat_growth' },
      { label: 'Add-Ons', value: 'add_ons' },
      { label: 'Feature Upgrades', value: 'feature_upgrades' },
      { label: 'Usage-Based Expansion', value: 'usage_based' }
    ]
  },
  {
    name: 'seat_utilization_percent',
    label: 'Seat Utilization %',
    type: 'number',
    fieldType: 'number',
    groupName: 'companyinformation',
    description: 'Percentage of licensed seats being used'
  },
  {
    name: 'power_user_count',
    label: 'Power User Count',
    type: 'number',
    fieldType: 'number',
    groupName: 'companyinformation',
    description: 'Number of highly active users'
  }
];

/**
 * All property definitions combined
 */
const ALL_PROPERTIES: PropertyDefinition[] = [
  ...RENEWAL_HEALTH_PROPERTIES,
  ...ML_TREND_PROPERTIES,
  ...ONBOARDING_PROPERTIES,
  ...EXPANSION_PROPERTIES
];

/**
 * Create custom properties in HubSpot if they don't exist
 */
export async function ensureCustomProperties(portalId: string): Promise<void> {
  const client = await getHubSpotClient(portalId);
  
  for (const propDef of ALL_PROPERTIES) {
    try {
      // Check if property exists
      await client.crm.properties.coreApi.getByName('companies', propDef.name);
    } catch {
      // Property doesn't exist, create it
      try {
        const propertyInput: HubSpotPropertyInput = {
          name: propDef.name,
          label: propDef.label,
          type: propDef.type,
          fieldType: propDef.fieldType,
          groupName: propDef.groupName,
          description: propDef.description
        };
        
        if (propDef.options) {
          propertyInput.options = propDef.options;
        }
        
        // Cast to satisfy HubSpot SDK's strict enum types
        await client.crm.properties.coreApi.create('companies', propertyInput as Parameters<typeof client.crm.properties.coreApi.create>[1]);
        console.log(`Created property: ${propDef.name}`);
      } catch (createError) {
        console.error(`Failed to create property ${propDef.name}:`, createError);
      }
    }
  }
}

/**
 * Update company properties with health score data
 */
export async function updateCompanyHealthScore(
  portalId: string,
  companyId: string,
  healthScore: RenewalHealthScore,
  usageCount: number,
  lastActivity: string | null,
  featuresCount: number
): Promise<void> {
  const client = await getHubSpotClient(portalId);
  
  const properties: Record<string, string> = {
    renewal_health_score: String(healthScore.score),
    renewal_risk_level: healthScore.riskLevel,
    product_usage_30d: String(usageCount),
    features_adopted: String(featuresCount),
    renewal_health_updated: new Date().toISOString()
  };
  
  if (lastActivity) {
    properties.last_product_activity = lastActivity;
  }
  
  await client.crm.companies.basicApi.update(companyId, { properties });
}

/**
 * Batch update company properties
 */
export async function batchUpdateCompanyHealthScores(
  portalId: string,
  updates: Array<{
    companyId: string;
    healthScore: RenewalHealthScore;
    usageCount: number;
    lastActivity: string | null;
    featuresCount: number;
  }>
): Promise<{ success: number; failed: number }> {
  let success = 0;
  let failed = 0;

  for (const update of updates) {
    try {
      await updateCompanyHealthScore(
        portalId,
        update.companyId,
        update.healthScore,
        update.usageCount,
        update.lastActivity,
        update.featuresCount
      );
      success++;
    } catch (error) {
      console.error(`Failed to update company ${update.companyId}:`, error);
      failed++;
    }
  }

  return { success, failed };
}

/**
 * Get company by ID from HubSpot
 */
export async function getCompany(portalId: string, companyId: string) {
  const client = await getHubSpotClient(portalId);
  return await client.crm.companies.basicApi.getById(companyId, [
    'name',
    'domain',
    'renewal_health_score',
    'renewal_risk_level',
    'last_product_activity',
    'product_usage_30d',
    'features_adopted'
  ]);
}

/**
 * Search companies by domain
 */
export async function searchCompaniesByDomain(portalId: string, domain: string) {
  const client = await getHubSpotClient(portalId);
  
  const searchRequest: HubSpotSearchRequest = {
    filterGroups: [{
      filters: [{
        propertyName: 'domain',
        operator: 'EQ',
        value: domain
      }]
    }],
    properties: ['name', 'domain', 'renewal_health_score', 'renewal_risk_level'],
    limit: 10
  };
  
  // Cast to satisfy HubSpot SDK's strict enum types for operator
  return await client.crm.companies.searchApi.doSearch(searchRequest as Parameters<typeof client.crm.companies.searchApi.doSearch>[0]);
}

/**
 * Update company with ML Usage Trend data
 */
export async function updateCompanyMLTrend(
  portalId: string,
  companyId: string,
  mlTrend: MLUsageTrend
): Promise<void> {
  const client = await getHubSpotClient(portalId);
  
  const properties: Record<string, string> = {
    renewal_usage_trend_ml: mlTrend.classification,
    renewal_trend_score_ml: String(mlTrend.trendScore),
    usage_volatility_index: String(Math.round(mlTrend.volatilityIndex * 100) / 100),
    usage_signature_cluster: mlTrend.usageSignature,
    cohort_drift_detected: String(mlTrend.cohortDrift.driftDetected)
  };
  
  await client.crm.companies.basicApi.update(companyId, { properties });
}

/**
 * Update company with Onboarding Health data
 */
export async function updateCompanyOnboardingHealth(
  portalId: string,
  companyId: string,
  onboarding: OnboardingHealthScore
): Promise<void> {
  const client = await getHubSpotClient(portalId);
  
  const properties: Record<string, string> = {
    onboarding_health_score: String(onboarding.score),
    onboarding_status: onboarding.status,
    onboarding_forecast_score: String(onboarding.onboardingForecastScore),
    onboarding_milestone_coverage: String(onboarding.milestoneCoverageScore)
  };
  
  if (onboarding.timeToFirstValue !== null) {
    properties.time_to_first_value = String(onboarding.timeToFirstValue);
  }
  
  await client.crm.companies.basicApi.update(companyId, { properties });
}

/**
 * Update company with Expansion Prediction data
 */
export async function updateCompanyExpansionPrediction(
  portalId: string,
  companyId: string,
  expansion: ExpansionPrediction
): Promise<void> {
  const client = await getHubSpotClient(portalId);
  
  const topVector = expansion.vectors[0];
  
  const properties: Record<string, string> = {
    expansion_likelihood_score: String(expansion.likelihoodScore),
    expansion_prediction_window: expansion.horizon,
    seat_utilization_percent: String(expansion.seatUtilization.utilizationPercent),
    power_user_count: String(expansion.seatUtilization.powerUsers)
  };
  
  if (topVector) {
    properties.expansion_recommendation_type = topVector.type;
  }
  
  await client.crm.companies.basicApi.update(companyId, { properties });
}

/**
 * Update all customer intelligence data for a company
 */
export async function updateCompanyIntelligenceSuite(
  portalId: string,
  companyId: string,
  healthScore: RenewalHealthScore,
  mlTrend: MLUsageTrend,
  onboarding: OnboardingHealthScore,
  expansion: ExpansionPrediction,
  usageCount: number,
  lastActivity: string | null,
  featuresCount: number
): Promise<void> {
  const client = await getHubSpotClient(portalId);
  
  const topVector = expansion.vectors[0];
  
  const properties: Record<string, string> = {
    // Renewal Health
    renewal_health_score: String(healthScore.score),
    renewal_risk_level: healthScore.riskLevel,
    product_usage_30d: String(usageCount),
    features_adopted: String(featuresCount),
    renewal_health_updated: new Date().toISOString(),
    // ML Trend
    renewal_usage_trend_ml: mlTrend.classification,
    renewal_trend_score_ml: String(mlTrend.trendScore),
    usage_volatility_index: String(Math.round(mlTrend.volatilityIndex * 100) / 100),
    usage_signature_cluster: mlTrend.usageSignature,
    cohort_drift_detected: String(mlTrend.cohortDrift.driftDetected),
    // Onboarding
    onboarding_health_score: String(onboarding.score),
    onboarding_status: onboarding.status,
    onboarding_forecast_score: String(onboarding.onboardingForecastScore),
    onboarding_milestone_coverage: String(onboarding.milestoneCoverageScore),
    // Expansion
    expansion_likelihood_score: String(expansion.likelihoodScore),
    expansion_prediction_window: expansion.horizon,
    seat_utilization_percent: String(expansion.seatUtilization.utilizationPercent),
    power_user_count: String(expansion.seatUtilization.powerUsers)
  };
  
  if (lastActivity) {
    properties.last_product_activity = lastActivity;
  }
  
  if (onboarding.timeToFirstValue !== null) {
    properties.time_to_first_value = String(onboarding.timeToFirstValue);
  }
  
  if (topVector) {
    properties.expansion_recommendation_type = topVector.type;
  }
  
  await client.crm.companies.basicApi.update(companyId, { properties });
}

/**
 * Get company with all intelligence properties
 */
export async function getCompanyWithIntelligence(portalId: string, companyId: string) {
  const client = await getHubSpotClient(portalId);
  return await client.crm.companies.basicApi.getById(companyId, [
    'name',
    'domain',
    // Renewal Health
    'renewal_health_score',
    'renewal_risk_level',
    'last_product_activity',
    'product_usage_30d',
    'features_adopted',
    // ML Trend
    'renewal_usage_trend_ml',
    'renewal_trend_score_ml',
    'usage_volatility_index',
    'usage_signature_cluster',
    'cohort_drift_detected',
    // Onboarding
    'onboarding_health_score',
    'onboarding_status',
    'time_to_first_value',
    'onboarding_forecast_score',
    'onboarding_milestone_coverage',
    // Expansion
    'expansion_likelihood_score',
    'expansion_prediction_window',
    'expansion_recommendation_type',
    'seat_utilization_percent',
    'power_user_count'
  ]);
}
