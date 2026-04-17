/**
 * Header.jsx - Application header component
 */

import React from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Box,
  Badge,
  Tooltip,
  Menu,
  MenuItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Chip,
  Button
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../contexts/ThemeContext';
import { useNotifications } from '../../contexts/NotificationContext';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import NotificationsIcon from '@mui/icons-material/Notifications';
import LanguageIcon from '@mui/icons-material/Language';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import DeleteIcon from '@mui/icons-material/Delete';
import GetAppIcon from '@mui/icons-material/GetApp';
import { format } from 'date-fns';
import US from 'country-flag-icons/react/3x2/US';
import IL from 'country-flag-icons/react/3x2/IL';
import ES from 'country-flag-icons/react/3x2/ES';

/**
 * Header component
 * @param {Object} props - Component props
 * @param {function} props.onMenuClick - Function to handle menu click
 * @param {number} [props.notificationCount=0] - Number of notifications
 */
export default function Header({ onMenuClick, notificationCount = 0 }) {
  const { mode, toggleMode } = useTheme();
  const { t, i18n } = useTranslation();
  const { notifications, markAsRead, markAllAsRead, clearNotification } = useNotifications();
  const [languageMenuAnchor, setLanguageMenuAnchor] = React.useState(null);
  const [notificationsMenuAnchor, setNotificationsMenuAnchor] = React.useState(null);
  const [deferredPrompt, setDeferredPrompt] = React.useState(null);
  const [isInstalled, setIsInstalled] = React.useState(false);

  const handleLanguageMenuOpen = function(event) {
    setLanguageMenuAnchor(event.currentTarget);
  };

  const handleLanguageMenuClose = function() {
    setLanguageMenuAnchor(null);
  };

  const handleLanguageChange = function(language) {
    i18n.changeLanguage(language);
    handleLanguageMenuClose();
  };

  const handleNotificationsMenuOpen = function(event) {
    setNotificationsMenuAnchor(event.currentTarget);
  };

  const handleNotificationsMenuClose = function() {
    setNotificationsMenuAnchor(null);
  };

  const handleMarkAsRead = function(notificationId) {
    markAsRead(notificationId);
  };

  const handleMarkAllAsRead = function() {
    markAllAsRead();
  };

  const handleClearNotification = function(notificationId) {
    clearNotification(notificationId);
  };

  // Check if app is already installed
  React.useEffect(function() {
    // Check if running as standalone (installed)
    const checkIfInstalled = function() {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                           window.navigator.standalone === true ||
                           document.referrer.includes('android-app://');
      
      setIsInstalled(isStandalone);
    };
    
    // Check immediately
    checkIfInstalled();
    
    // Also listen for display-mode changes
    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', checkIfInstalled);
    }
    
    return function() {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', checkIfInstalled);
      }
    };
  }, []);

  // Listen for beforeinstallprompt event
  React.useEffect(function() {
    const handleBeforeInstallPrompt = function(e) {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return function() {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, [deferredPrompt]);

  const handleInstallClick = async function() {
    if (deferredPrompt) {
      // Show the install prompt using the deferred prompt
      try {
        deferredPrompt.prompt();
        // Wait for the user to respond to the prompt
        await deferredPrompt.userChoice;
        // Clear the deferredPrompt
        setDeferredPrompt(null);
      } catch (error) {
        console.error('[PWA] Error showing install prompt:', error);
      }
    } else {
      // Check if app is installable
      if (window.matchMedia('(display-mode: standalone)').matches) {
        alert(t('header.alreadyInstalled') || 'האפליקציה כבר מותקנת');
        return;
      }

      // Try to trigger browser's install UI
      // For Chrome/Edge, we can show instructions
      const isChrome = /Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor);
      const isEdge = /Edg/.test(navigator.userAgent);
      const isSafari = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);
      const isFirefox = /Firefox/.test(navigator.userAgent);
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

      let instructions = '';
      
      if (isMobile) {
        if (isChrome || isEdge) {
          instructions = t('header.installInstructionsMobile') || 'להתקנה: לחץ על תפריט הדפדפן (⋮) ובחר "הוסף למסך הבית" או "התקן אפליקציה"';
        } else if (isSafari) {
          instructions = t('header.installInstructionsSafari') || 'להתקנה: לחץ על כפתור השיתוף (□↑) ובחר "הוסף למסך הבית"';
        } else {
          instructions = t('header.installInstructionsGeneric') || 'להתקנה: השתמש בתפריט הדפדפן כדי להוסיף את האפליקציה למסך הבית';
        }
      } else {
        if (isChrome || isEdge) {
          instructions = t('header.installInstructionsDesktop') || 'להתקנה: לחץ על סמל ההתקנה (⊕) בשורת הכתובת או בתפריט הדפדפן (⋮) > "התקן אפליקציה"';
        } else if (isFirefox) {
          instructions = t('header.installInstructionsFirefox') || 'להתקנה: לחץ על סמל ההתקנה בשורת הכתובת או בתפריט הדפדפן';
        } else {
          instructions = t('header.installInstructionsGeneric') || 'להתקנה: השתמש בתפריט הדפדפן כדי להתקין את האפליקציה';
        }
      }

      // Show instructions to user
      alert(instructions);
    }
  };

  const unreadNotifications = notifications.filter(n => !n.read);
  // Show notifications sorted by newest first
  const sortedNotifications = [...notifications].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  return (
    <AppBar 
      position="fixed" 
      elevation={0}
      sx={{ 
        zIndex: (theme) => theme.zIndex.drawer + 1,
        background: mode === 'dark' 
          ? 'linear-gradient(135deg, #1e293b 0%, #334155 100%)'
          : 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
        top: 0,
        left: 0,
        right: 0,
      }}
    >
      <Toolbar>
        <IconButton
          color="inherit"
          aria-label={t('header.openDrawer')}
          edge="start"
          onClick={onMenuClick}
          sx={{ mr: 2 }}
        >
          <AccountBalanceWalletIcon />
        </IconButton>
        
        <Typography variant="h6" component="div" sx={{ flexGrow: 1, fontWeight: 700 }}>
          {t('common.costManager')}
        </Typography>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {/* PWA Install Button - Only show if app is not installed */}
          {!isInstalled && (
            <Tooltip title={t('header.installApp')}>
              <IconButton 
                color="inherit"
                onClick={handleInstallClick}
                sx={{
                  '&:hover': {
                    bgcolor: 'rgba(255, 255, 255, 0.1)',
                  },
                }}
              >
                <GetAppIcon />
              </IconButton>
            </Tooltip>
          )}

          <Tooltip title={notificationCount > 0 ? t('header.notifications', { count: notificationCount }) : t('header.noNotifications')}>
            <IconButton 
              color="inherit"
              onClick={handleNotificationsMenuOpen}
              sx={{
                '&:hover': {
                  bgcolor: 'rgba(255, 255, 255, 0.1)',
                },
              }}
            >
              <Badge badgeContent={notificationCount} color="error">
                <NotificationsIcon />
              </Badge>
            </IconButton>
          </Tooltip>
          
          <Menu
            anchorEl={notificationsMenuAnchor}
            open={Boolean(notificationsMenuAnchor)}
            onClose={handleNotificationsMenuClose}
            anchorOrigin={{
              vertical: 'bottom',
              horizontal: 'right',
            }}
            transformOrigin={{
              vertical: 'top',
              horizontal: 'right',
            }}
            PaperProps={{
              sx: {
                width: 400,
                maxHeight: 500,
                mt: 1.5,
              }
            }}
          >
            <Box sx={{ p: 2, pb: 1 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  {t('notifications.title')}
                </Typography>
                {unreadNotifications.length > 0 && (
                  <Button 
                    size="small" 
                    onClick={handleMarkAllAsRead}
                    sx={{ minWidth: 'auto', fontSize: '0.75rem' }}
                  >
                    {t('notifications.markAllAsRead')}
                  </Button>
                )}
              </Box>
            </Box>
            <Divider />
            
            {notifications.length === 0 ? (
              <Box sx={{ p: 3, textAlign: 'center' }}>
                <NotificationsIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
                <Typography variant="body2" color="text.secondary">
                  {t('notifications.allCaughtUp')}
                </Typography>
              </Box>
            ) : (
              <Box sx={{ maxHeight: 400, overflow: 'auto' }}>
                {sortedNotifications.map((notification) => (
                  <MenuItem
                    key={notification.id}
                    onClick={() => {
                      if (!notification.read) {
                        handleMarkAsRead(notification.id);
                      }
                    }}
                    sx={{
                      py: 1.5,
                      px: 2,
                      borderLeft: notification.read ? 'none' : '3px solid',
                      borderColor: notification.type === 'budget_exceeded' ? 'error.main' : 'warning.main',
                      bgcolor: notification.read ? 'transparent' : 'action.hover',
                      '&:hover': {
                        bgcolor: 'action.selected',
                      },
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 36 }}>
                      {notification.read ? (
                        <CheckCircleIcon fontSize="small" color="success" />
                      ) : (
                        <NotificationsIcon fontSize="small" color="primary" />
                      )}
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                          <Typography 
                            variant="body2" 
                            sx={{ 
                              fontWeight: notification.read ? 400 : 600,
                              flex: 1,
                            }}
                          >
                            {notification.message}
                          </Typography>
                          <Chip
                            label={notification.type === 'budget_exceeded' ? t('common.exceeded') : t('common.warning')}
                            size="small"
                            color={notification.type === 'budget_exceeded' ? 'error' : 'warning'}
                            sx={{ height: 20, fontSize: '0.65rem' }}
                          />
                        </Box>
                      }
                      secondary={format(notification.timestamp, 'PPp')}
                      secondaryTypographyProps={{
                        variant: 'caption',
                        color: 'text.secondary',
                      }}
                    />
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleClearNotification(notification.id);
                      }}
                      sx={{ ml: 1 }}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </MenuItem>
                ))}
              </Box>
            )}
          </Menu>

          <Tooltip title={t('header.switchTo', { mode: mode === 'light' ? 'dark' : 'light' })}>
            <IconButton 
              onClick={toggleMode} 
              color="inherit"
              sx={{
                '&:hover': {
                  bgcolor: 'rgba(255, 255, 255, 0.1)',
                },
              }}
            >
              {mode === 'dark' ? <LightModeIcon /> : <DarkModeIcon />}
            </IconButton>
          </Tooltip>

          <Tooltip title={t('header.changeLanguage')}>
            <IconButton 
              onClick={handleLanguageMenuOpen} 
              color="inherit"
              sx={{
                '&:hover': {
                  bgcolor: 'rgba(255, 255, 255, 0.1)',
                },
              }}
            >
              <LanguageIcon />
            </IconButton>
          </Tooltip>
          <Menu
            anchorEl={languageMenuAnchor}
            open={Boolean(languageMenuAnchor)}
            onClose={handleLanguageMenuClose}
            anchorOrigin={{
              vertical: 'bottom',
              horizontal: 'right',
            }}
            transformOrigin={{
              vertical: 'top',
              horizontal: 'right',
            }}
          >
            <MenuItem 
              onClick={() => handleLanguageChange('en')} 
              selected={i18n.language === 'en'}
              sx={{
                fontWeight: i18n.language === 'en' ? 600 : 400,
                fontFamily: 'system-ui, -apple-system, sans-serif',
              }}
            >
              <Box sx={{ mr: 1.5, display: 'inline-flex', alignItems: 'center' }}>
                <US style={{ width: 24, height: 18 }} />
              </Box>
              English
            </MenuItem>
            <MenuItem 
              onClick={() => handleLanguageChange('he')} 
              selected={i18n.language === 'he'}
              sx={{
                fontWeight: i18n.language === 'he' ? 600 : 400,
                fontFamily: 'system-ui, -apple-system, sans-serif',
              }}
            >
              <Box sx={{ mr: 1.5, display: 'inline-flex', alignItems: 'center' }}>
                <IL style={{ width: 24, height: 18 }} />
              </Box>
              Hebrew
            </MenuItem>
            <MenuItem 
              onClick={() => handleLanguageChange('es')} 
              selected={i18n.language === 'es'}
              sx={{
                fontWeight: i18n.language === 'es' ? 600 : 400,
                fontFamily: 'system-ui, -apple-system, sans-serif',
              }}
            >
              <Box sx={{ mr: 1.5, display: 'inline-flex', alignItems: 'center' }}>
                <ES style={{ width: 24, height: 18 }} />
              </Box>
              Español
            </MenuItem>
          </Menu>
        </Box>
      </Toolbar>
    </AppBar>
  );
}

