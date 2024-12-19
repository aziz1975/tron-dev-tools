"use client";

import React, { useState } from 'react';
import axios from 'axios';
import type { AxiosResponse } from 'axios';

type NetworkType = 'Mainnet' | 'Shasta' | 'Nile';

// Mapping networks to their fullNode endpoints
type ContractInfo = {
  name: string;
  origin_address: string;
  abi: {
    entrys: Array<{
      name: string;
      type: string;
      inputs: Array<{ name: string; type: string }>;
    }>;
  };
};

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
    raw_data: Record<string, unknown>;
  };
};

type InputType = {
  name: string;
  type: string;
};

type ConversionFunction = (value: string) => string;

const ExtendedContractCalculator: React.FC = () => {
  const [ownerAddress, setOwnerAddress] = useState<string>('');
  const [contractAddress, setContractAddress] = useState<string>('');
  const [contractInfo, setContractInfo] = useState<ContractInfo | null>(null);
  const [result, setResult] = useState<EstimationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [network, setNetwork] = useState<NetworkType>('Mainnet');
  // State for function interaction
  const [selectedFunction, setSelectedFunction] = useState<string>('');
  const [functionParams, setFunctionParams] = useState<Record<string, string>>({});

  const networkEndpoints: { [key in NetworkType]: string } = {
    Mainnet: 'https://api.trongrid.io',
    Shasta: 'https://api.shasta.trongrid.io',
    Nile: 'https://nile.trongrid.io',
  };

  // Conversion utilities extracted to client-side only
  const convertToHex: Record<string, ConversionFunction> = {
    address: (value: string): string => {
      const cleanAddress = value.replace(/^0x/, '').replace(/[^0-9a-fA-F]/g, '');
      const paddedAddress = cleanAddress.padStart(40, '0').slice(-40);
      return paddedAddress.padStart(64, '0');
    },
    uint256: (value: string): string => {
      try {
        // Parse the value as a float
        const numValue = parseFloat(value);

        // Check for NaN or invalid number
        if (isNaN(numValue)) {
          throw new Error(`Invalid number: ${value}`);
        }

        // Handle very large numbers or overflow
        const MAX_UINT256 = BigInt('0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF');

        // Convert to BigInt, supporting both integers and floats
        let bigIntValue: bigint;

        // For floating-point numbers, convert to the largest whole number representation
        // This means scaling the float to preserve precision
        if (!Number.isInteger(numValue)) {
          // Find appropriate decimal precision (e.g., 18 decimal places is common in blockchain)
          const PRECISION = 18;
          const scaledValue = BigInt(Math.floor(numValue * Math.pow(10, PRECISION)));

          // Ensure the scaled value doesn't exceed uint256 max
          if (scaledValue > MAX_UINT256) {
            throw new Error(`Number too large for uint256: ${value}`);
          }

          bigIntValue = scaledValue;
        } else {
          // For integers, direct conversion
          bigIntValue = BigInt(Math.floor(numValue));

          // Additional check for max uint256
          if (bigIntValue > MAX_UINT256) {
            throw new Error(`Number too large for uint256: ${value}`);
          }
        }

        // Convert to hex, padding to 64 characters
        const hexValue = bigIntValue.toString(16);
        return hexValue.padStart(64, '0');
      } catch (error) {
        console.error(`Error converting uint256: ${value}`, error);
        throw new Error(`Invalid uint256 value: ${value}`);
      }
    },

    bool: (value: string): string => {
      const boolHex = (value === 'true' || value === '1') ? '1' : '0';
      return boolHex.padStart(64, '0');
    },
    string: (value: string): string => {
      const hexString = Array.from(value)
        .map(char => char.charCodeAt(0).toString(16).padStart(2, '0'))
        .join('');
      return hexString.padStart(64, '0').slice(0, 64);
    },

    default: (value: string): string => {
      const hexValue = Array.from(value)
        .map(char => char.charCodeAt(0).toString(16).padStart(2, '0'))
        .join('');
      return hexValue.padStart(64, '0').slice(0, 64);
    }
  };

  // Fetch contract info based on the contract address
  const fetchContractInfo = async (): Promise<void> => {
    setError(null);
    setContractInfo(null);

    if (!contractAddress) {
      setError('Please enter a contract address');
      return;
    }

    const options = {
      method: 'POST',
      url: networkEndpoints[network] + '/wallet/getcontract',
      headers: { accept: 'application/json', 'content-type': 'application/json' },
      data: {
        value: contractAddress,
        visible: true
      }
    };

    try {
      const response: AxiosResponse = await axios.request(options);
      const contractData = response.data;

      // Validate contract data
      if (contractData && contractData.origin_address) {
        setContractInfo(contractData);
        setOwnerAddress(contractData.origin_address);
      } else {
        setError('Invalid contract information received');
      }
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : 'Error fetching contract information. Please verify the contract address.'
      );
    }
  };

  // Filter functions with inputs
  const functionsWithInputs = contractInfo?.abi?.entrys
  ? contractInfo.abi.entrys.filter(
    entry => entry.inputs && 
            entry.inputs.length > 0 && 
            entry.type === 'Function'
  )
  : [];
if(functionsWithInputs.length > 0)
{
  console.log('functionsWithInputs', functionsWithInputs);
}
  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setError(null);
    setResult(null);

    // Validate that a function is selected
    if (!selectedFunction) {
      setError('Please select a function to interact with');
      return;
    }

    // Find the selected function in the contract ABI
    const selectedFunctionEntry = functionsWithInputs.find(
      entry => entry.name === selectedFunction
    );

    if (!selectedFunctionEntry) {
      setError('Selected function not found in contract ABI');
      return;
    }

    // Validate all required parameters are filled
    const missingParams = selectedFunctionEntry.inputs.filter(
      input => !functionParams[input.name]
    );

    if (missingParams.length > 0) {
      setError(`Missing parameters: ${missingParams.map(p => p.name).join(', ')}`);
      return;
    }

    try {
      // Convert parameters to hex based on their type
      const parameters = selectedFunctionEntry.inputs
        .map(input => {
          const value = functionParams[input.name];
          const conversionFn = convertToHex[input.type] || convertToHex.default;

          try {
            return conversionFn(value);
          } catch (conversionError) {
            console.error(`Conversion error for ${input.name}:`, conversionError);
            throw new Error(`Invalid parameter for ${input.name}: ${value}`);
          }
        })
        .join('');

      // Construct function selector
      const functionSelector = `${selectedFunction}(${selectedFunctionEntry.inputs.map(input => input.type).join(',')
        })`;

      const options = {
        method: 'POST',
        url: networkEndpoints[network] + '/wallet/triggerconstantcontract',
        headers: { accept: 'application/json', 'content-type': 'application/json' },
        data: {
          owner_address: ownerAddress,
          contract_address: contractAddress,
          function_selector: functionSelector,
          parameter: parameters,
          visible: true
        }
      };

      const response: AxiosResponse<EstimationResult> = await axios.request(options);
      setResult(response.data);
    } catch (err: unknown) {
      console.error('Submission Error:', err);
      setError(
        err instanceof Error
          ? err.message
          : 'Error estimating contract energy. Please check your inputs carefully.'
      );
    }
  };

  const renderInputField = (input: InputType) => {
    switch (input.type) {
      case 'address':
        return (
          <input
            type="text"
            placeholder={`Enter ${input.name} (address)`}
            className="w-full p-2 border rounded mt-1 text-black"
            value={functionParams[input.name] || ''}
            onChange={(e) => setFunctionParams(prev => ({
              ...prev,
              [input.name]: e.target.value
            }))}
          />
        );
      case 'uint256':
        return (
          <input
            type="number"
            placeholder={`Enter ${input.name} (unsigned integer)`}
            className="w-full p-2 border rounded mt-1 text-black"
            value={functionParams[input.name] || ''}
            onChange={(e) => setFunctionParams(prev => ({
              ...prev,
              [input.name]: e.target.value
            }))}
          />
        );
      case 'bool':
        return (
          <select
            className="w-full p-2 border rounded mt-1"
            value={functionParams[input.name] || ''}
            onChange={(e) => setFunctionParams(prev => ({
              ...prev,
              [input.name]: e.target.value
            }))}
          >
            <option value="">Select {input.name}</option>
            <option value="true">True</option>
            <option value="false">False</option>
          </select>
        );
      case 'string':
        return (
          <input
            type="text"
            placeholder={`Enter ${input.name} (string)`}
            className="w-full p-2 border rounded mt-1"
            value={functionParams[input.name] || ''}
            onChange={(e) => setFunctionParams(prev => ({
              ...prev,
              [input.name]: e.target.value
            }))}
          />
        );
      default:
        return (
          <input
            type="text"
            placeholder={`Enter ${input.name} (${input.type})`}
            className="w-full p-2 border rounded mt-1"
            value={functionParams[input.name] || ''}
            onChange={(e) => setFunctionParams(prev => ({
              ...prev,
              [input.name]: e.target.value
            }))}
          />
        );
    }
  };

  // Render contract interaction form
  const renderContractInteractionForm = () => {
    if (!contractInfo) return null;

    return (
      <div className="mt-6 p-6 bg-white rounded-lg shadow-lg border border-gray-200">
        <h2 className="text-xl font-semibold mb-4 text-black">Contract Interaction</h2>

        {functionsWithInputs.length > 0 ? (
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block text-black mb-2">Origin Address</label>
              <input
                type="text"
                value={ownerAddress || 'N/A'}
                readOnly
                className="w-full p-2 border rounded bg-gray-100 text-black"
              />
            </div>

            <div className="mb-4">
              <label className="block text-black mb-2">Function Selector</label>
              <select
                value={selectedFunction}
                onChange={(e) => setSelectedFunction(e.target.value)}
                className="w-full p-2 border rounded text-black"
              >
                <option value="">Select a Function</option>
                {functionsWithInputs.map((entry, index) => (
                  <option key={index} value={entry.name}>
                    {entry.name} ({entry.type})
                  </option>
                ))}
              </select>
            </div>

            {selectedFunction && (
              <div>
                <h3 className="text-lg font-semibold mb-3 text-black">
                  Function Parameters for {selectedFunction}
                </h3>
                {functionsWithInputs
                  .find(entry => entry.name === selectedFunction)
                  ?.inputs.map((input, index) => (
                    <div key={index} className="mb-3">
                      <label className="block text-black mb-1">{input.name} ({input.type})</label>
                      {renderInputField(input)}
                    </div>
                  ))}
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-red-700 text-white p-2 rounded mt-4 hover:bg-red-700 font-bold"
              disabled={!selectedFunction}
            >
              Estimate Energy
            </button>
          </form>
        ) : (
          <p className="text-black">No functions with input parameters found.</p>
        )}
      </div>
    );
  };

  return (
    <div className="bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold text-gray-900 text-center mb-8">
        Extended Contract Energy Calculator
      </h1>
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg border border-red-100 p-6">

        <div className="mb-6">
          <label className="block mb-2 font-medium text-gray-700">Network</label>
          <select
            value={network}
            onChange={(e) => setNetwork(e.target.value as NetworkType)}
            className="w-full p-2 border border-gray-300 text-black rounded-md shadow-sm focus:ring focus:ring-red-200 focus:border-red-500"
          >
            <option value="Nile">Nile (Testnet)</option>
            <option value="Shasta">Shasta (Testnet)</option>
            <option value="Mainnet">Mainnet</option>
          </select>
          <label className="block mb-2 font-medium text-gray-700">Contract Address</label>
          <input
            type="text"
            value={contractAddress}
            onChange={(e) => setContractAddress(e.target.value)}
            className="w-full p-2 border border-gray-300 text-black rounded-md shadow-sm focus:ring focus:ring-red-200 focus:border-red-500"
          />
          <button
            onClick={fetchContractInfo}
            className="mt-3 bg-red-700 hover:bg-red-700 text-white py-2 px-4 rounded"
          >
            Fetch Contract Info
          </button>
        </div>

        {renderContractInteractionForm()}

        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-600">{error}</p>
          </div>
        )}
        {result && (
          <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-green-600">
              Estimated Energy: {result.energy_used}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ExtendedContractCalculator;