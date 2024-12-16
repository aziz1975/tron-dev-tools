import { useState } from 'react';
import { NextPage } from 'next';
import { TronWeb } from 'tronweb';

type TransferType = 'TRX' | 'TRC10';
type NetworkType = 'Mainnet' | 'Shasta' | 'Nile';

// Mapping networks to their fullNode endpoints
const networkEndpoints: { [key in NetworkType]: string } = {
  Mainnet: 'https://api.trongrid.io',
  Shasta: 'https://api.shasta.trongrid.io',
  Nile: 'https://nile.trongrid.io',
};

const TrxTrc10TransferSimulation: NextPage = () => {
  const [network, setNetwork] = useState<NetworkType>('Mainnet');
  const [transferType, setTransferType] = useState<TransferType>('TRX');
  const [fromAddress, setFromAddress] = useState('');
  const [toAddress, setToAddress] = useState('');
  const [amount, setAmount] = useState<number>(0);
  const [tokenID, setTokenID] = useState('');
  const [estimatedBandwidth, setEstimatedBandwidth] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [trxCost, setTrxCost] = useState<number | null>(null);
  const [sunCost, setSunCost] = useState<number | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setEstimatedBandwidth(null);
    setTrxCost(null);
    setSunCost(null);

    try {
      // Initialize TronWeb with selected network
      const tronWeb = new TronWeb({
        fullHost: networkEndpoints[network],
        // headers: { "TRON-PRO-API-KEY": "YOUR_API_KEY_HERE" }, // If needed
      });

      let transaction;

      if (transferType === 'TRX') {
        const amountInSun = Number(tronWeb.toSun(amount));
        transaction = await tronWeb.transactionBuilder.sendTrx(
          toAddress,
          amountInSun,
          fromAddress
        );
      } else {
        // For TRC10, `amount` must be in the token's base units.
        transaction = await tronWeb.transactionBuilder.sendToken(
          toAddress,
          amount,
          tokenID,
          fromAddress
        );
      }

      const rawDataHex = transaction.raw_data_hex;
      if (!rawDataHex) {
        throw new Error('Unable to fetch transaction data.');
      }

      // Calculate bandwidth: each 2 hex chars = 1 byte
      const bandwidthUsed = rawDataHex.length / 2;

      setEstimatedBandwidth(bandwidthUsed);

      // Approximate costs if no free bandwidth is available:
      // 1 TRX = 1000 bandwidth (approximation)
      const estimatedTrxCost = bandwidthUsed / 1000;
      const estimatedSunCost = estimatedTrxCost * 1_000_000; // 1 TRX = 1,000,000 SUN

      setTrxCost(estimatedTrxCost);
      setSunCost(estimatedSunCost);

    } catch (err: unknown) {
        console.log(err);
        if (err instanceof Error) {
            setErrorMessage(`Error: ${err.message}`);
          } else {
            setErrorMessage('An unknown error occurred.');
          }
    }
  };

  return (
    <div style={{ maxWidth: '600px', margin: '50px auto', fontFamily: 'sans-serif' }}>
      <h1>Simulate TRX/TRC10 Transfer Bandwidth Cost</h1>
      <form onSubmit={handleSubmit} style={{ marginTop: '20px' }}>
        <table style={{ borderCollapse: 'collapse', width: '100%' }}>
          <tbody>
            <tr>
              <td style={{ padding: '5px', textAlign: 'right' }}>Network:</td>
              <td style={{ padding: '5px' }}>
                <select
                  value={network}
                  onChange={(e) => setNetwork(e.target.value as NetworkType)}
                  style={{ width: '100%' }}
                >
                  <option value="Mainnet">Mainnet</option>
                  <option value="Shasta">Shasta</option>
                  <option value="Nile">Nile</option>
                </select>
              </td>
            </tr>

            <tr>
              <td style={{ padding: '5px', textAlign: 'right' }}>Transfer Type:</td>
              <td style={{ padding: '5px' }}>
                <select
                  value={transferType}
                  onChange={(e) => setTransferType(e.target.value as TransferType)}
                  style={{ width: '100%' }}
                >
                  <option value="TRX">TRX</option>
                  <option value="TRC10">TRC10</option>
                </select>
              </td>
            </tr>

            {transferType === 'TRC10' && (
              <tr>
                <td style={{ padding: '5px', textAlign: 'right' }}>Token ID:</td>
                <td style={{ padding: '5px' }}>
                  <input
                    type="text"
                    value={tokenID}
                    onChange={(e) => setTokenID(e.target.value)}
                    style={{ width: '100%' }}
                    required
                  />
                </td>
              </tr>
            )}

            <tr>
              <td style={{ padding: '5px', textAlign: 'right' }}>From Address:</td>
              <td style={{ padding: '5px' }}>
                <input
                  type="text"
                  value={fromAddress}
                  onChange={(e) => setFromAddress(e.target.value)}
                  style={{ width: '100%' }}
                  placeholder="e.g. Txxxxxxxxxxxxxxxxxxxx"
                  required
                />
              </td>
            </tr>

            <tr>
              <td style={{ padding: '5px', textAlign: 'right' }}>To Address:</td>
              <td style={{ padding: '5px' }}>
                <input
                  type="text"
                  value={toAddress}
                  onChange={(e) => setToAddress(e.target.value)}
                  style={{ width: '100%' }}
                  placeholder="e.g. Tyyyyyyyyyyyyyyyyyyyyy"
                  required
                />
              </td>
            </tr>

            <tr>
              <td style={{ padding: '5px', textAlign: 'right' }}>Amount:</td>
              <td style={{ padding: '5px' }}>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={amount}
                  onChange={(e) => setAmount(parseFloat(e.target.value))}
                  style={{ width: '100%' }}
                  required
                />
              </td>
            </tr>

            <tr>
              <td style={{ padding: '5px' }}></td>
              <td style={{ padding: '5px', textAlign: 'left' }}>
                <button type="submit" style={{ padding: '0.5em', cursor: 'pointer' }}>
                  Simulate
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </form>

      {errorMessage && (
        <div style={{ marginTop: '20px', color: 'red' }}>
          <strong>Error:</strong> {errorMessage}
        </div>
      )}

      {estimatedBandwidth !== null && (
        <div style={{ marginTop: '20px', fontSize: '1.2em' }}>
          <div><strong>Estimated Bandwidth Cost:</strong> {estimatedBandwidth} bytes</div>
          {trxCost !== null && (
            <div><strong>Equivalent TRX Cost (if no free bandwidth):</strong> {trxCost.toFixed(6)} TRX</div>
          )}
          {sunCost !== null && (
            <div><strong>Equivalent SUN Cost:</strong> {sunCost.toFixed(0)} SUN</div>
          )}
        </div>
      )}
    </div>
  );
};

export default TrxTrc10TransferSimulation;
