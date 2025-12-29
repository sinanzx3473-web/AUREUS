# Takumi Backend API

Production-grade Node.js backend for Takumi - Decentralized Skills Verification Platform.

## Features

### Core Functionality
- **Express Server**: TypeScript-based REST API with comprehensive middleware
- **PostgreSQL Database**: Advanced schema with profiles, skills, endorsements, verifiers
- **Contract Event Indexing**: Real-time blockchain event listener and indexer
- **Redis Caching**: Session management and caching layer

### Notifications & Monitoring (Phase 3B)
- **Email Notifications**: Automated emails for endorsement requests and skill verifications
- **Webhook Support**: Custom webhook integrations for external systems
- **Real-time Event Subscriptions**: Contract event listeners with database persistence
- **Structured Logging**: Winston-based logging with separate files for events, errors, webhooks
- **Metrics Collection**: 
  - API latency and performance tracking
  - Gas usage monitoring per contract/function
  - Error rate tracking
  - Prometheus-compatible metrics endpoint

### Security & Performance
- **JWT Authentication**: Secure admin endpoints
- **Rate Limiting**: Configurable request throttling
- **CORS**: Cross-origin resource sharing configuration
- **Helmet**: Security headers
- **Compression**: Response compression

## Quick Start

### Prerequisites
- Node.js >= 18.0.0
- PostgreSQL 14+
- Redis 6+
- Docker (optional)

### Installation

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Edit .env with your configuration
nano .env

# Run database migrations
npm run migrate

# Start development server
npm run dev
```

### Docker Setup

```bash
# Start all services (PostgreSQL, Redis, Backend)
docker-compose up -d

# View logs
docker-compose logs -f backend

# Stop services
docker-compose down
```

## Environment Configuration

Key environment variables:

```env
# Server
NODE_ENV=development
PORT=3001

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/takumi

# Redis
REDIS_URL=redis://localhost:6379

# Email (Phase 3B)
EMAIL_ENABLED=true
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Blockchain
RPC_URL_SEPOLIA=https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY
CONTRACT_SKILL_PROFILE=0x...
CONTRACT_ENDORSEMENT=0x...

# Indexer
INDEXER_START_BLOCK=0
INDEXER_BATCH_SIZE=1000
INDEXER_POLL_INTERVAL=12000
```

## API Endpoints

### Profiles
- `GET /api/v1/profiles` - List profiles
- `GET /api/v1/profiles/:address` - Get profile by address
- `GET /api/v1/profiles/:address/skills` - Get profile with skills
- `GET /api/v1/profiles/search` - Search profiles

### Skills
- `GET /api/v1/skills` - List skills
- `GET /api/v1/skills/:id` - Get skill details

### Notifications (Phase 3B)
- `GET /api/v1/notifications` - Get user notifications
- `PATCH /api/v1/notifications/:id/read` - Mark as read
- `PATCH /api/v1/notifications/read-all` - Mark all as read
- `DELETE /api/v1/notifications/:id` - Delete notification

### Webhooks (Phase 3B)
- `POST /api/v1/webhooks/register` - Register webhook
- `DELETE /api/v1/webhooks/:id` - Unregister webhook
- `GET /api/v1/webhooks/:id/logs` - Get delivery logs
- `GET /api/v1/webhooks/events` - List available events

### Metrics (Phase 3B)
- `GET /metrics` - Prometheus metrics (public)
- `GET /metrics/api` - API performance metrics (auth required)
- `GET /metrics/gas` - Gas usage metrics (auth required)
- `GET /metrics/errors` - Error metrics (auth required)

### Health
- `GET /health` - Health check endpoint

## Webhook Events

Available webhook events:
- `profile.created` - New profile created
- `skill.added` - Skill added to profile
- `skill.verified` - Skill verified by verifier
- `endorsement.created` - New endorsement received
- `verifier.registered` - New verifier registered
- `claim.created` - New skill claim created
- `claim.approved` - Skill claim approved
- `claim.rejected` - Skill claim rejected

### Webhook Registration Example

```bash
curl -X POST http://localhost:3001/api/v1/webhooks/register \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://your-app.com/webhook",
    "events": ["endorsement.created", "skill.verified"],
    "secret": "your-webhook-secret"
  }'
```

### Webhook Payload Format

```json
{
  "event": "endorsement.created",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "data": {
    "endorsee": "0x...",
    "endorser": "0x...",
    "skillName": "Solidity Development",
    "message": "Great work!",
    "blockNumber": 12345,
    "transactionHash": "0x..."
  }
}
```

## Logging

Logs are written to:
- `logs/combined.log` - All logs
- `logs/error.log` - Error logs only
- `logs/blockchain-events.log` - Blockchain event logs
- `logs/webhooks.log` - Webhook delivery logs

## Metrics & Monitoring

### Prometheus Metrics

Access Prometheus-compatible metrics at `/metrics`:

```
takumi_http_requests_total
takumi_http_request_duration_seconds
takumi_indexer_block_height
takumi_indexer_events_total
takumi_db_connections_active
```

### Custom Metrics API

Get detailed metrics via authenticated endpoints:

```bash
# API performance (last 60 minutes)
curl http://localhost:3001/metrics/api?minutes=60 \
  -H "Authorization: Bearer YOUR_TOKEN"

# Gas usage (last 24 hours)
curl http://localhost:3001/metrics/gas?hours=24 \
  -H "Authorization: Bearer YOUR_TOKEN"

# Error tracking
curl http://localhost:3001/metrics/errors \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Database Migrations

```bash
# Run all pending migrations
npm run migrate

# Rollback last migration
npm run migrate:down

# Create new migration
npm run migrate:create migration-name
```

## Testing

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Watch mode
npm run test:watch

# E2E tests
npm run test:e2e
```

## Development

```bash
# Start with auto-reload
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Lint code
npm run lint

# Format code
npm run format
```

## Architecture

```
backend/
├── src/
│   ├── config/          # Database, Redis configuration
│   ├── controllers/     # Request handlers
│   ├── middleware/      # Express middleware
│   ├── routes/          # API routes
│   ├── services/        # Business logic
│   │   ├── indexer.service.ts    # Blockchain indexer
│   │   ├── email.service.ts      # Email notifications
│   │   ├── webhook.service.ts    # Webhook delivery
│   │   └── notification.service.ts # In-app notifications
│   ├── types/           # TypeScript types
│   ├── utils/           # Utilities
│   └── index.ts         # App entry point
├── migrations/          # Database migrations
├── logs/               # Application logs
└── docker-compose.yml  # Docker orchestration
```

## Production Deployment

1. Set `NODE_ENV=production`
2. Configure production database and Redis
3. Set strong JWT secrets
4. Enable email notifications
5. Configure monitoring and alerting
6. Set up log aggregation
7. Configure backup strategy
8. Enable HTTPS/TLS
9. Set up rate limiting
10. Configure CORS for production domains

## Troubleshooting

### Indexer not syncing
- Check RPC URL is accessible
- Verify contract addresses in metadata.json
- Check indexer_state table for errors
- Review logs/blockchain-events.log

### Email not sending
- Verify EMAIL_ENABLED=true
- Check SMTP credentials
- Review logs for email errors
- Test SMTP connection manually

### Webhook delivery failing
- Check webhook URL is accessible
- Verify webhook signature validation
- Review logs/webhooks.log
- Check webhook_logs table

## License

MIT

## Support

For issues and questions, please open an issue on GitHub.
