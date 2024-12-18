import React, { useState, ChangeEvent, FormEvent } from 'react';
import { TronWeb } from 'tronweb';

type TronNetwork = 'Nile' | 'Shasta' | 'Mainnet';

interface TronResponse {
  energy_used?: number;
  energy_penalty?: number;
  result?: {
    result: boolean;
  };
}

const networkEndpoints: Record<TronNetwork, string> = {
  Nile: 'https://nile.trongrid.io',
  Shasta: 'https://api.shasta.trongrid.io',
  Mainnet: 'https://api.trongrid.io',
};

const contractAddresses: Record<TronNetwork, string> = {
  Nile: 'TXYZopYRdj2D9XRtbG411XZZ3kM5VkAeBf',
  Shasta: 'TG3XXyExBkPp9nzdajDZsozEu4BkaSJozs',
  Mainnet: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t',
};

function padTo32Bytes(hexString: string): string {
  const cleanHex = hexString.replace(/^0x/, '');
  return cleanHex.padStart(64, '0');
}

const UsdtTransferSimulation: React.FC = () => {
  const [network, setNetwork] = useState<TronNetwork>('Nile');
  const [ownerAddress, setOwnerAddress] = useState<string>('');
  const [contractAddress, setContractAddress] = useState<string>(contractAddresses['Nile']);
  const [recipientAddress, setRecipientAddress] = useState<string>('');
  const [amount, setAmount] = useState<string>('1000000');
  const [functionSelector, setFunctionSelector] = useState<string>('transfer(address,uint256)');

  const [loading, setLoading] = useState<boolean>(false);
  const [response, setResponse] = useState<TronResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!ownerAddress || !contractAddress || !recipientAddress || !amount || !functionSelector) {
      setError('Please fill in all fields.');
      return;
    }

    const tronWeb = new TronWeb({ fullHost: networkEndpoints[network] });

    // Check if the recipient address is valid
    if (!tronWeb.isAddress(recipientAddress)) {
      setError('Invalid recipient address according to TronWeb.');
      return;
    }

    let hexAddr: string;
    try {
      hexAddr = tronWeb.address.toHex(recipientAddress);
      console.log(`Converted Recipient Address: ${hexAddr}`);
    } catch (convErr) {
      console.log(convErr);
      setError(`Invalid recipient address (unable to convert from base58).`);
      return;
    }

    // TronWeb returns hex addresses starting with '41' followed by 40 hex chars (total length = 42 chars)
    if (!hexAddr.startsWith('41') || hexAddr.length !== 42) {
      setError(`Converted hex address doesn't have the expected format. Got: ${hexAddr}`);
      return;
    }

    // Remove the first 2 chars ("41") to get the 20-byte hex portion (40 chars)
    const recipientHex = hexAddr.slice(2);
    if (recipientHex.length !== 40) {
      setError(`Recipient address must convert to a 20-byte hex (40 hex chars) string. Got: ${recipientHex}`);
      return;
    }

    let amountHex: string;
    try {
      const amtBn = BigInt(amount);
      amountHex = amtBn.toString(16);
    } catch {
      setError('Amount must be a valid number.');
      return;
    }

    const recipientParam = padTo32Bytes('000000000000000000000000' + recipientHex);
    const amountParam = padTo32Bytes(amountHex);
    const parameter = recipientParam + amountParam;

    setLoading(true);
    setError(null);
    setResponse(null);

    const endpoint = `${networkEndpoints[network]}/wallet/triggerconstantcontract`;

    const body = {
      owner_address: ownerAddress,
      contract_address: contractAddress,
      function_selector: functionSelector,
      parameter: parameter,
      visible: true,
    };

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        throw new Error('Network response was not ok');
      }

      const data: TronResponse = await res.json();
      setResponse(data);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(`Error: ${err.message}`);
      } else {
        setError('An unknown error occurred.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleNetworkChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const selectedNetwork = e.target.value as TronNetwork;
    setNetwork(selectedNetwork);
    setContractAddress(contractAddresses[selectedNetwork]); 
  };

  const handleOwnerChange = (e: ChangeEvent<HTMLInputElement>) => {
    setOwnerAddress(e.target.value);
  };

  const handleRecipientChange = (e: ChangeEvent<HTMLInputElement>) => {
    setRecipientAddress(e.target.value);
  };

  const handleAmountChange = (e: ChangeEvent<HTMLInputElement>) => {
    setAmount(e.target.value);
  };

  const handleFunctionSelectorChange = (e: ChangeEvent<HTMLInputElement>) => {
    setFunctionSelector(e.target.value);
  };

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '20px' }}>
      <h1 style={{ color: "#333", textAlign: "center", marginBottom: "20px", fontSize: "36px", fontWeight: "bold" }}>
        USDT Transfer Simulation
      </h1>
      <p>Use this tool to simulate the energy costs of a USDT transfer on the selected Tron network.</p>
      
      <form onSubmit={handleSubmit}>
        <table style={{ borderCollapse: 'collapse', width: '100%' }}>
          <tbody>
            <tr>
              <td style={{ padding: '5px', verticalAlign: 'middle', width: '30%' }}>
                <label>Network:</label>
              </td>
              <td style={{ padding: '5px' }}>
                <select value={network} onChange={handleNetworkChange} style={{ width: '100%' }}>
                  <option value="Nile">Nile (Testnet)</option>
                  <option value="Shasta">Shasta (Testnet)</option>
                  <option value="Mainnet">Mainnet</option>
                </select>
              </td>
            </tr>
            <tr>
              <td style={{ padding: '5px', verticalAlign: 'middle' }}>
                <label>Owner / Sender Address (Base58):</label>
              </td>
              <td style={{ padding: '5px' }}>
                <input
                  type="text"
                  value={ownerAddress}
                  onChange={handleOwnerChange}
                  placeholder="Your Tron address (e.g. TVD...)"
                  style={{ width: '100%' }}
                />
              </td>
            </tr>
            <tr>
              <td style={{ padding: '5px', verticalAlign: 'middle' }}>
                <label>Contract Address (Base58):</label>
              </td>
              <td style={{ padding: '5px' }}>
                <input
                  type="text"
                  value={contractAddress}
                  onChange={() => {}}
                  placeholder="USDT contract address on Tron"
                  style={{ width: '100%' }}
                  disabled
                />
              </td>
            </tr>
            <tr>
              <td style={{ padding: '5px', verticalAlign: 'middle' }}>
                <label>Recipient Address (Base58):</label>
              </td>
              <td style={{ padding: '5px' }}>
                <input
                  type="text"
                  value={recipientAddress}
                  onChange={handleRecipientChange}
                  placeholder="e.g. TQGfKPHs3AwiBT44ibkCU64u1G4ttojUXU"
                  style={{ width: '100%' }}
                />
              </td>
            </tr>
            <tr>
              <td style={{ padding: '5px', verticalAlign: 'middle' }}>
                <label>Amount (decimal):</label>
              </td>
              <td style={{ padding: '5px' }}>
                <input
                  type="text"
                  value={amount}
                  onChange={handleAmountChange}
                  placeholder="1000000 (for 1 USDT if decimals=6)"
                  style={{ width: '100%' }}
                />
              </td>
            </tr>
            <tr>
              <td style={{ padding: '5px', verticalAlign: 'middle' }}>
                <label>Function Selector:</label>
              </td>
              <td style={{ padding: '5px' }}>
                <input
                  type="text"
                  value={functionSelector}
                  onChange={handleFunctionSelectorChange}
                  placeholder="e.g. transfer(address,uint256)"
                  style={{ width: '100%' }}
                />
              </td>
            </tr>
            {error && (
              <tr>
                <td colSpan={2} style={{ padding: '5px' }}>
                  <div style={{ color: 'red', marginTop: '10px' }}>{error}</div>
                </td>
              </tr>
            )}
            <tr>
              <td colSpan={2} style={{ padding: '5px', textAlign: 'right' }}>
                <button type="submit" disabled={loading} style={{ padding: '10px 20px', cursor: 'pointer' }}>
                  {loading ? 'Simulating...' : 'Simulate Transfer'}
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </form>

      {response && (
        <div style={{ marginTop: '20px' }}>
          <h3>Simulation Result</h3>

          {typeof response.energy_used !== 'undefined' && (
            <p><strong>Energy Used:</strong> {response.energy_used}</p>
          )}
          {typeof response.energy_penalty !== 'undefined' && (
            <p><strong>Energy Penalty:</strong> {response.energy_penalty}</p>
          )}
        </div>
      )}
    </div>
  );
};

export default UsdtTransferSimulation;
