'use client';

import React, { useState, FormEvent, ChangeEvent } from 'react';

// Map network keys to the corresponding TRONGRID endpoints
const NETWORK_ENDPOINTS: Record<NetworkKey, string> = {
  mainnet: 'https://api.trongrid.io',
  shasta: 'https://api.shasta.trongrid.io',
  nile: 'https://nile.trongrid.io',
};

type NetworkKey = 'mainnet' | 'shasta' | 'nile';

interface TransactionInfo {
  contractResult?: string[];
  // other fields are ignored for this component
}

const hexToAscii = (hex: string): string => {
  const cleanHex = hex.startsWith('0x') ? hex.slice(2) : hex;
  let str = '';
  for (let i = 0; i < cleanHex.length; i += 2) {
    const code = parseInt(cleanHex.substr(i, 2), 16);
    if (!isNaN(code) && code >= 32 && code <= 126) {
      str += String.fromCharCode(code);
    }
  }
  return str;
};

const TronDebud: React.FC = () => {
  const [network, setNetwork] = useState<NetworkKey>('mainnet');
  const [txId, setTxId] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<string | null>(null);
  const [decoded, setDecoded] = useState<string[]>([]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMessage(null);
    setDecoded([]);

    if (!txId.trim()) {
      setMessage('Please enter a transaction ID.');
      return;
    }

    setLoading(true);
    try {
      const endpoint = `${NETWORK_ENDPOINTS[network]}/wallet/gettransactioninfobyid`;
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: txId.trim() }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status} ${response.statusText}`);
      }

      const data: TransactionInfo = await response.json();

      if (!data || (typeof data === 'object' && Object.keys(data).length === 0)) {
        setMessage('Transaction ID does not exist.');
        return;
      }

      if (!Array.isArray(data.contractResult)) {
        setMessage('No contractResult field in response.');
        return;
      }

      if (data.contractResult.length === 0) {
        setMessage('contractResult is empty.');
        return;
      }

      const decodedArr = data.contractResult.map((hexStr) => {
        const text = hexToAscii(hexStr);
        return text || 'contractResult is empty';
      });

      setDecoded(decodedArr);
    } catch (err) {
      if (err instanceof Error) {
        setMessage(err.message);
      } else {
        setMessage('Unknown error');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleNetworkChange = (e: ChangeEvent<HTMLSelectElement>) => {
    setNetwork(e.target.value as NetworkKey);
  };

  return (
    <div style={{ maxWidth: 600, margin: '2rem auto', padding: '1rem' }}>
      <h2>TRON Transaction Debugger</h2>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <label>
          Network:
          <select value={network} onChange={handleNetworkChange} style={{ marginLeft: '0.5rem' }}>
            <option value="mainnet">Mainnet</option>
            <option value="shasta">Shasta Testnet</option>
            <option value="nile">Nile Testnet</option>
          </select>
        </label>

        <label>
          Transaction ID:
          <input
            type="text"
            value={txId}
            onChange={(e) => setTxId(e.target.value)}
            placeholder="Enter transaction hash"
            style={{ width: '100%', padding: '0.5rem', marginTop: '0.25rem' }}
          />
        </label>

        <button type="submit" disabled={loading} style={{ padding: '0.5rem' }}>
          {loading ? 'Loading…' : 'Submit'}
        </button>
      </form>

      {message && (
        <div
          style={{
            marginTop: '1rem',
            color: message.startsWith('HTTP') || message.startsWith('Transaction') ? 'red' : 'black',
          }}
        >
          {message}
        </div>
      )}

      {decoded.length > 0 && (
        <div style={{ marginTop: '1rem' }}>
          <h3>Debug result:</h3>
          <ul>
            {decoded.map((txt, i) => (
              <li key={i} style={{ fontFamily: 'monospace', marginBottom: '0.5rem' }}>
                {txt}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default TronDebud;
