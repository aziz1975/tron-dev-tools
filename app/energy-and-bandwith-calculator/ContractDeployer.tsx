"use client";

import React, { useState, useEffect } from 'react';
import Button from './components/Button';
import { ethers } from 'ethers';

type NetworkType = 'Mainnet' | 'Nile';

interface DeploymentResult {
  address?: string;
  txId?: string;
  error?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  transaction?: any;
}

interface Input {
  type: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  value: any;
}

declare global {
    interface Window {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    tronWeb: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    tronLink: any;
  }
}

interface ContractDeployerProps {
    bytecode: string;
    contractAbi: string;
}

const ContractDeployer: React.FC<ContractDeployerProps> = ({ bytecode, contractAbi }) => {
  const [isDeploying, setIsDeploying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<DeploymentResult | null>(null);
  const [network, setNetwork] = useState<NetworkType>('Nile');
  const [ownerAddress, setOwnerAddress] = useState('');
  const [contractName, setContractName] = useState('');
  const [originEnergyLimit, setOriginEnergyLimit] = useState('10000000');
  const [feeLimit, setFeeLimit] = useState('100000000');
  const [consumeUserResourcePercent, setConsumeUserResourcePercent] = useState('100');
  const [parameters, setParameters] = useState<Input[]>([]);
  const [parameterErrors, setParameterErrors] = useState<(string | null)[]>([]);
  const [isTronLinkReady, setIsTronLinkReady] = useState(false);

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

  const formatValueForEncoding = (type: string, value: string) => {
    if (type === 'bool') {
      const lowerValue = value.toLowerCase();
      return lowerValue === 'true' || lowerValue === '1';
    }

    if (type.startsWith('bytes') && !value.startsWith('0x')) {
      return '0x' + value;
    }

    if (type === 'address') {
      return window.tronWeb.address.toHex(value).replace(/^(41)/, '0x');
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

  const handleDeploy = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsDeploying(true);
    setError(null);
    setResult(null);

    try {
      if (!window.tronWeb || !window.tronWeb.ready) {
        throw new Error('Please connect TronLink wallet first');
      }

      if (!contractAbi || !bytecode) {
        throw new Error('Contract ABI and bytecode are required');
      }

      // Intelligent ABI parsing
      let abi;
      try {
        if (typeof contractAbi === 'string') {
          // First try parsing it directly
          try {
            abi = JSON.parse(contractAbi);
          } catch {
            // If direct parsing fails, try handling escaped quotes
            const unescapedAbi = contractAbi
              .replace(/\\"/g, '"')  // Replace \" with "
              .replace(/^"|"$/g, '') // Remove surrounding quotes if present
              .trim();
            
            // If it doesn't look like JSON array, wrap it
            if (!unescapedAbi.startsWith('[')) {
              abi = JSON.parse(`[${unescapedAbi}]`);
            } else {
              abi = JSON.parse(unescapedAbi);
            }
          }
        } else {
          // If it's not a string, use it as is (assuming it's already parsed)
          abi = contractAbi;
        }

        // Validate ABI structure
        if (!Array.isArray(abi)) {
          throw new Error('ABI must be an array of function descriptions');
        }

        // Find constructor in ABI
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const constructor = abi.find((item: any) => item.type === 'constructor');
        if (constructor && constructor.inputs) {
          // Validate constructor parameters
          if (parameters.length !== constructor.inputs.length) {
            throw new Error(`Constructor requires ${constructor.inputs.length} parameters, but ${parameters.length} were provided`);
          }

          // Log parameters before deployment
          console.log('Constructor parameters:', parameters);

          // Validate parameter types
          const newErrors = parameters.map((param, index) => {
            try {
              const input = constructor.inputs[index];
              if (param.type !== input.type) {
                return `Parameter ${index + 1} should be of type ${input.type}`;
              }
              return null;
            } catch (e) {
              console.error(`Error validating parameter ${index + 1}:`, e);
              return `Invalid parameter ${index + 1}`;
            }
          });

          if (newErrors.some(error => error !== null)) {
            setParameterErrors(newErrors);
            throw new Error('Invalid constructor parameters');
          }
        }

      } catch (e) {
        console.error('ABI parsing error:', e);
        throw new Error('Invalid ABI format. Please check your ABI structure.');
      }

      // Clean up bytecode (remove 0x if present)
      const cleanBytecode = bytecode.startsWith('0x') ? bytecode.slice(2) : bytecode;

      // Encode constructor parameters if they exist
      let encodedParameters = '';
      if (parameters.length > 0) {
        try {
          encodedParameters = encodeParams(parameters);
        } catch (e) {
          console.error('Parameter encoding error:', e);
          throw new Error('Failed to encode constructor parameters');
        }
      }

      // Combine bytecode with encoded parameters
      const finalBytecode = cleanBytecode + encodedParameters;

      // Log final bytecode before deployment
      console.log('Final bytecode:', finalBytecode);

      console.log('Creating contract deployment transaction:', {
        abi,
        bytecode: finalBytecode,
        feeLimit: parseInt(feeLimit, 10),
        callValue: 0,
        userFeePercentage: parseInt(consumeUserResourcePercent, 10),
        originEnergyLimit: parseInt(originEnergyLimit, 10),
        name: contractName,
        parameters,
        encodedParameters
      });

      // Create the contract deployment transaction using TronLink's tronWeb instance
      const transaction = await window.tronWeb.transactionBuilder.createSmartContract({
        abi,
        bytecode: finalBytecode,
        feeLimit: parseInt(feeLimit, 10),
        callValue: 0,
        userFeePercentage: parseInt(consumeUserResourcePercent, 10),
        originEnergyLimit: parseInt(originEnergyLimit, 10),
        parameters: parameters.map((param: Input) => param.value),
      }, window.tronWeb.defaultAddress.hex);

      console.log('Transaction created:', transaction);

      // Sign and send the transaction using TronLink
      const signedTx = await window.tronWeb.trx.sign(transaction);
      console.log('Transaction signed:', signedTx);

      const receipt = await window.tronWeb.trx.sendRawTransaction(signedTx);
      console.log('Deployment result:', receipt);

      setResult({
        address: receipt.contract_address,
        txId: receipt.txid || receipt.transaction.txID,
        transaction: receipt.transaction
      });

    } catch (err) {
      console.error('Deployment error:', err);
      setError(err instanceof Error ? err.message : 'Contract deployment failed');
    } finally {
      setIsDeploying(false);
    }
  };

  return (
    <div className="bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">Deploy Smart Contract</h2>
        <div className="bg-white shadow-lg rounded-lg px-8 py-6 border border-gray-200">
          
          <form onSubmit={handleDeploy} className="space-y-4">
            {!isTronLinkReady && (
              <div className="text-red-500 bg-red-100 p-3 rounded">
                Please install and connect TronLink wallet to deploy contracts
              </div>
            )}
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-black mb-1">Network</label>
                <select
                  value={network}
                  onChange={(e) => setNetwork(e.target.value as NetworkType)}
                  className="block w-full text-black rounded-md border border-gray-300 shadow-sm py-2 px-3 focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm"
                  required
                >
                  <option value="Mainnet">Mainnet</option>
                  <option value="Nile">Nile Testnet</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-black mb-1">Contract Name</label>
                <input
                  type="text"
                  value={contractName}
                  onChange={(e) => setContractName(e.target.value)}
                  className="block w-full text-black rounded-md border border-gray-300 shadow-sm py-2 px-3 focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-black mb-1">Owner Address</label>
              <input
                type="text"
                value={ownerAddress}
                onChange={(e) => setOwnerAddress(e.target.value)}
                className="block text-black w-full rounded-md border border-gray-300 shadow-sm py-2 px-3 font-mono text-sm focus:outline-none focus:ring-red-500 focus:border-red-500"
                placeholder="41..."
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-black mb-1">Bytecode</label>
              <textarea
                value={bytecode}
                disabled
                rows={4}
                className="block w-full text-black rounded-md border border-gray-300 shadow-sm py-2 px-3 font-mono text-sm focus:outline-none focus:ring-red-500 focus:border-red-500"
                placeholder="0x..."
                required
              />
            </div>

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

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
              <div>
                <label className="block text-sm font-medium text-black mb-1">Origin Energy Limit</label>
                <input
                  type="number"
                  value={originEnergyLimit}
                  onChange={(e) => setOriginEnergyLimit(e.target.value)}
                  className="block w-full text-black rounded-md border border-gray-300 shadow-sm py-2 px-3 focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-black mb-1">Fee Limit (SUN)</label>
                <input
                  type="number"
                  value={feeLimit}
                  onChange={(e) => setFeeLimit(e.target.value)}
                  className="block text-black w-full rounded-md border border-gray-300 shadow-sm py-2 px-3 focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-black mb-1">Resource Percent</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={consumeUserResourcePercent}
                  onChange={(e) => setConsumeUserResourcePercent(e.target.value)}
                  className="block w-full text-black rounded-md border border-gray-300 shadow-sm py-2 px-3 focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm"
                  required
                />
                <p className="mt-1 text-sm text-black">0-100%</p>
              </div>
            </div>

            <div className="pt-4">
              <Button
                type="submit"
                isLoading={isDeploying}
                loadingText="Deploying..."
                disabled={!isTronLinkReady}
              >
                Deploy Contract
              </Button>
            </div>
          </form>

          {error && (
            <div className="mt-4 rounded-md bg-red-50 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-red-800">{error}</p>
                </div>
              </div>
            </div>
          )}

          {result && (
            <div className="mt-4 rounded-md bg-green-50 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3 w-full">
                  <h3 className="text-sm font-medium text-green-800">Contract Deployment Transaction Created!</h3>
                  <div className="mt-2 text-sm text-green-700">
                    <div className="space-y-2">
                      {result?.transaction?.contract_address && (
                        <div>
                          <span className="font-semibold">Contract Address:</span>
                          <p className="font-mono break-all">
                            {window.tronWeb.address.fromHex(result.transaction.contract_address)}
                          </p>
                          <p className="text-xs text-green-600 font-mono mt-1">
                            Hex: {result.transaction.contract_address}
                          </p>
                        </div>
                      )}
                      {result?.transaction?.txID && (
                        <div>
                          <span className="font-semibold">Transaction ID:</span>
                          <p className="font-mono break-all">{result.transaction.txID}</p>
                        </div>
                      )}
                      {result?.transaction?.raw_data && (
                        <div>
                          <span className="font-semibold">Transaction Details:</span>
                          <div className="bg-green-100 p-2 rounded mt-1 font-mono text-xs overflow-auto">
                            <div><span className="font-semibold">Expiration:</span> {new Date(result.transaction.raw_data.expiration).toLocaleString()}</div>
                            <div><span className="font-semibold">Timestamp:</span> {new Date(result.transaction.raw_data.timestamp).toLocaleString()}</div>
                            <div><span className="font-semibold">Ref Block:</span> {result.transaction.raw_data.ref_block_bytes}_{result.transaction.raw_data.ref_block_hash}</div>
                          </div>
                        </div>
                      )}
                      <div className="mt-2">
                        <button
                          type="button"
                          onClick={() => window.open(`https://${network.toLowerCase()}.tronscan.org/#/transaction/${result.transaction?.txID}`, '_blank')}
                          className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-full shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                        >
                          View on TronScan
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ContractDeployer;