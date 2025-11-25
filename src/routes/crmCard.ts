import { Router, Request, Response } from 'express';
import { calculateRenewalHealthScore } from '../services/scoringService';
import { calculateUsageTrends, calculateFeatureAdoption, getUsageEvents } from '../services/usageEventsService';
import { CRMCardResponse, CRMCardSection, CRMCardProperty } from '../types';

const router = Router();

/**
 * GET /api/crm-card
 * HubSpot CRM card endpoint for displaying renewal health data
 * 
 * HubSpot sends these query parameters:
 * - portalId: The HubSpot portal ID
 * - associatedObjectId: The company record ID
 * - associatedObjectType: Should be "COMPANY"
 */
router.get('/', (req: Request<object, CRMCardResponse, object, { 
  portalId?: string; 
  associatedObjectId?: string;
  associatedObjectType?: string;
}>, res: Response<CRMCardResponse>) => {
  try {
    const { associatedObjectId } = req.query;
    
    if (!associatedObjectId) {
      res.json({
        results: [{
          objectId: 0,
          title: 'Error',
          properties: [{
            label: 'Error',
            dataType: 'STRING',
            value: 'Company ID not provided'
          }]
        }]
      });
      return;
    }

    const companyId = associatedObjectId;
    
    // Calculate health score and metrics
    const healthScore = calculateRenewalHealthScore(companyId);
    const trends = calculateUsageTrends(companyId);
    const features = calculateFeatureAdoption(companyId);
    const recentEvents = getUsageEvents(companyId, 30);

    // Build CRM card response
    const properties: CRMCardProperty[] = [
      {
        label: 'Health Score',
        dataType: 'NUMBER',
        value: healthScore.score
      },
      {
        label: 'Risk Level',
        dataType: 'STATUS',
        value: getRiskLevelDisplay(healthScore.riskLevel)
      },
      {
        label: 'Usage (30 days)',
        dataType: 'NUMBER',
        value: recentEvents.length
      },
      {
        label: 'Features Adopted',
        dataType: 'NUMBER',
        value: features.length
      }
    ];

    // Add usage trend if available
    if (trends.length > 0) {
      const latestTrend = trends[trends.length - 1];
      if (latestTrend) {
        properties.push({
          label: 'Usage Trend',
          dataType: 'STRING',
          value: getTrendDisplay(latestTrend.trend)
        });
      }
    }

    // Add last activity if available
    if (recentEvents.length > 0) {
      const sortedEvents = recentEvents.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
      const lastEvent = sortedEvents[0];
      if (lastEvent) {
        properties.push({
          label: 'Last Activity',
          dataType: 'DATE',
          value: lastEvent.timestamp
        });
      }
    }

    // Add top recommendation if available
    if (healthScore.recommendations.length > 0) {
      const topRecommendation = healthScore.recommendations[0];
      if (topRecommendation) {
        properties.push({
          label: 'Top Recommendation',
          dataType: 'STRING',
          value: topRecommendation
        });
      }
    }

    const section: CRMCardSection = {
      objectId: parseInt(companyId, 10) || 0,
      title: 'Renewal Health',
      properties,
      actions: [
        {
          type: 'IFRAME',
          width: 800,
          height: 600,
          uri: `${process.env.APP_URL || 'http://localhost:3000'}/api/crm-card/details?companyId=${companyId}`,
          label: 'View Details'
        }
      ]
    };

    res.json({
      results: [section]
    });
  } catch (error) {
    console.error('CRM card error:', error);
    res.json({
      results: [{
        objectId: 0,
        title: 'Error',
        properties: [{
          label: 'Error',
          dataType: 'STRING',
          value: error instanceof Error ? error.message : 'Failed to load health data'
        }]
      }]
    });
  }
});

/**
 * GET /api/crm-card/details
 * Detailed view for the CRM card iframe
 */
router.get('/details', (req: Request<object, string, object, { companyId?: string }>, res: Response) => {
  try {
    const { companyId } = req.query;
    
    if (!companyId) {
      res.status(400).send('<html><body><h1>Error: Company ID required</h1></body></html>');
      return;
    }

    const healthScore = calculateRenewalHealthScore(companyId);
    const trends = calculateUsageTrends(companyId);
    const features = calculateFeatureAdoption(companyId);

    // Generate HTML for detailed view
    const html = generateDetailedHtml(healthScore, trends, features);
    res.type('html').send(html);
  } catch (error) {
    res.status(500).send(`<html><body><h1>Error</h1><p>${error instanceof Error ? error.message : 'Unknown error'}</p></body></html>`);
  }
});

/**
 * Helper functions
 */
function getRiskLevelDisplay(riskLevel: string): string {
  const displays: Record<string, string> = {
    low: '🟢 Low Risk',
    medium: '🟡 Medium Risk',
    high: '🟠 High Risk',
    critical: '🔴 Critical'
  };
  return displays[riskLevel] || riskLevel;
}

function getTrendDisplay(trend: string): string {
  const displays: Record<string, string> = {
    increasing: '📈 Increasing',
    stable: '➡️ Stable',
    decreasing: '📉 Decreasing'
  };
  return displays[trend] || trend;
}

function generateDetailedHtml(
  healthScore: ReturnType<typeof calculateRenewalHealthScore>,
  trends: ReturnType<typeof calculateUsageTrends>,
  features: ReturnType<typeof calculateFeatureAdoption>
): string {
  const riskColors: Record<string, string> = {
    low: '#28a745',
    medium: '#ffc107',
    high: '#fd7e14',
    critical: '#dc3545'
  };

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Renewal Health Details</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif; padding: 20px; background: #f5f8fa; color: #33475b; }
    .header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; }
    .score-badge { font-size: 48px; font-weight: bold; color: ${riskColors[healthScore.riskLevel]}; }
    .risk-label { font-size: 14px; color: ${riskColors[healthScore.riskLevel]}; text-transform: uppercase; font-weight: 600; }
    .section { background: white; border-radius: 8px; padding: 16px; margin-bottom: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .section-title { font-size: 16px; font-weight: 600; margin-bottom: 12px; color: #33475b; }
    .factor { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; }
    .factor:last-child { border-bottom: none; }
    .factor-name { font-weight: 500; }
    .factor-value { color: #516f90; }
    .recommendation { padding: 8px 12px; background: #f5f8fa; border-radius: 4px; margin-bottom: 8px; font-size: 14px; }
    .feature { display: flex; justify-content: space-between; padding: 6px 0; }
    .trend-chart { display: flex; align-items: flex-end; height: 60px; gap: 4px; margin-top: 12px; }
    .trend-bar { background: #0091ae; border-radius: 2px 2px 0 0; min-width: 20px; }
    .no-data { color: #7c98b6; font-style: italic; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h1>Renewal Health Score</h1>
      <span class="risk-label">${healthScore.riskLevel} risk</span>
    </div>
    <div class="score-badge">${healthScore.score}</div>
  </div>

  <div class="section">
    <div class="section-title">Score Factors</div>
    ${healthScore.factors.map(f => `
      <div class="factor">
        <span class="factor-name">${f.name}</span>
        <span class="factor-value">${f.value}/100 (${f.description})</span>
      </div>
    `).join('')}
  </div>

  <div class="section">
    <div class="section-title">Recommendations</div>
    ${healthScore.recommendations.length > 0 
      ? healthScore.recommendations.map(r => `<div class="recommendation">• ${r}</div>`).join('')
      : '<p class="no-data">No recommendations at this time</p>'
    }
  </div>

  <div class="section">
    <div class="section-title">Usage Trends (Last 90 Days)</div>
    ${trends.length > 0 ? `
      <div class="trend-chart">
        ${trends.slice(-12).map(t => {
          const maxCount = Math.max(...trends.map(x => x.eventCount), 1);
          const height = Math.max((t.eventCount / maxCount) * 50, 4);
          return `<div class="trend-bar" style="height: ${height}px" title="${t.period}: ${t.eventCount} events"></div>`;
        }).join('')}
      </div>
    ` : '<p class="no-data">No usage data available</p>'}
  </div>

  <div class="section">
    <div class="section-title">Feature Adoption</div>
    ${features.length > 0 
      ? features.slice(0, 10).map(f => `
        <div class="feature">
          <span>${f.featureName}</span>
          <span>${f.usageCount} uses (${f.adoptionRate}%)</span>
        </div>
      `).join('')
      : '<p class="no-data">No feature data available</p>'
    }
  </div>

  <p style="text-align: center; color: #7c98b6; font-size: 12px; margin-top: 20px;">
    Last calculated: ${new Date(healthScore.calculatedAt).toLocaleString()}
  </p>
</body>
</html>
  `;
}

export default router;
