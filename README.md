# Version 1 Payments

A complete payment integration system that connects to the Lipia Online M-Pesa payment service with word balance tracking for Andikar AI.

## Features

- M-Pesa payment integration through Lipia Online
- Fixed payment tiers (1,500 KES, 2,500 KES, 4,000 KES)
- Word balance tracking based on payments
- Payment history and statistics
- Real-time payment status updates

## Technology Stack

- **Frontend**: React.js
- **Backend**: Node.js with Express
- **Database**: PostgreSQL
- **Payment Gateway**: Lipia Online (M-Pesa)

## Project Structure

```
version-1-payments/
├── backend/          # Node.js/Express backend API
├── frontend/         # React.js frontend application
├── database/         # Database schema and migrations
└── docs/            # Documentation
```

## Payment Tiers

- **Basic Plan**: 1,500 KES for 30,000 words
- **Standard Plan**: 2,500 KES for 60,000 words
- **Premium Plan**: 4,000 KES for 100,000 words
