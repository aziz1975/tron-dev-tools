"use client";

import React, { useState } from 'react';
import axios from 'axios';
import { ethers } from 'ethers';

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

const ContractDeploymentEnergyCalculator: React.FC = () => {
  const [ownerAddress, setOwnerAddress] = useState<string>('');
  const [network, setNetwork] = useState<NetworkType>('Mainnet');
  const [bytecode, setBytecode] = useState<string>('');
  const [result, setResult] = useState<EstimationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [parameterInput, setParameterInput] = useState<string>('');
  const [parsedParameter, setParsedParameter] = useState<string>('');

  const networkEndpoints: { [key in NetworkType]: string } = {
    Mainnet: 'https://api.trongrid.io/wallet/triggerconstantcontract',
    Shasta: 'https://api.shasta.trongrid.io/wallet/triggerconstantcontract',
    Nile: 'https://nile.trongrid.io/wallet/triggerconstantcontract',
  };

  const padLeft = (str: string, len: number): string => {
    return '0'.repeat(Math.max(len - str.length, 0)) + str;
  };

  const encodeUint256 = (value: number): string => {
    const hex = value.toString(16);
    return padLeft(hex, 64);
  };

  const encodeString = (str: string): string => {
    // Convert string to hex
    const hex = Array.from(str)
      .map(c => c.charCodeAt(0).toString(16).padStart(2, '0'))
      .join('');
    
    // Get length of string in bytes and encode it
    const length = encodeUint256(str.length);
    
    // Pad the hex string to multiple of 32 bytes
    const paddedHex = hex.padEnd(Math.ceil(hex.length / 64) * 64, '0');
    
    return length + paddedHex;
  };

  const parseParameter = (input: string): string => {
    try {
      const cleanInput = input.trim();
      if (!cleanInput) return '';
      
      const params = JSON.parse(cleanInput);
      if (!Array.isArray(params)) {
        throw new Error('Parameters must be an array');
      }

      let encoded = '';
      params.forEach(param => {
        if (typeof param === 'number') {
          encoded += encodeUint256(param);
        } else if (typeof param === 'string') {
          encoded += encodeString(param);
        } else {
          throw new Error(`Unsupported parameter type: ${typeof param}`);
        }
      });

      return encoded;
    } catch (err) {
      throw new Error('Invalid parameter format. Please provide a valid array (e.g., [1, 2, "string"])');
    }
  };

  const handleParameterChange = (value: string) => {
    setParameterInput(value);
    try {
      const encoded = parseParameter(value);
      setParsedParameter(encoded);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Parameter parsing error');
      setParsedParameter('');
    }
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResult(null);

    console.log('Parsed Parameter:', parsedParameter);
    console.log('parameterInput:', parameterInput);

    try {
      const response = await axios.post<EstimationResult>(
        networkEndpoints[network],
        {
          owner_address: ownerAddress,
          data: bytecode,
          parameter: parsedParameter,
          visible: true,
        }
      );

      console.log(response.data);
      if (!response.data.result.result) {
        throw new Error('Estimation failed. Please check your inputs.');
      }
      setResult(response.data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Estimation failed. Please check your inputs.'
      );
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

            <label className="block">
              <span className="text-gray-700 font-medium">Owner Address</span>
              <input
                type="text"
                value={ownerAddress}
                onChange={(e) => setOwnerAddress(e.target.value)}
                required
                className="mt-1 block w-full rounded-lg border-red-300 shadow-sm focus:border-red-500 focus:ring focus:ring-red-200 focus:ring-opacity-50 transition-colors text-black p-2"
                placeholder="Enter owner address..."
              />
            </label>

            <label className="block">
              <span className="text-gray-700 font-medium">Bytecode</span>
              <textarea
                value={bytecode}
                onChange={(e) => setBytecode(e.target.value)}
                rows={4}
                required
                className="mt-1 block w-full rounded-lg border-red-500 shadow-sm focus:border-red-500 ring focus:ring-red-200 focus:ring-opacity-50 font-mono text-sm transition-colors text-black p-2"
                placeholder="Enter bytecode..."
              />
            </label>

            <label className="block">
              <span className="text-gray-700 font-medium">Constructor Parameters</span>
              <input
                type="text"
                value={parameterInput}
                onChange={(e) => handleParameterChange(e.target.value)}
                className="mt-1 block w-full rounded-lg border-red-300 shadow-sm focus:border-red-500 focus:ring focus:ring-red-200 focus:ring-opacity-50 transition-colors text-black p-2"
                placeholder='Enter parameters as array (e.g., [1, 2, "string"])'
              />
              {parsedParameter && (
                <div className="mt-2">
                  <span className="text-sm text-gray-600">Encoded Parameters:</span>
                  <pre className="mt-1 p-2 bg-gray-50 rounded text-xs font-mono overflow-x-auto text-red-500 border border-red-100">
                    {parsedParameter}
                  </pre>
                </div>
              )}
              <p className="text-xs text-gray-500 mt-1">
                Provide constructor parameters as a JSON array. Parameters will be automatically encoded to VM format.
              </p>
            </label>
          </div>

          <button
            type="submit"
            className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-opacity-50"
          >
            Estimate Energy
          </button>
        </form>

        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        {result && (
          <div className="mt-6 p-6 bg-white rounded-lg shadow-lg border border-red-100">
            <h2 className="text-xl font-semibold mb-4 text-gray-800">Estimation Results</h2>
            <div className="space-y-3">
              <div className="flex items-center">
                <span className="text-gray-600 w-32">Energy Used:</span>
                <span className="font-mono text-gray-800">{result.energy_used}</span>
              </div>
              {result.transaction.contract_address && (
                <div className="flex items-center">
                  <span className="text-gray-600 w-32">Contract Address:</span>
                  <span className="font-mono text-gray-800">{result.transaction.contract_address}</span>
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