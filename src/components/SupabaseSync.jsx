import React, { useEffect, useRef, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Cloud, CloudOff, RefreshCw } from 'lucide-react';

const SUPABASE_URL = 'https://thpncsayykhidafheamb.supabase.co';
const SUPABASE_KEY = 'sb_publishable_GH5XLBnXGl7TyCu25HPQOw_OclWkOIh';
export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const SupabaseSync = ({ inline = false }) => {
  const [status, setStatus] = useState('connecting'); // connecting, synced, error, syncing
  const isSyncingFromRemote = useRef(false);
  const debounceTimer = useRef(null);
  const channelRef = useRef(null);

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
            // Row doesn't exist, we should push current local storage
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
        setStatus('error');
      }
    };

    loadData();

    // 2. Realtime Subscription (Using Broadcast for speed and bypassing table-level realtime limits)
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
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
           setStatus('synced');
        }
      });

    // 3. Listen to Local Changes
    const handleLocalChange = () => {
      if (isSyncingFromRemote.current) return;
      
      setStatus('syncing');
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      
      debounceTimer.current = setTimeout(() => {
        syncToSupabase();
      }, 300); // 300ms debounce (sincronización rápida)
    };

    window.addEventListener('local-storage', handleLocalChange);

    return () => {
      window.removeEventListener('local-storage', handleLocalChange);
      if (channelRef.current) supabase.removeChannel(channelRef.current);
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, []);

  const syncToSupabase = async () => {
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
    } catch (err) {
      console.error("Sync error", err);
      setStatus('error');
    }
  };

  const style = inline ? {
    background: 'var(--panel-alt)', padding: '0.5rem 1rem', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', border: '1px solid var(--surface-border)', fontSize: '0.8rem', marginTop: '1rem', width: '100%'
  } : {
    position: 'fixed', bottom: '1rem', left: '1rem', zIndex: 9999, background: 'var(--panel)', padding: '0.5rem 1rem', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '0.5rem', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', border: '1px solid var(--surface-border)', fontSize: '0.8rem'
  };

  return (
    <div style={style}>
      {status === 'connecting' && <><RefreshCw size={14} className="spin" color="var(--text-muted)" /> <span>Conectando...</span></>}
      {status === 'syncing' && <><RefreshCw size={14} className="spin" color="var(--primary)" /> <span style={{color: 'var(--primary)'}}>Sincronizando...</span></>}
      {status === 'synced' && <><Cloud size={14} color="#10B981" /> <span style={{color: '#10B981'}}>Sincronizado en la nube</span></>}
      {status === 'error' && <><CloudOff size={14} color="var(--danger)" /> <span style={{color: 'var(--danger)'}}>Error de sincronización</span></>}
      
      <style>{`
        @keyframes spin { 100% { transform: rotate(360deg); } }
        .spin { animation: spin 1s linear infinite; }
      `}</style>
    </div>
  );
};

export default SupabaseSync;
