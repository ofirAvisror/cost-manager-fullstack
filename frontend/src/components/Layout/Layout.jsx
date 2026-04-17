/**
 * Layout.jsx - Main layout component with Header and Sidebar
 */

import React, { useState } from 'react';
import { Box, useMediaQuery, useTheme } from '@mui/material';
import { useTranslation } from 'react-i18next';
import Header from './Header';
import Sidebar, { drawerWidth } from './Sidebar';

/**
 * Layout component
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components
 * @param {string} props.currentView - Current active view
 * @param {function} props.onViewChange - Function to change view
 * @param {number} [props.notificationCount=0] - Number of notifications
 */
export default function Layout({ 
  children, 
  currentView, 
  onViewChange,
  notificationCount = 0 
}) {
  const { i18n } = useTranslation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);
  
  // Determine if sidebar is on right (Hebrew) or left (English)
  const isRTL = i18n.language === 'he';

  const handleMenuClick = function() {
    setSidebarOpen(!sidebarOpen);
  };

  const handleSidebarClose = function() {
    setSidebarOpen(false);
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', position: 'relative' }}>
      <Header 
        onMenuClick={handleMenuClick} 
        notificationCount={notificationCount}
      />
      
      {/* Sidebar - will be positioned based on anchor prop */}
      <Sidebar
        key={`sidebar-${i18n.language}`} // Force re-render when language changes
        open={sidebarOpen}
        onClose={handleSidebarClose}
        currentView={currentView}
        onViewChange={onViewChange}
      />
      
      {/* Main content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { 
            md: sidebarOpen 
              ? `calc(100% - ${drawerWidth}px)` 
              : '100%' 
          },
          ...(isRTL ? {
            marginRight: 0,
          } : {
            marginLeft: 0,
          }),
          mt: '64px',
          bgcolor: 'background.default',
          minHeight: 'calc(100vh - 64px)',
          transition: theme.transitions.create('width', {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen,
          }),
        }}
      >
        {children}
      </Box>
    </Box>
  );
}

