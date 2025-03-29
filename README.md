# Version 1 Payments

A beautiful dashboard and API server for Lipia Online payment integration.

![Version 1 Payments Dashboard](https://via.placeholder.com/800x450?text=Version+1+Payments+Dashboard)

## Features

- **Beautiful GUI Dashboard**: Modern, responsive interface for payment management
- **Payment Plans Visualization**: Display of available payment tiers with pricing
- **Simple Health Check API**: Reliable endpoint for monitoring
- **M-Pesa Integration**: Connection to Lipia Online payment service

## Payment Tiers

| Plan | Price (KES) | Word Credits | Features |
|------|-------------|--------------|----------|
| Basic | 1,500 | 30,000 | Basic API Access, Standard Support |
| Standard | 2,500 | 60,000 | Full API Access, Priority Support |
| Premium | 4,000 | 100,000 | Advanced API Features, 24/7 Premium Support |

## Deployment on Railway

This project is configured for easy deployment on Railway with Docker:

1. The Dockerfile handles all build requirements
2. No external dependencies needed
3. Health check endpoint at `/api/health` ensures uptime monitoring
4. GUI dashboard available at the root URL

## API Endpoints

- `/api/health` - Health check endpoint
- `/` - Main dashboard GUI

## Local Development

To run locally:

```bash
# Clone the repository
git clone https://github.com/granitevolition/version-1-payments.git
cd version-1-payments

# Run with Node.js
node index.js
```

Then visit http://localhost:8080 in your browser.

## Screenshots

### Dashboard
![Dashboard](https://via.placeholder.com/600x300?text=Dashboard)

### Health Check
![Health Check](https://via.placeholder.com/600x300?text=Health+Check+API)

## Technology Stack

- **Backend**: Node.js (no external dependencies)
- **Frontend**: HTML/CSS (embedded in index.js)
- **Deployment**: Docker on Railway
- **Payment Gateway**: Lipia Online (M-Pesa)
