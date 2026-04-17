/**
 * App.jsx - Main application component
 */

import React, { useState, useEffect } from 'react';
import { CssBaseline, Alert, Fade } from '@mui/material';
import { Toaster } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import './i18n/config';
import { ThemeProvider } from './contexts/ThemeContext';
import { NotificationProvider, useNotifications } from './contexts/NotificationContext';
import { openCostsDB } from './lib/api-db';
import Layout from './components/Layout/Layout';
import AddCostForm from './components/AddCostForm';
import ReportView from './components/ReportView';
import PieChartView from './components/PieChartView';
import BarChartView from './components/BarChartView';
import Settings from './components/Settings';
import Dashboard from './components/Dashboard/Dashboard';
import CategoriesManager from './components/Categories/CategoriesManager';
import BudgetManager from './components/Budget/BudgetManager';
import SavingsGoalsManager from './components/SavingsGoals/SavingsGoalsManager';
import AdvancedFilters from './components/Filters/AdvancedFilters';
import NotificationCenter from './components/Notifications/NotificationCenter';

/**
 * Main App component (inner component with notifications)
 */
function AppInner() {
  const { t } = useTranslation();
  const [db, setDb] = useState(null);
  const [dbError, setDbError] = useState('');
  const [currentView, setCurrentView] = useState('dashboard');
  const { notifications, checkBudgets } = useNotifications();

  /**
   * Initializes the database connection
   */
  useEffect(function() {
    async function initDB() {
      try {
        const database = await openCostsDB();
        setDb(database);
        setDbError('');
      } catch (error) {
        setDbError(t('messages.failedToInitialize') + ': ' + (error instanceof Error ? error.message : 'Unknown error'));
      }
    }

    initDB();
  }, [t]);

  useEffect(function() {
    // Check budgets periodically
    if (db) {
      checkBudgets(db);
      const interval = setInterval(function() {
        checkBudgets(db);
      }, 60000); // Check every minute
      
      return function() {
        clearInterval(interval);
      };
    }
  }, [db, checkBudgets]);

  /**
   * Renders the current view based on selection
   */
  const renderView = function() {
    switch (currentView) {
      case 'dashboard':
        return <Dashboard db={db} />;
      case 'add-cost':
        return <AddCostForm db={db} />;
      case 'report':
        return <ReportView db={db} />;
      case 'pie-chart':
        return <PieChartView db={db} />;
      case 'bar-chart':
        return <BarChartView db={db} />;
      case 'categories':
        return <CategoriesManager db={db} />;
      case 'budget':
        return <BudgetManager db={db} />;
      case 'savings-goals':
        return <SavingsGoalsManager db={db} />;
      case 'filters':
        return <AdvancedFilters db={db} />;
      case 'notifications':
        return <NotificationCenter />;
      case 'settings':
        return <Settings />;
      default:
        return <Dashboard db={db} />;
    }
  };

  return (
    <>
      <CssBaseline />
      <Toaster 
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            borderRadius: '8px',
          },
        }}
      />
      <Layout 
        currentView={currentView} 
        onViewChange={setCurrentView}
        notificationCount={notifications.filter(n => !n.read).length}
      >
        {dbError && (
          <Fade in={!!dbError}>
            <Alert 
              severity="error" 
              sx={{ 
                mb: 3,
                borderRadius: 2,
              }}
              onClose={() => setDbError('')}
            >
              {dbError}
            </Alert>
          </Fade>
        )}
        
        {renderView()}
      </Layout>
    </>
  );
}

/**
 * Main App component
 */
function App() {
  return (
    <ThemeProvider>
      <NotificationProvider>
        <AppInner />
      </NotificationProvider>
    </ThemeProvider>
  );
}

export default App;

