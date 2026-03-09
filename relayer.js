require('dotenv').config();
const { ethers } = require('ethers');
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Load environment variables securely
const RPC_URL = process.env.VITE_ALCHEMY_RPC_URL || process.env.VITE_POLYGON_RPC_URL;
const PRIVATE_KEY = process.env.VITE_MANUFACTURER_PRIVATE_KEY;
const CONTRACT_ADDRESS = process.env.VITE_SEED_SECURE_ADDRESS;

if (!RPC_URL || !PRIVATE_KEY || !CONTRACT_ADDRESS) {
    console.error("Missing required environment variables. Please check .env file.");
    process.exit(1);
}

// Ensure the private key starts with '0x'
const formattedPrivateKey = PRIVATE_KEY.startsWith('0x') ? PRIVATE_KEY : `0x${PRIVATE_KEY}`;

// Load ABI (Using the compiled Hardhat artifact)
const SeedSecureArtifact = require('./src/contracts/SeedSecure.json');
// Handle both direct array export and Hardhat object export
const CONTRACT_ABI = SeedSecureArtifact.abi || SeedSecureArtifact;

// Initialize Provider and Signer
const provider = new ethers.JsonRpcProvider(RPC_URL);
const wallet = new ethers.Wallet(formattedPrivateKey, provider);
const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, wallet);

console.log(`Relayer Service initialized with relayer address: ${wallet.address}`);

/**
 * Validates and parses a raw QR string into a blockchain-compatible BigInt Batch ID.
 * Handles format: "BATCH_<ID>_CHILD_<INDEX>_<UUID>" -> returns { batchId, childIndex }
 */
const parseBatchId = (rawId) => {
    if (!rawId || typeof rawId !== 'string') {
        throw new Error("No QR code data provided.");
    }

    const parts = rawId.split('_');

    if (parts.length < 4 || parts[0] !== 'BATCH') {
        if (/^\d+$/.test(rawId)) {
            return { batchId: BigInt(rawId), childIndex: BigInt(0) };
        }
        if (parts.length >= 2 && parts[0] === 'BATCH' && /^\d+$/.test(parts[1])) {
            return { batchId: BigInt(parts[1]), childIndex: BigInt(0) };
        }
        throw new Error("QR code format invalid or unrecognized.");
    }

    try {
        const batchId = BigInt(parts[1]);
        const childIndex = BigInt(parts[3]);
        return { batchId, childIndex };
    } catch (err) {
        throw new Error("Extracted ID segments are not valid integers.");
    }
};

// --- Relayer Endpoint ---

app.post('/api/relayer/verifyAndSell', async (req, res) => {
    try {
        const { childPacketId, latitude = "", longitude = "" } = req.body;

        if (!childPacketId) {
            return res.status(400).json({ success: false, error: "Missing childPacketId" });
        }

        console.log(`\n[Relayer] Processing verification for packet: ${childPacketId}`);
        if (latitude && longitude) {
            console.log(`[Relayer] Geolocation provided: ${latitude}, ${longitude}`);
        } else {
            console.log(`[Relayer] No location data provided. Locking with empty bounds.`);
        }

        // Parse the Batch ID
        const { batchId } = parseBatchId(childPacketId);

        // Hash the child packet ID
        const qrHash = ethers.keccak256(ethers.toUtf8Bytes(childPacketId));

        // Check if the packet is already burned on-chain
        const alreadyScanned = await contract.burnedChildPackets(qrHash);
        if (alreadyScanned) {
            console.warn(`[Relayer] Packet ${childPacketId} is already verified and sold.`);
            return res.status(400).json({ success: false, error: "WARNING: FAKE OR DUPLICATE DETECTED. This packet has already been verified." });
        }

        console.log(`[Relayer] Executing verifyAndSell for Batch ID ${batchId.toString()}...`);

        // Try new 4-arg signature (with GPS lock). Fall back to legacy 2-arg if
        // the deployed contract pre-dates Phase 5 (avoids ABI mismatch revert).
        let tx;
        try {
            // Phase 5 contract: verifyAndSell(batchId, qrHash, lat, lng)
            tx = await contract.verifyAndSell(batchId, qrHash, latitude, longitude, {
                gasLimit: 300000
            });
            console.log(`[Relayer] Used Phase-5 contract (location lock enabled).`);
        } catch (sigErr) {
            if (sigErr?.code === 'CALL_EXCEPTION' || sigErr?.message?.includes('no data')) {
                // Legacy contract: verifyAndSell(batchId, qrHash)
                console.warn(`[Relayer] Phase-5 call failed. Falling back to legacy 2-arg verifyAndSell (location lock NOT stored on-chain).`);
                tx = await contract.verifyAndSell(batchId, qrHash, {
                    gasLimit: 300000
                });
            } else {
                throw sigErr; // Re-throw non-mismatch errors
            }
        }

        console.log(`[Relayer] Transaction submitted! Hash: ${tx.hash}`);

        // Wait for confirmation — retry up to 3 times (Polygon Amoy can be slow)
        let receipt = null;
        const MAX_WAIT_ATTEMPTS = 3;
        const TIMEOUT_MS = 90_000; // 90s per attempt

        for (let attempt = 1; attempt <= MAX_WAIT_ATTEMPTS; attempt++) {
            try {
                console.log(`[Relayer] Waiting for confirmation (attempt ${attempt}/${MAX_WAIT_ATTEMPTS})...`);
                receipt = await tx.wait(1); // wait for 1 confirmation
                break; // confirmed — exit retry loop
            } catch (waitErr) {
                const isTimeout = waitErr?.code === 'TIMEOUT' || (waitErr?.message || '').includes('timeout');
                if (isTimeout && attempt < MAX_WAIT_ATTEMPTS) {
                    console.warn(`[Relayer] tx.wait() timed out. Retrying (${attempt}/${MAX_WAIT_ATTEMPTS})...`);
                    continue;
                }
                if (isTimeout) {
                    // Still unconfirmed after all retries — tx is in the mempool, return 202
                    console.warn(`[Relayer] TX still pending after ${MAX_WAIT_ATTEMPTS} attempts. Returning pending status.`);
                    return res.status(202).json({
                        success: true,
                        pending: true,
                        txHash: tx.hash,
                        message: 'Transaction submitted but confirmation timed out. It will confirm automatically.'
                    });
                }
                throw waitErr; // non-timeout error — re-throw to outer catch
            }
        }

        console.log(`[Relayer] Transaction confirmed in block: ${receipt.blockNumber}`);

        return res.status(200).json({
            success: true,
            txHash: receipt.hash,
            blockNumber: receipt.blockNumber
        });

    } catch (error) {
        console.error("[Relayer] Transaction Failed:", error);

        // Extract the real Solidity revert reason
        const raw = error?.reason
            || error?.data?.message
            || error?.error?.message
            || error?.message
            || "Unknown blockchain error.";

        console.error("[Relayer] Revert reason:", raw);

        let errorMessage;
        if (raw.includes("already been verified") || raw.includes("FAKE OR DUPLICATE")) {
            errorMessage = "WARNING: FAKE OR DUPLICATE DETECTED. This packet has already been verified.";
        } else if (raw.includes("Batch does not exist") || raw.includes("batch is invalid")) {
            errorMessage = "Batch does not exist on blockchain. Please create a new batch on the Manufacturer Portal first, then scan QR codes from that batch.";
        } else if (raw.includes("Location already locked")) {
            errorMessage = "Location already locked for this packet. It cannot be re-verified.";
        } else if (raw.includes("Only manufacturer")) {
            errorMessage = "Authorization failed: The relayer wallet is not the authorized manufacturer.";
        } else {
            errorMessage = raw;
        }

        return res.status(500).json({ success: false, error: errorMessage });
    }
});

const PORT = process.env.PORT || 3001;
if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log(`Gasless Relayer API is running locally on port ${PORT}`);
    });
}

// Export the Express API for Vercel
module.exports = app;
