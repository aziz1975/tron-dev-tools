import React, { useState, ChangeEvent, FormEvent } from 'react';
import { TronWeb } from 'tronweb';
import Button from '../energy-and-bandwith-calculator/components/Button';
import { Container, Typography, TextField, Grid, Paper, Card, CardContent, Box, MenuItem } from '@mui/material';

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

  const handleNetworkChange = (e: ChangeEvent<HTMLInputElement>) => {
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
    <Container maxWidth="sm" style={{ marginTop: '20px' }}>
      <Paper style={{ padding: '20px', backgroundColor: 'white' }}>
        <Typography variant="h4" style={{ color: "#333", textAlign: "center", marginBottom: "20px", fontWeight: "bold" }}>
          USDT Transfer Simulation
        </Typography>
        <Typography variant="body1" style={{ textAlign: "center", marginBottom: "20px" }}>
          Use this tool to simulate the energy costs of a USDT transfer on the selected Tron network.
        </Typography>
        <form onSubmit={handleSubmit}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Network"
                select
                value={network}
                onChange={handleNetworkChange}
                fullWidth
                variant="outlined"
              >
                <MenuItem value="Nile">Nile (Testnet)</MenuItem>
                <MenuItem value="Shasta">Shasta (Testnet)</MenuItem>
                <MenuItem value="Mainnet">Mainnet</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Owner / Sender Address (Base58)"
                value={ownerAddress}
                onChange={handleOwnerChange}
                fullWidth
                variant="outlined"
                placeholder="Your Tron address (e.g. TVD...)"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Contract Address (Base58)"
                value={contractAddress}
                onChange={() => {}}
                fullWidth
                variant="outlined"
                placeholder="USDT contract address on Tron"
                disabled
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Recipient Address (Base58)"
                value={recipientAddress}
                onChange={handleRecipientChange}
                fullWidth
                variant="outlined"
                placeholder="e.g. TQGfKPHs3AwiBT44ibkCU64u1G4ttojUXU"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Amount (decimal)"
                value={amount}
                onChange={handleAmountChange}
                fullWidth
                variant="outlined"
                placeholder="1000000 (for 1 USDT if decimals=6)"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Function Selector"
                value={functionSelector}
                onChange={handleFunctionSelectorChange}
                fullWidth
                variant="outlined"
                placeholder="e.g. transfer(address,uint256)"
              />
            </Grid>
            {error && (
              <Grid item xs={12}>
                <Typography style={{ color: 'red', marginTop: '10px' }}>{error}</Typography>
              </Grid>
            )}
            <Grid item xs={12}>
              <Button type="submit" disabled={loading} variant="primary" color="primary" fullWidth>
                {loading ? 'Simulating...' : 'Simulate Transfer'}
              </Button>
            </Grid>
          </Grid>
        </form>
        {response && (
          <Box sx={{ mt: 2 }}>
            <Card sx={{ padding: 2 }}>
              <CardContent>
                <Typography variant="h6">Simulation Result</Typography>
                <Grid container spacing={2} sx={{ mt: 1 }}>
                  {typeof response.energy_used !== 'undefined' && (
                    <Grid item xs={12} sm={6}>
                      <Typography><strong>Energy Used:</strong> {response.energy_used}</Typography>
                    </Grid>
                  )}
                  {typeof response.energy_penalty !== 'undefined' && (
                    <Grid item xs={12} sm={6}>
                      <Typography><strong>Energy Penalty:</strong> {response.energy_penalty}</Typography>
                    </Grid>
                  )}
                </Grid>
              </CardContent>
            </Card>
          </Box>
        )}
      </Paper>
    </Container>
  );
};

export default UsdtTransferSimulation;
