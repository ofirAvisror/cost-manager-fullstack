# Cost Manager

A comprehensive personal finance management application built with React. Track your expenses, income, and savings with multi-currency support, budgeting tools, savings goals, and detailed analytics.

![Cost Manager](https://img.shields.io/badge/version-0.1.0-blue.svg)
![React](https://img.shields.io/badge/React-18.2.0-61DAFB?logo=react)
![License](https://img.shields.io/badge/license-Private-red.svg)

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Technologies](#technologies)
- [Installation](#installation)
- [Usage](#usage)
- [Project Structure](#project-structure)
- [Key Components](#key-components)
- [Database Schema](#database-schema)
- [Internationalization](#internationalization)
- [Progressive Web App (PWA)](#progressive-web-app-pwa)
- [Scripts](#scripts)
- [Development](#development)
- [Browser Support](#browser-support)

## Overview

Cost Manager is a modern, feature-rich expense tracking application that helps you manage your personal finances. Built with React and Material-UI, it provides an intuitive interface for tracking expenses, income, and savings across multiple currencies. All data is stored locally using IndexedDB, ensuring privacy and offline functionality.

## Features

### 💰 Transaction Management
- **Add Transactions**: Record expenses, income, and savings deposits/withdrawals
- **Multiple Transaction Types**: Support for expenses, income, and savings transactions
- **Multi-Currency Support**: Track transactions in USD, ILS, GBP, and EURO
- **Automatic Currency Conversion**: View reports and statistics in your preferred currency
- **Transaction Categories**: Organize transactions with customizable categories
- **Descriptive Notes**: Add detailed descriptions to each transaction

### 📊 Analytics & Reports
- **Dashboard**: Overview of your financial status with key statistics
- **Monthly Reports**: Detailed breakdowns of transactions by month
- **Pie Charts**: Visual representation of expenses by category
- **Bar Charts**: Trend analysis over time periods
- **Statistics**: Total expenses, income, savings, and category breakdowns

### 📈 Budget Management
- **Set Budgets**: Create monthly budgets for different categories
- **Budget Tracking**: Monitor spending against your budgets
- **Budget Alerts**: Receive notifications when budgets are exceeded
- **Budget Overview**: View all budgets and their current status

### 🎯 Savings Goals
- **Goal Setting**: Define and track savings goals
- **Progress Tracking**: Monitor progress towards your goals
- **Deposit/Withdrawal Tracking**: Record savings deposits and withdrawals
- **Goal Management**: Create, edit, and delete savings goals

### 🔍 Advanced Filtering
- **Date Range Filters**: Filter transactions by custom date ranges
- **Category Filters**: Filter by specific categories
- **Amount Filters**: Filter by minimum and maximum amounts
- **Currency Filters**: Filter transactions by currency
- **Transaction Type Filters**: Filter by expense, income, or savings

### 📱 User Experience
- **Responsive Design**: Works seamlessly on desktop, tablet, and mobile devices
- **Dark/Light Theme**: Toggle between light and dark themes
- **Multi-Language Support**: Available in English, Hebrew, and Spanish
- **Notifications**: Get notified about budget overruns and important events
- **Export Functionality**: Export reports to PDF and CSV formats
- **PWA Support**: Install as a Progressive Web App for native-like experience

### 🔒 Privacy & Data
- **Local Storage**: All data is stored locally in your browser using IndexedDB
- **No Server Required**: Fully client-side application
- **Offline Support**: Works completely offline after initial load
- **Data Privacy**: Your financial data never leaves your device

## Technologies

### Core Framework
- **React 18.2.0**: Modern UI library
- **Create React App**: Build tooling and development environment

### UI Framework & Styling
- **Material-UI (MUI) 5.15.0**: Comprehensive React component library
- **Emotion**: CSS-in-JS styling solution
- **Framer Motion 10.16.16**: Animation library
- **Recharts 2.10.3**: Charting library for data visualization

### Data Management
- **IndexedDB**: Browser-based database for local data storage
- **Custom IDB Wrapper**: Promise-based IndexedDB abstraction layer

### Internationalization
- **i18next 23.7.6**: Internationalization framework
- **react-i18next 13.5.0**: React bindings for i18next

### Utilities
- **Zod 4.3.5**: Schema validation library
- **date-fns 2.30.0**: Date utility library
- **react-hot-toast 2.4.1**: Toast notification library
- **jsPDF 4.0.0**: PDF generation library
- **jsPDF-AutoTable 3.8.2**: Table plugin for jsPDF
- **Country Flag Icons 1.6.4**: Flag icons for currency display

### Development Tools
- **Canvas 3.2.0**: Server-side canvas rendering (for icon generation)
- **Sharp 0.34.5**: High-performance image processing

## Installation

### Prerequisites
- Node.js (version 14.0 or higher recommended)
- npm or yarn package manager

### Steps

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd HIT-FRONT
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Generate application icons** (optional, but recommended)
   ```bash
   npm run generate-icons
   ```

4. **Start the development server**
   ```bash
   npm start
   ```

5. **Open your browser**
   - Navigate to `http://localhost:3000`
   - The application will automatically open in your default browser

## Usage

### Getting Started

1. **First Launch**: The application automatically initializes a local database on first use
2. **Add a Transaction**: Navigate to "Add Transaction" from the sidebar
3. **Fill in Details**:
   - Select transaction type (Expense, Income, or Savings)
   - Enter the amount
   - Select currency
   - Choose or create a category
   - Add a description
4. **View Dashboard**: Check the dashboard for an overview of your finances
5. **Explore Reports**: Use the Report, Pie Chart, or Bar Chart views for detailed analysis

### Managing Categories

1. Navigate to "Categories" from the sidebar
2. Click "Add Category" to create new categories
3. Edit or delete existing categories as needed
4. Categories are automatically available when adding transactions

### Setting Up Budgets

1. Go to "Budget" from the sidebar
2. Click "Add Budget"
3. Select a category and set the monthly budget amount
4. The application will track spending and notify you when budgets are exceeded

### Creating Savings Goals

1. Navigate to "Savings Goals" from the sidebar
2. Click "Add Goal"
3. Enter goal name, target amount, and deadline
4. Track deposits and withdrawals through the transaction form

### Exporting Data

1. Navigate to the Report view
2. Use the export button to generate PDF or CSV files
3. Select columns and date ranges before exporting

## Project Structure

```
HIT-FRONT/
├── public/                 # Public assets
│   ├── index.html         # HTML template
│   ├── manifest.json      # PWA manifest
│   ├── sw.js             # Service worker
│   ├── exchange-rates.json # Currency exchange rates
│   ├── icon.svg          # Application icon (SVG)
│   ├── icon-192.png      # Application icon (192x192)
│   └── icon-512.png      # Application icon (512x512)
├── src/
│   ├── components/       # React components
│   │   ├── AddCostForm.jsx
│   │   ├── Dashboard/    # Dashboard components
│   │   ├── Budget/       # Budget management
│   │   ├── Categories/   # Category management
│   │   ├── Charts/       # Chart components
│   │   ├── Export/       # Export functionality
│   │   ├── Filters/      # Filtering components
│   │   ├── Layout/       # Layout components
│   │   ├── Notifications/# Notification system
│   │   └── SavingsGoals/ # Savings goals
│   ├── contexts/         # React contexts
│   │   ├── ThemeContext.jsx
│   │   └── NotificationContext.jsx
│   ├── i18n/            # Internationalization
│   │   └── config.js
│   ├── lib/             # Utility libraries
│   │   ├── idb-react.js # IndexedDB wrapper
│   │   ├── idb.js       # IndexedDB wrapper (vanilla JS version)
│   │   ├── chartHelpers.js
│   │   └── exportHelpers.js
│   ├── locales/         # Translation files
│   │   ├── en/
│   │   ├── he/
│   │   └── es/
│   ├── types/           # Type definitions
│   ├── App.jsx          # Main application component
│   └── index.jsx        # Application entry point
├── scripts/             # Build scripts
│   └── generate-icons.js
├── package.json         # Dependencies and scripts
└── README.md           # This file
```

## Key Components

### AddCostForm
Form component for adding new transactions with validation using Zod schema.

### Dashboard
Main dashboard displaying statistics, charts, and overview of financial status.

### BudgetManager
Component for creating and managing monthly budgets with alerts.

### CategoriesManager
Interface for managing transaction categories.

### SavingsGoalsManager
Tool for setting and tracking savings goals.

### ReportView
Detailed report view with filtering and export capabilities.

### PieChartView & BarChartView
Visualization components for analyzing financial data.

### AdvancedFilters
Advanced filtering interface for transactions.

### NotificationCenter
Central hub for viewing and managing notifications.

### Settings
Application settings for configuring exchange rate URL. Theme and language preferences are managed from the Header component.

## Database Schema

The application uses IndexedDB with the following object stores:

### Costs Store
Stores all transactions (expenses, income, savings).

**Schema:**
```javascript
{
  id: number (auto-increment),
  sum: number,
  currency: string ('USD' | 'ILS' | 'GBP' | 'EURO'),
  category: string,
  description: string,
  type: string ('expense' | 'income' | 'savings_deposit' | 'savings_withdrawal'),
  date: {
    year: number,
    month: number (1-12),
    day: number
  }
}
```

### Categories Store
Stores user-defined categories.

**Schema:**
```javascript
{
  id: number (auto-increment),
  name: string,
  // Additional category properties
}
```

### Budgets Store
Stores monthly budget definitions.

**Schema:**
```javascript
{
  id: number (auto-increment),
  category: string,
  amount: number,
  currency: string,
  month: number,
  year: number
}
```

### Savings Goals Store
Stores savings goal definitions.

**Schema:**
```javascript
{
  id: number (auto-increment),
  name: string,
  targetAmount: number,
  currentAmount: number,
  currency: string,
  deadline: Date,
  // Additional properties
}
```

## Internationalization

The application supports multiple languages:
- **English (en)**: Default language
- **Hebrew (he)**: Full RTL support
- **Spanish (es)**: Complete translation

Translation files are located in `src/locales/` directory. The language can be changed from the Settings page.

## Progressive Web App (PWA)

Cost Manager is a Progressive Web App, which means:

- **Installable**: Can be installed on your device from the browser
- **Offline Support**: Works offline after initial load
- **Service Worker**: Caches resources for offline access
- **App-like Experience**: Standalone display mode
- **Update Notifications**: Notifies users when new versions are available

### Installing as PWA

1. **Chrome/Edge (Desktop)**:
   - Click the install icon in the address bar
   - Or go to Settings → Install Cost Manager

2. **Chrome (Android)**:
   - Tap the menu (three dots)
   - Select "Add to Home screen"

3. **Safari (iOS)**:
   - Tap the Share button
   - Select "Add to Home Screen"

## Scripts

### `npm start`
Starts the development server at `http://localhost:3000`

### `npm run build`
Creates an optimized production build in the `build/` directory

### `npm run generate-icons`
Generates application icons for PWA (runs automatically before build)

### `npm run prebuild`
Automatically runs before build to generate icons

### `npm run eject`
Ejects from Create React App (irreversible, not recommended)

## Development

### Code Style
- Components use functional components with hooks
- ES6+ JavaScript features
- Material-UI for UI components
- Custom hooks and contexts for state management

### Adding New Features

1. **New Components**: Add to `src/components/`
2. **New Routes**: Add to `App.jsx` renderView function
3. **New Translations**: Add entries to `src/locales/{lang}/translation.json`
4. **Database Changes**: Update `idb-react.js` onupgradeneeded handler

### Database Migrations

When modifying the database schema:
1. Increment the database version in `App.jsx` (openCostsDB call)
2. Handle migration in `request.onupgradeneeded` in `idb-react.js`
3. Test migration with existing data

## Browser Support

The application supports all modern browsers:
- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)
- Opera (latest)

**Note**: IndexedDB support is required. The application may not work in very old browsers (Internet Explorer 11 and below).

## Exchange Rates

Exchange rates are fetched from a remote JSON file. The default URL can be configured via:
- Environment variable: `REACT_APP_EXCHANGE_RATE_URL`
- LocalStorage key: `exchangeRateUrl`

Default exchange rate source: External JSON endpoint

## Contributing

This is a private project. For contribution guidelines, please contact the project maintainer.

## License

Private - All rights reserved

## Support

For issues, questions, or feature requests, please contact the development team.

---

**Built with ❤️ using React and Material-UI**

