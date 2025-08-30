# Local Authentication Guide

This API now uses PostgreSQL-based local authentication with JWT tokens instead of Firebase Auth.

## Authentication Flow

1. **Registration**: Users register with email, password, and name
2. **Login**: Users authenticate with email and password
3. **JWT Token**: Server returns a JWT token for authenticated requests
4. **Protected Routes**: Include JWT token in Authorization header for protected endpoints

## API Endpoints

### Register User
```
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "your_password",
  "name": "User Name"
}
```

**Response:**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "User Name",
    "picture": null
  },
  "token": "jwt_token_here",
  "message": "User registered successfully"
}
```

### Login User
```
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "your_password"
}
```

**Response:**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "User Name",
    "picture": null
  },
  "token": "jwt_token_here",
  "message": "Login successful"
}
```

### Get Current User
```
GET /api/auth/me
Authorization: Bearer your_jwt_token
```

### Check Authentication Status
```
GET /api/auth/status
Authorization: Bearer your_jwt_token
```

### Logout
```
POST /api/auth/logout
```

## Protected Endpoints

All transaction and analytics endpoints require authentication. Include the JWT token in the Authorization header:

```
Authorization: Bearer your_jwt_token
```

## Environment Variables

Make sure to set these in your `.env` file:

```
# JWT Configuration
JWT_SECRET=your_strong_secret_key_here
JWT_EXPIRES_IN=7d

# PostgreSQL Configuration
PG_USER=postgres
PG_PASSWORD=your_password
PG_HOST=localhost
PG_PORT=5432
PG_DATABASE=finance_db
```

## Database Migration

To migrate your existing database to use local authentication:

```bash
npm run migrate-local-auth
```

This will:
- Drop the existing users table
- Create a new users table with email/password authentication
- Recreate necessary triggers

**⚠️ Warning:** This will delete all existing user data. Make sure to backup your data before running this migration.

## Frontend Integration

Update your frontend to:

1. Use the new `/api/auth/register` and `/api/auth/login` endpoints
2. Store the returned JWT token (in localStorage or secure storage)
3. Include the JWT token in the Authorization header for all API requests
4. Handle token expiration by redirecting to login

Example frontend code:
```javascript
// Login
const response = await fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password })
});

const { token, user } = await response.json();
localStorage.setItem('token', token);

// Make authenticated requests
const transactionsResponse = await fetch('/api/transactions', {
  headers: { 
    'Authorization': `Bearer ${localStorage.getItem('token')}` 
  }
});
```

## Security Features

- Passwords are hashed using bcryptjs with 12 salt rounds
- JWT tokens expire after 7 days (configurable)
- Rate limiting on all API endpoints
- Input validation using express-validator
- CORS protection
- Helmet security headers
