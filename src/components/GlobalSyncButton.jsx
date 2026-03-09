import React, { useContext } from 'react';
import { RefreshCw } from 'lucide-react';
import { BlockchainContext } from '../BlockchainContext';

export default function GlobalSyncButton() {
  const { isSyncing, syncAllDashboardData } = useContext(BlockchainContext) || {};
  const onClick = async () => {
    if (!syncAllDashboardData) return;
    await syncAllDashboardData();
  };
  return (
    <button
      onClick={onClick}
      aria-label="Global Sync"
      style={{
        background: 'rgba(255,255,255,0.05)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: '1px solid rgba(255,255,255,0.1)',
        padding: '10px',
        borderRadius: 9999,
        cursor: 'pointer',
        transition: 'all 0.2s ease'
      }}
      onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 0 15px rgba(0,255,157,0.4)'; e.currentTarget.style.background = 'rgba(255,255,255,0.10)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
    >
      <RefreshCw size={18} className={isSyncing ? 'animate-spin' : ''} color="#00FF9D" />
    </button>
  );
}
