"use client";

import React, { useState, useEffect, useMemo, use } from 'react';
import axios from 'axios';
import { TronWeb } from 'tronweb';

const CONTRACT_API_URL = 'https://api.shasta.trongrid.io/wallet/getcontract';
const ESTIMATION_API_URL = 'https://nile.trongrid.io/wallet/triggerconstantcontract';

type ContractInfo = {
  name: string;
  origin_address: string;
  abi: {
    entrys: Array<{ name: string; type: string; inputs: Array<{ name: string; type: string }> }>;
  };
};

const tronWeb = new TronWeb({
  fullHost: 'https://api.shasta.trongrid.io',
});

tronWeb.setAddress('TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t');

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

const ExtendedContractCalculator: React.FC = () => {
  const [ownerAddress, setOwnerAddress] = useState('');
  const [contractAddress, setContractAddress] = useState('');
  const [functionSelector, setFunctionSelector] = useState('');
  const [functionParameters, setFunctionParameters] = useState('');
  const [contractInfo, setContractInfo] = useState<ContractInfo | null>(null);
  const [result, setResult] = useState<EstimationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch contract info based on the contract address
  const fetchContractInfo = async () => {
    setError(null);
    setContractInfo(null);
    const options = {
      method: 'POST',
      url: CONTRACT_API_URL,
      headers: { accept: 'application/json', 'content-type': 'application/json' },
      data: {
        value:
          contractAddress, 
          visible: true
      }
    };

    try {
      axios.request(options).then((response) => {
        console.log(response.data);
        setContractInfo(response.data);
      })
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Error fetching contract information. Please verify the contract address.'
      );
    }
  };

  const contractABI = contractInfo?.abi?.entrys;
  const functionsWithInputs = contractInfo?.abi?.entrys
  ? contractInfo.abi.entrys.filter(
      entry => entry.inputs && entry.inputs.length > 0
    )
  : [];


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResult(null);

    try {
      const response = await axios.post(ESTIMATION_API_URL, {
        owner_address: ownerAddress,
        contract_address: contractAddress,
        function_selector: functionSelector,
        parameter: functionParameters,
        visible: true,
      });

      console.log(ownerAddress, contractAddress, functionSelector, functionParameters);

      if (!response.data.result.result) {
        throw new Error('Something went wrong, please check your input fields and try again!');
      }
      setResult(response.data as EstimationResult);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Error estimating energy usage. Please verify the inputs.'
      );
    }
  };

  const renderContractInfo = () => {
    if (!contractInfo) return null;

    return (
      <ContractInteractionForm contractInfo={contractInfo} />
    );
  };

  const [selectedFunction, setSelectedFunction] = useState('');
  const [functionParams, setFunctionParams] = useState({});

  // const handleSubmit = (e) => {
  //   e.preventDefault();
  //   // Here you would typically call your contract interaction method
  //   console.log('Calling function:', selectedFunction);
  //   console.log('With parameters:', functionParams);
  //   const contract = tronWeb.contract(contractABI, contractAddress);
  
  //   const result = contract[selectedFunction](...Object.values(functionParams)).call();
  //   console.log(result);
  //   // const result = contract[selectedFunction](...Object.values(functionParams));
  //   // console.log(result.toString(10));
  // };
  const ContractInteractionForm = ({ contractInfo }) => {

  
  
    // Reset parameters when function changes
    // useEffect(() => {
    //   if (currentFunction) {
    //     const initialParams = currentFunction.inputs.reduce((acc, input) => {
    //       acc[input.name] = '';
    //       return acc;
    //     }, {} as Record<string, string>);
        
    //     setFunctionParams(initialParams);
    //   }
    // }, [currentFunction]);

  
    const handleFunctionChange = (e) => {
      setSelectedFunction(e.target.value);
    };
  
    const handleParamChange = (paramName, value) => {
      setFunctionParams(prev => ({
        ...prev,
        [paramName]: value
      }));
    };
    
    // Render input field based on parameter type
    const renderInputField = (input) => {
      switch (input.type) {
        case 'address':
          return (
            <input
              type="text"
              placeholder={`Enter ${input.name} (address)`}
              className="w-full p-2 border rounded mt-1 text-black"
              value={functionParams[input.name] || ''}
              onChange={(e) => handleParamChange(input.name, e.target.value)}
            />
          );
        case 'uint256':
          return (
            <input
              type="number"
              placeholder={`Enter ${input.name} (unsigned integer)`}
              className="w-full p-2 border rounded mt-1 text-black"
              value={functionParams[input.name] || ''}
              onChange={(e) => handleParamChange(input.name, e.target.value)}
            />
          );
        case 'bool':
          return (
            <select
              className="w-full p-2 border rounded mt-1"
              value={functionParams[input.name] || ''}
              onChange={(e) => handleParamChange(input.name, e.target.value)}
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
              onChange={(e) => handleParamChange(input.name, e.target.value)}
            />
          );
        default:
          return (
            <input
              type="text"
              placeholder={`Enter ${input.name} (${input.type})`}
              className="w-full p-2 border rounded mt-1"
              value={functionParams[input.name] || ''}
              onChange={(e) => handleParamChange(input.name, e.target.value)}
            />
          );
      }
    };
  
    // If contractInfo is not provided or is incomplete
  if (!contractInfo || !contractInfo.origin_address) {
    setOwnerAddress('');
    return (
      <div className="mt-6 p-6 bg-white rounded-lg shadow-lg border border-gray-200">
        <p className="text-black">No contract information available.</p>
      </div>
    );
  }



  
  
  return (
    <div className="mt-6 p-6 bg-white rounded-lg shadow-lg border border-gray-200">
      <h2 className="text-xl font-semibold mb-4 text-black">Contract Interaction</h2>
      
      {functionsWithInputs.length > 0 ? (
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-black mb-2">Origin Address</label>
            <input
              type="text"
              value={contractInfo.origin_address || 'N/A'}
              readOnly
              className="w-full p-2 border rounded bg-gray-100 text-black"
            />
          </div>

          <div className="mb-4">
            <label className="block text-black mb-2">Function Selector</label>
            <select
              value={selectedFunction}
              onChange={handleFunctionChange}
              className="w-full p-2 border rounded text-black"
            >
              <option value="">Select a Function</option>
              {functionsWithInputs.map((entry) => (
                <option key={entry.name} value={entry.name}>
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
                ?.inputs.map((input) => (
                  <div key={input.name} className="mb-3">
                    <label className="block text-black mb-1">{input.name} ({input.type})</label>
                    {renderInputField(input)}
                  </div>
                ))}
            </div>
          )}

          <button
            type="button"
            className="w-full bg-blue-500 text-white p-2 rounded mt-4 hover:bg-blue-600"
            disabled={!selectedFunction}
          >
            Interact with Contract
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
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 text-center mb-8">
          Extended Contract Energy Calculator
        </h1>

        <div className="mb-6">
          <label className="block mb-2 font-medium text-gray-700">Contract Address</label>
          <input
            type="text"
            value={contractAddress}
            onChange={(e) => setContractAddress(e.target.value)}
            className="w-full p-2 border border-gray-300 text-black rounded-md shadow-sm focus:ring focus:ring-red-200 focus:border-red-500"
          />
          <button
            onClick={fetchContractInfo}
            className="mt-3 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded"
          >
            Fetch Contract Info
          </button>
        </div>

        {renderContractInfo()}
{/* 
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block mb-2 font-medium text-gray-700">Owner Address</label>
            <input
              type="text"
              value={ownerAddress}
              onChange={(e) => setOwnerAddress(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring focus:ring-red-200 focus:border-red-500"
            />
          </div>
          <div>
            <label className="block mb-2 font-medium text-gray-700">Function Selector</label>
            <input
              type="text"
              value={functionSelector}
              onChange={(e) => setFunctionSelector(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring focus:ring-red-200 focus:border-red-500"
            />
          </div>
          <div>
            <label className="block mb-2 font-medium text-gray-700">Function Parameters</label>
            <input
              type="text"
              value={functionParameters}
              onChange={(e) => setFunctionParameters(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring focus:ring-red-200 focus:border-red-500"
            />
          </div>
          <button
            type="submit"
            className="w-full bg-red-600 hover:bg-red-700 text-white py-3 px-6 rounded-lg"
          >
            Estimate Energy
          </button>
        </form>

        {result && (
          <div className="mt-6 p-6 bg-white rounded-lg shadow-lg border border-gray-200">
            <h2 className="text-xl font-semibold mb-4">Estimation Results</h2>
            <p><strong>Energy Used:</strong> {result.energy_used}</p>
          </div>
        )} */}

        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-600">{error}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ExtendedContractCalculator;