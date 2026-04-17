# Browser URLs for Testing

All URLs are for the deployed service on Render. The service uses a gateway that routes all requests through a single port.

Base URL: `https://cost-manager-restful-web-services-u68h.onrender.com`

For local testing, use: `http://localhost:3000` (or the port your service is running on)

## Health Check Endpoint

- **Main Service**: `https://cost-manager-restful-web-services-u68h.onrender.com/`

This will show all available services: users, goals, budgets, costs, analytics, reports, admin, logs

## Users Service

### GET Requests (Open in Browser)
- **Get all users**: `https://cost-manager-restful-web-services-u68h.onrender.com/api/users`
- **Get user by ID**: `https://cost-manager-restful-web-services-u68h.onrender.com/api/users/1`
- **Get user by ID**: `https://cost-manager-restful-web-services-u68h.onrender.com/api/users/2`
- **Get user by ID**: `https://cost-manager-restful-web-services-u68h.onrender.com/api/users/3`
- **Get user by ID**: `https://cost-manager-restful-web-services-u68h.onrender.com/api/users/4`
- **Get user by ID**: `https://cost-manager-restful-web-services-u68h.onrender.com/api/users/5`
- **Get user by ID**: `https://cost-manager-restful-web-services-u68h.onrender.com/api/users/15` (all users 1-25)
- **Get current user (authenticated)**: `https://cost-manager-restful-web-services-u68h.onrender.com/api/users/me` (requires authentication token)

### POST Requests (Use Postman/cURL)

#### Register New User
**URL**: `POST https://cost-manager-restful-web-services-u68h.onrender.com/api/register`

**Body**:
```json
{
  "id": 999999,
  "first_name": "John",
  "last_name": "Doe",
  "birthday": "1990-05-15",
  "email": "john.doe@example.com",
  "password": "password123"
}
```

#### Login
**URL**: `POST https://cost-manager-restful-web-services-u68h.onrender.com/api/login`

**Body**:
```json
{
  "email": "john.doe@example.com",
  "password": "password123"
}
```

#### Create User (Legacy - Backward Compatibility)
**URL**: `POST https://cost-manager-restful-web-services-u68h.onrender.com/api/add`

**Body**:
```json
{
  "id": 123456,
  "first_name": "Jane",
  "last_name": "Smith",
  "birthday": "1985-03-20"
}
```

## Goals Service

### GET Requests (Open in Browser)
- **Get all goals for user 1**: `https://cost-manager-restful-web-services-u68h.onrender.com/api/goals?userid=1`
- **Get all goals for user 2**: `https://cost-manager-restful-web-services-u68h.onrender.com/api/goals?userid=2`
- **Get all goals for user 3**: `https://cost-manager-restful-web-services-u68h.onrender.com/api/goals?userid=3`
- **Get all goals for user 4**: `https://cost-manager-restful-web-services-u68h.onrender.com/api/goals?userid=4`
- **Get all goals for user 5**: `https://cost-manager-restful-web-services-u68h.onrender.com/api/goals?userid=5`
- **Get all goals for user 15**: `https://cost-manager-restful-web-services-u68h.onrender.com/api/goals?userid=15`
- **Get all goals for user 20**: `https://cost-manager-restful-web-services-u68h.onrender.com/api/goals?userid=20`
- **Get active goals for user 1**: `https://cost-manager-restful-web-services-u68h.onrender.com/api/goals?userid=1&status=active`
- **Get completed goals for user 4**: `https://cost-manager-restful-web-services-u68h.onrender.com/api/goals?userid=4&status=completed`
- **Get goal by ID** (use the _id from the goals list): `https://cost-manager-restful-web-services-u68h.onrender.com/api/goals/69655e6c65b983e0277d0f4a`
- **Get goal progress** (replace :id with actual goal ID): `https://cost-manager-restful-web-services-u68h.onrender.com/api/goals/69655e6c65b983e0277d0f4a/progress`

### POST/PUT/DELETE Requests (Use Postman/cURL)

#### Create Goal
**URL**: `POST https://cost-manager-restful-web-services-u68h.onrender.com/api/goals`

**Body**:
```json
{
  "userid": 1,
  "title": "Save for vacation",
  "description": "Save money for summer vacation",
  "target_amount": 5000,
  "current_amount": 0,
  "deadline": "2025-08-01",
  "category": "savings",
  "currency": "ILS",
  "status": "active"
}
```

**Note**: 
- `userid` (required): User ID (1-25)
- `title` (required): Goal title
- `target_amount` (required): Target amount to save
- `current_amount` (optional, default: 0): Current saved amount
- `deadline` (optional): Deadline date in format "YYYY-MM-DD"
- `category` (optional): One of: food, health, housing, sports, education, salary, freelance, investment, business, gift, other, savings, debt_payment, emergency_fund
- `currency` (optional, default: "ILS"): One of: ILS, USD, EUR
- `status` (optional, default: "active"): One of: active, completed, paused

#### Update Goal
**URL**: `PUT https://cost-manager-restful-web-services-u68h.onrender.com/api/goals/:id`

**Body** (all fields optional, only include fields you want to update):
```json
{
  "title": "Updated goal title",
  "target_amount": 6000,
  "current_amount": 1000,
  "deadline": "2025-09-01",
  "category": "savings",
  "currency": "USD",
  "status": "active"
}
```

#### Delete Goal
**URL**: `DELETE https://cost-manager-restful-web-services-u68h.onrender.com/api/goals/:id`

**Body**: None required

## Budgets Service

### GET Requests (Open in Browser)
- **Get all budgets for user 1**: `https://cost-manager-restful-web-services-u68h.onrender.com/api/budgets?userid=1`
- **Get all budgets for user 2**: `https://cost-manager-restful-web-services-u68h.onrender.com/api/budgets?userid=2`
- **Get all budgets for user 3**: `https://cost-manager-restful-web-services-u68h.onrender.com/api/budgets?userid=3`
- **Get all budgets for user 4**: `https://cost-manager-restful-web-services-u68h.onrender.com/api/budgets?userid=4`
- **Get all budgets for user 5**: `https://cost-manager-restful-web-services-u68h.onrender.com/api/budgets?userid=5`
- **Get all budgets for user 15**: `https://cost-manager-restful-web-services-u68h.onrender.com/api/budgets?userid=15`
- **Get all budgets for user 20**: `https://cost-manager-restful-web-services-u68h.onrender.com/api/budgets?userid=20`
- **Get budget status for user 1**: `https://cost-manager-restful-web-services-u68h.onrender.com/api/budgets/status?userid=1&year=2025&month=1`
- **Get budget status for user 2**: `https://cost-manager-restful-web-services-u68h.onrender.com/api/budgets/status?userid=2&year=2025&month=1`
- **Get budget status for user 10**: `https://cost-manager-restful-web-services-u68h.onrender.com/api/budgets/status?userid=10&year=2025&month=1`

### POST/PUT/DELETE Requests (Use Postman/cURL)

#### Create Budget (Total Monthly Budget)
**URL**: `POST https://cost-manager-restful-web-services-u68h.onrender.com/api/budgets`

**Body**:
```json
{
  "userid": 1,
  "year": 2025,
  "month": 1,
  "type": "total",
  "amount": 5000,
  "currency": "ILS"
}
```

#### Create Budget (Category-Specific Budget)
**URL**: `POST https://cost-manager-restful-web-services-u68h.onrender.com/api/budgets`

**Body**:
```json
{
  "userid": 1,
  "year": 2025,
  "month": 1,
  "type": "category",
  "category": "food",
  "amount": 2000,
  "currency": "ILS"
}
```

**Note**:
- `userid` (required): User ID (1-25)
- `year` (required): Year (2000-2100)
- `month` (required): Month (1-12)
- `type` (required): Either "total" or "category"
- `category` (required if type is "category"): One of: food, health, housing, sports, education
- `amount` (required): Budget amount (must be positive)
- `currency` (optional, default: "ILS"): One of: ILS, USD, EUR

#### Update Budget
**URL**: `PUT https://cost-manager-restful-web-services-u68h.onrender.com/api/budgets/:id`

**Body** (all fields optional, only include fields you want to update):
```json
{
  "amount": 2500,
  "currency": "USD"
}
```

#### Delete Budget
**URL**: `DELETE https://cost-manager-restful-web-services-u68h.onrender.com/api/budgets/:id`

**Body**: None required

## Costs Service

### GET Requests (Open in Browser)

#### Get All Costs for User
- **Get all costs for user 1**: `https://cost-manager-restful-web-services-u68h.onrender.com/api/costs?userid=1`
- **Get all costs for user 2**: `https://cost-manager-restful-web-services-u68h.onrender.com/api/costs?userid=2`
- **Get all costs for user 15**: `https://cost-manager-restful-web-services-u68h.onrender.com/api/costs?userid=15`
- **Get all costs for user 20**: `https://cost-manager-restful-web-services-u68h.onrender.com/api/costs?userid=20`

#### Get Costs with Filters
- **Get expenses only**: `https://cost-manager-restful-web-services-u68h.onrender.com/api/costs?userid=1&type=expense`
- **Get income only**: `https://cost-manager-restful-web-services-u68h.onrender.com/api/costs?userid=1&type=income`
- **Get costs by category (food)**: `https://cost-manager-restful-web-services-u68h.onrender.com/api/costs?userid=1&category=food`
- **Get costs by category (health)**: `https://cost-manager-restful-web-services-u68h.onrender.com/api/costs?userid=1&category=health`
- **Get costs by category (salary)**: `https://cost-manager-restful-web-services-u68h.onrender.com/api/costs?userid=1&category=salary&type=income`
- **Get recurring costs**: `https://cost-manager-restful-web-services-u68h.onrender.com/api/costs?userid=1&recurring=true`
- **Get costs with date range**: `https://cost-manager-restful-web-services-u68h.onrender.com/api/costs?userid=1&startDate=2025-01-01&endDate=2025-01-31`
- **Get costs with tags**: `https://cost-manager-restful-web-services-u68h.onrender.com/api/costs?userid=1&tags=urgent,important`
- **Get costs with pagination**: `https://cost-manager-restful-web-services-u68h.onrender.com/api/costs?userid=1&limit=10&skip=0`

#### Get Cost by ID
- **Get cost by ID** (use the _id from the costs list): `https://cost-manager-restful-web-services-u68h.onrender.com/api/costs/69655e6c65b983e0277d0f4a`

**Query Parameters**:
- `userid` (required): User ID (1-25) - or use authentication token
- `type` (optional): Filter by type - "income" or "expense"
- `category` (optional): Filter by category
  - For expenses: food, health, housing, sports, education
  - For income: salary, freelance, investment, business, gift, other
- `startDate` (optional): Start date for date range filter (ISO format: YYYY-MM-DD)
- `endDate` (optional): End date for date range filter (ISO format: YYYY-MM-DD)
- `tags` (optional): Comma-separated list of tags to filter by (e.g., "urgent,important")
- `recurring` (optional): Filter recurring costs - "true" or "false"
- `limit` (optional): Maximum number of results (default: 100)
- `skip` (optional): Number of results to skip for pagination (default: 0)

**Note**: When authenticated (using token), `userid` is optional and will use the authenticated user's ID.

### POST Requests (Use Postman/cURL)

#### Create Cost (Expense)
**URL**: `POST https://cost-manager-restful-web-services-u68h.onrender.com/api/add`

**Body**:
```json
{
  "type": "expense",
  "description": "Grocery shopping",
  "category": "food",
  "userid": 1,
  "sum": 450,
  "currency": "ILS",
  "payment_method": "credit_card"
}
```

#### Create Cost (Income)
**URL**: `POST https://cost-manager-restful-web-services-u68h.onrender.com/api/add`

**Body**:
```json
{
  "type": "income",
  "description": "Salary",
  "category": "salary",
  "userid": 1,
  "sum": 10000,
  "currency": "ILS"
}
```

#### Create Cost (with Authentication Token)
**URL**: `POST https://cost-manager-restful-web-services-u68h.onrender.com/api/add`
**Headers**: `Authorization: Bearer YOUR_TOKEN_HERE`

**Body** (userid is optional when using token):
```json
{
  "type": "expense",
  "description": "Restaurant dinner",
  "category": "food",
  "sum": 200,
  "currency": "ILS",
  "payment_method": "credit_card"
}
```

#### Create Cost with Tags
**URL**: `POST https://cost-manager-restful-web-services-u68h.onrender.com/api/add`

**Body**:
```json
{
  "type": "expense",
  "description": "Gym membership",
  "category": "sports",
  "userid": 1,
  "sum": 200,
  "currency": "ILS",
  "payment_method": "credit_card",
  "tags": ["fitness", "monthly", "important"]
}
```

#### Create Recurring Cost
**URL**: `POST https://cost-manager-restful-web-services-u68h.onrender.com/api/add`

**Body**:
```json
{
  "type": "expense",
  "description": "Monthly rent",
  "category": "housing",
  "userid": 1,
  "sum": 3000,
  "currency": "ILS",
  "payment_method": "credit_card",
  "recurring": {
    "enabled": true,
    "frequency": "monthly",
    "next_date": "2025-02-01"
  }
}
```

#### Create Cost with Future Date
**URL**: `POST https://cost-manager-restful-web-services-u68h.onrender.com/api/add`

**Body**:
```json
{
  "type": "expense",
  "description": "Planned vacation",
  "category": "other",
  "userid": 1,
  "sum": 5000,
  "currency": "ILS",
  "payment_method": "credit_card",
  "created_at": "2025-06-15"
}
```

#### All Expense Categories Examples

**Food**:
```json
{
  "type": "expense",
  "description": "Restaurant dinner",
  "category": "food",
  "userid": 1,
  "sum": 150,
  "currency": "ILS",
  "payment_method": "credit_card"
}
```

**Health**:
```json
{
  "type": "expense",
  "description": "Doctor visit",
  "category": "health",
  "userid": 1,
  "sum": 300,
  "currency": "ILS",
  "payment_method": "cash"
}
```

**Housing**:
```json
{
  "type": "expense",
  "description": "Electricity bill",
  "category": "housing",
  "userid": 1,
  "sum": 450,
  "currency": "ILS",
  "payment_method": "credit_card"
}
```

**Sports**:
```json
{
  "type": "expense",
  "description": "Gym membership",
  "category": "sports",
  "userid": 1,
  "sum": 200,
  "currency": "ILS",
  "payment_method": "credit_card"
}
```

**Education**:
```json
{
  "type": "expense",
  "description": "Online course",
  "category": "education",
  "userid": 1,
  "sum": 500,
  "currency": "ILS",
  "payment_method": "credit_card"
}
```

#### All Income Categories Examples

**Salary**:
```json
{
  "type": "income",
  "description": "Monthly salary",
  "category": "salary",
  "userid": 1,
  "sum": 10000,
  "currency": "ILS"
}
```

**Freelance**:
```json
{
  "type": "income",
  "description": "Freelance project payment",
  "category": "freelance",
  "userid": 1,
  "sum": 3000,
  "currency": "ILS"
}
```

**Investment**:
```json
{
  "type": "income",
  "description": "Stock dividends",
  "category": "investment",
  "userid": 1,
  "sum": 500,
  "currency": "ILS"
}
```

**Business**:
```json
{
  "type": "income",
  "description": "Business revenue",
  "category": "business",
  "userid": 1,
  "sum": 5000,
  "currency": "ILS"
}
```

**Gift**:
```json
{
  "type": "income",
  "description": "Birthday gift",
  "category": "gift",
  "userid": 1,
  "sum": 200,
  "currency": "ILS"
}
```

**Other**:
```json
{
  "type": "income",
  "description": "Cashback refund",
  "category": "other",
  "userid": 1,
  "sum": 100,
  "currency": "ILS"
}
```

**Complete Field Reference**:
- `type` (required): Either "income" or "expense"
- `description` (required): Cost description
- `category` (required): 
  - For expenses: food, health, housing, sports, education
  - For income: salary, freelance, investment, business, gift, other
- `userid` (required if no token): User ID (1-25)
- `sum` (required): Cost amount (must be positive)
- `currency` (optional, default: "ILS"): One of: ILS, USD, EUR
- `payment_method` (optional, only for expenses): One of: credit_card, cash, bit, check
- `tags` (optional): Array of strings for categorization (e.g., ["urgent", "important"])
- `recurring` (optional): Object with:
  - `enabled` (boolean): Whether this is a recurring cost
  - `frequency` (required if enabled): One of: daily, weekly, monthly, yearly
  - `next_date` (required if enabled): Next occurrence date (ISO format)
- `created_at` (optional): Date in ISO format (cannot be in the past, default: current date)

## Analytics Service

### GET Requests (Open in Browser)
- **Get analytics for user 1**: `https://cost-manager-restful-web-services-u68h.onrender.com/api/analytics?userid=1`
- **Get analytics for user 2**: `https://cost-manager-restful-web-services-u68h.onrender.com/api/analytics?userid=2`
- **Get analytics for user 3**: `https://cost-manager-restful-web-services-u68h.onrender.com/api/analytics?userid=3`
- **Get analytics for user 15**: `https://cost-manager-restful-web-services-u68h.onrender.com/api/analytics?userid=15`
- **Get analytics for user 20**: `https://cost-manager-restful-web-services-u68h.onrender.com/api/analytics?userid=20`
- **Get analytics summary**: `https://cost-manager-restful-web-services-u68h.onrender.com/api/analytics/summary?userid=1`
- **Get analytics trends**: `https://cost-manager-restful-web-services-u68h.onrender.com/api/analytics/trends?userid=1`
- **Get category breakdown**: `https://cost-manager-restful-web-services-u68h.onrender.com/api/analytics/category?userid=1`
- **Get categories analytics**: `https://cost-manager-restful-web-services-u68h.onrender.com/api/analytics/categories?userid=1`
- **Get monthly summary**: `https://cost-manager-restful-web-services-u68h.onrender.com/api/analytics/monthly?userid=1&year=2025`
- **Get comparison**: `https://cost-manager-restful-web-services-u68h.onrender.com/api/analytics/comparison?userid=1&year=2025&month=1`
- **Get yearly analytics**: `https://cost-manager-restful-web-services-u68h.onrender.com/api/analytics/yearly?userid=1&year=2025`

## Report Service

### GET Requests (Open in Browser)
- **Get report for user 1**: `https://cost-manager-restful-web-services-u68h.onrender.com/api/reports?id=1&year=2025&month=1`
- **Get report for user 2**: `https://cost-manager-restful-web-services-u68h.onrender.com/api/reports?id=2&year=2025&month=1`
- **Get report for user 15**: `https://cost-manager-restful-web-services-u68h.onrender.com/api/reports?id=15&year=2025&month=1`
- **Get report for user 20**: `https://cost-manager-restful-web-services-u68h.onrender.com/api/reports?id=20&year=2025&month=1`
- **Get monthly report for user 1 (January 2025)**: `https://cost-manager-restful-web-services-u68h.onrender.com/api/reports?id=1&month=1&year=2025`
- **Get monthly report for user 1 (December 2024)**: `https://cost-manager-restful-web-services-u68h.onrender.com/api/reports?id=1&month=12&year=2024`
- **Get report (singular)**: `https://cost-manager-restful-web-services-u68h.onrender.com/api/report?id=1&year=2025&month=1`

**Note**:
- `id` (required): User ID (1-25)
- `year` (required): Year (e.g., 2024, 2025)
- `month` (required): Month (1-12)

## Admin Service

### GET Requests (Open in Browser)
- **Get about/team**: `https://cost-manager-restful-web-services-u68h.onrender.com/api/about`

## Logs Service

### GET Requests (Open in Browser)
- **Get all logs**: `https://cost-manager-restful-web-services-u68h.onrender.com/api/logs`

**Response Example**:
```json
[
  {
    "id": 1,
    "message": "GET /api/logs",
    "level": "info",
    "endpoint": "/api/logs",
    "method": "GET",
    "timestamp": "2026-01-16T15:46:06.544Z",
    "status_code": 200
  },
  {
    "id": 2,
    "message": "POST /api/add",
    "level": "info",
    "endpoint": "/api/add",
    "method": "POST",
    "timestamp": "2026-01-16T15:45:30.123Z",
    "userid": 123123,
    "status_code": 201
  }
]
```

**Response**: Returns an array of log objects. Each log entry includes:
- `id`: Unique log entry ID
- `message`: Log message content
- `level`: Log level (info, error, warn, debug)
- `endpoint`: The endpoint that was accessed
- `method`: HTTP method used (GET, POST, PUT, DELETE, etc.)
- `timestamp`: When the log was created
- `userid`: User ID if applicable (optional)
- `status_code`: HTTP status code of the response (optional)

**Notes**:
- Returns all log entries stored in the database
- Logs are automatically created for every HTTP request and endpoint access
- Logs include information about requests, responses, and errors
- If no logs exist, the endpoint returns an empty array `[]`
- Logs are stored in the MongoDB `logs` collection

## Database Summary

The database contains:
- **25 users** (IDs 1-25)
- **184 goals** (distributed across all users, 5-10 goals per user)
- **1,090 budgets** (for users 1-25, across 13 months including past 12 months and current month)
- **5,000 costs** (200 costs per user - 3,578 expenses and 1,422 income, distributed across 24 months)
- **600 cached reports** (cached monthly reports for past 24 months)

## Notes

1. **For POST/PUT/DELETE requests**, you'll need to use tools like:
   - Postman
   - Insomnia
   - cURL
   - Browser extensions (like REST Client)

2. **Local Testing**: If running locally, replace the base URL with `http://localhost:3000` (or your local port)

3. **User IDs**: The seed data creates users with IDs 1-25, so use those IDs in your queries.

4. **Query Parameters**: Some endpoints require query parameters (like `userid`). Make sure to include them in the URL.

5. **All services are accessible through the same base URL** - no need to specify different ports. The gateway service routes requests to the appropriate handlers.

6. **Health Check**: Visit the root URL (`/`) to see all available services and verify the service is running.
