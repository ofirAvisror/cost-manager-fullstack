/**
 * NotificationContext.jsx - Context for managing notifications
 */

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import i18n from '../i18n/config';

const NotificationContext = createContext(undefined);

/**
 * NotificationProvider component
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components
 */
export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([]);
  const [dismissedNotifications, setDismissedNotifications] = useState(new Set());
  const dismissedNotificationsRef = useRef(new Set());

  useEffect(function() {
    // Load notifications from localStorage
    const saved = localStorage.getItem('notifications');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setNotifications(parsed.map(function(n) {
          return { ...n, timestamp: new Date(n.timestamp) };
        }));
      } catch (error) {
        // Ignore
      }
    }

    // Load dismissed notifications from localStorage
    const savedDismissed = localStorage.getItem('dismissedNotifications');
    if (savedDismissed) {
      try {
        const parsed = JSON.parse(savedDismissed);
        const dismissedSet = new Set(parsed);
        setDismissedNotifications(dismissedSet);
        dismissedNotificationsRef.current = dismissedSet;
      } catch (error) {
        // Ignore
      }
    }
  }, []);

  useEffect(function() {
    // Save notifications to localStorage
    localStorage.setItem('notifications', JSON.stringify(notifications));
  }, [notifications]);

  useEffect(function() {
    // Save dismissed notifications to localStorage and update ref
    dismissedNotificationsRef.current = dismissedNotifications;
    localStorage.setItem('dismissedNotifications', JSON.stringify(Array.from(dismissedNotifications)));
  }, [dismissedNotifications]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAsRead = function(id) {
    setNotifications(function(prev) {
      return prev.map(function(n) {
        return n.id === id ? { ...n, read: true } : n;
      });
    });
  };

  const markAllAsRead = function() {
    setNotifications(function(prev) {
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
    // Add to dismissed notifications so it doesn't reappear
    setDismissedNotifications(function(prev) {
      const newSet = new Set(prev);
      newSet.add(id);
      return newSet;
    });
  };

  const clearAll = function() {
    setNotifications(function(prev) {
      // Add all current notifications to dismissed set
      setDismissedNotifications(function(dismissed) {
        const newSet = new Set(dismissed);
        prev.forEach(function(n) {
          newSet.add(n.id);
        });
        return newSet;
      });
      return [];
    });
  };

  const checkBudgets = async function(db) {
    if (!db) return;

    try {
      const budgets = await db.getAllBudgets();
      const newNotifications = [];

      for (const budget of budgets) {
        let spent = 0;

        try {
          if (budget.type === 'monthly' && budget.month) {
            const report = await db.getReport(budget.year, budget.month, budget.currency);
            spent = report.total.total;
          } else if (budget.type === 'yearly') {
            let total = 0;
            for (let m = 1; m <= 12; m++) {
              const report = await db.getReport(budget.year, m, budget.currency);
              total += report.total.total;
            }
            spent = total;
          }

          const percentage = (spent / budget.amount) * 100;

          if (spent > budget.amount) {
            newNotifications.push({
              id: `budget-exceeded-${budget.id}`,
              type: 'budget_exceeded',
              message: i18n.t('notifications.budgetExceeded', { 
                spent: spent.toFixed(2), 
                currency: budget.currency, 
                amount: budget.amount.toFixed(2) 
              }),
              timestamp: new Date(),
              read: false,
            });
          } else if (percentage >= 80) {
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

      // Add new notifications (avoid duplicates and dismissed ones)
      setNotifications(function(prev) {
        const existingIds = new Set(prev.map(n => n.id));
        const toAdd = newNotifications.filter(n => !existingIds.has(n.id) && !dismissedNotificationsRef.current.has(n.id));
        return [...prev, ...toAdd];
      });
    } catch (error) {
      // Ignore
    }
  };

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

