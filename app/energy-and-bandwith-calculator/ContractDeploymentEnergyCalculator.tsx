import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ethers } from 'ethers';
import { utils, TronWeb } from 'tronweb';
import Button from './components/Button';

type NetworkType = 'Mainnet' | 'Shasta' | 'Nile';

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
  ownerAddress: string;
  bytecode: string;
  contractAbi: string;
}

const ContractDeploymentEnergyCalculator: React.FC<ContractDeploymentEnergyCalculatorProps> = ({ ownerAddress, bytecode, contractAbi }) => {
  const [network, setNetwork] = useState<NetworkType>('Mainnet');
  const [parameters, setParameters] = useState<Input[]>([]);
  const [encodedParameters, setEncodedParameters] = useState<string>('');
  const [result, setResult] = useState<EstimationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [parameterErrors, setParameterErrors] = useState<(string | null)[]>([]);
  const [trxPrice, setTrxPrice] = useState<number>(0);
  const [isCalculating, setIsCalculating] = useState(false);

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
    Shasta: 'https://api.shasta.trongrid.io/wallet/triggerconstantcontract',
    Nile: 'https://nile.trongrid.io/wallet/triggerconstantcontract',
  };

  // Define supported Solidity types
  const SOLIDITY_TYPES = {
    // Unsigned Integers
    'uint8': { min: 0, max: 255 },
    'uint16': { min: 0, max: 65535 },
    'uint32': { min: 0, max: 4294967295 },
    'uint64': { min: 0, max: BigInt('18446744073709551615') },
    'uint128': { min: 0, max: BigInt('340282366920938463463374607431768211455') },
    'uint256': { min: 0, max: BigInt('115792089237316195423570985008687907853269984665640564039457584007913129639935') },
    // Signed Integers
    'int8': { min: -128, max: 127 },
    'int16': { min: -32768, max: 32767 },
    'int32': { min: -2147483648, max: 2147483647 },
    'int64': { min: BigInt('-9223372036854775808'), max: BigInt('9223372036854775807') },
    'int128': { min: BigInt('-170141183460469231731687303715884105728'), max: BigInt('170141183460469231731687303715884105727') },
    'int256': { min: BigInt('-57896044618658097711785492504343953926634992332820282019728792003956564819968'), max: BigInt('57896044618658097711785492504343953926634992332820282019728792003956564819967') },
    // Address and Bytes
    'address': {},
    'bytes': {},
    'bytes1': {},
    'bytes2': {},
    'bytes4': {},
    'bytes8': {},
    'bytes16': {},
    'bytes20': {},
    'bytes32': {},
    // Other
    'bool': {},
    'string': {},
  } as const;

  type SolidityType = keyof typeof SOLIDITY_TYPES;

  const handleAddParameter = () => {
    setParameters([...parameters, { type: '', value: '' }]);
    setParameterErrors([...parameterErrors, null]);
  };

  const validateParameter = (type: string, value: string): string | null => {
    if (!type || !value) return null; // Don't show error while user is typing

    try {
      const tronWeb = new TronWeb({
        fullHost: networkEndpoints[network],
      });

      // Address validation
      if (type === 'address') {
        if (!tronWeb.isAddress(value)) {
          return 'Invalid TRON address format';
        }
        return null;
      }

      // Boolean validation
      if (type === 'bool') {
        const lowerValue = value.toLowerCase();
        if (lowerValue !== 'true' && lowerValue !== 'false' && lowerValue !== '0' && lowerValue !== '1') {
          return 'Must be true/false or 0/1';
        }
        return null;
      }

      // Bytes validation
      if (type.startsWith('bytes')) {
        const bytesRegex = /^(0x)?[0-9a-fA-F]*$/;
        if (!bytesRegex.test(value)) {
          return 'Must be a valid hexadecimal value';
        }
        
        // Check specific bytes length if specified
        const specificLength = type.replace('bytes', '');
        if (specificLength) {
          const length = parseInt(specificLength) * 2; // 2 hex chars per byte
          const valueNoPrefix = value.replace('0x', '');
          if (valueNoPrefix.length !== length) {
            return `Must be exactly ${length} hexadecimal characters`;
          }
        }
        return null;
      }

      // Integer validation
      if (type.startsWith('uint') || type.startsWith('int')) {
        // Remove underscores for readability (Solidity allows them)
        const cleanValue = value.replace(/_/g, '');
        
        if (!/^-?\d+$/.test(cleanValue)) {
          return 'Must be a valid integer';
        }

        try {
          const numValue = BigInt(cleanValue);
          const range = SOLIDITY_TYPES[type as SolidityType];
          
          if (range && 'min' in range && 'max' in range && (numValue < range.min || numValue > range.max)) {
            return `Value must be between ${range.min} and ${range.max}`;
          }
        } catch {
          return 'Invalid number format';
        }
        return null;
      }

      // String validation - accept any string
      if (type === 'string') {
        return null;
      }

      return 'Unsupported type';
    } catch (err) {
      return 'Invalid parameter value' + (err instanceof Error ? `: ${err.message}` : '');
    }
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

  const handleParameterChange = (index: number, field: keyof Input, value: string) => {
    const updatedParameters = [...parameters];
    updatedParameters[index][field] = value;
    setParameters(updatedParameters);

    // Update validation errors
    const updatedErrors = [...parameterErrors];
    if (field === 'value') {
      updatedErrors[index] = validateParameter(updatedParameters[index].type, value);
    }
    setParameterErrors(updatedErrors);

    try {
      // Only encode if we have both type and value and no validation errors
      if (updatedParameters.every(param => param.type && param.value) &&
          !updatedErrors.some(error => error !== null)) {
        const encoded = encodeParams(updatedParameters);
        setEncodedParameters(encoded);
        setError(null);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Parameter encoding failed';
      setError(errorMessage);
      setEncodedParameters('');
    }
  };

  const handleRemoveParameter = (index: number) => {
    const updatedParameters = parameters.filter((_, i) => i !== index);
    const updatedErrors = parameterErrors.filter((_, i) => i !== index);
    setParameters(updatedParameters);
    setParameterErrors(updatedErrors);

    try {
      if (updatedParameters.every(param => param.type && param.value)) {
        const encoded = encodeParams(updatedParameters);
        setEncodedParameters(encoded);
        setError(null);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Parameter encoding failed';
      setError(errorMessage);
      setEncodedParameters('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResult(null);
    setIsCalculating(true);

    try {
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
                <option value="Shasta">Shasta (Testnet)</option>
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

            {/* Contract ABI */}
            <label className="block">
              <span className="text-gray-700 font-medium">Contract ABI</span>
              <textarea
                value={contractAbi}
                disabled
                rows={4}
                className="mt-1 block w-full rounded-lg border-red-500 shadow-sm focus:border-red-500 ring focus:ring-red-200 focus:ring-opacity-50 font-mono text-sm transition-colors text-black p-2"
                placeholder="Enter contract ABI..."
              />
            </label>

            {/* Dynamic Parameters */}
            <div className="block space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-700 font-medium text-lg">Constructor Parameters</span>
                <button
                  type="button"
                  onClick={handleAddParameter}
                  className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors duration-200 flex items-center space-x-2 text-sm font-medium"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  <span>Add Parameter</span>
                </button>
              </div>
              
              <div className="space-y-4">
                {parameters.map((param, index) => (
                  <div key={index} className="p-4 bg-white rounded-lg shadow-sm border border-red-100 space-y-3">
                    <div className="flex items-center space-x-3">
                      <select
                        value={param.type}
                        onChange={(e) => handleParameterChange(index, 'type', e.target.value)}
                        className="w-1/3 rounded-lg border-red-300 shadow-sm focus:border-red-500 focus:ring focus:ring-red-200 focus:ring-opacity-50 transition-colors text-black p-2"
                      >
                        <option value="">Select Type</option>
                        <optgroup label="Address">
                          <option value="address">address</option>
                        </optgroup>
                        <optgroup label="Unsigned Integers">
                          <option value="uint8">uint8</option>
                          <option value="uint16">uint16</option>
                          <option value="uint32">uint32</option>
                          <option value="uint64">uint64</option>
                          <option value="uint128">uint128</option>
                          <option value="uint256">uint256</option>
                        </optgroup>
                        <optgroup label="Signed Integers">
                          <option value="int8">int8</option>
                          <option value="int16">int16</option>
                          <option value="int32">int32</option>
                          <option value="int64">int64</option>
                          <option value="int128">int128</option>
                          <option value="int256">int256</option>
                        </optgroup>
                        <optgroup label="Bytes">
                          <option value="bytes">bytes</option>
                          <option value="bytes1">bytes1</option>
                          <option value="bytes2">bytes2</option>
                          <option value="bytes4">bytes4</option>
                          <option value="bytes8">bytes8</option>
                          <option value="bytes16">bytes16</option>
                          <option value="bytes20">bytes20</option>
                          <option value="bytes32">bytes32</option>
                        </optgroup>
                        <optgroup label="Other">
                          <option value="bool">bool</option>
                          <option value="string">string</option>
                        </optgroup>
                      </select>
                      <input
                        type="text"
                        value={param.value}
                        onChange={(e) => handleParameterChange(index, 'value', e.target.value)}
                        className={`flex-1 rounded-lg shadow-sm focus:ring focus:ring-red-200 focus:ring-opacity-50 transition-colors text-black p-2 ${
                          parameterErrors[index] 
                            ? 'border-red-500 focus:border-red-500' 
                            : 'border-red-300 focus:border-red-500'
                        }`}
                        placeholder={`Enter ${param.type || 'parameter'} value...`}
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveParameter(index)}
                        className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors duration-200"
                        title="Remove parameter"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                    {parameterErrors[index] && (
                      <p className="text-sm text-red-600 ml-1">{parameterErrors[index]}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>

          </div>

          <Button
            type="submit"
            isLoading={isCalculating}
            loadingText="Calculating..."
          >
            Calculate Energy
          </Button>
        </form>

        {/* Encoded Parameters Display */}
        {encodedParameters && (
          <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <h3 className="text-lg font-medium text-gray-700">Encoded Parameters:</h3>
            <pre className="mt-2 text-sm text-gray-800 font-mono whitespace-pre-wrap break-all overflow-x-auto">{encodedParameters}</pre>
          </div>
        )}

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
