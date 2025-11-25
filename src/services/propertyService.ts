import { getHubSpotClient } from './hubspotService';
import { RenewalHealthScore } from '../types';

type PropertyType = 'number' | 'enumeration' | 'datetime';
type FieldType = 'number' | 'select' | 'date';

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
 * Create custom properties in HubSpot if they don't exist
 */
export async function ensureCustomProperties(portalId: string): Promise<void> {
  const client = await getHubSpotClient(portalId);
  
  for (const propDef of RENEWAL_HEALTH_PROPERTIES) {
    try {
      // Check if property exists
      await client.crm.properties.coreApi.getByName('companies', propDef.name);
    } catch {
      // Property doesn't exist, create it
      try {
        // Use 'as any' to bypass strict HubSpot SDK types
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const propertyInput: any = {
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
        
        await client.crm.properties.coreApi.create('companies', propertyInput);
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
  
  // Use 'as any' to bypass strict HubSpot SDK types for search request
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const searchRequest: any = {
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
  
  return await client.crm.companies.searchApi.doSearch(searchRequest);
}
