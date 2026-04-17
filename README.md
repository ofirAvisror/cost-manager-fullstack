# COST-MANAGER Monorepo

This repository combines two existing projects:

- `backend`: Node.js/Express/MongoDB REST API
- `frontend`: React personal finance web application

Use this README as the main entry point, while keeping the original detailed docs in:

- `backend/README.md`
- `frontend/README.md`

## Repository Structure

```text
COST-MANAGER/
├── backend/   # REST services, MongoDB models, tests
└── frontend/  # React client, charts, PWA, i18n
```

## Backend (from `backend/README.md`)

The backend is a RESTful web service for managing users, costs, reports, admin data, and logs.

### Main Highlights

- Node.js + Express + MongoDB (Mongoose)
- JWT authentication (`/api/register`, `/api/login`, protected routes)
- Multi-process architecture by domain
- Computed Design Pattern for monthly report caching
- Centralized request logging
- Jest + Supertest tests

### Backend Services

- User service (`app_users.js`)
- Cost service (`app_costs.js`)
- Report service (`app_report.js`)
- Admin service (`app_admin.js`)
- Logs service (`app_logs.js`)

### Backend Quick Start

```bash
cd backend
npm install
```

Create `backend/.env` with at least:

```env
MONGO_URI=your_mongodb_connection_string
PORT_USERS=3000
PORT_COSTS=3001
PORT_REPORT=3002
PORT_ADMIN=3003
PORT_LOGS=3007
JWT_SECRET=your_secret
JWT_EXPIRES_IN=7d
```

Run services:

```bash
npm run dev
```

Or run each process separately (see scripts in `backend/package.json` and full details in `backend/README.md`).

## Frontend (from `frontend/README.md`)

The frontend is a React application for personal finance management with dashboards, reports, budgeting, and savings goals.

### Main Highlights

- React + Material UI
- Transaction management (expenses, income, savings)
- Dashboard + Pie/Bar/Area charts
- Budgets and savings goals
- Advanced filtering
- Multi-language support (English/Hebrew/Spanish)
- PWA support (installable, offline-ready)

### Frontend Quick Start

```bash
cd frontend
npm install
npm start
```

The app runs at:

- `http://localhost:3000`

### Frontend Build

```bash
cd frontend
npm run build
```

## Running Full Stack Locally

1. Start backend services from `backend/`
2. Start frontend from `frontend/`
3. Verify frontend environment points to backend base URL (for example via `REACT_APP_API_BASE_URL`)

## Detailed Documentation

For complete endpoint specs, schema definitions, feature breakdown, and advanced setup:

- Backend: `backend/README.md`
- Frontend: `frontend/README.md`
