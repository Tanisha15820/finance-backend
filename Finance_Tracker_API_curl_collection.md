# Finance Tracker API - Complete curl Collection

Base URL: `http://localhost:3001`

**Important Notes:**
- Replace `{{TOKEN}}` with your actual JWT token from login
- All authenticated endpoints require the `Authorization: Bearer {{TOKEN}}` header
- All POST/PUT requests require `Content-Type: application/json` header

---

## 🏥 Health & Info Endpoints

### Health Check
```bash
curl -X GET http://localhost:3001/health
```

### API Info
```bash
curl -X GET http://localhost:3001/
```

---

## 🔐 Authentication Endpoints

### Register New User
```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "securepassword123",
    "name": "John Doe"
  }'
```

### Login User
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

### Get Current User Info
```bash
curl -X GET http://localhost:3001/api/auth/me \
  -H "Authorization: Bearer {{TOKEN}}"
```

### Check Auth Status
```bash
curl -X GET http://localhost:3001/api/auth/status \
  -H "Authorization: Bearer {{TOKEN}}"
```

### Logout User
```bash
curl -X POST http://localhost:3001/api/auth/logout \
  -H "Authorization: Bearer {{TOKEN}}"
```

---

## 💰 Transaction Endpoints

### Create Transaction (Basic)
```bash
curl -X POST http://localhost:3001/api/transactions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {{TOKEN}}" \
  -d '{
    "amount": 12.50,
    "description": "Coffee at Starbucks",
    "category": "Food & Dining",
    "type": "expense"
  }'
```

### Create Transaction (with Date & Confidence)
```bash
curl -X POST http://localhost:3001/api/transactions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {{TOKEN}}" \
  -d '{
    "amount": 3500.00,
    "description": "Monthly Salary",
    "category": "Income",
    "type": "income",
    "date": "2025-08-30T10:00:00.000Z",
    "confidence": 0.98
  }'
```

### Create Food Expense
```bash
curl -X POST http://localhost:3001/api/transactions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {{TOKEN}}" \
  -d '{
    "amount": 45.50,
    "description": "Grocery shopping at Walmart",
    "category": "Groceries",
    "type": "expense",
    "date": "2025-08-30T14:30:00.000Z"
  }'
```

### Create Transportation Expense
```bash
curl -X POST http://localhost:3001/api/transactions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {{TOKEN}}" \
  -d '{
    "amount": 25.75,
    "description": "Gas station fill-up",
    "category": "Transportation",
    "type": "expense"
  }'
```

### Get All Transactions
```bash
curl -X GET http://localhost:3001/api/transactions \
  -H "Authorization: Bearer {{TOKEN}}"
```

### Get Transactions (Filtered)
```bash
# Filter by category and type
curl -X GET "http://localhost:3001/api/transactions?category=Food%20%26%20Dining&type=expense" \
  -H "Authorization: Bearer {{TOKEN}}"

# Filter with pagination
curl -X GET "http://localhost:3001/api/transactions?limit=10&offset=0" \
  -H "Authorization: Bearer {{TOKEN}}"

# Filter by date range
curl -X GET "http://localhost:3001/api/transactions?startDate=2025-08-01&endDate=2025-08-31" \
  -H "Authorization: Bearer {{TOKEN}}"

# Complex filter (category + type + date + pagination)
curl -X GET "http://localhost:3001/api/transactions?category=Transportation&type=expense&startDate=2025-08-01&limit=50&offset=0" \
  -H "Authorization: Bearer {{TOKEN}}"
```

### Update Transaction
```bash
curl -X PUT http://localhost:3001/api/transactions/{{TRANSACTION_ID}} \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {{TOKEN}}" \
  -d '{
    "amount": 30.00,
    "description": "Updated lunch expense",
    "category": "Food & Dining",
    "type": "expense",
    "date": "2025-08-30T10:00:00.000Z"
  }'
```

### Delete Transaction
```bash
curl -X DELETE http://localhost:3001/api/transactions/{{TRANSACTION_ID}} \
  -H "Authorization: Bearer {{TOKEN}}"
```

### Parse Natural Language Transaction (AI)
```bash
curl -X POST http://localhost:3001/api/transactions/parse \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {{TOKEN}}" \
  -d '{
    "input": "Spent $25 on lunch at McDonalds today"
  }'
```

### Get Available Categories
```bash
curl -X GET http://localhost:3001/api/transactions/categories \
  -H "Authorization: Bearer {{TOKEN}}"
```

---

## 📊 Analytics Endpoints

### Get Financial Summary (Current Month)
```bash
curl -X GET http://localhost:3001/api/analytics/summary \
  -H "Authorization: Bearer {{TOKEN}}"
```

### Get Spending by Categories (Monthly)
```bash
curl -X GET http://localhost:3001/api/analytics/categories?period=month \
  -H "Authorization: Bearer {{TOKEN}}"
```

### Get Spending by Categories (Quarterly)
```bash
curl -X GET http://localhost:3001/api/analytics/categories?period=quarter \
  -H "Authorization: Bearer {{TOKEN}}"
```

### Get Spending by Categories (Yearly)
```bash
curl -X GET http://localhost:3001/api/analytics/categories?period=year \
  -H "Authorization: Bearer {{TOKEN}}"
```

### Get Spending Trends (30 days)
```bash
curl -X GET http://localhost:3001/api/analytics/trends?days=30 \
  -H "Authorization: Bearer {{TOKEN}}"
```

### Get Spending Trends (60 days)
```bash
curl -X GET http://localhost:3001/api/analytics/trends?days=60 \
  -H "Authorization: Bearer {{TOKEN}}"
```

### Get Monthly Comparison
```bash
curl -X GET http://localhost:3001/api/analytics/monthly-comparison \
  -H "Authorization: Bearer {{TOKEN}}"
```

---

## 📋 Available Categories

- `Food & Dining`
- `Transportation`
- `Shopping`
- `Entertainment`
- `Bills & Utilities`
- `Healthcare`
- `Income`
- `Groceries`
- `Travel`
- `Other`

---

## 🔧 PowerShell Examples (Windows)

If you prefer PowerShell syntax, here are key examples:

### Login and Save Token
```powershell
$loginBody = @{
    email = "test@example.com"
    password = "password123"
} | ConvertTo-Json

$loginHeaders = @{ "Content-Type" = "application/json" }
$loginResponse = Invoke-RestMethod -Uri "http://localhost:3001/api/auth/login" -Method POST -Headers $loginHeaders -Body $loginBody
$token = $loginResponse.token
Write-Host "Token: $token"
```

### Create Transaction (PowerShell)
```powershell
$headers = @{
    "Content-Type" = "application/json"
    "Authorization" = "Bearer $token"
}

$transactionBody = @{
    amount = 15.99
    description = "Lunch at Subway"
    category = "Food & Dining"
    type = "expense"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3001/api/transactions" -Method POST -Headers $headers -Body $transactionBody
```

### Get All Transactions (PowerShell)
```powershell
$headers = @{ "Authorization" = "Bearer $token" }
Invoke-RestMethod -Uri "http://localhost:3001/api/transactions" -Method GET -Headers $headers
```

---

## 🧪 Testing Workflow

1. **First, get a token:**
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "password123"}'
```

2. **Copy the token from the response and use it in subsequent requests**

3. **Test creating a transaction:**
```bash
curl -X POST http://localhost:3001/api/transactions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "amount": 10.99,
    "description": "Test transaction",
    "category": "Food & Dining",
    "type": "expense"
  }'
```

4. **Verify by getting all transactions:**
```bash
curl -X GET http://localhost:3001/api/transactions \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

---

## 📝 Notes

- **Authentication:** All transaction and analytics endpoints require a valid JWT token
- **Validation:** Transaction amount must be positive, description cannot be empty
- **Categories:** Must use exact category names from the available list
- **Types:** Only `"income"` or `"expense"` are valid
- **Dates:** Use ISO 8601 format (YYYY-MM-DDTHH:mm:ss.sssZ)
- **Confidence:** Optional field between 0.00 and 1.00 (used for AI parsing confidence)

---

## 🚨 Common Error Responses

- **400 Bad Request:** Validation failed (missing/invalid fields)
- **401 Unauthorized:** Invalid or missing token
- **404 Not Found:** Transaction not found or route doesn't exist
- **409 Conflict:** User already exists (registration)
- **500 Internal Server Error:** Database or server error

Your transaction creation error should now be resolved with the UUID schema fix! 🎉
