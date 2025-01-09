"use client";

import React, { useState } from 'react';
import axios from 'axios';
import type { AxiosResponse } from 'axios';
import Button from './components/Button';
import { Card, FormControl, InputLabel, MenuItem, Select, TextField, Typography } from '@mui/material';

type NetworkType = 'Mainnet' | 'Nile';

// Mapping networks to their fullNode endpoints
type ContractInfo = {
  name: string;
  origin_address: string;
  abi: {
    entrys: Array<{
      name: string;
      type: string;
      constant: boolean;
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
  const [network, setNetwork] = useState<NetworkType>('Nile');
  // State for function interaction
  const [selectedFunction, setSelectedFunction] = useState<string>('');
  const [functionParams, setFunctionParams] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);

  const networkEndpoints: { [key in NetworkType]: string } = {
    Mainnet: 'https://api.trongrid.io',
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
  const handleContractInfo = async () => {
    setIsLoading(true);
    setError(null);
    setContractInfo(null);
    setResult(null);  // Clear any previous calculation results

    if (!contractAddress) {
      setError('Please enter a contract address');
      setIsLoading(false);
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
      setContractInfo(null);  // Clear contract info if there's an error
      setResult(null);  // Clear any existing results
      console.error('Error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Filter functions with inputs
  const functionsWithInputs = contractInfo?.abi?.entrys
  ? contractInfo.abi.entrys.filter(
    entry => entry.inputs && 
            entry.inputs.length > 0 && 
            entry.type === 'Function' &&
            entry.constant !== true
  )
  : [];
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCalculating(true);
    setError(null);
    setResult(null);  // Clear previous result when starting new calculation

    // Validate that a function is selected
    if (!selectedFunction) {
      setError('Please select a function to interact with');
      setIsCalculating(false);
      return;
    }

    // Find the selected function in the contract ABI
    const selectedFunctionEntry = functionsWithInputs.find(
      entry => entry.name === selectedFunction
    );

    if (!selectedFunctionEntry) {
      setError('Selected function not found in contract ABI');
      setIsCalculating(false);
      return;
    }

    // Validate all required parameters are filled
    const missingParams = selectedFunctionEntry.inputs.filter(
      input => !functionParams[input.name]
    );

    if (missingParams.length > 0) {
      setError(`Missing parameters: ${missingParams.map(p => p.name).join(', ')}`);
      setIsCalculating(false);
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
      setError(
        err instanceof Error
          ? err.message
          : 'Error estimating contract energy. Please check your inputs carefully.'
      );
      setResult(null);  // Clear result if there's an error
      console.error('Submission Error:', err);
    } finally {
      setIsCalculating(false);
    }
  };

  const renderInputField = (input: InputType) => {
    switch (input.type) {
      case 'address':
        return (
          <TextField
            label={input.name}
            value={functionParams[input.name] || ''}
            onChange={(e) => setFunctionParams(prev => ({
              ...prev,
              [input.name]: e.target.value
            }))}
            fullWidth
          />
        );
      case 'uint256':
        return (
          <TextField
            label={input.name}
            value={functionParams[input.name] || ''}
            onChange={(e) => setFunctionParams(prev => ({
              ...prev,
              [input.name]: e.target.value
            }))}
            fullWidth
          />
        );
      case 'bool':
        return (
          <FormControl fullWidth>
            <InputLabel>{input.name}</InputLabel>
            <Select
              value={functionParams[input.name] || ''}
              onChange={(e) => setFunctionParams(prev => ({
                ...prev,
                [input.name]: e.target.value
              }))}
            >
              <MenuItem value="true">True</MenuItem>
              <MenuItem value="false">False</MenuItem>
            </Select>
          </FormControl>
        );
      case 'string':
        return (
          <TextField
            label={input.name}
            value={functionParams[input.name] || ''}
            onChange={(e) => setFunctionParams(prev => ({
              ...prev,
              [input.name]: e.target.value
            }))}
            fullWidth
          />
        );
      default:
        return (
          <TextField
            label={input.name}
            value={functionParams[input.name] || ''}
            onChange={(e) => setFunctionParams(prev => ({
              ...prev,
              [input.name]: e.target.value
            }))}
            fullWidth
          />
        );
    }
  };

  // Render contract interaction form
  const renderContractInteractionForm = () => {
    if (!contractInfo) return null;

    return (
      <Card className="p-6 mb-4 max-w-4xl mx-auto">
        <Typography variant="h6" className="mb-4">Contract Interaction</Typography>

        {functionsWithInputs.length > 0 ? (
          <form onSubmit={handleSubmit}>
            <FormControl variant="outlined" fullWidth className="mb-4">
              
              <TextField
                value={ownerAddress || 'N/A'}
                slotProps={{ input: { readOnly: true } }}
                label="Owner Address"
                fullWidth
              />
            </FormControl>
            <div className="mb-4"/>
            <FormControl variant="outlined" fullWidth className="mb-4">
              <InputLabel>Function Selector</InputLabel>
              <Select
                value={selectedFunction}
                onChange={(e) => setSelectedFunction(e.target.value)}
                fullWidth
              >
                <MenuItem value="">Select a Function</MenuItem>
                {functionsWithInputs.map((entry, index) => (
                  <MenuItem key={index} value={entry.name}>
                    {entry.name} ({entry.type})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <div className="mb-4"/>

            {selectedFunction && (
              <div>
                <Typography variant="h6" className="mb-3">Function Parameters for {selectedFunction}</Typography>
                {functionsWithInputs
                  .find(entry => entry.name === selectedFunction)
                  ?.inputs.map((input, index) => (
                    <div key={index} className="mb-3">
                      {renderInputField(input)}
                    </div>
                  ))}
              </div>
            )}
            

            <Button
              type="submit"
              isLoading={isCalculating}
              loadingText="Calculating..."
              disabled={!selectedFunction}
              fullWidth
            >
              Calculate Energy
            </Button>
          </form>
        ) : (
          <Typography variant="body1">No functions with input parameters found.</Typography>
        )}
      </Card>
    );
  };

  return (
    <div className="bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <Typography variant="h4" className="text-center mb-8 text-gray-700">Extended Contract Energy Calculator</Typography>

      <Card className="p-6 mb-4 max-w-4xl mx-auto">
        <div className="pb-4">
        <FormControl variant="outlined" fullWidth className="mb-4">
          <InputLabel>Network Type</InputLabel>
          <Select
            value={network}
            onChange={(e) => setNetwork(e.target.value as NetworkType)}
            label="Network Type"
            fullWidth
          >
            <MenuItem value="Nile">Nile (Testnet)</MenuItem>
            <MenuItem value="Mainnet">Mainnet</MenuItem>
          </Select>
        </FormControl>
        </div>

        <TextField
          label="Contract Address"
          value={contractAddress}
          onChange={(e) => setContractAddress(e.target.value)}
          className="mb-4"
          placeholder="Enter contract address..."
          fullWidth
        />
<div className="pb-4"></div>
        <Button
          type="button"
          onClick={handleContractInfo}
          isLoading={isLoading}
          loadingText="Fetching..."
          disabled={!contractAddress}
          fullWidth
        >
          Get Contract Info
        </Button>
      </Card>

      {renderContractInteractionForm()}

      {error && (
        <Card className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <Typography variant="body2" color="error">{error}</Typography>
        </Card>
      )}

      {result && (
        <Card className="mt-6 p-6 max-w-4xl mx-auto bg-white rounded-lg shadow-lg border border-red-100">
          <Typography variant="h6" className="mb-4 text-gray-800">Estimation Results</Typography>
          <Typography variant="body2">Estimated Energy: {result.energy_used}</Typography>
        </Card>
      )}
    </div>
  );
};

export default ExtendedContractCalculator;