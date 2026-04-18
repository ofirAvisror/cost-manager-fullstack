/**
 * NotificationContext.jsx - Context for managing notifications
 */

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import i18n from '../i18n/config';
import { getUserId } from '../lib/api-db';
import { computeBudgetSpent } from '../lib/budgetSpent';

const NotificationContext = createContext(undefined);

const LS_NOTIFICATIONS = 'notifications';
const LS_DISMISSED = 'dismissedNotifications';

function parseNotificationsFromStorage() {
  const saved = localStorage.getItem(LS_NOTIFICATIONS);
  if (!saved) {
    return [];
  }
  try {
    return JSON.parse(saved).map(function(n) {
      return { ...n, timestamp: new Date(n.timestamp) };
    });
  } catch (error) {
    return [];
  }
}

function parseDismissedIdsFromStorage() {
  const saved = localStorage.getItem(LS_DISMISSED);
  if (!saved) {
    return new Set();
  }
  try {
    return new Set(JSON.parse(saved));
  } catch (error) {
    return new Set();
  }
}

/**
 * NotificationProvider component
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components
 */
export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState(function() {
    return parseNotificationsFromStorage();
  });
  const [dismissedNotifications, setDismissedNotifications] = useState(function() {
    return parseDismissedIdsFromStorage();
  });

  /**
   * Must match dismissedNotifications on every render so async checkBudgets always sees current suppressions
   * (initial state is already loaded from localStorage — not empty until useEffect like before).
   */
  const dismissedNotificationsRef = useRef(null);
  dismissedNotificationsRef.current = dismissedNotifications;

  useEffect(function() {
    function onStorage(event) {
      if (event.key !== LS_NOTIFICATIONS && event.key !== LS_DISMISSED) {
        return;
      }
      if (event.storageArea !== localStorage) {
        return;
      }
      setNotifications(parseNotificationsFromStorage());
      const nextDismissed = parseDismissedIdsFromStorage();
      dismissedNotificationsRef.current = nextDismissed;
      setDismissedNotifications(nextDismissed);
    }
    window.addEventListener('storage', onStorage);
    return function() {
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  useEffect(function() {
    localStorage.setItem(LS_NOTIFICATIONS, JSON.stringify(notifications));
  }, [notifications]);

  useEffect(function() {
    dismissedNotificationsRef.current = dismissedNotifications;
    localStorage.setItem(LS_DISMISSED, JSON.stringify(Array.from(dismissedNotifications)));
  }, [dismissedNotifications]);

  const unreadCount = notifications.filter(n => !n.read).length;

  /** Keeps ref in sync immediately so checkBudgets (interval/async) never re-adds before paint. */
  const addDismissedIds = function(ids) {
    setDismissedNotifications(function(prev) {
      const newSet = new Set(prev);
      ids.forEach(function(id) {
        newSet.add(id);
      });
      dismissedNotificationsRef.current = newSet;
      return newSet;
    });
  };

  const markAsRead = function(id) {
    setNotifications(function(prev) {
      return prev.map(function(n) {
        return n.id === id ? { ...n, read: true } : n;
      });
    });
    addDismissedIds([id]);
  };

  const markAllAsRead = function() {
    setNotifications(function(prev) {
      const ids = prev.map(function(n) {
        return n.id;
      });
      addDismissedIds(ids);
      return prev.map(function(n) {
        return { ...n, read: true };
      });
    });
  };

  const clearNotification = function(id) {
    setNotifications(function(prev) {
      return prev.filter(function(n) {
        return n.id !== id;
      });
    });
    addDismissedIds([id]);
  };

  const clearAll = function() {
    setNotifications(function(prev) {
      addDismissedIds(prev.map(function(n) {
        return n.id;
      }));
      return [];
    });
  };

  function budgetIdFromNotificationId(notificationId) {
    if (typeof notificationId !== 'string') {
      return null;
    }
    if (notificationId.startsWith('budget-exceeded-')) {
      return notificationId.slice('budget-exceeded-'.length);
    }
    if (notificationId.startsWith('budget-warning-')) {
      return notificationId.slice('budget-warning-'.length);
    }
    return null;
  }

  const checkBudgets = useCallback(async function(db) {
    if (!db) {
      return;
    }

    try {
      const budgets = await db.getAllBudgets();
      const validBudgetIds = new Set(
        budgets.map(function (b) {
          return String(b.id != null ? b.id : '');
        })
      );
      const newNotifications = [];
      const uid = getUserId();

      for (const budget of budgets) {
        let spent = 0;

        try {
          spent = await computeBudgetSpent(db, budget, uid);

          const cap = Number(budget.amount) || 0;
          const percentage = cap > 0 ? (spent / cap) * 100 : 0;

          if (cap > 0 && spent > cap) {
            newNotifications.push({
              id: `budget-exceeded-${budget.id}`,
              type: 'budget_exceeded',
              message: i18n.t('notifications.budgetExceeded', {
                spent: spent.toFixed(2),
                currency: budget.currency,
                amount: cap.toFixed(2),
              }),
              timestamp: new Date(),
              read: false,
            });
          } else if (cap > 0 && percentage >= 80) {
            newNotifications.push({
              id: `budget-warning-${budget.id}`,
              type: 'budget_warning',
              message: i18n.t('notifications.budgetWarning', { percentage: percentage.toFixed(1) }),
              timestamp: new Date(),
              read: false,
            });
          }
        } catch (error) {
          // Ignore errors for individual budgets
        }
      }

      setNotifications(function(prev) {
        const dismissed = dismissedNotificationsRef.current;
        const scoped = prev.filter(function (n) {
          const bid = budgetIdFromNotificationId(n.id);
          if (bid === null) {
            return true;
          }
          return validBudgetIds.has(bid);
        });
        const existingIds = new Set(scoped.map(function (n) {
          return n.id;
        }));
        const toAdd = newNotifications.filter(function (n) {
          return !existingIds.has(n.id) && !dismissed.has(n.id);
        });
        return scoped.concat(toAdd);
      });
    } catch (error) {
      // Ignore
    }
  }, []);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        markAsRead,
        markAllAsRead,
        clearNotification,
        clearAll,
        checkBudgets,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

/**
 * Hook to use notification context
 * @returns {Object} Notification context value
 */
export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}
