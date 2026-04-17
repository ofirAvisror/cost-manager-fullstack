# Cost Manager RESTful Web Service

A comprehensive Node.js/Express/MongoDB RESTful API for managing expenses and generating monthly reports. This project implements a RESTful web service with four separate processes, following the Computed Design Pattern for report generation.

## Project Structure

```
├── src/
│   ├── config/            # Configuration files
│   │   ├── database.js    # MongoDB connection
│   │   └── logger.js      # MongoDB logging middleware
│   ├── models/            # Mongoose schemas
│   │   ├── User.js        # User schema
│   │   ├── Cost.js        # Cost schema
│   │   ├── Report.js      # Report schema (for caching)
│   │   └── Log.js         # Log schema
│   ├── middleware/         # Express middleware
│   │   └── logging.js     # MongoDB logging middleware
│   └── processes/         # Application processes
│       ├── users.js       # User management process
│       ├── costs.js        # Cost management process
│       ├── report.js       # Report generation process
│       ├── admin.js        # Admin/team information process
│       └── logs.js         # Logs service process
├── tests/                 # Unit tests
│   ├── users.test.js
│   ├── costs.test.js
│   ├── report.test.js
│   ├── admin.test.js
│   └── logs.test.js
├── app_users.js           # Entry point for users process (Port 3000)
├── app_costs.js           # Entry point for costs process (Port 3001)
├── app_report.js          # Entry point for report process (Port 3002)
├── app_admin.js           # Entry point for admin process (Port 3003)
├── app_logs.js            # Entry point for logs process (Port 3007)
├── package.json
├── jest.config.js         # Jest test configuration
├── .env                   # Environment variables (create from .env.example)
└── README.md
```

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Create a `.env` file in the root directory with the following variables:

```
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/cost_manager
PORT_USERS=3000
PORT_COSTS=3001
PORT_REPORT=3002
PORT_ADMIN=3003
PORT_LOGS=3007
NODE_ENV=development
LOG_LEVEL=info
JWT_SECRET=your-secret-key-change-in-production
JWT_EXPIRES_IN=7d
```

**Note:** 
- Replace the MongoDB URI with your actual MongoDB Atlas connection string.
- Change JWT_SECRET to a secure random string in production.
- JWT_EXPIRES_IN specifies token expiration (default: 7d).

### 3. Start the Services

You can run each service in a separate terminal:

```bash
# Terminal 1: User Management Service
npm run start:users

# Terminal 2: Cost Management Service
npm run start:costs

# Terminal 3: Report Generation Service
npm run start:report

# Terminal 4: Admin Service
npm run start:admin

# Terminal 5: Logs Service
npm run start:logs
```

## API Endpoints

### User Management Service (Port 3000)

#### POST /api/register - Register New User
Registers a new user with email and password (returns JWT token).

**Request Body:**
```json
{
  "id": 123123,
  "first_name": "mosh",
  "last_name": "israeli",
  "birthday": "1990-05-15",
  "email": "mosh@example.com",
  "password": "password123"
}
```

**Response (201 Created):**
```json
{
  "user": {
    "id": 123123,
    "first_name": "mosh",
    "last_name": "israeli",
    "birthday": "1990-05-15T00:00:00.000Z",
    "email": "mosh@example.com",
    "_id": "..."
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### POST /api/login - Login
Login with email and password (returns JWT token).

**Request Body:**
```json
{
  "email": "mosh@example.com",
  "password": "password123"
}
```

**Response (200 OK):**
```json
{
  "user": {
    "id": 123123,
    "first_name": "mosh",
    "last_name": "israeli",
    "email": "mosh@example.com"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Error Response (401 Unauthorized):**
```json
{
  "id": "UNAUTHORIZED",
  "message": "Invalid email or password"
}
```

#### GET /api/users/me - Get Current User
Get current authenticated user's details (requires authentication).

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
```

**Response (200 OK):**
```json
{
  "id": 123123,
  "first_name": "mosh",
  "last_name": "israeli",
  "email": "mosh@example.com",
  "total_income": 5000,
  "total_expenses": 2500,
  "balance": 2500
}
```

#### POST /api/add - Create User (Backward Compatibility)
Creates a new user without authentication (for backward compatibility).

**Request Body:**
```json
{
  "id": 123123,
  "first_name": "mosh",
  "last_name": "israeli",
  "birthday": "1990-05-15"
}
```

**Response (201 Created):**
```json
{
  "id": 123123,
  "first_name": "mosh",
  "last_name": "israeli",
  "birthday": "1990-05-15T00:00:00.000Z",
  "_id": "...",
  "createdAt": "...",
  "updatedAt": "..."
}
```

#### GET /api/users - List All Users
Returns a JSON array of all users in the system.

**Response (200 OK):**
```json
[
  {
    "id": 123123,
    "first_name": "mosh",
    "last_name": "israeli",
    "birthday": "1990-05-15T00:00:00.000Z"
  }
]
```

#### GET /api/users/:id - Get User Details with Total Costs
Returns user details including the total sum of all their costs.

**Response (200 OK):**
```json
{
  "first_name": "mosh",
  "last_name": "israeli",
  "id": 123123,
  "total": 250.50
}
```

**Error Response (404 Not Found):**
```json
{
  "id": "NOT_FOUND",
  "message": "User not found"
}
```

### Cost Management Service (Port 3001)

#### POST /api/add - Add Cost Item
Creates a new cost entry. The server does not allow adding costs with dates in the past.

**Request Body:**
```json
{
  "description": "Lunch at restaurant",
  "category": "food",
  "userid": 123123,
  "sum": 85.50
}
```

**Optional Fields:**
- `created_at`: Date (must not be in the past). If not provided, uses current date/time.

**Response (201 Created):**
```json
{
  "description": "Lunch at restaurant",
  "category": "food",
  "userid": 123123,
  "sum": 85.50,
  "created_at": "2025-01-15T12:00:00.000Z",
  "_id": "..."
}
```

**Valid Categories:** `food`, `health`, `housing`, `sports`, `education`

**Error Response (400 Bad Request):**
```json
{
  "id": "VALIDATION_ERROR",
  "message": "Cannot add costs with dates in the past"
}
```

### Report Generation Service (Port 3002)

#### GET /api/report - Get Monthly Report
Returns a monthly report for a specific user, grouped by category. Implements the **Computed Design Pattern**:
- **Past Months**: Returns cached report if available, otherwise generates, caches, and returns
- **Current Month**: Always calculates fresh data (not cached)

**Query Parameters:**
- `id`: User ID (required)
- `year`: Year (required)
- `month`: Month 1-12 (required)

**Example Request:**
```
GET /api/report?id=123123&year=2025&month=11
```

**Response (200 OK):**
```json
{
  "userid": 123123,
  "year": 2025,
  "month": 11,
  "costs": [
    {
      "food": [
        {
          "sum": 12,
          "description": "choco",
          "day": 17
        },
        {
          "sum": 14,
          "description": "baigale",
          "day": 22
        }
      ]
    },
    {
      "education": [
        {
          "sum": 82,
          "description": "math book",
          "day": 10
        }
      ]
    },
    {
      "health": []
    },
    {
      "housing": []
    },
    {
      "sports": []
    }
  ]
}
```

**Error Response (400 Bad Request):**
```json
{
  "id": "VALIDATION_ERROR",
  "message": "Missing required query parameters: id, year, and month are required"
}
```

### Admin Service (Port 3003)

#### GET /api/about - Get Team Members
Returns the list of team members (developers) with only first_name and last_name.

**Response (200 OK):**
```json
[
  {
    "first_name": "Gal",
    "last_name": "Aviv"
  },
  {
    "first_name": "Bar",
    "last_name": "Bibi"
  },
  {
    "first_name": "Ofir",
    "last_name": "Avisror"
  }
]
```

### Logs Service (Port 3004)

#### GET /api/logs - List All Logs
Returns all log entries stored in the MongoDB logs collection.

**Response (200 OK):**
```json
[
  {
    "id": 1,
    "message": "GET /api/users - Request received",
    "level": "info",
    "endpoint": "/api/users",
    "method": "GET",
    "timestamp": "2025-01-15T12:00:00.000Z",
    "status_code": 200
  }
]
```

## Error Response Format

All error responses follow this format:
```json
{
  "id": "ERROR_ID",
  "message": "Error description"
}
```

**Common Error IDs:**
- `VALIDATION_ERROR`: Invalid input parameters
- `NOT_FOUND`: Resource not found
- `DUPLICATE_ERROR`: Duplicate resource (e.g., user ID already exists)
- `SERVER_ERROR`: Internal server error

## Database Schemas

### User Collection (`users`)
- `id` (Number, Unique, Required): Custom user ID (different from MongoDB `_id`)
- `first_name` (String, Required)
- `last_name` (String, Required)
- `birthday` (Date, Required)
- `_id` (ObjectId): MongoDB auto-generated ID

### Cost Collection (`costs`)
- `description` (String, Required)
- `category` (String, Required, Enum: 'food', 'health', 'housing', 'sports', 'education')
- `userid` (Number, Required): References User.id
- `sum` (Number/Double, Required, Min: 0)
- `created_at` (Date, Default: current date/time)
- `_id` (ObjectId): MongoDB auto-generated ID

**Note:** The server does not allow adding costs with dates in the past.

### Report Collection (`reports`)
Used for caching reports following the Computed Design Pattern:
- `userid` (Number, Required)
- `year` (Number, Required)
- `month` (Number, Required, Range: 1-12)
- `data` (Object, Required): Cached report JSON structure
- `saved_at` (Date, Default: now)
- `_id` (ObjectId): MongoDB auto-generated ID

### Log Collection (`logs`)
Stores all HTTP requests and endpoint accesses:
- `id` (Number, Unique, Required): Log entry ID
- `message` (String, Required): Log message
- `level` (String, Required, Enum: 'info', 'error', 'warn', 'debug')
- `endpoint` (String): The endpoint that was accessed
- `method` (String, Enum: 'GET', 'POST', 'PUT', 'DELETE', 'PATCH')
- `timestamp` (Date, Default: now)
- `userid` (Number): User ID if applicable
- `status_code` (Number): HTTP status code
- `_id` (ObjectId): MongoDB auto-generated ID

## Logging

All HTTP requests and endpoint accesses are logged using **Pino** logger and saved to the MongoDB `logs` collection. The logging middleware automatically:
- Logs every incoming HTTP request
- Logs every endpoint access
- Saves logs to MongoDB for centralized logging
- Maintains structured JSON output for easy parsing and analysis

## Testing

The project includes comprehensive unit tests using Jest and Supertest.

### Run Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### Test Files

- `tests/users.test.js` - Tests for user endpoints
- `tests/costs.test.js` - Tests for cost endpoints
- `tests/report.test.js` - Tests for report endpoint (including Computed Design Pattern)
- `tests/admin.test.js` - Tests for admin endpoints
- `tests/logs.test.js` - Tests for logs endpoints

## Technologies

- **Runtime**: Node.js
- **Web Framework**: Express.js
- **Database**: MongoDB Atlas (Mongoose ODM)
- **Logging**: Pino with MongoDB storage
- **Environment**: dotenv
- **Testing**: Jest, Supertest

## Architecture

The application consists of **four separate processes**:

1. **User Process** (`app_users.js`): Handles user-related operations
2. **Cost Process** (`app_costs.js`): Handles cost-related operations
3. **Report Process** (`app_report.js`): Handles report generation with Computed Design Pattern
4. **Admin Process** (`app_admin.js`): Handles admin operations (team info)
5. **Logs Process** (`app_logs.js`): Handles logs retrieval operations

Each process runs independently on a separate port and connects to the same MongoDB database.

## Computed Design Pattern

The report generation implements the **Computed Design Pattern**:
- Reports for **past months** are cached in the `reports` collection
- When a past month report is requested, it's retrieved from cache if available
- If not cached, the report is generated, saved to cache, and returned
- Reports for the **current month** are always calculated fresh (not cached)

## Database Initialization

Before deployment, ensure the database contains a single user with:
- `id`: 123123
- `first_name`: "mosh"
- `last_name`: "israeli"
- `birthday`: Any valid date

## Development

For development with auto-reload (all 4 processes):

```bash
npm run dev
```

## Deployment

Each process should be deployed separately. Ensure:
- All processes connect to the same MongoDB Atlas database
- Environment variables are properly configured
- All four processes are running and accessible

## License

ISC
