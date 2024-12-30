"use client";

import React, { useState } from 'react';
import axios from 'axios';
import { ethers } from 'ethers';
import { TronWeb } from 'tronweb';

type NetworkType = 'Mainnet' | 'Shasta' | 'Nile';

const ADDRESS_PREFIX_REGEX = /^(41)/;


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
const ContractDeploymentEnergyCalculator: React.FC = () => {
  const [ownerAddress, setOwnerAddress] = useState<string>('');
  const [network, setNetwork] = useState<NetworkType>('Mainnet');
  const [bytecode, setBytecode] = useState<string>('');
  const [parameters, setParameters] = useState<Input[]>([]);
  const [encodedParameters, setEncodedParameters] = useState<string>('');
  const [result, setResult] = useState<EstimationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const networkEndpoints: { [key in NetworkType]: string } = {
    Mainnet: 'https://api.trongrid.io/wallet/triggerconstantcontract',
    Shasta: 'https://api.shasta.trongrid.io/wallet/triggerconstantcontract',
    Nile: 'https://nile.trongrid.io/wallet/triggerconstantcontract',
  };

  const handleAddParameter = () => {
    setParameters([...parameters, { type: '', value: '' }]);
  };

  function encodeParams(inputs: Input[]): string {
    console.log(inputs);
    debugger
    let parameters = '';
    if (inputs.length === 0) return parameters;
  
    const abiCoder = new ethers.utils.AbiCoder();
    const types: string[] = [];
    const values: unknown[] = [];
    const tronWeb = new TronWeb({
      fullHost: networkEndpoints[network],
      // headers: { "TRON-PRO-API-KEY": "YOUR_API_KEY_HERE" }, // If needed
    });
    for (const input of inputs) {
      // eslint-disable-next-line prefer-const
      let { type, value } = input;
  
      if (type === 'address') {
        const hexa = tronWeb.address.toHex(value);
      
        value = hexa.replace(ADDRESS_PREFIX_REGEX, '0x');
      } else if (type === 'address[]') {
        value = value.map((v: string) => v.replace(ADDRESS_PREFIX_REGEX, '0x'));
      }
  
      types.push(type);
      values.push(value);
    }
  
    console.log(types, values);
  
    try {
      parameters = abiCoder.encode(types, values).replace(/^(0x)/, '');
    } catch (ex) {
      console.error('Error encoding parameters:', ex);
    }
  
    return parameters;
  }

  const handleParameterChange = (index: number, field: keyof Input, value: string) => {
    const updatedParameters = [...parameters];
    updatedParameters[index][field] = value;
    setParameters(updatedParameters);

    // Re-encode parameters
    const encoded = encodeParams(updatedParameters);
    setEncodedParameters(encoded);
  };

  const handleRemoveParameter = (index: number) => {
    const updatedParameters = parameters.filter((_, i) => i !== index);
    setParameters(updatedParameters);

    // Re-encode parameters
    const encoded = encodeParams(updatedParameters);
    setEncodedParameters(encoded);
  };



  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResult(null);

    try {
      console.log('Submitting form...', {
        ownerAddress,
        network,
        bytecode,
        parameters,
        encodedParameters,
      });
      const response = await axios.post<EstimationResult>(
        networkEndpoints[network],
        {
          owner_address: ownerAddress,
          data: bytecode,
          parameter: encodedParameters,
          visible: true,
        }
      );

     console.log('Response:', response.data);

      if (!response.data.result.result) {
        throw new Error('Estimation failed. Please check your inputs.');
      }
      setResult(response.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Estimation failed. Please check your inputs.');
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
                onChange={(e) => setOwnerAddress(e.target.value)}
                required
                className="mt-1 block w-full rounded-lg border-red-300 shadow-sm focus:border-red-500 focus:ring focus:ring-red-200 focus:ring-opacity-50 transition-colors text-black p-2"
                placeholder="Enter owner address..."
              />
            </label>

            {/* Bytecode */}
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

            {/* Dynamic Parameters */}
            <label className="block">
              <span className="text-gray-700 font-medium">Constructor Parameters</span>
              <div className="space-y-4">
                {parameters.map((param, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <select
                      value={param.type}
                      onChange={(e) => handleParameterChange(index, 'type', e.target.value)}
                      className="w-1/3 rounded-lg border-red-300 shadow-sm focus:border-red-500 focus:ring focus:ring-red-200 focus:ring-opacity-50 transition-colors text-black p-2"
                    >
                      <option value="">Select Type</option>
                      <option value="address">Address</option>
                      <option value="uint256">Uint256</option>
                      <option value="string">String</option>
                      {/* Add more types as needed */}
                    </select>
                    <input
                      type="text"
                      value={param.value}
                      onChange={(e) => handleParameterChange(index, 'value', e.target.value)}
                      className="w-2/3 rounded-lg border-red-300 shadow-sm focus:border-red-500 focus:ring focus:ring-red-200 focus:ring-opacity-50 transition-colors text-black p-2"
                      placeholder="Enter value..."
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveParameter(index)}
                      className="text-red-500 hover:text-red-700 transition-colors"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={handleAddParameter}
                className="mt-2 bg-blue-500 text-white font-semibold py-2 px-4 rounded-lg hover:bg-blue-600 transition-colors"
              >
                Add Parameter
              </button>
            </label>
          </div>

          <button
            type="submit"
            className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-opacity-50"
          >
            Estimate Energy
          </button>
        </form>

        {/* Encoded Parameters Display */}
        {encodedParameters && (
          <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <h3 className="text-lg font-medium text-gray-700">Encoded Parameters:</h3>
            <pre className="mt-2 text-sm text-gray-800 font-mono">{encodedParameters}</pre>
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
