import { doc, updateDoc, arrayUnion, getDoc } from "firebase/firestore";
import { db } from "../firebase";

export async function updateTransitLocation(
  parentCartonId,
  handlerName,
  lat,
  lng,
  isFinalRetailer
) {
  const transitEntry = {
    handlerName,
    latitude: lat,
    longitude: lng,
    timestamp: new Date(),
  };

  const batchRef = doc(db, "batches", parentCartonId);

  const snapshot = await getDoc(batchRef);

  if (!snapshot.exists()) {
    throw new Error("Carton not found on the network.");
  }

  const data = snapshot.data();

  // DISPATCH GUARD: Prevent tracking for batches still at the factory
  if (data.status === "Ready" || data.status === "Factory / Origin" || data.status === "Pending") {
    throw new Error(
      "Error: This batch is still at the factory. It must be Dispatched by the manufacturer before logistics tracking can begin."
    );
  }

  if (data.status === "At Retailer") {
    throw new Error(
      "This carton is already at the final retailer and is ready for sale."
    );
  }

  if (data.status === "Sold") {
    throw new Error(
      "Packets from this carton have already been sold. Transit tracking is closed."
    );
  }

  // 1. Sync State With Blockchain via Relayer
  const isDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  const RELAYER_URL = import.meta.env.VITE_RELAYER_URL || (isDev ? "http://localhost:3001" : "");
  
  try {
    const response = await fetch(`${RELAYER_URL}/api/relayer/transit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        batchId: parentCartonId,
        isFinalRetailer: isFinalRetailer
      })
    });

    const relayerData = await response.json();
    if (!response.ok && !relayerData.pending) {
      throw new Error(relayerData.error || "Failed to update blockchain state.");
    }
  } catch (err) {
    console.error("[Transit Service] Blockchain Error:", err);
    throw new Error(`Blockchain sync failed: ${err.message}`);
  }

  // 2. Sync State with Firebase
  const updates = {
    transitHistory: arrayUnion(transitEntry),
  };

  if (isFinalRetailer) {
    updates.status = "At Retailer";
  }

  await updateDoc(batchRef, updates);

  return { success: true };
}
