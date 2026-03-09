import { db } from "../firebase"; 
import { doc, setDoc, serverTimestamp, updateDoc, collection, query, where, getDocs, arrayUnion } from "firebase/firestore"; 
 
/**
* Saves the generated batch data, purity score, and blockchain hash to Firestore. 
* @param {Object} batchData 
* @param {string} txHash 
*/ 
export const saveBatchToFirebase = async (batchData, txHash) => { 
  try { 
    const batchRef = doc(db, "batches", batchData.parentCarton); 

    await setDoc(batchRef, { 
      batchID: batchData.batchID, 
      parentCartonID: batchData.parentCarton, 
      childPacketIDs: batchData.childPackets, 
      purityScore: batchData.purityScore, 
      seedType: batchData.seedType || "Premium Wheat Seeds",
      blockchainTxHash: txHash, 
      status: "Ready for Dispatch", 
      createdAt: serverTimestamp(), 
      lastLocation: "Factory Main Unit", 
      transitHistory: [{
        status: 'Ready for Dispatch',
        timestamp: new Date().toISOString(),
        handlerName: 'Factory Main Unit',
        latitude: null,
        longitude: null
      }],
      soldChildPackets: []
    }); 

    console.log("Batch successfully recorded in the Secure Ledger!"); 
    return { success: true, docId: batchData.parentCarton }; 
  } catch (error) { 
    console.error("Error saving to Firebase Ledger:", error); 
    throw error; 
  } 
};

/**
 * Updates the status of a batch to "In Transit".
 * @param {string} parentId - The unique parentCartonID of the batch.
 * @returns {Promise<{success: boolean}>}
*/
export const dispatchBatch = async (parentId) => {
  const getFactoryLocation = () =>
    new Promise((resolve) => {
      if (typeof navigator === "undefined" || !navigator.geolocation) {
        resolve({ lat: null, lng: null });
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        () => {
          resolve({ lat: null, lng: null });
        }
      );
    });

  try {
    const { lat, lng } = await getFactoryLocation();
    const batchRef = doc(db, "batches", parentId);
    await updateDoc(batchRef, {
      status: "In Transit",
      dispatchedAt: serverTimestamp(),
      lastLocation: "Factory Main Unit",
      transitHistory: arrayUnion({
        handlerName: "Factory Main Unit",
        latitude: lat,
        longitude: lng,
        timestamp: new Date(),
      }),
    });
    console.log(`Batch ${parentId} dispatched successfully!`);
    return { success: true };
  } catch (error) {
    console.error("Error dispatching batch:", error);
    throw error;
  }
};

/**
 * Fetches all batches with a specific status.
 * @param {string} status - The status to filter by.
 * @returns {Promise<Array>}
 */
export const getBatchesByStatus = async (status) => {
  try {
    const q = query(collection(db, "batches"), where("status", "==", status));
    const querySnapshot = await getDocs(q);
    const batches = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      batches.push({ 
        id: doc.id, 
        ...data,
        transitHistory: Array.isArray(data.transitHistory) ? data.transitHistory : [],
        childPacketIDs: Array.isArray(data.childPacketIDs) ? data.childPacketIDs : [],
        soldChildPackets: Array.isArray(data.soldChildPackets) ? data.soldChildPackets : []
      });
    });
    return batches;
  } catch (error) {
    console.error("Error fetching batches:", error);
    throw error;
  }
};
