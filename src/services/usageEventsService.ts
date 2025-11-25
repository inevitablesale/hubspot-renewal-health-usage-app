import { randomUUID } from 'crypto';
import { UsageEvent, UsageEventInput, UsageTrend, FeatureAdoption } from '../types';

/**
 * In-memory storage for usage events
 * In production, use a persistent database
 */
const usageEvents: Map<string, UsageEvent[]> = new Map();

/**
 * Store a new usage event
 */
export function storeUsageEvent(input: UsageEventInput): UsageEvent {
  const companyKey = input.companyId || input.externalCompanyId;
  if (!companyKey) {
    throw new Error('Either companyId or externalCompanyId is required');
  }

  const event: UsageEvent = {
    eventId: randomUUID(),
    companyId: input.companyId || '',
    externalCompanyId: input.externalCompanyId,
    eventType: input.eventType,
    featureName: input.featureName,
    timestamp: input.timestamp || new Date().toISOString(),
    metadata: input.metadata
  };

  const existingEvents = usageEvents.get(companyKey) || [];
  existingEvents.push(event);
  usageEvents.set(companyKey, existingEvents);

  return event;
}

/**
 * Get usage events for a company
 */
export function getUsageEvents(companyId: string, days: number = 30): UsageEvent[] {
  const events = usageEvents.get(companyId) || [];
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  return events.filter(event => new Date(event.timestamp) >= cutoffDate);
}

/**
 * Calculate usage trends for a company
 */
export function calculateUsageTrends(companyId: string): UsageTrend[] {
  const events = getUsageEvents(companyId, 90);
  const trends: UsageTrend[] = [];

  // Group events by week
  const weeklyGroups: Map<string, UsageEvent[]> = new Map();
  events.forEach(event => {
    const date = new Date(event.timestamp);
    const weekStart = new Date(date);
    weekStart.setDate(date.getDate() - date.getDay());
    const weekKey = weekStart.toISOString().split('T')[0];
    
    const weekEvents = weeklyGroups.get(weekKey) || [];
    weekEvents.push(event);
    weeklyGroups.set(weekKey, weekEvents);
  });

  // Calculate trends for each week
  const sortedWeeks = Array.from(weeklyGroups.keys()).sort();
  let previousCount = 0;

  sortedWeeks.forEach((week, index) => {
    const weekEvents = weeklyGroups.get(week) || [];
    const eventCount = weekEvents.length;
    const uniqueFeatures = new Set(weekEvents.map(e => e.featureName).filter(Boolean));
    const uniqueUsers = new Set(weekEvents.map(e => e.metadata?.userId).filter(Boolean));

    let trend: 'increasing' | 'decreasing' | 'stable' = 'stable';
    if (index > 0) {
      if (eventCount > previousCount * 1.1) {
        trend = 'increasing';
      } else if (eventCount < previousCount * 0.9) {
        trend = 'decreasing';
      }
    }

    trends.push({
      period: week,
      eventCount,
      activeUsers: uniqueUsers.size,
      featuresUsed: uniqueFeatures.size,
      trend
    });

    previousCount = eventCount;
  });

  return trends;
}

/**
 * Calculate feature adoption metrics for a company
 */
export function calculateFeatureAdoption(companyId: string): FeatureAdoption[] {
  const events = getUsageEvents(companyId, 90);
  const featureMap: Map<string, { count: number; lastUsed: string }> = new Map();

  events.forEach(event => {
    if (event.featureName) {
      const existing = featureMap.get(event.featureName) || { count: 0, lastUsed: '' };
      existing.count++;
      if (!existing.lastUsed || event.timestamp > existing.lastUsed) {
        existing.lastUsed = event.timestamp;
      }
      featureMap.set(event.featureName, existing);
    }
  });

  const totalEvents = events.length || 1;
  const adoption: FeatureAdoption[] = [];

  featureMap.forEach((data, featureName) => {
    adoption.push({
      featureName,
      usageCount: data.count,
      lastUsed: data.lastUsed,
      adoptionRate: Math.round((data.count / totalEvents) * 100)
    });
  });

  // Sort by usage count descending
  return adoption.sort((a, b) => b.usageCount - a.usageCount);
}

/**
 * Batch store multiple usage events
 */
export function batchStoreUsageEvents(events: UsageEventInput[]): UsageEvent[] {
  return events.map(event => storeUsageEvent(event));
}

/**
 * Clear all usage events for a company (useful for testing)
 */
export function clearUsageEvents(companyId: string): void {
  usageEvents.delete(companyId);
}

/**
 * Get all stored company IDs (useful for batch processing)
 */
export function getAllCompanyIds(): string[] {
  return Array.from(usageEvents.keys());
}
