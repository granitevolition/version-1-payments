# Version 1 Payments

A complete payment integration system that connects to the Lipia Online M-Pesa payment service with word balance tracking for Andikar AI.

## Features

- M-Pesa payment integration through Lipia Online
- Fixed payment tiers with word allocations:
  - 1,500 KES = 30,000 words
  - 2,500 KES = 60,000 words
  - 4,000 KES = 100,000 words
- Word balance tracking in database
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

## Deployment on Railway

This project is configured to deploy easily on Railway.app.

### Prerequisites

- A Railway.app account
- PostgreSQL database service on Railway
- GitHub account connected to Railway

### Steps for Deployment

1. **Fork or clone this repository** to your GitHub account
   
2. **Create a new project in Railway** and connect to your GitHub repository

3. **Add a PostgreSQL database** to your project

4. **Set the following environment variables** in your Railway project:
   - `NODE_ENV=production`
   - `DATABASE_PUBLIC_URL=${DATABASE_URL}` (Railway provides this automatically)
   - `JWT_SECRET=your_jwt_secret_here`
   - `LIPIA_URL=https://lipia-online.vercel.app/link/andikar`
   - `CALLBACK_URL=https://your-railway-domain.up.railway.app/api/v1/payments/callback`
   - `ALLOWED_ORIGINS=https://your-frontend-url.com`

5. **Deploy the project** - Railway will automatically detect and build the backend

6. **Deploy the frontend separately** on Vercel, Netlify, or another Railway service

7. **Connect the frontend** to your backend API by setting the appropriate environment variables

### Railway Configuration

The `railway.toml` and `Procfile` files are already configured to:
- Build and run the backend Node.js application
- Set up the health check endpoint
- Configure the restart policy

## Local Development Setup

### Backend Setup

1. Navigate to the backend directory:
   ```
   cd backend
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Create a `.env` file based on `.env.example`:
   ```
   cp .env.example .env
   ```

4. Update the `.env` file with your database credentials.

5. Start the development server:
   ```
   npm run dev
   ```

### Frontend Setup

1. Navigate to the frontend directory:
   ```
   cd frontend
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Create a `.env` file based on `.env.example`:
   ```
   cp .env.example .env
   ```

4. Update the `.env` file with your backend API URL.

5. Start the development server:
   ```
   npm start
   ```

## API Endpoints

### Payments

- `POST /api/v1/payments` - Initiate a new payment
- `POST /api/v1/payments/callback` - Handle payment callback
- `GET /api/v1/payments/user/:userId` - Get user's payment history
- `GET /api/v1/payments/:paymentId` - Get payment details

### Word Balance

- `GET /api/v1/words/user/:userId` - Get user's word balance
- `POST /api/v1/words/user/:userId/add` - Add words to user's balance (admin only)
- `POST /api/v1/words/user/:userId/use` - Use words from user's balance

## License

This project is proprietary and confidential.

## Support

For support, contact the developers at Granite Volition.
