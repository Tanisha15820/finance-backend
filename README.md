# Finance Tracker Backend

A comprehensive backend API for the Intelligent Finance Tracker application with AI-powered transaction parsing, Google OAuth authentication, and analytics capabilities.

## 🚀 Features

- **Google OAuth Authentication** - Secure login with Google accounts
- **AI-Powered Transaction Parsing** - Natural language input parsing using OpenAI
- **Comprehensive Transaction Management** - Full CRUD operations with filtering
- **Advanced Analytics** - Financial summaries, category breakdowns, and trend analysis  
- **Real-time Data** - PostgreSQL database with optimized queries
- **Security** - JWT tokens, rate limiting, input validation, and CORS protection
- **Error Handling** - Comprehensive error handling and logging

## 🛠️ Technology Stack

- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **PostgreSQL** - Primary database
- **JWT** - Authentication tokens
- **Passport.js** - Google OAuth integration
- **OpenAI API** - AI transaction parsing
- **Express Validator** - Input validation
- **Helmet** - Security middleware

## 📋 Prerequisites

Before setting up the backend, ensure you have:

- Node.js (v16 or higher)
- PostgreSQL (v12 or higher)
- Google Cloud Console account (for OAuth)
- OpenAI API account (optional, fallback parser available)

## ⚙️ Installation

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Configure Environment Variables**
   
   Update the `.env` file with your actual values:
   ```env
   # Database
   PORT=5000
   PG_USER=postgres
   PG_PASSWORD=your_password
   PG_HOST=localhost
   PG_PORT=5432
   PG_DATABASE=finance_db

   # JWT Configuration
   JWT_SECRET=your_very_secure_jwt_secret_key_here
   JWT_EXPIRES_IN=7d

   # Google OAuth (Get from Google Cloud Console)
   GOOGLE_CLIENT_ID=your_google_client_id
   GOOGLE_CLIENT_SECRET=your_google_client_secret
   GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback

   # Session Secret
   SESSION_SECRET=your_session_secret_here

   # OpenAI Configuration (Optional)
   OPENAI_API_KEY=your_openai_api_key

   # Frontend URL (for CORS)
   FRONTEND_URL=http://localhost:5173
   ```

3. **Set Up Database**
   ```bash
   # Create the database first in PostgreSQL
   psql -U postgres -c "CREATE DATABASE finance_db;"
   
   # Run the setup script to create tables
   npm run setup-db
   ```

## 🚀 Running the Server

### Development Mode
```bash
npm run dev
```

### Production Mode
```bash
npm start
```

The server will start on `http://localhost:5000`

## 📚 API Documentation

### Base URL
```
http://localhost:5000/api
```

### Authentication Endpoints

#### Google OAuth Login
- **GET** `/auth/google`
  - Redirects to Google OAuth consent screen

#### OAuth Callback
- **GET** `/auth/google/callback`
  - Handles OAuth callback and redirects to frontend with tokens

#### Get Current User
- **GET** `/auth/me`
  - Headers: `Authorization: Bearer <token>`
  - Returns current user information

#### Refresh Token
- **POST** `/auth/refresh`
  - Body: `{ "refreshToken": "token" }`
  - Returns new access token

#### Logout
- **POST** `/auth/logout`
  - Body: `{ "refreshToken": "token" }`
  - Invalidates refresh token

### Transaction Endpoints

#### Get Transactions
- **GET** `/transactions`
  - Headers: `Authorization: Bearer <token>`
  - Query params: `category`, `type`, `startDate`, `endDate`, `limit`, `offset`
  - Returns filtered transactions for user

#### Parse Transaction
- **POST** `/transactions/parse`
  - Headers: `Authorization: Bearer <token>`
  - Body: `{ "input": "Coffee at Starbucks $6.50" }`
  - Returns parsed transaction data

#### Create Transaction
- **POST** `/transactions`
  - Headers: `Authorization: Bearer <token>`
  - Body: `{ "amount": 6.50, "description": "Coffee", "category": "Food & Dining", "type": "expense" }`

#### Update Transaction
- **PUT** `/transactions/:id`
  - Headers: `Authorization: Bearer <token>`
  - Body: Updated transaction data

#### Delete Transaction
- **DELETE** `/transactions/:id`
  - Headers: `Authorization: Bearer <token>`

#### Get Categories
- **GET** `/transactions/categories`
  - Returns available transaction categories with colors

### Analytics Endpoints

#### Financial Summary
- **GET** `/analytics/summary`
  - Headers: `Authorization: Bearer <token>`
  - Returns current month's income, expenses, savings, and monthly change

#### Category Analytics
- **GET** `/analytics/categories`
  - Headers: `Authorization: Bearer <token>`
  - Query params: `period` (month, quarter, year)
  - Returns spending breakdown by category

#### Spending Trends
- **GET** `/analytics/trends`
  - Headers: `Authorization: Bearer <token>`
  - Query params: `days` (default 30)
  - Returns daily spending trends

#### Monthly Comparison
- **GET** `/analytics/monthly-comparison`
  - Headers: `Authorization: Bearer <token>`
  - Returns current vs previous month comparison

## 🔧 Configuration

### Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add authorized origins:
   - `http://localhost:5000` (development)
   - Your production URL
6. Add authorized redirect URIs:
   - `http://localhost:5000/api/auth/google/callback`

### OpenAI Setup (Optional)

1. Sign up at [OpenAI](https://platform.openai.com/)
2. Generate an API key
3. Add to `.env` file as `OPENAI_API_KEY`

If not configured, the system will use a fallback keyword-based parser.

## 🗄️ Database Schema

### Tables
- `users` - User profiles from Google OAuth
- `transactions` - Financial transactions with AI parsing confidence
- `categories` - Transaction categories with colors
- `user_sessions` - JWT refresh token management

### Key Features
- UUID primary keys for security
- Automatic timestamps
- Foreign key constraints
- Optimized indexes for performance
- Transaction confidence scoring

## 🔒 Security Features

- **Helmet** - Security headers
- **CORS** - Cross-origin protection
- **Rate Limiting** - API abuse prevention
- **JWT Authentication** - Secure token-based auth
- **Input Validation** - Request data validation
- **SQL Injection Prevention** - Parameterized queries

## 📊 Monitoring

### Health Check
- **GET** `/health`
  - Returns server and database status

### Logging
- Console logging with emoji indicators
- Error stack traces in development
- Database connection monitoring

## 🚀 Deployment

### Environment Variables for Production
```env
NODE_ENV=production
FRONTEND_URL=https://your-frontend-domain.com
GOOGLE_CALLBACK_URL=https://your-api-domain.com/api/auth/google/callback
```

### Database Migration
```bash
# Run schema setup in production
NODE_ENV=production npm run setup-db
```

## 🧪 Testing the API

### Using curl
```bash
# Health check
curl http://localhost:5000/health

# Parse transaction (requires auth token)
curl -X POST http://localhost:5000/api/transactions/parse \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"input": "Lunch at McDonald's $12.50"}'
```

### Using Postman
Import the API endpoints and set up environment variables for easy testing.

## 🔧 Troubleshooting

### Common Issues

1. **Database Connection Failed**
   - Check PostgreSQL is running
   - Verify database credentials in `.env`
   - Ensure `finance_db` database exists

2. **Google OAuth Error**
   - Verify Google Client ID and Secret
   - Check authorized origins and redirect URIs
   - Ensure Google+ API is enabled

3. **OpenAI Parsing Fails**
   - Check API key validity
   - Monitor API usage limits
   - Fallback parser will activate automatically

4. **CORS Issues**
   - Verify `FRONTEND_URL` in `.env`
   - Check frontend is running on correct port

## 📄 License

MIT License - see LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

---

Built with ❤️ for the Intelligent Finance Tracker
