import React, { useState } from 'react';
import { Container, Typography, TextField, Grid, Paper, Table, TableBody, TableCell, TableHead, TableRow, Alert, MenuItem } from '@mui/material';
import Button from '../energy-and-bandwith-calculator/components/Button';
import Image from 'next/image';

/** 
 * Helper function to validate if a TRC20 address is a valid Base58 Tron address.
 * This is a simple check:
 * - Must start with "T"
 * - Must be 34 characters long
 * - Must pass a basic Base58 format check (excluding 0, O, I, l, etc.)
 */
function isValidBase58Address(address: string): boolean {
  if (!address) return false;
  if (!address.startsWith('T')) return false;
  if (address.length !== 34) return false;

  // Basic Base58 (with Tron typical pattern) check
  const base58Regex = /^[T][1-9A-HJ-NP-Za-km-z]{33}$/;
  return base58Regex.test(address);
}

const USDT_BEST_ENERGY_COST = 64285;
const USDT_AVG_ENERGY_COST = 96428;
const USDT_WORST_ENERGY_COST = 128570;

const TRC20_BEST_ENERGY_COST = 13000;
const TRC20_AVG_ENERGY_COST = 20500;
const TRC20_WORST_ENERGY_COST = 28000;
const INFO_ICON_PATH = '/images/info.png';

type TokenType = 'USDT' | 'TRC20';

// --------------- API Response Interfaces ---------------
interface AccountResourceResponse {
  TotalEnergyWeight: number;
  [key: string]: unknown; // to allow other fields from the API
}

interface ChainParameter {
  key: string;
  value: number;
}

interface ChainParametersResponse {
  chainParameter: ChainParameter[];
  [key: string]: unknown; // to allow other fields from the API
}
// ------------------------------------------------------

/**
 * We'll store the calculation results in a single state variable ("result")
 * so that changing the Token Type from the dropdown doesn't immediately update
 * the displayed output. The output only updates upon clicking "Calculate".
 */
interface CalculationResult {
  energyObtained: number;
  bestCase: number;
  avgCase: number;
  worstCase: number;
  tokenType: TokenType;
}

const UsdtTrc20EnergyCalculator = () => {
  // Hardcode the contract address instead of taking it from user input:
  const contractAddress = "TZ4UXDV5ZhNW7fb2AMSbgfAEZ7hWsnYS2g";

  const [stakedTrx, setStakedTrx] = useState<string>('');
  const [tokenType, setTokenType] = useState<TokenType>('USDT');
  const [result, setResult] = useState<CalculationResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleCalculate = async () => {
    try {
      setErrorMessage(null); // Clear any previous error message

      // Parse staked TRX as a number
      const staked = parseFloat(stakedTrx);
      if (isNaN(staked) || staked <= 0) {
        setErrorMessage('Please enter a valid number for Staked TRX.');
        return;
      }

      // (Optional) Validate the hardcoded contract address, if desired:
      if (!isValidBase58Address(contractAddress)) {
        setErrorMessage('Hardcoded TRC20 Contract Address is invalid.');
        return;
      }

      // 1) Fetch from getaccountresource to get TotalEnergyWeight
      const resourceResponse = await fetch('https://api.trongrid.io/wallet/getaccountresource', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          address: contractAddress,
          visible: true,
        }),
      });

      if (!resourceResponse.ok) {
        throw new Error('Failed to fetch getaccountresource');
      }

      const resourceData: AccountResourceResponse = await resourceResponse.json();
      const totalEnergyWeight: number = resourceData.TotalEnergyWeight;
      console.log('totalEnergyWeight: ' + totalEnergyWeight);

      // 2) Fetch from getchainparameters to get getTotalEnergyCurrentLimit
      const chainParamResponse = await fetch('https://api.trongrid.io/wallet/getchainparameters', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });

      if (!chainParamResponse.ok) {
        throw new Error('Failed to fetch getchainparameters');
      }

      const chainParamData: ChainParametersResponse = await chainParamResponse.json();
      const chainParam = chainParamData.chainParameter.find(
        (p) => p.key === 'getTotalEnergyCurrentLimit'
      );
      if (!chainParam) {
        throw new Error('getTotalEnergyCurrentLimit not found in chain parameters');
      }

      const getTotalEnergyCurrentLimit = chainParam.value;

      // 3) Calculate energy obtained:
      const energyObtained = (staked / totalEnergyWeight) * getTotalEnergyCurrentLimit;

      // 4) Depending on token type, compute best/avg/worst
      let bestCase, avgCase, worstCase;
      if (tokenType === 'USDT') {
        bestCase = energyObtained / USDT_BEST_ENERGY_COST;
        avgCase = energyObtained / USDT_AVG_ENERGY_COST;
        worstCase = energyObtained / USDT_WORST_ENERGY_COST;
      } else {
        bestCase = energyObtained / TRC20_BEST_ENERGY_COST;
        avgCase = energyObtained / TRC20_AVG_ENERGY_COST;
        worstCase = energyObtained / TRC20_WORST_ENERGY_COST;
      }

      // Update final result object
      setResult({
        energyObtained,
        bestCase,
        avgCase,
        worstCase,
        tokenType,
      });
    } catch (error: unknown) {
      console.error('Error in calculation:', error);
      if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage('An unknown error occurred during calculation.');
      }
      setResult(null); // Clear previous results on error
      setErrorMessage(''); // Clear any previous error message
    }
  };

  return (
    <Container maxWidth="md" style={{ padding: '2rem', backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)' }}>
      <Typography variant="h4" style={{ color: '#333', textAlign: 'center', marginBottom: '20px', fontWeight: 'bold' }}>
        USDT Transfers per TRX staked
      </Typography>

      {/* Inputs */}
      <Paper elevation={3} style={{ padding: '20px' }}>
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <TextField
              label="How much TRX is staked"
              type="text"
              value={stakedTrx}
              onChange={(e) => setStakedTrx(e.target.value)}
              placeholder="Enter staked TRX"
              fullWidth
              variant="outlined"
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              label="Token Type"
              select
              value={tokenType}
              onChange={(e) => setTokenType(e.target.value as TokenType)}
              fullWidth
              variant="outlined"
            >
              <MenuItem value="USDT">USDT</MenuItem>
              <MenuItem value="TRC20">TRC20</MenuItem>
            </TextField>
          </Grid>
          <Grid item xs={12}>
            <Button onClick={handleCalculate} variant="primary" color="primary" fullWidth>
              Calculate
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Display error message in red if present */}
      {errorMessage && (
        <Alert severity="error" style={{ marginTop: '20px' }}>
          {errorMessage}
        </Alert>
      )}

      {/* Output table - only show if we have a result */}
      {result && !errorMessage && (
        <Table className='mt-4 rounded-md p-4' style={{ marginTop: '1rem', borderRadius: '10px', overflow: 'hidden', boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)' }}>
          <TableHead style={{ backgroundColor: 'rgba(249,235,232,255)', color: 'white' }}>
            <TableRow>
              <TableCell style={{ fontWeight: 'bold', fontSize: '1.2rem' }}>Metric</TableCell>
              <TableCell style={{ fontWeight: 'bold', fontSize: '1.2rem' }}>Value</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            <TableRow>
              <TableCell>Energy Obtained</TableCell>
              <TableCell title="This is the total energy you obtained after staking." style={{ display: 'flex', alignItems: 'center' }}>
                {Math.round(result.energyObtained)}{' '}
                <Image
                  src={INFO_ICON_PATH}
                  alt="info"
                  width={16}
                  height={16}
                  style={{ marginLeft: '5px', width: '16px', height: '16px' }}
                />
              </TableCell>
            </TableRow>
            {result.tokenType === 'USDT' ? (
              <> {/* USDT specific rows */}
                <TableRow>
                  <TableCell>Number of USDT transactions (Best case)</TableCell>
                  <TableCell title="This is the estimated number of USDT transactions you can perform under the best case scenario." style={{ display: 'flex', alignItems: 'center' }}>
                    {Math.round(result.bestCase)}{' '}
                    <Image
                      src={INFO_ICON_PATH}
                      alt="info"
                      width={16}
                      height={16}
                      style={{ marginLeft: '5px', width: '16px', height: '16px' }}
                    />
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Number of USDT transactions (Worst case)</TableCell>
                  <TableCell title="This is the estimated number of USDT transactions you can perform under the worst case scenario." style={{ display: 'flex', alignItems: 'center' }}>
                    {Math.round(result.worstCase)}{' '}
                    <Image
                      src={INFO_ICON_PATH}
                      alt="info"
                      width={16}
                      height={16}
                      style={{ marginLeft: '5px', width: '16px', height: '16px' }}
                    />
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Number of USDT transactions (Average case)</TableCell>
                  <TableCell title="This is the estimated number of USDT transactions you can perform on average." style={{ display: 'flex', alignItems: 'center' }}>
                    {Math.round(result.avgCase)}{' '}
                    <Image
                      src={INFO_ICON_PATH}
                      alt="info"
                      width={16}
                      height={16}
                      style={{ marginLeft: '5px', width: '16px', height: '16px' }}
                    />
                  </TableCell>
                </TableRow>
              </>
            ) : (
              <> {/* TRC20 specific rows */}
                <TableRow>
                  <TableCell>Number of TRC20 transactions (Best case)</TableCell>
                  <TableCell title="This is the estimated number of TRC20 transactions you can perform under the best case scenario." style={{ display: 'flex', alignItems: 'center' }}>
                    {Math.round(result.bestCase)}{' '}
                    <Image
                      src={INFO_ICON_PATH}
                      alt="info"
                      width={16}
                      height={16}
                      style={{ marginLeft: '5px', width: '16px', height: '16px' }}
                    />
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Number of TRC20 transactions (Worst case)</TableCell>
                  <TableCell title="This is the estimated number of TRC20 transactions you can perform under the worst case scenario." style={{ display: 'flex', alignItems: 'center' }}>
                    {Math.round(result.worstCase)}{' '}
                    <Image
                      src={INFO_ICON_PATH}
                      alt="info"
                      width={16}
                      height={16}
                      style={{ marginLeft: '5px', width: '16px', height: '16px' }}
                    />
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Number of TRC20 transactions (Average case)</TableCell>
                  <TableCell title="This is the estimated number of TRC20 transactions you can perform on average." style={{ display: 'flex', alignItems: 'center' }}>
                    {Math.round(result.avgCase)}{' '}
                    <Image
                      src={INFO_ICON_PATH}
                      alt="info"
                      width={16}
                      height={16}
                      style={{ marginLeft: '5px', width: '16px', height: '16px' }}
                    />
                  </TableCell>
                </TableRow>
              </>
            )}
          </TableBody>
        </Table>
      )}
    </Container>
  );
};

export default UsdtTrc20EnergyCalculator;
