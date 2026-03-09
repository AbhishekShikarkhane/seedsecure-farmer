import React, { createContext, useEffect, useMemo, useState } from 'react';
import { ethers } from 'ethers';
import SeedSecureArtifact from './contracts/SeedSecure.json';
import { getBatchesByStatus } from './services/firebaseService';

export const BlockchainContext = createContext(null);

export function BlockchainProvider({ children }) {
  const [isSyncing, setIsSyncing] = useState(false);
  const [allBatches, setAllBatches] = useState([]);
  const [logisticsBatches, setLogisticsBatches] = useState([]);
  const [inTransitBatches, setInTransitBatches] = useState([]);
  const [retailerBatches, setRetailerBatches] = useState([]);
  const [historyBatches, setHistoryBatches] = useState([]);
  const stats = useMemo(() => {
    const totalPackets = allBatches.reduce((a, b) => a + (b.childPacketIDs?.length || 0), 0);
    const avgPurity = allBatches.length > 0
      ? Number((allBatches.reduce((a, b) => a + (b.purityScore || 0), 0) / allBatches.length).toFixed(1))
      : 0;
    return { totalPackets, avgPurity };
  }, [allBatches]);

  const syncAllDashboardData = async () => {
    setIsSyncing(true);
    try {
      const [
        manufactured,
        readyDispatch,
        transit,
        retailer,
        readySale,
        sold,
        fullySold
      ] = await Promise.all([
        getBatchesByStatus('Manufactured'),
        getBatchesByStatus('Ready for Dispatch'),
        getBatchesByStatus('In Transit'),
        getBatchesByStatus('At Retailer'),
        getBatchesByStatus('Ready for Sale'),
        getBatchesByStatus('Sold'),
        getBatchesByStatus('Fully Sold')
      ]);
      const combined = [
        ...(manufactured || []),
        ...(readyDispatch || []),
        ...(transit || []),
        ...(retailer || []),
        ...(readySale || []),
        ...(sold || []),
        ...(fullySold || [])
      ];
      setAllBatches(combined);
      setLogisticsBatches(combined.filter(b => b.status === 'Ready for Dispatch' || b.status === 'Manufactured'));
      setInTransitBatches(combined.filter(b => b.status === 'In Transit'));
      setRetailerBatches(combined.filter(b => {
        const isAtRetailer = b.status === 'At Retailer' || b.status === 'Ready for Sale';
        const isFullySold = b.status === 'Fully Sold' || ((b.soldChildPackets?.length || 0) === (b.childPacketIDs?.length || 0) && (b.childPacketIDs?.length || 0) > 0);
        return isAtRetailer && !isFullySold;
      }));
      setHistoryBatches(combined.filter(b => b.status === 'Fully Sold' || ((b.soldChildPackets?.length || 0) === (b.childPacketIDs?.length || 0) && (b.childPacketIDs?.length || 0) > 0)));
      window.syncAllDashboardData = syncAllDashboardData;
    } finally {
      setTimeout(() => setIsSyncing(false), 1200);
    }
  };

  useEffect(() => {
    let provider;
    let contract;
    let heartbeat;
    const addr = import.meta.env.VITE_SEED_SECURE_ADDRESS;
    const setup = async () => {
      await syncAllDashboardData();
      if (!window.ethereum || !addr) return;
      provider = new ethers.BrowserProvider(window.ethereum);
      // The artifact JSON object contains an 'abi' field
      contract = new ethers.Contract(addr, SeedSecureArtifact.abi, provider);
      const onEvent = async () => {
        await syncAllDashboardData();
      };
      contract.on('BatchCreated', onEvent);
      contract.on('SeedSold', onEvent);
      const onVisibility = async () => {
        if (document.visibilityState === 'visible') {
          await syncAllDashboardData();
        }
      };
      document.addEventListener('visibilitychange', onVisibility);
      heartbeat = setInterval(syncAllDashboardData, 15000);
      return () => {
        contract.off('BatchCreated', onEvent);
        contract.off('SeedSold', onEvent);
        if (provider) provider.removeAllListeners('block');
        document.removeEventListener('visibilitychange', onVisibility);
        if (heartbeat) clearInterval(heartbeat);
      };
    };
    let cleanup;
    (async () => { cleanup = await setup(); })();
    return () => {
      if (cleanup) cleanup();
    };
  }, []);

  return (
    <BlockchainContext.Provider
      value={{
        isSyncing,
        syncAllDashboardData,
        allBatches,
        logisticsBatches,
        inTransitBatches,
        retailerBatches,
        historyBatches,
        stats
      }}
    >
      {children}
    </BlockchainContext.Provider>
  );
}
