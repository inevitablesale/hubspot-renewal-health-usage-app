import { getHubSpotClient } from './hubspotService';
import { TimelineEvent } from '../types';

/**
 * Create a timeline event in HubSpot
 */
export async function createTimelineEvent(
  portalId: string,
  eventTemplateId: string,
  objectId: string,
  tokens: Record<string, string>,
  extraData?: Record<string, unknown>
): Promise<void> {
  const client = await getHubSpotClient(portalId);
  
  await client.crm.timeline.eventsApi.create({
    eventTemplateId,
    objectId,
    tokens,
    extraData
  });
}

/**
 * Create a usage event on the timeline
 */
export async function createUsageTimelineEvent(
  portalId: string,
  eventTemplateId: string,
  companyId: string,
  eventType: string,
  featureName?: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  const tokens: Record<string, string> = {
    eventType,
    timestamp: new Date().toISOString()
  };
  
  if (featureName) {
    tokens.featureName = featureName;
  }

  await createTimelineEvent(
    portalId,
    eventTemplateId,
    companyId,
    tokens,
    metadata
  );
}

/**
 * Create a health score change timeline event
 */
export async function createHealthScoreTimelineEvent(
  portalId: string,
  eventTemplateId: string,
  companyId: string,
  previousScore: number,
  newScore: number,
  riskLevel: string
): Promise<void> {
  const tokens: Record<string, string> = {
    previousScore: previousScore.toString(),
    newScore: newScore.toString(),
    riskLevel,
    timestamp: new Date().toISOString(),
    changeDirection: newScore > previousScore ? 'improved' : newScore < previousScore ? 'declined' : 'unchanged'
  };

  await createTimelineEvent(
    portalId,
    eventTemplateId,
    companyId,
    tokens
  );
}

/**
 * Batch create timeline events
 */
export async function batchCreateTimelineEvents(
  portalId: string,
  events: TimelineEvent[]
): Promise<{ success: number; failed: number }> {
  let success = 0;
  let failed = 0;

  for (const event of events) {
    try {
      await createTimelineEvent(
        portalId,
        event.eventTemplateId,
        event.objectId || '',
        event.tokens,
        event.extraData
      );
      success++;
    } catch (error) {
      console.error('Failed to create timeline event:', error);
      failed++;
    }
  }

  return { success, failed };
}
