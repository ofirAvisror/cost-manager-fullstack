/**
 * Sidebar.jsx - Sidebar navigation component
 */

import React from 'react';
import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  Box,
  Typography,
  useMediaQuery,
  useTheme as useMUITheme
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import DashboardIcon from '@mui/icons-material/Dashboard';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import AssessmentIcon from '@mui/icons-material/Assessment';
import PieChartIcon from '@mui/icons-material/PieChart';
import BarChartIcon from '@mui/icons-material/BarChart';
import CategoryIcon from '@mui/icons-material/Category';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import FilterListIcon from '@mui/icons-material/FilterList';
import NotificationsIcon from '@mui/icons-material/Notifications';
import SettingsIcon from '@mui/icons-material/Settings';
import SavingsIcon from '@mui/icons-material/Savings';

const drawerWidth = 280;

// Navigation items will be created inside component to use translation

/**
 * Sidebar component
 * @param {Object} props - Component props
 * @param {boolean} props.open - Whether sidebar is open
 * @param {function} props.onClose - Function to close sidebar
 * @param {string} props.currentView - Current active view
 * @param {function} props.onViewChange - Function to change view
 */
export default function Sidebar({ open, onClose, currentView, onViewChange }) {
  const { t, i18n } = useTranslation();
  const muiTheme = useMUITheme();
  const isMobile = useMediaQuery(muiTheme.breakpoints.down('md'));
  
  // Determine drawer anchor based on language direction
  const anchor = i18n.language === 'he' ? 'right' : 'left';

  const navItems = [
    { id: 'dashboard', label: t('navigation.dashboard'), icon: <DashboardIcon /> },
    { id: 'add-cost', label: t('navigation.addCost'), icon: <AddCircleOutlineIcon /> },
    { id: 'report', label: t('navigation.report'), icon: <AssessmentIcon /> },
    { id: 'pie-chart', label: t('navigation.pieChart'), icon: <PieChartIcon /> },
    { id: 'bar-chart', label: t('navigation.barChart'), icon: <BarChartIcon /> },
    { id: 'categories', label: t('navigation.categories'), icon: <CategoryIcon /> },
    { id: 'budget', label: t('navigation.budget'), icon: <AccountBalanceIcon /> },
    { id: 'savings-goals', label: t('navigation.savingsGoals'), icon: <SavingsIcon /> },
    { id: 'filters', label: t('navigation.filters'), icon: <FilterListIcon /> },
    { id: 'notifications', label: t('navigation.notifications'), icon: <NotificationsIcon /> },
    { id: 'settings', label: t('navigation.settings'), icon: <SettingsIcon /> },
  ];

  const handleItemClick = function(itemId) {
    onViewChange(itemId);
    if (isMobile) {
      onClose();
    }
  };

  const drawerContent = (
    <Box>
      <Box sx={{ p: 3, bgcolor: 'primary.main', color: 'primary.contrastText' }}>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          💰 {t('common.costManager')}
        </Typography>
        <Typography variant="body2" sx={{ opacity: 0.9, mt: 0.5 }}>
          {t('common.manageExpenses')}
        </Typography>
      </Box>
      
      <Divider />
      
      <List sx={{ pt: 2 }}>
        {navItems.map((item) => (
          <ListItem key={item.id} disablePadding>
            <ListItemButton
              selected={currentView === item.id}
              onClick={() => handleItemClick(item.id)}
              sx={{
                mx: 1,
                mb: 0.5,
                borderRadius: 2,
                '&.Mui-selected': {
                  bgcolor: 'primary.main',
                  color: 'primary.contrastText',
                  '&:hover': {
                    bgcolor: 'primary.dark',
                  },
                  '& .MuiListItemIcon-root': {
                    color: 'primary.contrastText',
                  },
                },
              }}
            >
              <ListItemIcon
                sx={{
                  color: currentView === item.id ? 'primary.contrastText' : 'inherit',
                  minWidth: 40,
                }}
              >
                {item.icon}
              </ListItemIcon>
              <ListItemText 
                primary={item.label}
                primaryTypographyProps={{
                  fontWeight: currentView === item.id ? 600 : 400,
                }}
              />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </Box>
  );

  return (
    <Drawer
      variant={isMobile ? 'temporary' : 'persistent'}
      anchor={anchor}
      open={open}
      onClose={onClose}
      ModalProps={{
        keepMounted: true, // Better open performance on mobile
      }}
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        zIndex: (theme) => theme.zIndex.drawer,
        '& .MuiDrawer-paper': {
          width: drawerWidth,
          boxSizing: 'border-box',
          top: '64px', // Position below header
          height: 'calc(100vh - 64px)',
          zIndex: (theme) => theme.zIndex.drawer,
          position: 'fixed',
          ...(anchor === 'right' ? {
            right: 0,
          } : {
            left: 0,
          }),
        },
      }}
    >
      {drawerContent}
    </Drawer>
  );
}

export { drawerWidth };

