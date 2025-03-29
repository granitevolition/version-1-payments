# Version 1 Payments

A complete payment integration system for Andikar AI with Lipia Online M-Pesa support and word balance tracking.

## Key Features

- **Popup Modal Integration**: Embeds Lipia payment form in a modal instead of redirecting users
- **Seamless User Experience**: Users remain within your application during the payment process
- **Automatic Payment Verification**: Payments are verified and recorded in your database
- **Word Balance Tracking**: Automatically adds purchased words to user accounts
- **Beautiful UI**: Modern, responsive interface for payment management

## Payment Tiers

| Plan | Price (KES) | Word Credits | Features |
|------|-------------|--------------|----------|
| Basic | 1,500 | 30,000 | Basic API Access, Standard Support |
| Standard | 2,500 | 60,000 | Full API Access, Priority Support |
| Premium | 4,000 | 100,000 | Advanced API Features, 24/7 Premium Support |

## Implementation Details

### Frontend Integration

The payment integration uses a modal popup approach with an iframe:

1. User clicks "Pay Now" on your website
2. A modal window opens with the Lipia payment form embedded inside
3. User completes payment without leaving your site
4. Modal automatically closes upon completion
5. User's word balance is updated in real-time

### Backend Integration

The backend handles payment verification and database updates:

1. When payment is initiated, a record is created in the database
2. Lipia sends a callback to your server when payment completes
3. Backend verifies the payment and updates status
4. Word credits are automatically added to the user's account

## API Endpoints

- `POST /api/v1/payments/initiate` - Start a new payment
- `POST /api/v1/payments/callback` - Handle payment completion from Lipia
- `GET /api/v1/payments/:paymentId` - Get payment details
- `GET /api/v1/payments/user/:userId` - Get user's payment history
- `GET /api/v1/payments/url` - Get payment URL for the frontend
- `GET /api/v1/payments/status/:reference` - Check payment status

## Deployment

### Frontend Deployment

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Build for production
npm run build

# Deploy to hosting platform of choice
```

### Backend Deployment on Railway

The backend is configured for easy deployment on Railway:

1. Connect your GitHub repository to Railway
2. Set up the following environment variables:
   - `NODE_ENV=production`
   - `DATABASE_PUBLIC_URL=${DATABASE_URL}` (automatically provided)
   - `LIPIA_URL=https://lipia-online.vercel.app/link/andikar`
   - `CALLBACK_URL=https://your-railway-domain.up.railway.app/api/v1/payments/callback`
3. Deploy the application

## Local Development

To run locally:

```bash
# Clone the repository
git clone https://github.com/granitevolition/version-1-payments.git
cd version-1-payments

# Start the backend
cd backend
npm install
npm run dev

# In a new terminal, start the frontend
cd frontend
npm install
npm start
```

## Screenshots

### Payment Form with Modal
![Payment Form](https://via.placeholder.com/600x300?text=Payment+Form+with+Modal)

### Payment Success Screen
![Success Screen](https://via.placeholder.com/600x300?text=Payment+Success+Screen)

## Technology Stack

- **Frontend**: React.js, Context API for state management
- **Backend**: Node.js, Express
- **Database**: PostgreSQL
- **Payment Gateway**: Lipia Online (M-Pesa)
- **Deployment**: Docker on Railway (backend), Vercel/Netlify (frontend)
