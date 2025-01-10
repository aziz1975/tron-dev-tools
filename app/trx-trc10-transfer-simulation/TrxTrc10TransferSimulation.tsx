import { useState } from 'react';
import { NextPage } from 'next';
import { TronWeb } from 'tronweb';
import Button from '../energy-and-bandwith-calculator/components/Button';
import { Container, Typography, TextField, Grid, Paper, Box, Alert, MenuItem, Table, TableHead, TableRow, TableCell, TableBody } from '@mui/material';

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
    <Container maxWidth="sm" style={{ fontFamily: 'sans-serif', backgroundColor: 'white', padding: '20px', borderRadius: '10px' }}>
      <Typography variant="h4" style={{ color: "#333", textAlign: "center", marginBottom: "20px", fontWeight: "bold" }}>
        Simulate TRX/TRC10 Transfer Bandwidth Cost
      </Typography>
      <Paper elevation={3} style={{ padding: '20px' }}>
        <form onSubmit={handleSubmit} style={{ marginTop: '20px' }}>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                label="Network"
                select
                value={network}
                onChange={(e) => setNetwork(e.target.value as NetworkType)}
                fullWidth
                variant="outlined"
              >
                <MenuItem value="Nile">Nile (Testnet)</MenuItem>
                <MenuItem value="Shasta">Shasta (Testnet)</MenuItem>
                <MenuItem value="Mainnet">Mainnet</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Transfer Type"
                select
                value={transferType}
                onChange={(e) => setTransferType(e.target.value as TransferType)}
                fullWidth
                variant="outlined"
              >
                <MenuItem value="TRX">TRX</MenuItem>
                <MenuItem value="TRC10">TRC10</MenuItem>
              </TextField>
            </Grid>
            {transferType === 'TRC10' && (
              <Grid item xs={12}>
                <TextField
                  label="Token ID"
                  value={tokenID}
                  onChange={(e) => setTokenID(e.target.value)}
                  fullWidth
                  variant="outlined"
                  required
                />
              </Grid>
            )}
            <Grid item xs={12}>
              <TextField
                label="From Address"
                value={fromAddress}
                onChange={(e) => setFromAddress(e.target.value)}
                fullWidth
                variant="outlined"
                placeholder="e.g. Txxxxxxxxxxxxxxxxxxxx"
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="To Address"
                value={toAddress}
                onChange={(e) => setToAddress(e.target.value)}
                fullWidth
                variant="outlined"
                placeholder="e.g. Tyyyyyyyyyyyyyyyyyyyyy"
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Amount"
                type="number"
                value={amount}
                onChange={(e) => setAmount(parseFloat(e.target.value))}
                fullWidth
                variant="outlined"
                required
              />
            </Grid>
            <Grid item xs={12}>
              <Button type="submit" variant="primary" color="primary" fullWidth>
                Simulate
              </Button>
            </Grid>
          </Grid>
        </form>
        {errorMessage && (
          <Alert severity="error" className="mt-4 rounded-md bg-red-50 p-4">
            <strong>Error:</strong> {errorMessage}
          </Alert>
        )}
        {estimatedBandwidth !== null && (
          <Box className="mt-4 rounded-md bg-green-50 p-4">
            {/* <Typography variant="h6" className="mb-2 font-semibold">Results:</Typography> */}
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell><strong>Description</strong></TableCell>
                  <TableCell><strong>Value</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                <TableRow>
                  <TableCell>Estimated Bandwidth</TableCell>
                  <TableCell>{estimatedBandwidth} bytes</TableCell>
                </TableRow>
                {trxCost !== null && (
                  <TableRow>
                    <TableCell>Equivalent TRX Cost (if no free bandwidth)</TableCell>
                    <TableCell>{trxCost.toFixed(6)} TRX</TableCell>
                  </TableRow>
                )}
                {sunCost !== null && (
                  <TableRow>
                    <TableCell>Equivalent SUN Cost</TableCell>
                    <TableCell>{sunCost.toFixed(0)} SUN</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Box>
        )}
      </Paper>
    </Container>
  );
};

export default TrxTrc10TransferSimulation;
