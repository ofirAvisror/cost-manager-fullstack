/**
 * Settings.jsx - Component for application settings
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  TextField,
  Typography,
  Paper,
  Card,
  CardContent
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';

/**
 * Settings component
 * Allows users to configure the exchange rate URL
 */
export default function Settings() {
  const { t } = useTranslation();
  const [exchangeRateUrl, setExchangeRateUrl] = useState(process.env.REACT_APP_EXCHANGE_RATE_URL || 'https://gist.githubusercontent.com/Pafestivo/e4e1c962472306b578983a6a0c40828e/raw/exchange-rates.json');

  /**
   * Loads the current exchange rate URL from localStorage on mount
   */
  useEffect(function() {
    const savedUrl = localStorage.getItem('exchangeRateUrl');
    if (savedUrl) {
      setExchangeRateUrl(savedUrl);
    } else {
      setExchangeRateUrl(process.env.REACT_APP_EXCHANGE_RATE_URL || 'https://gist.githubusercontent.com/Pafestivo/e4e1c962472306b578983a6a0c40828e/raw/exchange-rates.json');
    }
  }, []);

  /**
   * Handles saving the exchange rate URL
   */
  const handleSave = function() {
    localStorage.setItem('exchangeRateUrl', exchangeRateUrl);
    toast.success(t('messages.settingsSaved'));
  };

  return (
    <Card 
      sx={{ 
        maxWidth: 700, 
        mx: 'auto', 
        borderRadius: 3,
        boxShadow: 4,
        bgcolor: 'background.paper',
      }}
    >
      <CardContent sx={{ p: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" component="h2" sx={{ fontWeight: 700, color: 'text.primary' }}>
            {t('settings.title')}
          </Typography>
        </Box>

        <Paper 
          elevation={0}
          sx={{ 
            p: 3, 
            bgcolor: 'background.paper',
            borderRadius: 2,
            border: '1px solid',
            borderColor: 'divider',
          }}
        >
          <TextField
            label={t('settings.exchangeRateUrl')}
            value={exchangeRateUrl}
            onChange={(e) => setExchangeRateUrl(e.target.value)}
            fullWidth
            margin="normal"
            helperText={t('settings.exchangeRateUrlHelper')}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 2,
                '&:hover fieldset': {
                  borderColor: 'primary.main',
                },
              },
            }}
          />

          <Button
            variant="contained"
            color="primary"
            onClick={handleSave}
            fullWidth
            size="large"
            sx={{ 
              mt: 3,
              py: 1.5,
              borderRadius: 2,
              fontSize: '1rem',
              fontWeight: 600,
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
              boxShadow: 3,
              '&:hover': {
                background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                boxShadow: 4,
                transform: 'translateY(-2px)',
              },
              transition: 'all 0.3s ease',
            }}
          >
            {t('settings.saveSettings')}
          </Button>
        </Paper>
      </CardContent>
    </Card>
  );
}

