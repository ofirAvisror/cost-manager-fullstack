/**
 * Lists recurring expense schedules and allows stopping them.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  Stack,
  Chip,
  CircularProgress,
} from '@mui/material';
import RepeatIcon from '@mui/icons-material/Repeat';
import { useTranslation } from 'react-i18next';
import { useHouseholdView } from '../../contexts/HouseholdViewContext';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

export default function RecurringSchedulesManager({ db }) {
  const { t } = useTranslation();
  const householdView = useHouseholdView();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async function() {
    if (!db || typeof db.getRecurringSchedules !== 'function') {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      if (typeof db.processRecurringDue === 'function') {
        try {
          await db.processRecurringDue();
        } catch (err) {
          console.warn('processRecurringDue', err);
        }
      }
      const list = await db.getRecurringSchedules();
      setItems(list || []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('recurring.loadFailed'));
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [db, t]);

  useEffect(function() {
    load();
  }, [load, householdView]);

  const handleStop = async function(id) {
    if (!db || typeof db.deleteRecurringSchedule !== 'function') return;
    try {
      await db.deleteRecurringSchedule(id);
      toast.success(t('recurring.stopped'));
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('recurring.stopFailed'));
    }
  };

  const freqLabel = function(f) {
    const key = `recurring.frequency.${f || 'monthly'}`;
    const translated = t(key);
    return translated === key ? f : translated;
  };

  return (
    <Card sx={{ maxWidth: 720, mx: 'auto', borderRadius: 3, boxShadow: 4 }}>
      <CardContent sx={{ p: 4 }}>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
          <RepeatIcon color="primary" />
          <Typography variant="h4" component="h1" sx={{ fontWeight: 700 }}>
            {t('recurring.title')}
          </Typography>
        </Stack>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          {t('recurring.subtitle')}
        </Typography>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress />
          </Box>
        ) : items.length === 0 ? (
          <Typography color="text.secondary">{t('recurring.empty')}</Typography>
        ) : (
          <Stack spacing={2}>
            {items.map(function(item) {
              const nextRaw = item.recurring?.nextDate;
              let nextLabel = '—';
              try {
                if (nextRaw) {
                  nextLabel = format(new Date(nextRaw), 'PP');
                }
              } catch (e) {
                nextLabel = '—';
              }
              return (
                <Card key={item.id} variant="outlined" sx={{ borderRadius: 2 }}>
                  <CardContent sx={{ py: 2, '&:last-child': { pb: 2 } }}>
                    <Stack
                      direction={{ xs: 'column', sm: 'row' }}
                      spacing={2}
                      alignItems={{ xs: 'flex-start', sm: 'center' }}
                      justifyContent="space-between"
                    >
                      <Box>
                        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                          {item.description}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {item.sum} {item.currency} · {item.category}
                        </Typography>
                        <Stack direction="row" spacing={1} sx={{ mt: 1 }} flexWrap="wrap" useFlexGap>
                          <Chip size="small" label={freqLabel(item.recurring?.frequency)} />
                          <Chip size="small" variant="outlined" label={`${t('recurring.nextDue')}: ${nextLabel}`} />
                        </Stack>
                      </Box>
                      <Button
                        color="error"
                        variant="outlined"
                        onClick={() => handleStop(item.id)}
                        sx={{ flexShrink: 0 }}
                      >
                        {t('recurring.stop')}
                      </Button>
                    </Stack>
                  </CardContent>
                </Card>
              );
            })}
          </Stack>
        )}
      </CardContent>
    </Card>
  );
}
