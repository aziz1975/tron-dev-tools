"use client";

import React, { useState } from 'react';
import axios from 'axios';

const API_URL = 'https://nile.trongrid.io/wallet/triggerconstantcontract';
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

const ContractCallingEnergyCalculator: React.FC = () => {
  const [ownerAddress, setOwnerAddress] = useState<string>('');
  const [contractAddress, setContractAddress] = useState<string>('');
  const [functionSelector, setFunctionSelector] = useState<string>('');
  const [functionParameters, setFunctionParameters] = useState<string>('');
  const [result, setResult] = useState<EstimationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResult(null);

    console.log('ownerAddress', ownerAddress);

    try {
      const response = await axios.post(API_URL, {
        owner_address: ownerAddress,
        contract_address: contractAddress,
        function_selector: functionSelector,
        parameter: functionParameters,
        visible: true,
      });

      if(!response.data.result.result) {
        throw new Error('Something went wrong, please check your input fields and try again!'); 
      }
      setResult(response.data as EstimationResult);
      console.log(response.data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Something went wrong, please check your input fields and try again!'
      );
    }
  };

  const renderResult = () => {
    if (!result) return null;

    return (
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
            <span className={`px-3 py-1 rounded-full text-sm ${
              result.result.result ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}>
              {result.result.result ? 'Success' : 'Failed'}
            </span>
          </div>
        </div>
      </div>
    );
  };

  const renderError = () => {
    if (!error) return null;

    return (
      <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-600 text-sm">{error}</p>
      </div>
    );
  };

  const renderForm = () => {
    return (
      <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded-lg shadow-lg border border-red-100">
        <div className="space-y-4">
          <label className="block">
            <span className="text-gray-700 font-medium">Owner Address</span>
            <input
              type="text"
              value={ownerAddress}
              onChange={(e) => setOwnerAddress(e.target.value)}
              required
              className="mt-1 block w-full rounded-lg border-red-300 shadow-sm focus:border-red-500 focus:ring focus:ring-red-200 focus:ring-opacity-50 transition-colors text-black p-2 border border-red-300 rounded-lg shadow-sm focus:border-red-500 focus:ring focus:ring-red-200 focus:ring-opacity-50"
              placeholder="Enter owner address..."
            />
          </label>

          <label className="block">
            <span className="text-gray-700 font-medium">Contract Address</span>
            <input
              type="text"
              value={contractAddress}
              onChange={(e) => setContractAddress(e.target.value)}
              required
              className="mt-1 block w-full rounded-lg border-red-300 shadow-sm focus:border-red-500 focus:ring focus:ring-red-200 focus:ring-opacity-50 transition-colors text-black p-2 border border-red-300 rounded-lg shadow-sm focus:border-red-500 focus:ring focus:ring-red-200 focus:ring-opacity-50"
              placeholder="Enter contract address..."
            />
          </label>

          <label className="block">
            <span className="text-gray-700 font-medium">Function Selector</span>
            <input
              type="text"
              value={functionSelector}
              onChange={(e) => setFunctionSelector(e.target.value)}
              required
              className="mt-1 block w-full rounded-lg border-red-300 shadow-sm focus:border-red-500 focus:ring focus:ring-red-200 focus:ring-opacity-50 transition-colors text-black p-2 border border-red-300 rounded-lg shadow-sm focus:border-red-500 focus:ring focus:ring-red-200 focus:ring-opacity-50"
              placeholder="Enter function selector..."
            />
          </label>

          <label className="block">
            <span className="text-gray-700 font-medium">Function Parameters</span>
            <input
              type="text"
              value={functionParameters}
              onChange={(e) => setFunctionParameters(e.target.value)}
              required
              className="mt-1 block w-full rounded-lg border-red-300 shadow-sm focus:border-red-500 focus:ring focus:ring-red-200 focus:ring-opacity-50 transition-colors text-black p-2 border border-red-300 rounded-lg shadow-sm focus:border-red-500 focus:ring focus:ring-red-200 focus:ring-opacity-50"
              placeholder="Enter function parameters..."
            />
          </label>
        </div>
        <button 
          type="submit"
          className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-opacity-50"
        >
         Estimate Energy
        </button>
      </form>
    );
  };

  return (
    <div className="bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 text-center mb-8">
          Contract Calling Energy Calculator
        </h1>
        {renderForm()}
        {renderResult()}
        {renderError()}
      </div>
    </div>
  );
};

export default ContractCallingEnergyCalculator;