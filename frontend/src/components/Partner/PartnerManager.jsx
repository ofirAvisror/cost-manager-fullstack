import React, { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Grid,
  TextField,
  Typography,
} from '@mui/material';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

export default function PartnerManager({ db }) {
  const { t } = useTranslation();
  const [partnerEmail, setPartnerEmail] = useState('');
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [settlement, setSettlement] = useState(null);

  const loadStatus = async function() {
    if (!db || typeof db.getPartnerStatus !== 'function') return;
    try {
      const result = await db.getPartnerStatus();
      setStatus(result);
    } catch (error) {
      toast.error(error.message || t('partner.messages.failedLoadingStatus'));
    }
  };

  useEffect(function() {
    loadStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db]);

  const requestPartner = async function() {
    if (!partnerEmail.trim()) return;
    try {
      setLoading(true);
      await db.requestPartner(partnerEmail.trim());
      toast.success(t('partner.messages.requestSent'));
      setPartnerEmail('');
      await loadStatus();
    } catch (error) {
      toast.error(error.message || t('partner.messages.failedSendingRequest'));
    } finally {
      setLoading(false);
    }
  };

  const respondRequest = async function(action) {
    try {
      setLoading(true);
      await db.respondPartner(action);
      toast.success(action === 'accept' ? t('partner.messages.requestAccepted') : t('partner.messages.requestRejected'));
      await loadStatus();
    } catch (error) {
      toast.error(error.message || t('partner.messages.failedHandlingRequest'));
    } finally {
      setLoading(false);
    }
  };

  const loadSettlement = async function() {
    try {
      setLoading(true);
      const result = await db.getMonthlySettlement(year, month);
      setSettlement(result);
    } catch (error) {
      toast.error(error.message || t('partner.messages.failedLoadingSettlement'));
      setSettlement(null);
    } finally {
      setLoading(false);
    }
  };

  if (!db) {
    return <Alert severity="info">{t('messages.databaseNotInitializedWait')}</Alert>;
  }

  return (
    <Box>
      <Typography variant="h4" sx={{ fontWeight: 700, mb: 3 }}>
        {t('partner.title')}
      </Typography>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>
            {t('partner.statusTitle')}
          </Typography>

          {status?.status === 'connected' && status?.partner ? (
            <Alert severity="success" sx={{ mb: 2 }}>
              {t('partner.connectedWith', {
                name: `${status.partner.first_name || ''} ${status.partner.last_name || ''}`.trim() || t('forms.partnerOption'),
                email: status.partner.email || t('partner.noEmail'),
              })}
            </Alert>
          ) : status?.status === 'pending_sent' ? (
            <Alert severity="info" sx={{ mb: 2 }}>
              {t('partner.pendingSent')}
            </Alert>
          ) : status?.status === 'pending_received' ? (
            <Alert severity="warning" sx={{ mb: 2 }}>
              {t('partner.pendingReceived')}
            </Alert>
          ) : (
            <Alert severity="info" sx={{ mb: 2 }}>
              {t('partner.noPartnerConnected')}
            </Alert>
          )}

          {status?.status === 'none' && (
            <Grid container spacing={2}>
              <Grid item xs={12} md={8}>
                <TextField
                  fullWidth
                  label={t('partner.partnerEmail')}
                  value={partnerEmail}
                  onChange={(e) => setPartnerEmail(e.target.value)}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <Button fullWidth variant="contained" onClick={requestPartner} disabled={loading}>
                  {t('partner.sendRequest')}
                </Button>
              </Grid>
            </Grid>
          )}

          {status?.status === 'pending_received' && (
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button variant="contained" color="success" onClick={() => respondRequest('accept')} disabled={loading}>
                {t('partner.accept')}
              </Button>
              <Button variant="contained" color="error" onClick={() => respondRequest('reject')} disabled={loading}>
                {t('partner.reject')}
              </Button>
            </Box>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>
            {t('partner.monthlySettlement')}
          </Typography>

          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={12} md={4}>
              <TextField
                label={t('common.year')}
                type="number"
                value={year}
                onChange={(e) => setYear(parseInt(e.target.value, 10) || new Date().getFullYear())}
                fullWidth
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                label={t('common.month')}
                type="number"
                value={month}
                onChange={(e) => setMonth(parseInt(e.target.value, 10) || 1)}
                inputProps={{ min: 1, max: 12 }}
                fullWidth
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <Button
                fullWidth
                variant="contained"
                onClick={loadSettlement}
                disabled={loading || status?.status !== 'connected'}
              >
                {t('partner.calculate')}
              </Button>
            </Grid>
          </Grid>

          {settlement && (
            <Box>
              <Typography variant="body1" sx={{ mb: 1 }}>
                {t('partner.yourNet', { amount: settlement.totals.me_net.toFixed(2) })}
              </Typography>
              <Typography variant="body1" sx={{ mb: 1 }}>
                {t('partner.partnerNet', { amount: settlement.totals.partner_net.toFixed(2) })}
              </Typography>
              {settlement.who_owes_whom?.amount > 0 ? (
                <Alert severity="warning">
                  {t('partner.transferRequired', {
                    from: settlement.who_owes_whom.from_userid,
                    amount: settlement.who_owes_whom.amount.toFixed(2),
                    to: settlement.who_owes_whom.to_userid,
                  })}
                </Alert>
              ) : (
                <Alert severity="success">{t('partner.noTransferNeeded')}</Alert>
              )}
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
