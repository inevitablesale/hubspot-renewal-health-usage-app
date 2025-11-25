# HubSpot Customer Intelligence Suite

Installable HubSpot App that ingests product-usage data from your SaaS platform, calculates customer health scores, and surfaces 360° actionable insights directly inside HubSpot. Helps CS and revenue teams predict renewals, identify at-risk accounts, optimize onboarding, and drive expansion.

## 🎯 Customer Intelligence Suite

The app provides a comprehensive **3-in-1 Customer Intelligence Suite**:

### 1. Renewal Health (Prevent Churn)
- **Score**: 0–100 health score based on usage patterns
- **Risk Level**: Low / Medium / High / Critical classification
- **Factors**: Usage frequency, feature adoption, trends, recency, consistency
- **Recommendations**: Actionable next steps based on risk factors

### 2. ML Usage Trend Detection (Advanced Behavior Modeling)
- **Trend Score**: 0–100 ML-calculated behavioral score
- **Classification**: Accelerating Usage → Healthy Growth → Stabilizing → Soft Decline → Sharp Decline → Near-Abandonment
- **Volatility Index**: Standard deviation of engagement across intervals
- **Usage Signature**: Customer clustering by usage patterns
- **Cohort Drift Detection**: Alerts when customers shift to riskier segments

### 3. Onboarding Health (Time-to-Value Intelligence)
- **Score**: 0–100 early-stage activation health
- **Status**: On Track / Behind / Blocked / At Risk
- **Milestone Coverage**: Percentage of expected milestones completed
- **Aha Moments**: Key activation milestone tracking
- **Time-to-First-Value**: Days until first value realization
- **Day 30 Forecast**: Predicted activation level at Day 30

### 4. Expansion Prediction (Growth Intelligence)
- **Likelihood Score**: 0–100 expansion probability
- **Horizon**: Ready Now (<30 days) / Likely Soon (30-60) / Potential (60-90) / Not Likely
- **Expansion Vectors**: Seat Growth, Add-Ons, Feature Upgrades, Usage-Based
- **Seat Utilization**: Current vs licensed seats with power user identification
- **Expansion Signals**: Detection of expansion intent indicators

## Features

- **OAuth 2.0 Integration**: Secure authentication with HubSpot
- **Usage Event Ingestion**: REST API to receive product usage events from your SaaS platform
- **Renewal Health Scoring**: Algorithmic scoring engine that calculates health based on:
  - Usage frequency
  - Feature adoption
  - Usage trends (increasing/decreasing)
  - Recency of activity
  - Usage consistency
- **ML Trend Analysis**: Linear regression, volatility calculation, and behavioral clustering
- **Onboarding Tracking**: Milestone completion, aha-moment detection, and activation forecasting
- **Expansion Prediction**: Seat utilization analysis, signal detection, and opportunity scoring
- **CRM Card**: Native HubSpot card showing all intelligence panels with detailed visualizations
- **HubSpot Property Sync**: Automatically update company records with all intelligence data
- **Timeline Events**: Log usage milestones and health score changes in HubSpot

## Quick Start

### Prerequisites

- Node.js 18+ 
- npm or yarn
- HubSpot Developer Account
- HubSpot App created in the Developer Portal

### Installation

```bash
# Clone the repository
git clone https://github.com/inevitablesale/hubspot-renewal-health-usage-app.git
cd hubspot-renewal-health-usage-app

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Configure your environment variables (see Configuration section)

# Build the application
npm run build

# Start the server
npm start
```

### Development Mode

```bash
npm run dev
```

## Configuration

Create a `.env` file with the following variables:

```env
# HubSpot App Configuration
HUBSPOT_CLIENT_ID=your-client-id
HUBSPOT_CLIENT_SECRET=your-client-secret
HUBSPOT_REDIRECT_URI=http://localhost:3000/oauth/callback

# App Configuration
PORT=3000
APP_URL=http://localhost:3000
NODE_ENV=development

# API Security (optional)
API_KEY=your-secure-api-key
```

### HubSpot App Setup

1. Go to [HubSpot Developer Portal](https://developers.hubspot.com/)
2. Create a new app
3. Configure OAuth scopes:
   - `crm.objects.companies.read`
   - `crm.objects.companies.write`
   - `timeline`
   - `crm.schemas.custom.read`
4. Set the redirect URL to `{YOUR_APP_URL}/oauth/callback`
5. Copy the Client ID and Client Secret to your `.env` file

### CRM Card Setup

In your HubSpot app settings, add a CRM Card with:
- **Target URL**: `{YOUR_APP_URL}/api/crm-card`
- **Object Types**: Company
- **Fetch Data**: On card load

## API Reference

### OAuth Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/oauth/authorize` | Redirect to HubSpot OAuth |
| GET | `/oauth/callback` | OAuth callback handler |
| GET | `/oauth/status/:portalId` | Check connection status |
| DELETE | `/oauth/disconnect/:portalId` | Disconnect from portal |

### Usage Events

#### Create Usage Event

```bash
POST /api/usage-events
Content-Type: application/json
X-API-Key: your-api-key

{
  "companyId": "123456789",
  "eventType": "feature_use",
  "featureName": "dashboard",
  "timestamp": "2024-01-15T10:30:00Z",
  "metadata": {
    "userId": "user-123",
    "sessionId": "session-456"
  }
}
```

#### Batch Create Events

```bash
POST /api/usage-events/batch
Content-Type: application/json
X-API-Key: your-api-key

{
  "events": [
    { "companyId": "123", "eventType": "login" },
    { "companyId": "123", "eventType": "feature_use", "featureName": "reports" }
  ]
}
```

#### Get Events

```bash
GET /api/usage-events/:companyId?days=30
```

#### Get Usage Trends

```bash
GET /api/usage-events/:companyId/trends
```

#### Get Feature Adoption

```bash
GET /api/usage-events/:companyId/features
```

### Health Scores

#### Get Single Score

```bash
GET /api/scores/:companyId
```

Response:
```json
{
  "success": true,
  "data": {
    "companyId": "123456789",
    "score": 72,
    "riskLevel": "medium",
    "factors": [
      {
        "name": "Usage Frequency",
        "value": 80,
        "weight": 0.25,
        "impact": "positive",
        "description": "45 events in the last 90 days"
      }
    ],
    "recommendations": [
      "Offer personalized training on advanced features",
      "Share relevant use cases and success stories"
    ],
    "calculatedAt": "2024-01-15T12:00:00Z"
  }
}
```

#### Get Multiple Scores

```bash
GET /api/scores?companyIds=id1,id2,id3
```

### Customer Intelligence API

#### Get Complete Intelligence Suite

```bash
GET /api/intelligence/suite/:companyId
```

Returns all four intelligence components in a single response.

#### ML Usage Trend Analysis

```bash
# Get ML trend for single company
GET /api/intelligence/ml-trend/:companyId

# Get ML trends for multiple companies
GET /api/intelligence/ml-trend?companyIds=id1,id2,id3
```

Response:
```json
{
  "success": true,
  "data": {
    "companyId": "123456789",
    "trendScore": 72,
    "classification": "healthy_growth",
    "volatilityIndex": 0.25,
    "trendDirection": 1.5,
    "trendStrength": 35,
    "usageSignature": "cluster_growing",
    "cohortDrift": {
      "previousCohort": "Active",
      "currentCohort": "Active",
      "driftDetected": false
    },
    "weeklyDeltas": [5.2, -2.1, 8.3, 12.5],
    "movingAverage": 115,
    "featureBreakdown": [...],
    "calculatedAt": "2024-01-15T12:00:00Z"
  }
}
```

#### Onboarding Health

```bash
# Get onboarding score
GET /api/intelligence/onboarding/:companyId?startDate=2024-01-01T00:00:00Z

# Set onboarding start date
POST /api/intelligence/onboarding/:companyId/start-date
{ "startDate": "2024-01-01T00:00:00Z" }

# Get scores for multiple companies
GET /api/intelligence/onboarding?companyIds=id1,id2,id3
```

Response:
```json
{
  "success": true,
  "data": {
    "companyId": "123456789",
    "score": 68,
    "status": "on_track",
    "milestoneCoverageScore": 75,
    "timeToFirstValue": 5,
    "ahaMomentsReached": 2,
    "ahaMomentsTotal": 4,
    "onboardingForecastScore": 82,
    "milestones": [...],
    "daysSinceOnboarding": 14,
    "recommendations": [...],
    "calculatedAt": "2024-01-15T12:00:00Z"
  }
}
```

#### Expansion Prediction

```bash
# Get expansion prediction
GET /api/intelligence/expansion/:companyId

# Set seat licensing data
POST /api/intelligence/expansion/:companyId/seats
{ "licensedSeats": 25, "metadata": { "plan": "enterprise" } }

# Get predictions for multiple companies
GET /api/intelligence/expansion?companyIds=id1,id2,id3
```

Response:
```json
{
  "success": true,
  "data": {
    "companyId": "123456789",
    "likelihoodScore": 78,
    "horizon": "likely_soon",
    "vectors": [
      {
        "type": "seat_growth",
        "score": 85,
        "confidence": 0.92,
        "reasoning": "Near capacity (92% utilization) with 5 power users"
      }
    ],
    "seatUtilization": {
      "currentSeats": 23,
      "licensedSeats": 25,
      "utilizationPercent": 92,
      "powerUsers": 5
    },
    "expansionSignals": [...],
    "recommendations": [...],
    "calculatedAt": "2024-01-15T12:00:00Z"
  }
}
```

### HubSpot Integration

#### Setup Custom Properties

```bash
POST /api/hubspot/setup/:portalId
```

Creates the following properties on Company records:

**Renewal Health:**
- `renewal_health_score` - Overall score (0-100)
- `renewal_risk_level` - Risk classification (low/medium/high/critical)
- `last_product_activity` - Most recent usage date
- `product_usage_30d` - Event count in last 30 days
- `features_adopted` - Number of features used
- `renewal_health_updated` - Last calculation timestamp

**ML Trends:**
- `renewal_usage_trend_ml` - Behavioral trend classification
- `renewal_trend_score_ml` - ML trend score (0-100)
- `usage_volatility_index` - Engagement volatility
- `usage_signature_cluster` - Customer cluster identifier
- `cohort_drift_detected` - Cohort drift alert

**Onboarding:**
- `onboarding_health_score` - Onboarding score (0-100)
- `onboarding_status` - On Track / Behind / Blocked / At Risk
- `time_to_first_value` - Days to first aha-moment
- `onboarding_forecast_score` - Day 30 activation forecast
- `onboarding_milestone_coverage` - Milestone completion %

**Expansion:**
- `expansion_likelihood_score` - Expansion probability (0-100)
- `expansion_prediction_window` - Ready Now / Likely Soon / Potential / Not Likely
- `expansion_recommendation_type` - Top expansion vector
- `seat_utilization_percent` - Current seat utilization
- `power_user_count` - Number of highly active users

#### Sync Health Score to HubSpot

```bash
POST /api/hubspot/sync/:portalId/:companyId
```

#### Batch Sync

```bash
POST /api/hubspot/sync-batch/:portalId
Content-Type: application/json

{
  "companyIds": ["123", "456", "789"]
}
```

### CRM Card

The CRM card endpoint is called automatically by HubSpot and now displays four intelligence panels:

```bash
GET /api/crm-card?associatedObjectId=123&associatedObjectType=COMPANY
```

The card shows:
1. **🔄 Renewal Health** - Health score, risk level, usage metrics
2. **📊 ML Usage Trends** - Trend score, behavior classification, cohort info
3. **🚀 Onboarding Health** - Onboarding score, milestone coverage, forecasts
4. **📈 Expansion Prediction** - Likelihood score, seat utilization, opportunities

## Health Score Algorithm

The renewal health score (0-100) is calculated using five weighted factors:

| Factor | Weight | Description |
|--------|--------|-------------|
| Usage Frequency | 25% | Total events in last 90 days |
| Feature Adoption | 25% | Number of distinct features used |
| Usage Trend | 20% | Week-over-week trend direction |
| Recency | 15% | Days since last activity |
| Consistency | 15% | Regularity of usage pattern |

### Risk Level Classification

| Score | Risk Level |
|-------|------------|
| 75-100 | Low |
| 50-74 | Medium |
| 25-49 | High |
| 0-24 | Critical |

## ML Usage Trend Algorithm

The ML trend analysis uses several statistical methods:

| Component | Method |
|-----------|--------|
| Trend direction | Linear regression slope (per feature + aggregate) |
| Trend strength | RMSE-normalized magnitude |
| Volatility | Standard deviation + coefficient of variation |
| Pattern detection | Usage signature clustering |
| Cohort drift | Moving average comparison |

### Behavioral Classifications

| Classification | Criteria |
|----------------|----------|
| Accelerating Usage | Strong positive slope, usage >130% of baseline |
| Healthy Growth | Positive slope, low volatility |
| Stabilizing | Minimal slope change, consistent usage |
| Soft Decline | Moderate negative slope, usage <80% of baseline |
| Sharp Decline | Strong negative slope, usage <50% of baseline |
| Near Abandonment | Very low recent activity |

## Onboarding Health Algorithm

Onboarding score is calculated using:

| Component | Weight | Description |
|-----------|--------|-------------|
| Milestone Coverage | 40% | Percentage of expected milestones completed |
| Time to First Value | 20% | How quickly first aha-moment was achieved |
| Aha Moments | 25% | Key activation milestones reached |
| Status Adjustment | 15% | Based on on_track/behind/blocked/at_risk |

## Expansion Prediction Algorithm

Expansion likelihood is calculated from multiple vectors:

| Vector | Signals |
|--------|---------|
| Seat Growth | Utilization >80%, power user ratio, team growth |
| Add-Ons | Feature depth, premium feature interest |
| Feature Upgrades | Usage intensity, adoption breadth, trend |
| Usage-Based | Volume growth, acceleration, consistency |

### Expansion Horizons

| Horizon | Criteria |
|---------|----------|
| Ready Now (<30 days) | Score ≥75, 2+ strong signals, or 95%+ seat utilization |
| Likely Soon (30-60) | Score ≥55, 1+ strong signal, or 80%+ seat utilization |
| Potential (60-90) | Score ≥35 |
| Not Likely | Score <35 |

## Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## Project Structure

```
├── src/
│   ├── app.ts              # Express app configuration
│   ├── index.ts            # Server entry point
│   ├── middleware/         # Express middleware
│   ├── routes/             # API route handlers
│   │   ├── oauth.ts        # OAuth flow
│   │   ├── usageEvents.ts  # Usage event ingestion
│   │   ├── scores.ts       # Health score API
│   │   ├── crmCard.ts      # HubSpot CRM card (4 panels)
│   │   ├── hubspot.ts      # HubSpot sync operations
│   │   └── intelligence.ts # Customer intelligence suite API
│   ├── services/           # Business logic
│   │   ├── hubspotService.ts
│   │   ├── usageEventsService.ts
│   │   ├── scoringService.ts      # Renewal health scoring
│   │   ├── mlTrendService.ts      # ML usage trend analysis
│   │   ├── onboardingService.ts   # Onboarding health scoring
│   │   ├── expansionService.ts    # Expansion prediction
│   │   ├── timelineService.ts
│   │   └── propertyService.ts     # HubSpot property management
│   ├── types/              # TypeScript types
│   └── utils/              # Utility functions
├── tests/                  # Test files (75+ tests)
│   ├── api.test.ts
│   ├── scoringService.test.ts
│   ├── mlTrendService.test.ts
│   ├── onboardingService.test.ts
│   ├── expansionService.test.ts
│   └── usageEventsService.test.ts
├── .env.example            # Environment template
└── README.md
```

## Production Deployment

For production deployments:

1. Use a persistent database (PostgreSQL, MongoDB) instead of in-memory storage
2. Configure Redis for token storage
3. Set up proper SSL/TLS
4. Configure rate limiting
5. Enable request logging
6. Set `NODE_ENV=production`

## License

ISC
