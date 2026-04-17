/**
 * NotificationCenter.jsx - Notification center component
 */

import React from 'react';
import {
  Box,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Button,
  Chip
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useNotifications } from '../../contexts/NotificationContext';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import DeleteIcon from '@mui/icons-material/Delete';
import NotificationsIcon from '@mui/icons-material/Notifications';
import { format } from 'date-fns';

/**
 * NotificationCenter component
 */
export default function NotificationCenter() {
  const { t } = useTranslation();
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearNotification,
    clearAll,
  } = useNotifications();

  const unreadNotifications = notifications.filter(n => !n.read);
  const readNotifications = notifications.filter(n => n.read);

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>
          {t('notifications.title')}
        </Typography>
        {unreadCount > 0 && (
          <Button onClick={markAllAsRead} variant="outlined" size="small">
            {t('notifications.markAllAsRead')}
          </Button>
        )}
        {notifications.length > 0 && (
          <Button onClick={clearAll} variant="outlined" color="error" size="small">
            {t('notifications.clearAll')}
          </Button>
        )}
      </Box>

      {notifications.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 3, bgcolor: 'background.paper' }}>
          <NotificationsIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" gutterBottom>
            {t('notifications.noNotifications')}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t('notifications.allCaughtUp')}
          </Typography>
        </Paper>
      ) : (
        <>
          {unreadNotifications.length > 0 && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                {t('notifications.unread', { count: unreadNotifications.length })}
              </Typography>
              <List>
                {unreadNotifications.map((notification) => (
                  <Paper key={notification.id} sx={{ mb: 2, borderRadius: 2, bgcolor: 'background.paper' }}>
                    <ListItem
                      secondaryAction={
                        <Box>
                          <IconButton
                            edge="end"
                            onClick={() => markAsRead(notification.id)}
                            size="small"
                          >
                            <CheckCircleIcon />
                          </IconButton>
                          <IconButton
                            edge="end"
                            onClick={() => clearNotification(notification.id)}
                            size="small"
                            color="error"
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Box>
                      }
                    >
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                              {notification.message}
                            </Typography>
                            <Chip
                              label={notification.type === 'budget_exceeded' ? t('common.exceeded') : t('common.warning')}
                              size="small"
                              color={notification.type === 'budget_exceeded' ? 'error' : 'warning'}
                            />
                          </Box>
                        }
                        secondary={format(notification.timestamp, 'PPp')}
                      />
                    </ListItem>
                  </Paper>
                ))}
              </List>
            </Box>
          )}

          {readNotifications.length > 0 && (
            <Box>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                {t('notifications.read', { count: readNotifications.length })}
              </Typography>
              <List>
                {readNotifications.map((notification) => (
                  <Paper key={notification.id} sx={{ mb: 2, borderRadius: 2, opacity: 0.7, bgcolor: 'background.paper' }}>
                    <ListItem
                      secondaryAction={
                        <IconButton
                          edge="end"
                          onClick={() => clearNotification(notification.id)}
                          size="small"
                          color="error"
                        >
                          <DeleteIcon />
                        </IconButton>
                      }
                    >
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="body1">
                              {notification.message}
                            </Typography>
                            <Chip
                              label={notification.type === 'budget_exceeded' ? t('common.exceeded') : t('common.warning')}
                              size="small"
                              color={notification.type === 'budget_exceeded' ? 'error' : 'warning'}
                              variant="outlined"
                            />
                          </Box>
                        }
                        secondary={format(notification.timestamp, 'PPp')}
                      />
                    </ListItem>
                  </Paper>
                ))}
              </List>
            </Box>
          )}
        </>
      )}
    </Box>
  );
}

