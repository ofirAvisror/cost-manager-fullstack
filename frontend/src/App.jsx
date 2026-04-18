/**
 * App.jsx - Main application component
 */

import React, { useState, useEffect } from 'react';
import {
  CssBaseline,
  Alert,
  Fade,
  Box,
  Button,
  Card,
  CardContent,
  TextField,
  Typography,
  Stack,
  Checkbox,
  FormControlLabel,
} from '@mui/material';
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
import PartnerManager from './components/Partner/PartnerManager';
import RecurringSchedulesManager from './components/Recurring/RecurringSchedulesManager';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:4000';
const AUTH_STORAGE_KEY = 'cm_auth';
const CREDS_STORAGE_KEY = 'cm_saved_credentials';

function AuthScreen({ onAuthenticated }) {
  const { t } = useTranslation();
  const [isRegister, setIsRegister] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [rememberCreds, setRememberCreds] = useState(true);
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    birthday: '',
    email: '',
    password: '',
  });

  useEffect(function initSavedCredentials() {
    try {
      const savedRaw = localStorage.getItem(CREDS_STORAGE_KEY);
      if (!savedRaw) return;
      const saved = JSON.parse(savedRaw);
      setForm((prev) => ({
        ...prev,
        email: saved.email || '',
        password: saved.password || '',
      }));
      setRememberCreds(true);
    } catch (err) {
      // Ignore malformed saved credentials.
    }
  }, []);

  const updateField = function(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async function(event) {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!form.email || !form.password) {
        throw new Error(t('auth.errors.emailPasswordRequired'));
      }

      let payload;
      let endpoint;
      if (isRegister) {
        if (!form.first_name || !form.last_name || !form.birthday) {
          throw new Error(t('auth.errors.fillRegistrationFields'));
        }
        endpoint = '/api/register';
        payload = {
          first_name: form.first_name.trim(),
          last_name: form.last_name.trim(),
          birthday: form.birthday,
          email: form.email.trim().toLowerCase(),
          password: form.password,
        };
      } else {
        endpoint = '/api/login';
        payload = {
          email: form.email.trim().toLowerCase(),
          password: form.password,
        };
      }

      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.message || t('auth.errors.authenticationFailed'));
      }

      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(data));
      if (rememberCreds) {
        localStorage.setItem(
          CREDS_STORAGE_KEY,
          JSON.stringify({ email: form.email.trim().toLowerCase(), password: form.password })
        );
      } else {
        localStorage.removeItem(CREDS_STORAGE_KEY);
      }
      onAuthenticated(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('auth.errors.authenticationFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 2,
        bgcolor: 'background.default',
      }}
    >
      <Card sx={{ width: '100%', maxWidth: 420, borderRadius: 3, boxShadow: 4 }}>
        <CardContent sx={{ p: 4 }}>
          <Typography variant="h5" sx={{ mb: 3, fontWeight: 700 }}>
            {isRegister ? t('auth.createAccount') : t('auth.signIn')}
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit}>
            <Stack spacing={2}>
              {isRegister && (
                <>
                  <TextField
                    label={t('auth.firstName')}
                    value={form.first_name}
                    onChange={(e) => updateField('first_name', e.target.value)}
                    required
                  />
                  <TextField
                    label={t('auth.lastName')}
                    value={form.last_name}
                    onChange={(e) => updateField('last_name', e.target.value)}
                    required
                  />
                  <TextField
                    label={t('auth.birthday')}
                    type="date"
                    value={form.birthday}
                    onChange={(e) => updateField('birthday', e.target.value)}
                    InputLabelProps={{ shrink: true }}
                    required
                  />
                </>
              )}

              <TextField
                label={t('auth.email')}
                type="email"
                value={form.email}
                onChange={(e) => updateField('email', e.target.value)}
                required
              />
              <TextField
                label={t('auth.password')}
                type="password"
                value={form.password}
                onChange={(e) => updateField('password', e.target.value)}
                required
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={rememberCreds}
                    onChange={(e) => setRememberCreds(e.target.checked)}
                  />
                }
                label={t('auth.rememberEmailPassword')}
              />
              <Button type="submit" variant="contained" disabled={loading}>
                {loading ? t('auth.pleaseWait') : isRegister ? t('auth.register') : t('auth.login')}
              </Button>
              <Button
                type="button"
                onClick={() => {
                  setIsRegister((prev) => !prev);
                  setError('');
                }}
              >
                {isRegister ? t('auth.haveAccountSignIn') : t('auth.needAccountRegister')}
              </Button>
            </Stack>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}

/**
 * Main App component (inner component with notifications)
 */
function AppInner({ auth, onLogout }) {
  const { t } = useTranslation();
  const [db, setDb] = useState(null);
  const [dbError, setDbError] = useState('');
  const [currentView, setCurrentView] = useState('dashboard');
  const [partnerNavLabel, setPartnerNavLabel] = useState('');
  const { notifications, checkBudgets } = useNotifications();

  /**
   * Initializes the database connection
   */
  useEffect(function() {
    async function initDB() {
      try {
        const database = await openCostsDB();
        if (database && typeof database.processRecurringDue === 'function') {
          try {
            await database.processRecurringDue();
          } catch (recErr) {
            console.warn('Recurring process on startup:', recErr);
          }
        }
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

  useEffect(function loadPartnerNavLabel() {
    let cancelled = false;

    async function loadPartner() {
      if (!db || typeof db.getPartnerStatus !== 'function') return;
      try {
        const status = await db.getPartnerStatus();
        if (cancelled) return;
        if (status?.status === 'connected' && status?.partner) {
          const fullName = `${status.partner.first_name || ''} ${status.partner.last_name || ''}`.trim();
          setPartnerNavLabel(fullName || status.partner.email || '');
        } else {
          setPartnerNavLabel('');
        }
      } catch (error) {
        if (!cancelled) {
          setPartnerNavLabel('');
        }
      }
    }

    loadPartner();
    return function cleanup() {
      cancelled = true;
    };
  }, [db, currentView]);

  /**
   * Renders the current view based on selection
   */
  const renderView = function() {
    switch (currentView) {
      case 'dashboard':
        return <Dashboard db={db} onViewChange={setCurrentView} />;
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
      case 'partner':
        return <PartnerManager db={db} />;
      case 'recurring':
        return <RecurringSchedulesManager db={db} />;
      default:
        return <Dashboard db={db} onViewChange={setCurrentView} />;
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
        auth={auth}
        onLogout={onLogout}
        partnerNavLabel={partnerNavLabel}
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
  const [auth, setAuth] = useState(null);

  useEffect(function initAuthFromStorage() {
    try {
      const raw = localStorage.getItem(AUTH_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed?.token) {
        setAuth(parsed);
      }
    } catch (error) {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    }
  }, []);

  const handleLogout = function() {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    setAuth(null);
    window.location.reload();
  };

  return (
    <ThemeProvider>
      <NotificationProvider>
        {auth ? (
          <AppInner auth={auth} onLogout={handleLogout} />
        ) : (
          <AuthScreen onAuthenticated={setAuth} />
        )}
      </NotificationProvider>
    </ThemeProvider>
  );
}

export default App;

