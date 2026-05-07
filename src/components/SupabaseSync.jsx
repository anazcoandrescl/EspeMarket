import React, { useEffect, useRef, useState, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Cloud, CloudOff, RefreshCw } from 'lucide-react';
import { useIsMobile } from '../hooks/useIsMobile';

const SUPABASE_URL = 'https://thpncsayykhidafheamb.supabase.co';
const SUPABASE_KEY = 'sb_publishable_GH5XLBnXGl7TyCu25HPQOw_OclWkOIh';
export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const MAX_RETRIES = 5;

const SupabaseSync = ({ inline = false }) => {
  const [status, setStatus] = useState('connecting'); // connecting, synced, error, syncing
  const [retryCount, setRetryCount] = useState(0);
  const [lastError, setLastError] = useState('');
  const isSyncingFromRemote = useRef(false);
  const debounceTimer = useRef(null);
  const retryTimer = useRef(null);
  const channelRef = useRef(null);

  const syncToSupabase = useCallback(async (isRetry = false) => {
    try {
      setStatus('syncing');

      const st = JSON.parse(localStorage.getItem('canasta_settings') || '{}');
      st._offers_db = JSON.parse(localStorage.getItem('canasta_offers') || '[]');

      const payload = {
        products: JSON.parse(localStorage.getItem('canasta_products') || '[]'),
        baskets: JSON.parse(localStorage.getItem('canasta_baskets') || '[]'),
        sales: JSON.parse(localStorage.getItem('canasta_sales') || '[]'),
        categories: JSON.parse(localStorage.getItem('canasta_categories') || '[]'),
        settings: st
      };

      const { error } = await supabase
        .from('app_data')
        .upsert({ id: 1, ...payload });

      if (error) throw error;

      // Broadcast to other browsers instantly
      if (channelRef.current) {
        channelRef.current.send({
          type: 'broadcast',
          event: 'db-update',
          payload: payload
        });
      }

      setStatus('synced');
      setRetryCount(0);
      setLastError('');
    } catch (err) {
      console.error("Sync error", err);
      setLastError(err.message || 'Error desconocido');

      const currentRetry = isRetry ? retryCount + 1 : 1;
      setRetryCount(currentRetry);

      if (currentRetry < MAX_RETRIES) {
        // Exponential backoff: 2s, 4s, 8s, 16s...
        const delay = Math.min(2000 * Math.pow(2, currentRetry - 1), 30000);
        console.log(`Reintentando en ${delay / 1000}s (intento ${currentRetry}/${MAX_RETRIES})...`);
        if (retryTimer.current) clearTimeout(retryTimer.current);
        retryTimer.current = setTimeout(() => {
          syncToSupabase(true);
        }, delay);
        setStatus('error');
      } else {
        setStatus('error');
      }
    }
  }, [retryCount]);

  useEffect(() => {
    // 1. Initial Load
    const loadData = async () => {
      try {
        const { data, error } = await supabase
          .from('app_data')
          .select('*')
          .eq('id', 1)
          .single();

        if (error) {
          if (error.code === 'PGRST116') {
            // Row doesn't exist, push current local storage
            syncToSupabase();
          } else {
            throw error;
          }
        } else if (data) {
          isSyncingFromRemote.current = true;
          if (data.products) localStorage.setItem('canasta_products', JSON.stringify(data.products));
          if (data.baskets) localStorage.setItem('canasta_baskets', JSON.stringify(data.baskets));
          if (data.sales) localStorage.setItem('canasta_sales', JSON.stringify(data.sales));
          if (data.categories) localStorage.setItem('canasta_categories', JSON.stringify(data.categories));
          if (data.settings) {
            const st = data.settings;
            if (st._offers_db) {
              localStorage.setItem('canasta_offers', JSON.stringify(st._offers_db));
              delete st._offers_db;
            }
            localStorage.setItem('canasta_settings', JSON.stringify(st));
          }
          window.dispatchEvent(new Event('local-storage'));

          setTimeout(() => { isSyncingFromRemote.current = false; }, 100);
          setStatus('synced');
        }
      } catch (err) {
        console.error("Supabase load error", err);
        setLastError(err.message || 'Error desconocido');
        setStatus('error');
        // Auto-retry initial load after 3s
        if (retryTimer.current) clearTimeout(retryTimer.current);
        retryTimer.current = setTimeout(() => loadData(), 3000);
      }
    };

    loadData();

    // 2. Realtime Subscription
    channelRef.current = supabase.channel('canasta-sync-room');
    channelRef.current
      .on(
        'broadcast',
        { event: 'db-update' },
        (payloadMessage) => {
          isSyncingFromRemote.current = true;
          const data = payloadMessage.payload;
          if (data.products) localStorage.setItem('canasta_products', JSON.stringify(data.products));
          if (data.baskets) localStorage.setItem('canasta_baskets', JSON.stringify(data.baskets));
          if (data.sales) localStorage.setItem('canasta_sales', JSON.stringify(data.sales));
          if (data.categories) localStorage.setItem('canasta_categories', JSON.stringify(data.categories));
          if (data.settings) {
            const st = data.settings;
            if (st._offers_db) {
              localStorage.setItem('canasta_offers', JSON.stringify(st._offers_db));
              delete st._offers_db;
            }
            localStorage.setItem('canasta_settings', JSON.stringify(st));
          }
          window.dispatchEvent(new Event('local-storage'));

          setTimeout(() => { isSyncingFromRemote.current = false; }, 100);
        }
      )
      .subscribe((subStatus) => {
        if (subStatus === 'SUBSCRIBED') {
          setStatus(prev => prev === 'connecting' ? 'synced' : prev);
        }
      });

    // 3. Listen to Local Changes
    const handleLocalChange = () => {
      if (isSyncingFromRemote.current) return;

      setStatus('syncing');
      if (debounceTimer.current) clearTimeout(debounceTimer.current);

      debounceTimer.current = setTimeout(() => {
        syncToSupabase();
      }, 300);
    };

    window.addEventListener('local-storage', handleLocalChange);

    return () => {
      window.removeEventListener('local-storage', handleLocalChange);
      if (channelRef.current) supabase.removeChannel(channelRef.current);
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      if (retryTimer.current) clearTimeout(retryTimer.current);
    };
  }, []);

  const handleManualRetry = () => {
    if (retryTimer.current) clearTimeout(retryTimer.current);
    setRetryCount(0);
    syncToSupabase();
  };

  const style = inline ? {
    background: 'var(--panel-alt)', padding: '0.5rem 1rem', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', border: '1px solid var(--surface-border)', fontSize: '0.8rem', marginTop: '1rem', width: '100%'
  } : {
    position: 'fixed', bottom: '1rem', left: '1rem', zIndex: 9999, background: 'var(--panel)', padding: '0.5rem 1rem', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '0.5rem', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', border: '1px solid var(--surface-border)', fontSize: '0.8rem'
  };

  const isMobile = useIsMobile();

  // Mobile: show compact circular icon only
  if (isMobile) {
    const iconColor = status === 'synced' ? '#10B981' : status === 'error' ? '#ef4444' : 'var(--primary)';
    const bg = status === 'synced' ? 'rgba(16,185,129,0.15)' : status === 'error' ? 'rgba(239,68,68,0.15)' : 'rgba(99,102,241,0.15)';
    const border = status === 'synced' ? 'rgba(16,185,129,0.4)' : status === 'error' ? 'rgba(239,68,68,0.4)' : 'rgba(99,102,241,0.4)';
    return (
      <button
        onClick={status === 'error' ? handleManualRetry : undefined}
        title={status === 'synced' ? 'Sincronizado en la nube' : status === 'error' ? `Sin conexión - Toca para reintentar` : 'Sincronizando...'}
        style={{ position: 'fixed', bottom: '5rem', right: '0.75rem', zIndex: 9999, width: '36px', height: '36px', borderRadius: '50%', background: bg, border: `1.5px solid ${border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: status === 'error' ? 'pointer' : 'default', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}
      >
        {status === 'connecting' && <RefreshCw size={16} className="spin" color="var(--text-muted)" />}
        {status === 'syncing' && <RefreshCw size={16} className="spin" color={iconColor} />}
        {status === 'synced' && <Cloud size={16} color={iconColor} />}
        {status === 'error' && <CloudOff size={16} color={iconColor} />}
        <style>{`@keyframes spin { 100% { transform: rotate(360deg); } } .spin { animation: spin 1s linear infinite; }`}</style>
      </button>
    );
  }

  return (
    <div style={style} title={lastError ? `Último error: ${lastError}` : ''}>
      {status === 'connecting' && <><RefreshCw size={14} className="spin" color="var(--text-muted)" /> <span>Conectando...</span></>}
      {status === 'syncing' && <><RefreshCw size={14} className="spin" color="var(--primary)" /> <span style={{color: 'var(--primary)'}}>Sincronizando...</span></>}
      {status === 'synced' && <><Cloud size={14} color="#10B981" /> <span style={{color: '#10B981'}}>Sincronizado en la nube</span></>}
      {status === 'error' && (
        <>
          <CloudOff size={14} color="var(--danger)" />
          <span style={{color: 'var(--danger)'}}>
            Sin conexión {retryCount > 0 && retryCount < MAX_RETRIES ? `(reintentando...)` : ''}
          </span>
          <button
            onClick={handleManualRetry}
            title="Reintentar sincronización"
            style={{ background: 'none', border: '1px solid var(--danger)', borderRadius: '6px', color: 'var(--danger)', cursor: 'pointer', padding: '0.1rem 0.4rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.2rem' }}
          >
            <RefreshCw size={11} /> Reintentar
          </button>
        </>
      )}

      <style>{`
        @keyframes spin { 100% { transform: rotate(360deg); } }
        .spin { animation: spin 1s linear infinite; }
      `}</style>
    </div>
  );
};

export default SupabaseSync;
