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

  const updates = {
    transitHistory: arrayUnion(transitEntry),
  };

  if (isFinalRetailer) {
    updates.status = "At Retailer";
  }

  await updateDoc(batchRef, updates);

  return { success: true };
}
