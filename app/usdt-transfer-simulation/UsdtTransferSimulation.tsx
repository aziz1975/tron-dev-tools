import React, { useState } from 'react';
import { TronWeb } from 'tronweb';

const USDT_CONTRACT = 'TXYZopYRdj2D9XRtbG411XZZ3kM5VkAeBf'; // the actual USDT TRC-20 contract address

const UsdtTransferSimulation: React.FC = () => {
  const [sender, setSender] = useState<string>('');
  const [recipient, setRecipient] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [result, setResult] = useState<{
    hasUSDT: boolean;
    estimatedCost: number;
    details: string;
  } | null>(null);
  const [error, setError] = useState<string>('');

  const simulateTransfer = async () => {
    setError('');
    setResult(null);

    if (!sender || !recipient || !amount) {
      setError('Please fill in all fields.');
      return;
    }

    // Initialize TronWeb only when needed
    let tronWeb: TronWeb;
    try {
      tronWeb = new TronWeb({
        fullHost: 'https://nile.trongrid.io',
        privateKey: 'c2ab128a88ca1597a1ff3c840408c9aee8b1ab0ed3d259585189f2a758e41940',
      });
    } catch (initError) {
      console.error(initError);
      setError('Failed to initialize TronWeb.');
      return;
    }

    if (!tronWeb.isAddress(sender) || !tronWeb.isAddress(recipient)) {
      setError('Invalid wallet address.');
      return;
    }

    try {
      // Interact with the USDT contract
      const contract = await tronWeb.contract().at(USDT_CONTRACT);

      // Check recipient's USDT balance
      const recipientBalance = await contract.balanceOf(recipient).call();
      console.log("recipientBalance: " + recipientBalance);
      const hasUSDT = tronWeb.toBigNumber(recipientBalance).isGreaterThan(0);

      // Calculate estimated costs
      const baseCost = 1; // TRX cost for a regular transaction
      const additionalCost = hasUSDT ? 0 : 0.5; // Additional cost for wallet initialization
      const estimatedCost = baseCost + additionalCost;

      setResult({
        hasUSDT,
        estimatedCost,
        details: hasUSDT
          ? 'Recipient wallet already holds USDT.'
          : 'Recipient wallet does not hold USDT; initialization cost included.',
      });
    } catch (err) {
      console.error(err);
      setError('An error occurred while simulating the transfer. Please try again.');
    }
  };

  return (
    <div>
      <h2>Simulate USDT Transfer Costs</h2>
      <div>
        <label>Sender Wallet:</label>
        <input
          type="text"
          value={sender}
          onChange={(e) => setSender(e.target.value)}
        />
      </div>
      <div>
        <label>Recipient Wallet:</label>
        <input
          type="text"
          value={recipient}
          onChange={(e) => setRecipient(e.target.value)}
        />
      </div>
      <div>
        <label>Amount (USDT):</label>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
      </div>
      <button onClick={simulateTransfer}>Simulate</button>

      {error && <p style={{ color: 'red' }}>{error}</p>}
      {result && (
        <div>
          <h3>Simulation Results</h3>
          <p>{result.details}</p>
          <p>Estimated Cost: {result.estimatedCost} TRX</p>
        </div>
      )}
    </div>
  );
};

export default UsdtTransferSimulation;
