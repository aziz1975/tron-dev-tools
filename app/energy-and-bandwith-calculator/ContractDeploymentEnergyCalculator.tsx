import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ethers } from 'ethers';
import { utils, TronWeb } from 'tronweb';
import Button from './components/Button';
import { 
  Card, 
  FormControl, 
  InputLabel, 
  MenuItem, 
  Select, 
  TextField, 
  Typography, 
  Table, 
  TableHead, 
  TableRow, 
  TableCell, 
  TableBody 
} from '@mui/material';

type NetworkType = 'Mainnet' | 'Nile';

type EstimationResult = {
  result: {
    result: boolean;
  };
  energy_used: number;
  constant_result: string[];
  transaction: {
    ret: Array<Record<string, never>>;
    visible: boolean;
    txID: string;
    contract_address: string;
    raw_data: {
      contract: Array<{
        parameter: {
          value: {
            owner_address: string;
            new_contract: {
              bytecode: string;
              consume_user_resource_percent: number;
              origin_address: string;
              origin_energy_limit: number;
            };
          };
          type_url: string;
        };
        type: string;
      }>;
      ref_block_bytes: string;
      ref_block_hash: string;
      expiration: number;
      timestamp: number;
    };
    raw_data_hex: string;
  };
};

interface Input {
  type: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  value: any;
}

interface ContractDeploymentEnergyCalculatorProps {
  bytecode: string;
  contractAbi: string;
}

const ContractDeploymentEnergyCalculator: React.FC<ContractDeploymentEnergyCalculatorProps> = ({bytecode, contractAbi }) => {
  const [network, setNetwork] = useState<NetworkType>('Mainnet');
  const [parameters, setParameters] = useState<Input[]>([]);
  
  const [result, setResult] = useState<EstimationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [trxPrice, setTrxPrice] = useState<number>(0);
  const [isCalculating, setIsCalculating] = useState(false);
  const [ownerAddress, setOwnerAddress] = useState<string>('');
  const [isTronLinkReady, setIsTronLinkReady] = useState(false);

  // Fetch TRX price from CoinGecko
  useEffect(() => {
    const fetchTrxPrice = async () => {
      try {
        const response = await axios.get(
          'https://api.coingecko.com/api/v3/simple/price?ids=tron&vs_currencies=usd'
        );
        setTrxPrice(response.data.tron.usd);
      } catch (err) {
        console.error('Error fetching TRX price:', err);
      }
    };

    fetchTrxPrice();
    // Refresh price every 5 minutes
    const interval = setInterval(fetchTrxPrice, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Display the values
  useEffect(() => {
    console.log('Owner Address:', ownerAddress);
    console.log('Bytecode:', bytecode);
    console.log('Contract ABI:', contractAbi);
  }, [ownerAddress, bytecode, contractAbi]);
  useEffect(() => {
    const initTronLink = async () => {
      try {
        // Wait for TronLink to be injected
        let tries = 0;
        const maxTries = 10;
        
        while (!window.tronLink && tries < maxTries) {
          await new Promise(resolve => setTimeout(resolve, 500));
          tries++;
        }

        if (!window.tronLink) {
          throw new Error('Please install TronLink');
        }

        // Request account access
        try {
          await window.tronLink.request({ method: 'tron_requestAccounts' });
        } catch (err) {
          console.error('User rejected connection', err);
          throw new Error('Please connect your TronLink wallet');
        }

        // Get the injected tronWeb instance
        const tronWebState = {
          installed: !!window.tronWeb,
          loggedIn: window.tronWeb && window.tronWeb.ready
        };

        if (!tronWebState.installed) {
          throw new Error('Please install TronLink');
        }

        if (!tronWebState.loggedIn) {
          throw new Error('Please log in to TronLink');
        }

        setIsTronLinkReady(true);
        
        // Update owner address from TronLink
        const address = window.tronWeb.defaultAddress.base58;
        if (address) {
          setOwnerAddress(address);
        }

      } catch (error) {
        console.error('TronLink initialization error:', error);
        setError(error instanceof Error ? error.message : 'Failed to initialize TronLink');
        setIsTronLinkReady(false);
      }
    };

    initTronLink();
  }, []);

  useEffect(() => {
    if (window.tronWeb) {
      // Listen for account changes
      window.tronWeb.on('addressChanged', (account: string) => {
        if (account) {
          setOwnerAddress(account);
        }
      });
    }
  }, []);
  // Calculate costs
  const calculateCosts = (energyUsed: number) => {
    const sunPerTrx = 1_000_000; // 1 TRX = 1,000,000 SUN
    const energyFeeInSun = 210; // Energy fee in SUN (adjusted to match TronStation)
    
    const costInSun = energyUsed * energyFeeInSun;
    const costInTrx = costInSun / sunPerTrx;
    const costInUsd = costInTrx * trxPrice;
    
    return {
      trx: costInTrx.toFixed(6),
      usd: costInUsd.toFixed(2)
    };
  };

  const networkEndpoints: { [key in NetworkType]: string } = {
    Mainnet: 'https://api.trongrid.io/wallet/triggerconstantcontract',
    Nile: 'https://nile.trongrid.io/wallet/triggerconstantcontract',
  };

  const formatValueForEncoding = (type: string, value: string) => {
    if (type === 'bool') {
      const lowerValue = value.toLowerCase();
      return lowerValue === 'true' || lowerValue === '1';
    }

    if (type.startsWith('bytes') && !value.startsWith('0x')) {
      return '0x' + value;
    }

    if (type === 'address') {
      const tronWeb = new TronWeb({
        fullHost: networkEndpoints[network],
      });
      return tronWeb.address.toHex(value).replace(/^(41)/, '0x');
    }

    return value;
  };

  function encodeParams(inputs: Input[]): string {
    if (inputs.length === 0) return '';
  
    const abiCoder = new ethers.utils.AbiCoder();
    const types: string[] = [];
    const values: unknown[] = [];

    try {
      for (const input of inputs) {
        const { type, value } = input;
        
        if (!type || !value) {
          throw new Error('Both type and value must be provided for all parameters');
        }

        // Format the value appropriately for the type
        const formattedValue = formatValueForEncoding(type, value);
        
        types.push(type);
        values.push(formattedValue);
      }

      return abiCoder.encode(types, values).replace(/^(0x)/, '');
    } catch (ex) {
      const errorMessage = ex instanceof Error ? ex.message : 'Unknown error during parameter encoding';
      console.error('Error encoding parameters:', errorMessage);
      throw new Error(errorMessage);
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResult(null);
    setIsCalculating(true);

    console.log('Parameters before submission:', parameters);

    try {
      //use parameters from state
      const encodedParameters = encodeParams(parameters);
      // Combine bytecode with encoded constructor parameters if they exist
      let finalBytecode = bytecode;
      if (encodedParameters) {
        finalBytecode = bytecode + encodedParameters;
      }

      console.log('Submitting form...', {
        ownerAddress,
        network,
        bytecode: finalBytecode,
        parameters,
        encodedParameters,
      });

      const response = await axios.post<EstimationResult>(
        networkEndpoints[network],
        {
          owner_address: ownerAddress,
          contract_address: null,
          function_selector: null,
          parameter: '',
          fee_limit: 1000000000,
          call_value: 0,
          data: finalBytecode,
          visible: true,
        }
      );

      console.log('Response:', response.data);

      if (response.data.result?.result === false || response.data.energy_used === 0) {
        throw new Error('Contract deployment estimation failed. Please check your parameters.');
      }
      
      setResult(response.data);
    } catch (err) {
      console.error('Error details:', err);
      setError(err instanceof Error ? err.message : 'Estimation failed. Please check your inputs.');
    } finally {
      setIsCalculating(false);
    }
  };

  return (
    <div className="bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <Typography variant="h4" className="text-center mb-8 text-gray-700">Contract Deployment Energy Calculator</Typography>
        <Card className="p-6 mb-4">
          {isTronLinkReady ? (
            <Typography variant="body1" className="text-lg text-gray-700 text-center">You are connected to TronLink.</Typography>
          ) : (
            <Typography variant="body1" className="text-lg text-gray-700 text-center">Please connect to TronLink to use this calculator.</Typography>
          )}
        </Card>
        <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded-lg shadow-lg border border-red-100">
          <div className="space-y-4 flex flex-col space-y-2">
            <FormControl variant="outlined" fullWidth className="mb-4">
              <InputLabel>Network Type</InputLabel>
              <Select
                value={network}
                onChange={(e) => setNetwork(e.target.value as NetworkType)}
                label="Network Type"
              >
                <MenuItem value="Mainnet">Mainnet</MenuItem>
                <MenuItem value="Nile">Nile (Testnet)</MenuItem>
              </Select>
            </FormControl>

            <TextField
              label="Owner Address"
              value={ownerAddress}
              disabled
              className="mb-4"
              placeholder="Enter owner address..."
            />

            <TextField
              label="Bytecode"
              value={bytecode}
              disabled
              multiline
              rows={4}
              className="mb-4"
              placeholder="Enter bytecode..."
            />

            <TextField
              label="Contract ABI"
              value={contractAbi}
              disabled
              multiline
              rows={4}
              onChange={(e) => {
                try {
                  const abi = JSON.parse(e.target.value);
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  const constructor = abi.find((item: any) => item.type === 'constructor');
                  if (constructor && constructor.inputs) {
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    setParameters(constructor.inputs.map((input: any) => ({ type: input.type, value: input.name })));
                  } else {
                    setParameters([]);
                  }
                } catch (e) {
                  console.error('ABI parsing error:', e);
                  setParameters([]);
                }
              }}
              className="mb-4"
              placeholder="Enter contract ABI..."
              required
            />
          </div>

          {contractAbi && (() => {
            try {
              const abi = JSON.parse(contractAbi);
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const constructor = abi.find((item: any) => item.type === 'constructor');
              if (constructor && constructor.inputs && constructor.inputs.length > 0) {
                return (
                  <div className="space-y-4">
                    <Typography variant="body1">Constructor Parameters</Typography>
                  {/*  eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                    {constructor.inputs.map((input: any, index: number) => (
                      <div key={index} className="flex flex-col space-y-2">
                        <Typography variant="body2">{input.name} ({input.type})</Typography>
                        <TextField
                          type="text"
                          value={parameters[index]?.value || ''}
                          onChange={(e) => {
                            const newParameters = [...parameters];
                            newParameters[index] = { type: input.type, value: e.target.value };
                            setParameters(newParameters);
                          }}
                          
                          placeholder={`Enter ${input.type} value`}
                          required
                        />
                      </div>
                    ))}
                  </div>
                );
              }
            } catch (e) {
              console.error('ABI parsing error:', e);
              return null;
            }
            return null;
          })()}
          <Button type="submit" variant="primary" color="primary" disabled={isCalculating}>
            {isCalculating ? 'Calculating...' : 'Calculate Energy'}
          </Button>
        </form>

        {error && (
          <Card className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <Typography variant="body2" color="error">{error}</Typography>
          </Card>
        )}

        {result && (
          <div>
            
            <Table sx={{ borderRadius: '10px', marginTop: '20px', overflow: 'hidden', boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)' }}>
              <TableHead>
                <TableRow sx={{ background: '#f8ece8' }}>
                  <TableCell sx={{ fontWeight: 'bold', border: 'none' }}>Description</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', border: 'none' }}>Value</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                <TableRow>
                  <TableCell>Energy Required</TableCell>
                  <TableCell>{result.energy_used}</TableCell>
                </TableRow>
                {result.energy_used > 0 && (
                  <>
                    <TableRow>
                      <TableCell>Cost in TRX</TableCell>
                      <TableCell>{calculateCosts(result.energy_used).trx} TRX</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Cost in USD</TableCell>
                      <TableCell>${calculateCosts(result.energy_used).usd}</TableCell>
                    </TableRow>
                  </>
                )}
                {result.transaction?.contract_address && (
                  <TableRow>
                    <TableCell>Contract Address</TableCell>
                    <TableCell>{utils.address.fromHex(result.transaction.contract_address)}</TableCell>
                  </TableRow>
                )}
                <TableRow>
                  <TableCell>Status</TableCell>
                  <TableCell><span className={`px-3 py-1 rounded-full text-sm ${result.result.result ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{result.result.result ? 'Success' : 'Failed'}</span></TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
};

export default ContractDeploymentEnergyCalculator;
