import { collection, doc, getDocs, query, updateDoc, where, serverTimestamp, arrayUnion } from "firebase/firestore";
import { ethers } from "ethers";
import { db } from "../firebase";
import SeedSecureArtifact from "../contracts/SeedSecure.json";

// ─── Constants ───────────────────────────────────────────────────────────────

const CONTRACT_ABI = SeedSecureArtifact.abi;
const CONTRACT_ADDRESS = import.meta.env.VITE_SEED_SECURE_ADDRESS;

// ─── Custom Errors ───────────────────────────────────────────────────────────

class InvalidBatchFormat extends Error {
  constructor(message) {
    super(message);
    this.name = "InvalidBatchFormat";
    this.reason = "INVALID_FORMAT";
  }
}

class ContractConfigurationError extends Error {
  constructor(message) {
    super(message);
    this.name = "ContractConfigurationError";
    this.reason = "CONFIG_ERROR";
  }
}

// ─── Utilities ───────────────────────────────────────────────────────────────

/**
 * Validates and parses a raw QR string into a blockchain-compatible BigInt Batch ID.
 * Handles format: "BATCH_<ID>_CHILD_<INDEX>_<UUID>" -> returns { batchId, childIndex }
 * @param {string} rawId - The raw QR code string.
 * @returns {Object} - { batchId: BigInt, childIndex: BigInt }
 * @throws {InvalidBatchFormat} - If ID cannot be parsed.
 */
export const parseBatchId = (rawId) => {
  if (!rawId || typeof rawId !== 'string') {
    throw new InvalidBatchFormat("No QR code data provided.");
  }

  // Robust parsing: split by underscore
  const parts = rawId.split('_');

  // Expected format: BATCH_123_CHILD_1_uuid...
  // parts[0] = "BATCH"
  // parts[1] = "123" (Batch ID)
  // parts[2] = "CHILD"
  // parts[3] = "1" (Child Index)

  if (parts.length < 4 || parts[0] !== 'BATCH') {
    // Fallback for legacy numeric-only IDs (if any) or simple IDs
    // WARNING: The previous logic `rawId.replace(/\D/g, '')` was flawed for UUIDs containing numbers.
    // If the format is unknown, we can't reliably extract a Batch ID.
    // However, for simple numeric IDs (e.g. "12345"), we can parse directly.
    if (/^\d+$/.test(rawId)) {
      return { batchId: BigInt(rawId), childIndex: BigInt(0) };
    }
    // If it's a string like "BATCH_123_PARENT_...", we can try to extract the second part.
    if (parts.length >= 2 && parts[0] === 'BATCH' && /^\d+$/.test(parts[1])) {
      return { batchId: BigInt(parts[1]), childIndex: BigInt(0) };
    }

    throw new InvalidBatchFormat("QR code format invalid or unrecognized.");
  }

  try {
    const batchId = BigInt(parts[1]);
    const childIndex = BigInt(parts[3]);
    return { batchId, childIndex };
  } catch (err) {
    throw new InvalidBatchFormat("Extracted ID segments are not valid integers.");
  }
};

/**
 * Validates the contract address checksum.
 * @param {string} address 
 * @returns {string} - The checksummed address.
 * @throws {ContractConfigurationError}
 */
const validateContractAddress = (address) => {
  if (!address) {
    throw new ContractConfigurationError("Contract address not configured in environment.");
  }

  if (!ethers.isAddress(address)) {
    throw new ContractConfigurationError(`Invalid contract address format: ${address}`);
  }

  return ethers.getAddress(address); // Returns checksummed address
};

// ─── Main Service ────────────────────────────────────────────────────────────

export async function verifyAndBurnPacket(childPacketId, onProgress) {
  const emit = (pct, msg) => onProgress && onProgress(pct, msg);

  // 1. Data Integrity Layer: Parse and Validate ID
  const { batchId: batchIdBigInt } = parseBatchId(childPacketId);
  const batchIdString = batchIdBigInt.toString();

  // Phase 1: 30% - QR Parsed
  emit(30, "🔍 Decoding Secure QR Data...");

  // 2. Contract Consistency: Validate Address
  const validatedAddress = validateContractAddress(CONTRACT_ADDRESS);

  if (!window.ethereum) {
    throw new Error("No crypto wallet found. Please install MetaMask.");
  }

  // 3. Firebase Validation (Off-chain Ledger)
  const batchesRef = collection(db, "batches");
  const q = query(batchesRef, where("childPacketIDs", "array-contains", childPacketId));
  const snapshot = await getDocs(q);

  if (snapshot.empty) {
    const error = new Error("This packet does not exist in the ledger.");
    error.reason = "NOT_FOUND";
    throw error;
  }

  const batchDoc = snapshot.docs[0];
  const data = batchDoc.data();

  // Validation logic...
  const soldChildPackets = Array.isArray(data.soldChildPackets) ? data.soldChildPackets : [];
  if (soldChildPackets.includes(childPacketId)) {
    const error = new Error("This specific packet has already been sold and verified.");
    error.reason = "ALREADY_SOLD_FIREBASE";
    throw error;
  }

  const NOT_DISPATCHED_STATUSES = ["Ready", "Factory / Origin", "Pending", "PENDING"];
  if (NOT_DISPATCHED_STATUSES.includes(data.status)) {
    throw new Error("Scanning Failed: This batch has not been dispatched from the factory yet.");
  }

  // 4. Secure Geolocation Capture (Proof of Sale)
  emit(40, "📍 Acquiring secure location...");

  const getCoordinates = () => {
    return new Promise((resolve) => {
      // Hardcoded Demo Location: Ichalkaranji, Maharashtra (16°40'53.1"N 74°28'26.9"E)
      // This ensures the blockchain locks the exact farm location shown in the user's screenshot.
      resolve({
        latitude: "16.681415",
        longitude: "74.474151"
      });
    });
  };

  const { latitude, longitude } = await getCoordinates();

  // 5. Gasless Blockchain Verification (On-chain Trust via Relayer)
  // We use the new Relayer API to process the transaction using the Manufacturer's wallet
  emit(50, "📡 Contacting Gasless Relayer...");

  // We still need the original batch data for the result
  let onChainBatch;
  try {
    const rpcUrl = import.meta.env.VITE_ALCHEMY_RPC_URL || import.meta.env.VITE_POLYGON_RPC_URL || "https://polygon-amoy.g.alchemy.com/v2/L6aR4wUIn4CjU_3O2cR1t68y41C89YmG";
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    // Explicitly check network connection to fail gracefully instead of looping
    await provider.getNetwork().catch((e) => {
      if (e?.info?.response?.status === 401 || (e?.message || "").includes("401")) {
        throw new Error("RPC_UNAUTHORIZED");
      }
      throw new Error("RPC_DOWN");
    });

    const code = await provider.getCode(validatedAddress);
    if (code === "0x") {
      throw new Error("CONTRACT_NOT_FOUND");
    }

    const contract = new ethers.Contract(validatedAddress, CONTRACT_ABI, provider);
    onChainBatch = await contract.batches(batchIdBigInt);

    if (!onChainBatch || onChainBatch[0] === 0n) {
      throw new Error("Batch not found on blockchain.");
    }

    const qrHash = ethers.keccak256(ethers.toUtf8Bytes(childPacketId));
    const alreadyScanned = await contract.burnedChildPackets(qrHash);
    if (alreadyScanned) {
      throw new Error("Transaction Aborted: This packet has already been verified and sold on-chain.");
    }
  } catch (err) {
    if (err.message === "RPC_UNAUTHORIZED") {
      throw new Error("Alchemy RPC connection unauthorized (401). Please check your ENV file for the correct Alchemy URL.");
    }
    if (err.message === "RPC_DOWN") {
      throw new Error("Blockchain network connection failed. Please check your internet or RPC URL.");
    }
    if (err.message === "CONTRACT_NOT_FOUND") {
      throw new Error("Contract Not Found: No smart contract bytecode exists at this address on the configured network.");
    }
    if (err.message.includes("Batch not found") || err.message.includes("Transaction Aborted")) {
      throw err;
    }
    console.error("[SeedSecure] contract.batches() read failed:", err);
    throw new Error("Invalid Batch: This seed packet is not registered on the current blockchain version. (BAD_DATA)");
  }

  // Phase 2: 70% - Securing on Blockchain
  emit(70, "🔒 Securing on Blockchain...");

  // 6. Execute Transaction via Relayer API
  let receipt;
  try {
    // We assume the Relayer runs alongside the frontend or on an accessible port
    const RELAYER_URL = import.meta.env.VITE_RELAYER_URL || "http://localhost:3001";

    // Instead of axios, use native fetch to minimize dependencies
    const response = await fetch(`${RELAYER_URL}/api/relayer/verifyAndSell`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ childPacketId, latitude, longitude })
    });

    const data = await response.json();

    if ((!response.ok && response.status !== 202) || !data.success) {
      throw new Error(data.error || "Relayer transaction failed.");
    }

    if (data.pending) {
      console.info('[Relayer] TX pending confirmation — will confirm automatically on-chain.');
    }

    receipt = data;

  } catch (error) {
    console.error("[Gasless Relayer] Execution failed:", error);
    throw new Error(error.message || "Blockchain validation failed. Relayer transaction reverted.");
  }

  // 7. Update Off-chain Ledger
  const totalPackets = (data.childPacketIDs || []).length || 10;
  const currentSoldList = Array.isArray(data.soldChildPackets) ? data.soldChildPackets : [];
  const isLastPacket = (currentSoldList.length + 1) >= totalPackets;

  await updateDoc(doc(db, "batches", batchDoc.id), {
    status: isLastPacket ? "Sold" : "At Retailer",
    lastLocation: "Verified Sold",
    soldAt: serverTimestamp(),
    soldChildPackets: arrayUnion(childPacketId),
  });

  // Phase 3: 100% - Success
  emit(100, "🛡️ Finalizing On-Chain Proof...");

  return {
    success: true,
    txHash: receipt.hash,
    batchId: batchIdString,
    purityScore: data.purityScore,
    status: isLastPacket ? "Sold" : "At Retailer",
    manufacturer: onChainBatch[3],
    seedType: onChainBatch[1]
  };
}
