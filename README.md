# HubSpot Renewal Health Usage App

Installable HubSpot App that ingests product-usage data from your SaaS platform, calculates renewal health scores for each customer account, and surfaces actionable churn-risk insights directly inside HubSpot. Helps CS and revenue teams predict renewals, identify at-risk accounts, and drive expansion.

## Features

- **OAuth 2.0 Integration**: Secure authentication with HubSpot
- **Usage Event Ingestion**: REST API to receive product usage events from your SaaS platform
- **Renewal Health Scoring**: Algorithmic scoring engine that calculates health based on:
  - Usage frequency
  - Feature adoption
  - Usage trends (increasing/decreasing)
  - Recency of activity
  - Usage consistency
- **CRM Card**: Native HubSpot card showing health score, trends, and recommendations
- **HubSpot Property Sync**: Automatically update company records with health data
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

### HubSpot Integration

#### Setup Custom Properties

```bash
POST /api/hubspot/setup/:portalId
```

Creates the following properties on Company records:
- `renewal_health_score` - Overall score (0-100)
- `renewal_risk_level` - Risk classification (low/medium/high/critical)
- `last_product_activity` - Most recent usage date
- `product_usage_30d` - Event count in last 30 days
- `features_adopted` - Number of features used
- `renewal_health_updated` - Last calculation timestamp

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

The CRM card endpoint is called automatically by HubSpot:

```bash
GET /api/crm-card?associatedObjectId=123&associatedObjectType=COMPANY
```

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
│   │   ├── crmCard.ts      # HubSpot CRM card
│   │   └── hubspot.ts      # HubSpot sync operations
│   ├── services/           # Business logic
│   │   ├── hubspotService.ts
│   │   ├── usageEventsService.ts
│   │   ├── scoringService.ts
│   │   ├── timelineService.ts
│   │   └── propertyService.ts
│   ├── types/              # TypeScript types
│   └── utils/              # Utility functions
├── tests/                  # Test files
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
