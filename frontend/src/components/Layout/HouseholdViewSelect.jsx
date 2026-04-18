/**
 * Compact scope selector: couple / me / partner (top of main content).
 * Sized and styled to align with sidebar nav rows and primary buttons.
 */

import React from 'react';
import { Box, FormControl, MenuItem, Select, InputLabel } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import { useTranslation } from 'react-i18next';
import { useHouseholdView } from '../../contexts/HouseholdViewContext';

export default function HouseholdViewSelect() {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const { viewScope, setViewScope, partnerConnected } = useHouseholdView();

  const effective = !partnerConnected && viewScope === 'partner' ? 'household' : viewScope;
  const isRTL = i18n.language === 'he';
  const shadowSoft = alpha(theme.palette.common.black, theme.palette.mode === 'dark' ? 0.28 : 0.07);

  return (
    <Box
      sx={{
        mb: 2,
        display: 'flex',
        justifyContent: 'flex-start',
      }}
    >
      <FormControl
        variant="outlined"
        size="medium"
        sx={{
          minWidth: { xs: '100%', sm: 260 },
          maxWidth: { xs: '100%', sm: 320 },
          direction: isRTL ? 'rtl' : 'ltr',
        }}
      >
        <InputLabel
          id="household-view-scope-label"
          shrink
          sx={{
            fontWeight: 600,
            fontSize: '0.875rem',
            color: 'text.secondary',
            '&.Mui-focused': { color: 'primary.main' },
          }}
        >
          {t('householdView.label')}
        </InputLabel>
        <Select
          labelId="household-view-scope-label"
          label={t('householdView.label')}
          notched
          value={effective}
          onChange={function (e) {
            setViewScope(e.target.value);
          }}
          MenuProps={{
            anchorOrigin: { vertical: 'bottom', horizontal: isRTL ? 'right' : 'left' },
            transformOrigin: { vertical: 'top', horizontal: isRTL ? 'right' : 'left' },
            PaperProps: {
              elevation: 3,
              sx: {
                borderRadius: '8px',
                mt: 0.75,
                minWidth: 200,
                '& .MuiMenuItem-root': { fontSize: '0.9375rem', py: 1.125 },
              },
            },
          }}
          sx={{
            minHeight: 48,
            borderRadius: '8px',
            fontWeight: 600,
            fontSize: '0.9375rem',
            bgcolor: 'background.paper',
            boxShadow: `0 1px 2px ${shadowSoft}`,
            transition: theme.transitions.create(
              ['box-shadow', 'border-color', 'background-color'],
              { duration: theme.transitions.duration.short }
            ),
            '&:hover': {
              bgcolor: alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.12 : 0.06),
              boxShadow: `0 2px 10px ${alpha(theme.palette.primary.main, 0.18)}`,
            },
            '&.Mui-focused': {
              bgcolor: 'background.paper',
              boxShadow: `0 0 0 3px ${alpha(theme.palette.primary.main, 0.22)}`,
            },
            '& .MuiOutlinedInput-notchedOutline': {
              borderColor: alpha(theme.palette.primary.main, 0.38),
            },
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: theme.palette.primary.main,
            },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderColor: theme.palette.primary.main,
              borderWidth: 2,
            },
            '& .MuiSelect-select': {
              py: 1.25,
              px: 2,
              display: 'flex',
              alignItems: 'center',
            },
            '& .MuiSelect-icon': {
              color: 'text.secondary',
              right: isRTL ? undefined : 10,
              left: isRTL ? 10 : undefined,
            },
          }}
        >
          <MenuItem value="household">{t('householdView.household')}</MenuItem>
          <MenuItem value="self">{t('householdView.self')}</MenuItem>
          {partnerConnected ? <MenuItem value="partner">{t('householdView.partner')}</MenuItem> : null}
        </Select>
      </FormControl>
    </Box>
  );
}
