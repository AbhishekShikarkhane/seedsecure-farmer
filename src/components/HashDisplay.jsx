import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';

const HashDisplay = ({ hash, isLarge = false }) => {
    const [copied, setCopied] = useState(false);

    if (!hash) return null;

    const truncateHash = (str) => {
        if (!str) return '';
        // If it's short, just display it
        if (str.length <= 14) return str;

        // For standard Ethereum hashes (0x...) or long IDs
        // 0x89205A3A3b2A69De6Dbf7f01ED13B2108B2c43e7 -> 0x8920...43e7
        return `${str.substring(0, 6)}...${str.substring(str.length - 4)}`;
    };

    const handleCopy = (e) => {
        e.stopPropagation(); // prevent clicking parent containers
        navigator.clipboard.writeText(hash);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            background: 'rgba(0,0,0,0.2)',
            padding: isLarge ? '8px 14px' : '6px 12px',
            borderRadius: 8,
            border: '1px solid rgba(255,255,255,0.1)',
            fontFamily: 'monospace',
            fontSize: isLarge ? '1.1rem' : '0.85rem',
            color: 'var(--text-secondary)',
            maxWidth: '100%',
            wordBreak: 'keep-all',
            whiteSpace: 'nowrap'
        }}>
            <span style={{ color: '#E2E8F0', fontWeight: isLarge ? 800 : 600 }}>
                {truncateHash(hash)}
            </span>
            <button
                onClick={handleCopy}
                style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: copied ? '#10B981' : '#94A3B8',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '4px 8px',
                    borderRadius: 6,
                    transition: 'all 0.2s',
                    gap: '0.375rem'
                }}
                onMouseEnter={(e) => {
                    if (!copied) e.currentTarget.style.color = '#fff';
                }}
                onMouseLeave={(e) => {
                    if (!copied) e.currentTarget.style.color = '#94A3B8';
                }}
                title="Copy full hash to clipboard"
            >
                {copied ? (
                    <>
                        <Check size={14} />
                        <span style={{ fontSize: '0.7rem', fontWeight: 700 }}>Copied!</span>
                    </>
                ) : (
                    <>
                        <Copy size={14} />
                        <span style={{ fontSize: '0.7rem', fontWeight: 600 }}>Copy</span>
                    </>
                )}
            </button>
        </div>
    );
};

export default HashDisplay;
