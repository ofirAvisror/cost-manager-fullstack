/**
 * Global scope: whose costs to show (household / self / partner).
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

const STORAGE_KEY = 'cm_household_view_scope';
const API_BASE = process.env.REACT_APP_API_BASE_URL || 'http://localhost:4000';
const AUTH_KEY = 'cm_auth';

const HouseholdViewContext = createContext(undefined);

function readStoredScope() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (raw === 'household' || raw === 'self' || raw === 'partner') return raw;
  } catch (e) {
    // ignore
  }
  return 'household';
}

async function fetchPartnerId() {
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    const token = raw ? JSON.parse(raw).token : '';
    const r = await fetch(`${API_BASE}/api/partners/status`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!r.ok) return { connected: false, partnerId: null };
    const data = await r.json();
    if (data.status === 'connected' && data.partner?.id != null) {
      return { connected: true, partnerId: Number(data.partner.id) };
    }
  } catch (e) {
    // ignore
  }
  return { connected: false, partnerId: null };
}

export function HouseholdViewProvider({ children }) {
  const [viewScope, setViewScopeState] = useState(readStoredScope);
  const [partnerConnected, setPartnerConnected] = useState(false);
  const [partnerId, setPartnerId] = useState(null);

  const filterRef = useRef({
    viewScope: readStoredScope(),
    partnerId: null,
    partnerConnected: false,
  });

  useEffect(function loadPartner() {
    let cancelled = false;
    fetchPartnerId().then(function (res) {
      if (cancelled) return;
      setPartnerConnected(res.connected);
      setPartnerId(Number.isFinite(res.partnerId) ? res.partnerId : null);
    });
    return function () {
      cancelled = true;
    };
  }, []);

  useEffect(
    function syncRef() {
      filterRef.current = {
        viewScope,
        partnerId,
        partnerConnected,
      };
    },
    [viewScope, partnerId, partnerConnected]
  );

  useEffect(
    function partnerOnlyNeedsConnection() {
      if (viewScope === 'partner' && !partnerConnected) {
        setViewScopeState('household');
        try {
          sessionStorage.setItem(STORAGE_KEY, 'household');
        } catch (e) {
          // ignore
        }
      }
    },
    [partnerConnected, viewScope]
  );

  const setViewScope = useCallback(function (next) {
    setViewScopeState(next);
    try {
      sessionStorage.setItem(STORAGE_KEY, next);
    } catch (e) {
      // ignore
    }
  }, []);

  const getViewFilter = useCallback(function () {
    return filterRef.current;
  }, []);

  const refreshPartner = useCallback(async function () {
    const res = await fetchPartnerId();
    setPartnerConnected(res.connected);
    setPartnerId(Number.isFinite(res.partnerId) ? res.partnerId : null);
  }, []);

  const value = useMemo(
    function () {
      return {
        viewScope,
        setViewScope,
        partnerId,
        partnerConnected,
        getViewFilter,
        refreshPartner,
      };
    },
    [viewScope, setViewScope, partnerId, partnerConnected, getViewFilter, refreshPartner]
  );

  return (
    <HouseholdViewContext.Provider value={value}>{children}</HouseholdViewContext.Provider>
  );
}

export function useHouseholdView() {
  const ctx = useContext(HouseholdViewContext);
  if (ctx === undefined) {
    throw new Error('useHouseholdView must be used within HouseholdViewProvider');
  }
  return ctx;
}
