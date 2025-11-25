import { Router, Request, Response } from 'express';
import { calculateRenewalHealthScore } from '../services/scoringService';
import { calculateUsageTrends, calculateFeatureAdoption, getUsageEvents } from '../services/usageEventsService';
import { calculateMLUsageTrend } from '../services/mlTrendService';
import { calculateOnboardingHealthScore } from '../services/onboardingService';
import { calculateExpansionPrediction } from '../services/expansionService';
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
    const mlTrend = calculateMLUsageTrend(companyId);
    const onboarding = calculateOnboardingHealthScore(companyId);
    const expansion = calculateExpansionPrediction(companyId);

    // Build CRM card response with multiple sections
    const sections: CRMCardSection[] = [];

    // Section 1: Renewal Health (existing)
    const renewalProperties: CRMCardProperty[] = [
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
        renewalProperties.push({
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
        renewalProperties.push({
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
        renewalProperties.push({
          label: 'Top Recommendation',
          dataType: 'STRING',
          value: topRecommendation
        });
      }
    }

    sections.push({
      objectId: parseInt(companyId, 10) || 0,
      title: '🔄 Renewal Health',
      properties: renewalProperties,
      actions: [
        {
          type: 'IFRAME',
          width: 900,
          height: 800,
          uri: `${process.env.APP_URL || 'http://localhost:3000'}/api/crm-card/details?companyId=${companyId}`,
          label: 'View Full Intelligence'
        }
      ]
    });

    // Section 2: ML Usage Trends
    const mlProperties: CRMCardProperty[] = [
      {
        label: 'Trend Score',
        dataType: 'NUMBER',
        value: mlTrend.trendScore
      },
      {
        label: 'Behavior',
        dataType: 'STATUS',
        value: getMLClassificationDisplay(mlTrend.classification)
      },
      {
        label: 'Volatility',
        dataType: 'STRING',
        value: getVolatilityDisplay(mlTrend.volatilityIndex)
      },
      {
        label: 'Cohort',
        dataType: 'STRING',
        value: mlTrend.cohortDrift.currentCohort
      }
    ];

    if (mlTrend.cohortDrift.driftDetected) {
      mlProperties.push({
        label: '⚠️ Alert',
        dataType: 'STRING',
        value: `Drift from ${mlTrend.cohortDrift.previousCohort}`
      });
    }

    sections.push({
      objectId: parseInt(companyId, 10) || 0,
      title: '📊 ML Usage Trends',
      properties: mlProperties
    });

    // Section 3: Onboarding Health
    const onboardingProperties: CRMCardProperty[] = [
      {
        label: 'Onboarding Score',
        dataType: 'NUMBER',
        value: onboarding.score
      },
      {
        label: 'Status',
        dataType: 'STATUS',
        value: getOnboardingStatusDisplay(onboarding.status)
      },
      {
        label: 'Milestone Coverage',
        dataType: 'STRING',
        value: `${onboarding.milestoneCoverageScore}%`
      },
      {
        label: 'Aha Moments',
        dataType: 'STRING',
        value: `${onboarding.ahaMomentsReached}/${onboarding.ahaMomentsTotal}`
      }
    ];

    if (onboarding.timeToFirstValue !== null) {
      onboardingProperties.push({
        label: 'Time to Value',
        dataType: 'STRING',
        value: `${onboarding.timeToFirstValue} days`
      });
    }

    onboardingProperties.push({
      label: 'Day 30 Forecast',
      dataType: 'NUMBER',
      value: onboarding.onboardingForecastScore
    });

    sections.push({
      objectId: parseInt(companyId, 10) || 0,
      title: '🚀 Onboarding Health',
      properties: onboardingProperties
    });

    // Section 4: Expansion Prediction
    const expansionProperties: CRMCardProperty[] = [
      {
        label: 'Expansion Score',
        dataType: 'NUMBER',
        value: expansion.likelihoodScore
      },
      {
        label: 'Window',
        dataType: 'STATUS',
        value: getExpansionHorizonDisplay(expansion.horizon)
      },
      {
        label: 'Seat Utilization',
        dataType: 'STRING',
        value: `${expansion.seatUtilization.utilizationPercent}%`
      },
      {
        label: 'Power Users',
        dataType: 'NUMBER',
        value: expansion.seatUtilization.powerUsers
      }
    ];

    const topVector = expansion.vectors[0];
    if (topVector) {
      expansionProperties.push({
        label: 'Top Opportunity',
        dataType: 'STRING',
        value: getExpansionVectorDisplay(topVector.type)
      });
    }

    if (expansion.expansionSignals.length > 0) {
      const strongSignals = expansion.expansionSignals.filter(s => s.strength === 'strong');
      if (strongSignals.length > 0) {
        expansionProperties.push({
          label: '🔥 Strong Signals',
          dataType: 'NUMBER',
          value: strongSignals.length
        });
      }
    }

    sections.push({
      objectId: parseInt(companyId, 10) || 0,
      title: '📈 Expansion Prediction',
      properties: expansionProperties
    });

    res.json({
      results: sections
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

function getMLClassificationDisplay(classification: string): string {
  const displays: Record<string, string> = {
    accelerating_usage: '🚀 Accelerating',
    healthy_growth: '🟢 Healthy Growth',
    stabilizing: '➡️ Stabilizing',
    soft_decline: '🟡 Soft Decline',
    sharp_decline: '🟠 Sharp Decline',
    near_abandonment: '🔴 Near Abandonment'
  };
  return displays[classification] || classification;
}

function getVolatilityDisplay(volatility: number): string {
  if (volatility < 0.2) return '🟢 Low';
  if (volatility < 0.5) return '🟡 Moderate';
  return '🔴 High';
}

function getOnboardingStatusDisplay(status: string): string {
  const displays: Record<string, string> = {
    on_track: '🟢 On Track',
    behind: '🟡 Behind',
    blocked: '🔴 Blocked',
    at_risk: '🟠 At Risk'
  };
  return displays[status] || status;
}

function getExpansionHorizonDisplay(horizon: string): string {
  const displays: Record<string, string> = {
    ready_now: '🟢 Ready Now',
    likely_soon: '🟡 30-60 Days',
    potential: '🔵 60-90 Days',
    not_likely: '⚪ Not Likely'
  };
  return displays[horizon] || horizon;
}

function getExpansionVectorDisplay(vector: string): string {
  const displays: Record<string, string> = {
    seat_growth: '👥 Seat Growth',
    add_ons: '➕ Add-Ons',
    feature_upgrades: '⬆️ Feature Upgrade',
    usage_based: '📊 Usage-Based'
  };
  return displays[vector] || vector;
}

function generateDetailedHtml(
  healthScore: ReturnType<typeof calculateRenewalHealthScore>,
  trends: ReturnType<typeof calculateUsageTrends>,
  features: ReturnType<typeof calculateFeatureAdoption>
): string {
  // Get additional intelligence data
  const companyId = healthScore.companyId;
  const mlTrend = calculateMLUsageTrend(companyId);
  const onboarding = calculateOnboardingHealthScore(companyId);
  const expansion = calculateExpansionPrediction(companyId);
  
  const riskColors: Record<string, string> = {
    low: '#28a745',
    medium: '#ffc107',
    high: '#fd7e14',
    critical: '#dc3545'
  };

  const onboardingColors: Record<string, string> = {
    on_track: '#28a745',
    behind: '#ffc107',
    blocked: '#dc3545',
    at_risk: '#fd7e14'
  };

  const expansionColors: Record<string, string> = {
    ready_now: '#28a745',
    likely_soon: '#ffc107',
    potential: '#17a2b8',
    not_likely: '#6c757d'
  };

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Customer Intelligence Suite</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif; padding: 20px; background: #f5f8fa; color: #33475b; }
    .dashboard { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; margin-bottom: 24px; }
    .score-card { background: white; border-radius: 8px; padding: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); text-align: center; }
    .score-value { font-size: 36px; font-weight: bold; margin: 8px 0; }
    .score-label { font-size: 12px; text-transform: uppercase; color: #7c98b6; font-weight: 600; }
    .score-status { font-size: 14px; margin-top: 8px; }
    .section { background: white; border-radius: 8px; padding: 16px; margin-bottom: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .section-title { font-size: 16px; font-weight: 600; margin-bottom: 12px; color: #33475b; display: flex; align-items: center; gap: 8px; }
    .row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; }
    .row:last-child { border-bottom: none; }
    .row-label { font-weight: 500; }
    .row-value { color: #516f90; }
    .recommendation { padding: 8px 12px; background: #f5f8fa; border-radius: 4px; margin-bottom: 8px; font-size: 14px; }
    .feature { display: flex; justify-content: space-between; padding: 6px 0; }
    .trend-chart { display: flex; align-items: flex-end; height: 60px; gap: 4px; margin-top: 12px; }
    .trend-bar { background: #0091ae; border-radius: 2px 2px 0 0; min-width: 20px; }
    .no-data { color: #7c98b6; font-style: italic; }
    .signal { display: flex; align-items: center; gap: 8px; padding: 6px 0; }
    .signal-badge { font-size: 12px; padding: 2px 8px; border-radius: 4px; font-weight: 500; }
    .signal-strong { background: #d4edda; color: #155724; }
    .signal-moderate { background: #fff3cd; color: #856404; }
    .signal-weak { background: #e2e3e5; color: #383d41; }
    .vector { padding: 8px 0; border-bottom: 1px solid #eee; }
    .vector:last-child { border-bottom: none; }
    .vector-header { display: flex; justify-content: space-between; align-items: center; }
    .vector-score { font-weight: bold; }
    .vector-reasoning { font-size: 13px; color: #7c98b6; margin-top: 4px; }
    .progress-bar { height: 8px; background: #e9ecef; border-radius: 4px; overflow: hidden; margin-top: 4px; }
    .progress-fill { height: 100%; border-radius: 4px; }
    .tabs { display: flex; border-bottom: 2px solid #e9ecef; margin-bottom: 16px; }
    .tab { padding: 12px 20px; cursor: pointer; border-bottom: 2px solid transparent; margin-bottom: -2px; font-weight: 500; }
    .tab.active { border-bottom-color: #0091ae; color: #0091ae; }
    .tab-content { display: none; }
    .tab-content.active { display: block; }
    h1 { font-size: 24px; margin-bottom: 8px; }
    .subtitle { color: #7c98b6; margin-bottom: 24px; }
  </style>
</head>
<body>
  <h1>Customer Intelligence Suite</h1>
  <p class="subtitle">360° view of account health: Activation → Adoption → Retention → Expansion</p>

  <!-- Score Dashboard -->
  <div class="dashboard">
    <div class="score-card">
      <div class="score-label">Renewal Health</div>
      <div class="score-value" style="color: ${riskColors[healthScore.riskLevel]}">${healthScore.score}</div>
      <div class="score-status" style="color: ${riskColors[healthScore.riskLevel]}">${getRiskLevelDisplay(healthScore.riskLevel)}</div>
    </div>
    <div class="score-card">
      <div class="score-label">ML Trend Score</div>
      <div class="score-value">${mlTrend.trendScore}</div>
      <div class="score-status">${getMLClassificationDisplay(mlTrend.classification)}</div>
    </div>
    <div class="score-card">
      <div class="score-label">Onboarding Health</div>
      <div class="score-value" style="color: ${onboardingColors[onboarding.status]}">${onboarding.score}</div>
      <div class="score-status" style="color: ${onboardingColors[onboarding.status]}">${getOnboardingStatusDisplay(onboarding.status)}</div>
    </div>
    <div class="score-card">
      <div class="score-label">Expansion Likelihood</div>
      <div class="score-value" style="color: ${expansionColors[expansion.horizon]}">${expansion.likelihoodScore}</div>
      <div class="score-status" style="color: ${expansionColors[expansion.horizon]}">${getExpansionHorizonDisplay(expansion.horizon)}</div>
    </div>
  </div>

  <!-- Tabs -->
  <div class="tabs">
    <div class="tab active" onclick="showTab('renewal')">🔄 Renewal</div>
    <div class="tab" onclick="showTab('ml')">📊 ML Trends</div>
    <div class="tab" onclick="showTab('onboarding')">🚀 Onboarding</div>
    <div class="tab" onclick="showTab('expansion')">📈 Expansion</div>
  </div>

  <!-- Renewal Tab -->
  <div id="renewal" class="tab-content active">
    <div class="section">
      <div class="section-title">Score Factors</div>
      ${healthScore.factors.map(f => `
        <div class="row">
          <span class="row-label">${f.name}</span>
          <span class="row-value">${f.value}/100</span>
        </div>
        <div class="progress-bar">
          <div class="progress-fill" style="width: ${f.value}%; background: ${f.impact === 'positive' ? '#28a745' : f.impact === 'negative' ? '#dc3545' : '#ffc107'}"></div>
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
  </div>

  <!-- ML Trends Tab -->
  <div id="ml" class="tab-content">
    <div class="section">
      <div class="section-title">Behavioral Analysis</div>
      <div class="row">
        <span class="row-label">Trend Direction</span>
        <span class="row-value">${mlTrend.trendDirection > 0 ? '📈' : mlTrend.trendDirection < 0 ? '📉' : '➡️'} ${mlTrend.trendDirection.toFixed(2)}</span>
      </div>
      <div class="row">
        <span class="row-label">Trend Strength</span>
        <span class="row-value">${mlTrend.trendStrength.toFixed(1)}%</span>
      </div>
      <div class="row">
        <span class="row-label">Volatility Index</span>
        <span class="row-value">${getVolatilityDisplay(mlTrend.volatilityIndex)} (${(mlTrend.volatilityIndex * 100).toFixed(0)}%)</span>
      </div>
      <div class="row">
        <span class="row-label">Usage Signature</span>
        <span class="row-value">${mlTrend.usageSignature.replace('cluster_', '').replace(/_/g, ' ')}</span>
      </div>
      <div class="row">
        <span class="row-label">7-Day Moving Average</span>
        <span class="row-value">${mlTrend.movingAverage.toFixed(0)}% of baseline</span>
      </div>
    </div>

    <div class="section">
      <div class="section-title">Cohort Analysis</div>
      <div class="row">
        <span class="row-label">Current Cohort</span>
        <span class="row-value">${mlTrend.cohortDrift.currentCohort}</span>
      </div>
      <div class="row">
        <span class="row-label">Previous Cohort</span>
        <span class="row-value">${mlTrend.cohortDrift.previousCohort}</span>
      </div>
      ${mlTrend.cohortDrift.driftDetected ? `
        <div class="recommendation" style="background: #f8d7da; color: #721c24; margin-top: 12px;">
          ⚠️ Cohort drift detected - customer has shifted to a riskier segment
        </div>
      ` : ''}
    </div>

    <div class="section">
      <div class="section-title">Feature-Level Trends</div>
      ${mlTrend.featureBreakdown.length > 0 
        ? mlTrend.featureBreakdown.slice(0, 8).map(f => `
          <div class="row">
            <span class="row-label">${f.featureName}</span>
            <span class="row-value">${f.trendDirection === 'up' ? '📈' : f.trendDirection === 'down' ? '📉' : '➡️'} ${f.usageCount} uses</span>
          </div>
        `).join('')
        : '<p class="no-data">No feature trends available</p>'
      }
    </div>
  </div>

  <!-- Onboarding Tab -->
  <div id="onboarding" class="tab-content">
    <div class="section">
      <div class="section-title">Onboarding Progress</div>
      <div class="row">
        <span class="row-label">Days Since Onboarding</span>
        <span class="row-value">${onboarding.daysSinceOnboarding} days</span>
      </div>
      <div class="row">
        <span class="row-label">Milestone Coverage</span>
        <span class="row-value">${onboarding.milestoneCoverageScore}%</span>
      </div>
      <div class="progress-bar">
        <div class="progress-fill" style="width: ${onboarding.milestoneCoverageScore}%; background: ${onboardingColors[onboarding.status]}"></div>
      </div>
      <div class="row">
        <span class="row-label">Aha Moments Reached</span>
        <span class="row-value">${onboarding.ahaMomentsReached}/${onboarding.ahaMomentsTotal}</span>
      </div>
      ${onboarding.timeToFirstValue !== null ? `
        <div class="row">
          <span class="row-label">Time to First Value</span>
          <span class="row-value">${onboarding.timeToFirstValue} days</span>
        </div>
      ` : ''}
      <div class="row">
        <span class="row-label">Day 30 Forecast</span>
        <span class="row-value">${onboarding.onboardingForecastScore}%</span>
      </div>
    </div>

    <div class="section">
      <div class="section-title">Milestones</div>
      ${onboarding.milestones.map(m => `
        <div class="row">
          <span class="row-label">${m.completed ? '✅' : '⬜'} ${m.name.replace(/_/g, ' ')} ${m.isAhaMoment ? '⭐' : ''}</span>
          <span class="row-value">${m.completed ? 'Completed' : 'Pending'}</span>
        </div>
      `).join('')}
    </div>

    <div class="section">
      <div class="section-title">Onboarding Recommendations</div>
      ${onboarding.recommendations.length > 0 
        ? onboarding.recommendations.map(r => `<div class="recommendation">• ${r}</div>`).join('')
        : '<p class="no-data">No recommendations at this time</p>'
      }
    </div>
  </div>

  <!-- Expansion Tab -->
  <div id="expansion" class="tab-content">
    <div class="section">
      <div class="section-title">Seat Utilization</div>
      <div class="row">
        <span class="row-label">Current Seats</span>
        <span class="row-value">${expansion.seatUtilization.currentSeats}/${expansion.seatUtilization.licensedSeats}</span>
      </div>
      <div class="progress-bar">
        <div class="progress-fill" style="width: ${expansion.seatUtilization.utilizationPercent}%; background: ${expansion.seatUtilization.utilizationPercent >= 80 ? '#28a745' : expansion.seatUtilization.utilizationPercent >= 60 ? '#ffc107' : '#6c757d'}"></div>
      </div>
      <div class="row">
        <span class="row-label">Utilization</span>
        <span class="row-value">${expansion.seatUtilization.utilizationPercent}%</span>
      </div>
      <div class="row">
        <span class="row-label">Power Users</span>
        <span class="row-value">${expansion.seatUtilization.powerUsers}</span>
      </div>
    </div>

    <div class="section">
      <div class="section-title">Expansion Vectors</div>
      ${expansion.vectors.map(v => `
        <div class="vector">
          <div class="vector-header">
            <span class="row-label">${getExpansionVectorDisplay(v.type)}</span>
            <span class="vector-score">${v.score}/100</span>
          </div>
          <div class="progress-bar">
            <div class="progress-fill" style="width: ${v.score}%; background: ${v.score >= 60 ? '#28a745' : v.score >= 40 ? '#ffc107' : '#6c757d'}"></div>
          </div>
          <div class="vector-reasoning">${v.reasoning}</div>
        </div>
      `).join('')}
    </div>

    <div class="section">
      <div class="section-title">Expansion Signals</div>
      ${expansion.expansionSignals.length > 0 
        ? expansion.expansionSignals.map(s => `
          <div class="signal">
            <span class="signal-badge signal-${s.strength}">${s.strength.toUpperCase()}</span>
            <span>${s.description}</span>
          </div>
        `).join('')
        : '<p class="no-data">No strong expansion signals detected</p>'
      }
    </div>

    <div class="section">
      <div class="section-title">Expansion Recommendations</div>
      ${expansion.recommendations.length > 0 
        ? expansion.recommendations.map(r => `<div class="recommendation">• ${r}</div>`).join('')
        : '<p class="no-data">No recommendations at this time</p>'
      }
    </div>
  </div>

  <p style="text-align: center; color: #7c98b6; font-size: 12px; margin-top: 20px;">
    Last calculated: ${new Date(healthScore.calculatedAt).toLocaleString()}
  </p>

  <script>
    function showTab(tabId) {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      document.querySelector(\`[onclick="showTab('\${tabId}')"]\`).classList.add('active');
      document.getElementById(tabId).classList.add('active');
    }
  </script>
</body>
</html>
  `;
}

export default router;
