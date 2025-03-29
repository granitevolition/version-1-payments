# Andikar AI Payment System

A comprehensive payment integration system for Andikar AI with Lipia Online M-Pesa support, modal popup integration, and word balance tracking.

## Overview

This payment system integrates Lipia Online for M-Pesa payments, providing a seamless experience where users never leave your application. It includes:

- **Popup Modal Payment Form**: Users stay in your app while making payments
- **Database Integration**: Automatic tracking of payments and word balances
- **Word Credit System**: Automatically adds purchased words to user accounts

## Key Features

- **Modal Payment Integration**: Embeds Lipia in a modal instead of redirecting
- **Automatic Callbacks**: Verifies and records payments in the database
- **Word Balance Management**: API endpoints for checking, adding, and using words
- **Comprehensive Dashboard**: Visual monitoring of payment plans
- **PostgreSQL Integration**: Reliable storage of payment and balance data

## System Architecture

The system uses:
- **Frontend**: React.js with iframe-based modal integration
- **Backend**: Node.js/Express API with PostgreSQL database
- **Payment Gateway**: Lipia Online for M-Pesa payments

## Payment Flow

1. User selects a payment plan in your application
2. A modal popup opens with the Lipia payment form inside
3. User completes payment without leaving your site
4. Backend receives a callback confirming payment
5. Word balance is updated automatically

## Payment Plans

| Plan | Price (KES) | Word Credits | Features |
|------|-------------|--------------|----------|
| Basic | 1,500 | 30,000 | Basic API Access |
| Standard | 2,500 | 60,000 | Full API Access |
| Premium | 4,000 | 100,000 | Advanced Features |

## API Endpoints

### Payment Endpoints
- `POST /api/v1/payments/initiate` - Start a new payment
- `POST /api/v1/payments/callback` - Handle Lipia callbacks
- `GET /api/v1/payments/:paymentId` - Get payment details
- `GET /api/v1/payments/user/:userId` - Get payment history
- `GET /api/v1/payments/status/:reference` - Check payment status

### Word Balance Endpoints
- `GET /api/v1/words/user/:userId` - Get user's word balance
- `POST /api/v1/words/add` - Add words to user's balance
- `POST /api/v1/words/use` - Use words from user's balance
- `GET /api/v1/words/check-balance/:userId/:requiredWords` - Check if user has enough words
- `GET /api/v1/words/stats/:userId` - Get usage statistics

## Setting Up on Railway

### Prerequisites
- A Railway account
- A PostgreSQL database (can be provisioned in Railway)
- A Lipia Online account

### Deployment Steps

1. **Fork this repository** to your GitHub account

2. **Create a new Railway project**:
   - Connect to your GitHub repository
   - Railway will automatically detect the Dockerfile

3. **Add PostgreSQL database**:
   - In Railway, click "New Service" → "Database" → "PostgreSQL"
   - Railway will automatically link the database to your app

4. **Set up environment variables**:
   - `NODE_ENV` = production
   - `LIPIA_URL` = https://lipia-online.vercel.app/link/andikar
   - `CALLBACK_URL` = https://your-railway-domain.up.railway.app/api/v1/payments/callback

5. **Deploy your app**:
   - Railway will automatically build and deploy your application
   - The database schema will be created automatically on first run

### Checking Deployment

1. Visit `https://your-railway-domain.up.railway.app/`
2. Check `/api/health` and `/api/health/db` endpoints
3. Verify database connection in Railway logs

## Local Development

```bash
# Clone the repository
git clone https://github.com/yourusername/version-1-payments.git
cd version-1-payments

# Set up environment variables
cp backend/.env.example backend/.env
# Edit .env file with your settings

# Install dependencies & run backend
cd backend
npm install
npm run dev

# In another terminal, run frontend
cd frontend
npm install
npm start
```

## Troubleshooting

### Database Connection Issues
- Check that DATABASE_URL environment variable is set correctly
- Ensure SSL is enabled for production environments
- Verify PostgreSQL is running and accessible

### Payment Processing Issues
- Verify Lipia Online URL is correct
- Check callback URL is properly configured
- Inspect server logs for error messages

## Security Notes

- All sensitive data is hidden in environment variables
- Database passwords never appear in logs or responses
- HTTPS is enforced in production environments

Need help? Contact support@andikar.ai
