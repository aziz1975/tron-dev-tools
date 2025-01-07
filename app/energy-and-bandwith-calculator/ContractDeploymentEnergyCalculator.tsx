import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ethers } from 'ethers';
import { utils, TronWeb } from 'tronweb';
import Button from './components/Button';

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
  const [parameterErrors, setParameterErrors] = useState<(string | null)[]>([]);
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
        <h1 className="text-3xl font-bold text-gray-900 text-center mb-8">
          Contract Deployment Energy Calculator
        </h1>
        {isTronLinkReady ? (
          <p className="text-lg text-gray-700 text-center mb-4">
            You are connected to TronLink.
          </p>
        ) : (
          <p className="text-lg text-gray-700 text-center mb-4">
            Please connect to TronLink to use this calculator.
          </p>
        )}
        <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded-lg shadow-lg border border-red-100">
          <div className="space-y-4">
            {/* Network Selection */}
            <label className="block">
              <span className="text-gray-700 font-medium">Network Type</span>
              <select
                value={network}
                onChange={(e) => setNetwork(e.target.value as NetworkType)}
                className="mt-1 block w-full rounded-lg border-red-300 shadow-sm focus:border-red-500 focus:ring focus:ring-red-200 focus:ring-opacity-50 transition-colors text-black p-2"
              >
                <option value="Mainnet">Mainnet</option>
                <option value="Nile">Nile (Testnet)</option>
              </select>
            </label>

            {/* Owner Address */}
            <label className="block">
              <span className="text-gray-700 font-medium">Owner Address</span>
              <input
                type="text"
                value={ownerAddress}
                disabled
                className="mt-1 block w-full rounded-lg border-red-300 shadow-sm focus:border-red-500 focus:ring focus:ring-red-200 focus:ring-opacity-50 transition-colors text-black p-2"
                placeholder="Enter owner address..."
              />
            </label>

            {/* Bytecode */}
            <label className="block">
              <span className="text-gray-700 font-medium">Bytecode</span>
              <textarea
                value={bytecode}
                disabled
                rows={4}
                className="mt-1 block w-full rounded-lg border-red-500 shadow-sm focus:border-red-500 ring focus:ring-red-200 focus:ring-opacity-50 font-mono text-sm transition-colors text-black p-2"
                placeholder="Enter bytecode..."
              />
            </label>
            <div>
              <label className="block text-sm font-medium text-black mb-1">Contract ABI</label>
              <textarea
                value={contractAbi}
                disabled
                onChange={(e) => {
                  try {
                    const abi = JSON.parse(typeof e.target.value === 'string' ? e.target.value : JSON.stringify(e.target.value));
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const constructor = abi.find((item: any) => item.type === 'constructor');
                    if (constructor && constructor.inputs) {
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      setParameters(constructor.inputs.map((input: any) => ({ type: input.type, value: input.name }))); // Set default values for parameters
                    } else {
                      setParameters([]);
                    }
                  } catch (e) {
                    console.error('ABI parsing error:', e);
                    setParameters([]);
                  }
                  setParameterErrors([]);
                }}
                rows={4}
                className="block w-full text-black rounded-md border border-gray-300 shadow-sm py-2 px-3 font-mono text-sm focus:outline-none focus:ring-red-500 focus:border-red-500"
                placeholder="Enter contract ABI..."
                required
              />
            </div>

            {contractAbi && (() => {
              try {
                const abi = JSON.parse(typeof contractAbi === 'string' ? contractAbi : JSON.stringify(contractAbi));
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const constructor = abi.find((item: any) => item.type === 'constructor');
                if (constructor && constructor.inputs && constructor.inputs.length > 0) {
                  return (
                    <div className="space-y-4">
                      <label className="block text-sm font-medium text-black">Constructor Parameters</label>
                      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                      {constructor.inputs.map((input: any, index: number) => (
                        <div key={index} className="flex flex-col space-y-2">
                          <div className="flex items-center space-x-2">
                            <span className="text-sm font-medium text-gray-500">{input.name} ({input.type})</span>
                            {parameterErrors[index] && (
                              <span className="text-xs text-red-500">{parameterErrors[index]}</span>
                            )}
                          </div>
                          <input
                            type="text"
                            value={parameters[index]?.value || ''}
                            onChange={(e) => {
                              const newParameters = [...parameters];
                              newParameters[index] = {
                                type: input.type,
                                value: e.target.value
                              };
                              setParameters(newParameters);
                
                            }}
                            className="block w-full text-black rounded-md border border-gray-300 shadow-sm py-2 px-3 font-mono text-sm focus:outline-none focus:ring-red-500 focus:border-red-500"
                            placeholder={`Enter ${input.type} value`}
                            required
                          />
                        </div>
                      ))}
                    </div>
                  );
                }
              } catch (e) {
                // If ABI parsing fails, don't show constructor parameters
                console.error('ABI parsing error:', e);
                return null;
              }
              return null;
            })()}

          </div>

          <Button
            type="submit"
            isLoading={isCalculating}
            loadingText="Calculating..."
          >
            Calculate Energy
          </Button>
        </form>



        {/* Error Message */}
        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        {/* Result Display */}
        {result && (
          <div className="mt-6 p-6 bg-white rounded-lg shadow-lg border border-red-100">
            <h2 className="text-xl font-semibold mb-4 text-gray-800">Estimation Results</h2>
            <div className="space-y-3">
              <div className="flex items-center">
                <span className="text-gray-600 w-32">Energy Required:</span>
                <span className="font-mono text-gray-800">{result.energy_used}</span>
              </div>
              {result.energy_used > 0 && (
                <>
                  <div className="flex items-center">
                    <span className="text-gray-600 w-32">Cost in TRX:</span>
                    <span className="font-mono text-gray-800">{calculateCosts(result.energy_used).trx} TRX</span>
                  </div>
                  <div className="flex items-center">
                    <span className="text-gray-600 w-32">Cost in USD:</span>
                    <span className="font-mono text-gray-800">${calculateCosts(result.energy_used).usd}</span>
                  </div>
                </>
              )}
              {result.transaction?.contract_address && (
                <div className="flex items-center">
                  <span className="text-gray-600 w-32">Contract Address:</span>
                  <span className="font-mono text-gray-800">{utils.address.fromHex(result.transaction.contract_address)}</span>
                </div>
              )}
              <div className="flex items-center">
                <span className="text-gray-600 w-32">Status:</span>
                <span className={`px-3 py-1 rounded-full text-sm ${result.result.result ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                  {result.result.result ? 'Success' : 'Failed'}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ContractDeploymentEnergyCalculator;
