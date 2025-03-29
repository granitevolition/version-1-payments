# Andikar AI Payment System

A comprehensive payment integration system for Andikar AI with Lipia Online M-Pesa integration, featuring modal popup payments and PostgreSQL database integration for user authentication and word balance tracking.

## Core Features

- **Modal Popup Payment**: Users stay on your site during the payment process
- **User Authentication**: Register and login system with JWT tokens
- **Word Balance Tracking**: Automatic tracking of purchased and used words
- **PostgreSQL Integration**: Robust database for storing users, payments, and word balances
- **Complete API**: RESTful endpoints for auth, payments, and word management

## System Overview

### Architecture

- **Frontend**: React.js with modal-based Lipia integration
- **Backend**: Node.js/Express.js REST API
- **Database**: PostgreSQL for data storage
- **Payment Gateway**: Lipia Online for M-Pesa processing

### Payment Flow

1. User registers/logs into the system
2. User selects a payment plan from the available options
3. User clicks "Pay Now" button 
4. A modal popup opens with Lipia payment form embedded via iframe
5. User completes payment without leaving your website
6. Payment confirmation happens via backend callback
7. User's word balance is automatically updated
8. Modal closes and user stays on your site

## Getting Started

### Prerequisites

- Node.js (v16+)
- PostgreSQL database
- Lipia Online account

### Backend Setup

```bash
# Clone the repository
git clone https://github.com/granitevolition/version-1-payments.git
cd version-1-payments

# Install dependencies
npm install

# Set up environment variables (create a .env file with the following)
NODE_ENV=development
PORT=8080
DATABASE_URL=postgres://username:password@localhost:5432/andikar
JWT_SECRET=your_jwt_secret
LIPIA_URL=https://lipia-online.vercel.app/link/andikar
CALLBACK_URL=http://localhost:8080/api/payments/callback

# Start the server
npm run dev
```

### Frontend Setup

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Set up environment variables (.env)
REACT_APP_API_URL=http://localhost:8080/api

# Start the development server
npm start
```

## API Documentation

### Authentication Endpoints

- `POST /api/auth/register` - Register a new user
  - Request: `{ username, email, password }`
  - Response: User data with JWT token

- `POST /api/auth/login` - Login user
  - Request: `{ email, password }`
  - Response: User data with JWT token

- `GET /api/auth/profile` - Get current user profile (requires auth)
  - Response: User profile with word balance

### Payment Endpoints

- `GET /api/payments/plans` - Get available payment plans
  - Response: List of payment plans with prices and word counts

- `POST /api/payments/initiate` - Start a new payment (requires auth)
  - Request: `{ plan }` (e.g., "basic", "standard", "premium")
  - Response: Payment details including reference and URL

- `GET /api/payments/callback` - Callback endpoint for Lipia (public)
  - Query params: `reference`, `status`, `transactionId`

- `GET /api/payments/status/:reference` - Check payment status
  - Response: Current status of the payment

- `GET /api/payments/user` - Get user's payment history (requires auth)
  - Response: List of user's payments

### Word Balance Endpoints

- `GET /api/words/balance` - Get user's word balance (requires auth)
  - Response: User's total, used, and remaining words

- `POST /api/words/add` - Add words to user's balance (requires auth)
  - Request: `{ words }` (number of words to add)
  - Response: Updated word balance

- `POST /api/words/use` - Use words from user's balance (requires auth)
  - Request: `{ words }` (number of words to use)
  - Response: Updated word balance

- `GET /api/words/check-balance/:userId/:requiredWords` - Check if user has sufficient balance
  - Response: Boolean indicating if user has enough words

## Payment Plans

| Plan | Price (KES) | Word Count | Features |
|------|-------------|------------|----------|
| Basic | 1,500 | 30,000 | Standard API access |
| Standard | 2,500 | 60,000 | Full API access |
| Premium | 4,000 | 100,000 | Advanced features |

## Database Schema

### Users Table
- `id` - Primary key
- `username` - User's display name
- `email` - User's email (unique)
- `password` - Hashed password
- `created_at` - Account creation timestamp
- `updated_at` - Last update timestamp

### Payments Table
- `id` - Primary key
- `user_id` - References users.id
- `amount` - Payment amount
- `plan_name` - Name of the plan purchased
- `word_count` - Number of words purchased
- `reference` - Unique payment reference
- `status` - Payment status (pending, completed, failed)
- `payment_date` - When payment was completed
- `created_at` - Record creation timestamp
- `updated_at` - Last update timestamp

### User Words Table
- `id` - Primary key
- `user_id` - References users.id
- `total_purchased` - Total words purchased
- `words_used` - Words consumed
- `created_at` - Record creation timestamp
- `updated_at` - Last update timestamp

## Deployment

### Railway Deployment

1. Set up a new project on Railway
2. Connect your GitHub repository
3. Add PostgreSQL as a plugin
4. Configure the following environment variables:
   - `NODE_ENV=production`
   - `PORT=8080`
   - `JWT_SECRET=your_secure_secret`
   - `LIPIA_URL=https://lipia-online.vercel.app/link/andikar`
   - `CALLBACK_URL=https://your-railway-app-url.up.railway.app/api/payments/callback`
5. Deploy

### Vercel Deployment (Frontend)

1. Connect your GitHub repository to Vercel
2. Configure build settings:
   - Build Command: `cd frontend && npm install && npm run build`
   - Output Directory: `frontend/build`
3. Add environment variables:
   - `REACT_APP_API_URL=https://your-railway-app-url.up.railway.app/api`
4. Deploy

## Troubleshooting

### Database Connection Issues

- Check your DATABASE_URL environment variable
- Ensure PostgreSQL is running and accessible
- Check Railway logs for database connection errors
- Verify SSL settings for production environments

### Payment Processing Issues

- Ensure Lipia URL is correctly set
- Check that your callback URL is publicly accessible
- Verify payment reference in database matches what's being sent to Lipia
- Check server logs for detailed error messages

## Security Features

- Passwords are hashed using bcrypt
- Authentication via JWT tokens
- HTTPS enforced in production
- Protected routes using middleware
- Input validation on all API endpoints
- Database connections use parameterized queries to prevent SQL injection

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Contact

For support or questions, please contact the Andikar AI team at support@andikar.ai
