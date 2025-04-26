import React, { useState } from 'react';
import * as d3 from 'd3';

const RevenueCalculator = () => {
  // State management
  const [walletAddress, setWalletAddress] = useState<string>('');
  //const [trxbaseCost, setTrxbaseCost] = useState<number>();
  //const [trxGrant, setTrxGrant] = useState<number>();
  const [energyCostSun, setEnergyCostSun] = useState<number>();
  const [netCostSun, setnetCostSun] = useState<number>();
  const [initialPeriod, setInitialPeriod] = useState<{ startDate: string; endDate: string }>({
    startDate: '2025-01-01',
    endDate: '2025-01-31'
  });
  const [comparisonPeriod, setComparisonPeriod] = useState<{ startDate: string; endDate: string }>({
    startDate: '2025-01-01',
    endDate: '2025-01-31'
  });
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [results, setResults] = useState<null | { basePeriodNet: { startDate: string; endDate: string; baseNetUsage: number }; basePeriodEnergy: { startDate: string; endDate: string; baseEnergyUsage: number }; basePeriodTransfers: { startDate: string; endDate: string; baseTransfersUsage: number }; newPeriodNet: { startDate: string; endDate: string; newNetUsage: number }; newPeriodEnergy: { startDate: string; endDate: string; newEnergyUsage: number }; newPeriodTransfers: { startDate: string; endDate: string; newTransfersUsage: number }; deltaEnergy: number; deltaNet: number; deltaTransfers: number; growthEnergyPercentage: string; growthNetPercentage: string; growthTransfersPercentage: string }>(null);

  // Function to fetch transaction data
  //Change to this endpoint, no need for bitquery: https://apilist.tronscanapi.com/api/account/analysis?address=TVYrm58wtdjMn2akCyyJEEHyAzbaZEbSUW&type=3&start_timestamp=1731275499000&end_timestamp=1733867499000
  const fetchTransactionData = async (address: string, startDate: string, endDate: string, resourceType: number) => {

    // Convert dates to timestamps
    const startTimestamp = new Date(startDate).getTime();
    const endTimestamp = new Date(endDate).getTime();

    try {
      const response = await fetch(
        `https://apilist.tronscanapi.com/api/account/analysis?address=${walletAddress}&type=${resourceType}&start_timestamp=${startTimestamp}&end_timestamp=${endTimestamp}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'TRON-PRO-API-KEY': '3b9ff34d-f68b-4d9d-83ae-9a4f68835771' // Replace with your actual API key
          }
        }
      );

      if (!response.ok) {
        throw new Error(`Error fetching analysis data: ${response.statusText}`);
      }

      const analysisData = await response.json();
      console.log(analysisData);
      return analysisData;
    } catch (error) {
      console.error('Error fetching transaction data:', error);
      throw new Error('Failed to fetch transaction data');
    }
  };


  // Function to analyze interaction growth
  const analyzeInteractionGrowth = async () => {
    const TRANSFERS: number = 1;
    const ENERGY: number = 2;
    const NET: number = 3;

    const TRANSACTION: number = 4;
    if (!walletAddress) {
      setError('Please enter a wallet address');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Fetch transaction data for both periods
      function sleep(ms: number) {
        return new Promise(resolve => setTimeout(resolve, ms));
      }

      const [
        initialNetData,
        initialEnergyData,
        initialTransfersData,
      ] = await Promise.all([
        fetchTransactionData(walletAddress, initialPeriod.startDate, initialPeriod.endDate, NET),
        fetchTransactionData(walletAddress, initialPeriod.startDate, initialPeriod.endDate, ENERGY),
        fetchTransactionData(walletAddress, initialPeriod.startDate, initialPeriod.endDate, TRANSFERS),
      ]);

      await sleep(2000); // wait for 2 seconds

      const [
        comparisonNetData,
        comparisonEnergyData,
        comparisonTransfersData,
      ] = await Promise.all([
        fetchTransactionData(walletAddress, comparisonPeriod.startDate, comparisonPeriod.endDate, NET),
        fetchTransactionData(walletAddress, comparisonPeriod.startDate, comparisonPeriod.endDate, ENERGY),
        fetchTransactionData(walletAddress, comparisonPeriod.startDate, comparisonPeriod.endDate, TRANSFERS),
      ]);



      // Extract 
      const baseNetUsage = initialNetData.data.reduce((acc: number, obj: any) => acc + obj.net_usage_total, 0);
      const baseEnergyUsage = initialEnergyData.data.reduce((acc: number, obj: any) => acc + obj.energy_usage_total, 0);
      const baseTransfersUsage = initialTransfersData.data.reduce((acc: number, obj: any) => acc + obj.token_count, 0);
      const newNetUsage = comparisonNetData.data.reduce((acc: number, obj: any) => acc + obj.net_usage_total, 0);
      const newEnergyUsage = comparisonEnergyData.data.reduce((acc: number, obj: any) => acc + obj.energy_usage_total, 0);
      const newTransfersUsage = comparisonTransfersData.data.reduce((acc: number, obj: any) => acc + obj.token_count, 0);


      // Calculate growth statistics
      const growthResults = {
        basePeriodNet: {
          startDate: initialPeriod.startDate,
          endDate: initialPeriod.endDate,
          baseNetUsage: baseNetUsage
        },
        basePeriodEnergy: {
          startDate: initialPeriod.startDate,
          endDate: initialPeriod.endDate,
          baseEnergyUsage: baseEnergyUsage
        },
        basePeriodTransfers: {
          startDate: initialPeriod.startDate,
          endDate: initialPeriod.endDate,
          baseTransfersUsage: baseTransfersUsage
        },
        newPeriodNet: {
          startDate: comparisonPeriod.startDate,
          endDate: comparisonPeriod.endDate,
          newNetUsage: newNetUsage
        },
        newPeriodEnergy: {
          startDate: comparisonPeriod.startDate,
          endDate: comparisonPeriod.endDate,
          newEnergyUsage: newEnergyUsage
        },
        newPeriodTransfers: {
          startDate: comparisonPeriod.startDate,
          endDate: comparisonPeriod.endDate,
          newTransfersUsage: newTransfersUsage
        },
        deltaEnergy: newEnergyUsage - baseEnergyUsage,
        deltaNet: newNetUsage - baseNetUsage,
        deltaTransfers: newTransfersUsage - baseTransfersUsage,
        growthEnergyPercentage: ((newEnergyUsage - baseEnergyUsage) / baseEnergyUsage * 100).toFixed(2),
        growthNetPercentage: ((newNetUsage - baseNetUsage) / baseNetUsage * 100).toFixed(2),
        growthTransfersPercentage: ((newTransfersUsage - baseTransfersUsage) / baseTransfersUsage * 100).toFixed(2)

      };

      setResults(growthResults);
      // renderChart(growthResults);
    } catch (err) {
      setError('Error analyzing interaction growth: ' + (err as Error).message);
    } finally {
      setLoading(false);
    }
  };



  return (
    <div className="bg-gray-100 min-h-screen p-6">
      <div className="max-w-6xl mx-auto bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold text-center text-gray-800 mb-6">Account Revenue Calculator</h1>

        <div className="mb-6 bg-gray-50 p-4 rounded-lg">
          <h2 className="text-xl font-semibold mb-4 text-gray-700">Input Parameters</h2>

          {/* Wallet Address */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Wallet Address</label>
            <input
              type="text"
              value={walletAddress}
              onChange={(e) => setWalletAddress(e.target.value)}
              placeholder="Enter TRON wallet address (starts with T)"
              className="w-full px-4 py-2 border text-gray-700 border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

            <div className="mb-4"></div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Energy Unit Cost</label>
            <input
              type="number"
              value={energyCostSun}
              onChange={(e) => setEnergyCostSun(Number(e.target.value))}
              placeholder="Enter Energy unit cost in SUN"
              className="w-full px-4 py-2 border text-gray-700 border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="mb-4"></div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Bandwidth Unit Cost</label>
            <input
              type="number"
              value={netCostSun}
              onChange={(e) => setnetCostSun(Number(e.target.value))}
              placeholder="Enter Bandwidth unit cost in SUN"
              className="w-full px-4 py-2 border text-gray-700 border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

          </div>
          <div className="mb-4">

          </div>

          {/* Date Range Inputs */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border border-gray-200 p-4 rounded-lg">
              <h3 className="text-md font-medium mb-2 text-gray-700">Baseline Period</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={initialPeriod.startDate}
                    onChange={(e) => setInitialPeriod({ ...initialPeriod, startDate: e.target.value })}
                    className="w-full px-4 py-2 border text-gray-700 border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                  <input
                    type="date"
                    value={initialPeriod.endDate}
                    onChange={(e) => setInitialPeriod({ ...initialPeriod, endDate: e.target.value })}
                    className="w-full px-4 py-2 border text-gray-700 border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            <div className="border border-gray-200 p-4 rounded-lg">
              <h3 className="text-md font-medium mb-2 text-gray-700">Comparison Period</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={comparisonPeriod.startDate}
                    onChange={(e) => setComparisonPeriod({ ...comparisonPeriod, startDate: e.target.value })}
                    className="w-full px-4 py-2 border text-gray-700 border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                  <input
                    type="date"
                    value={comparisonPeriod.endDate}
                    onChange={(e) => setComparisonPeriod({ ...comparisonPeriod, endDate: e.target.value })}
                    className="w-full px-4 py-2 border text-gray-700 border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Action Button */}
          <div className="mt-4">
            <button
              onClick={analyzeInteractionGrowth}
              disabled={loading}
              className={`px-6 py-2 rounded-md text-white ${loading ? "bg-gray-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"
                } transition-colors`}
            >
              {loading ? "Analyzing..." : "Analyze Account Revenue"}
            </button>
          </div>

          {error && <p className="text-red-500 mt-2">{error}</p>}
        </div>

        {/* Results Section */}
        {results && (
          <div className="mt-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-700">Analysis Results</h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-blue-50 p-4 rounded-lg shadow-sm">
                <h3 className="text-md font-medium mb-2 text-blue-800">Baseline Period</h3>
                <p className="text-sm text-gray-700">
                  <span className="font-semibold">Date Range:</span>{" "}
                  {new Date(results.basePeriodNet.startDate).toLocaleDateString()} to {new Date(results.basePeriodNet.endDate).toLocaleDateString()}
                </p>
                <p className="text-sm text-gray-700">
                  <span className="font-semibold">Bandwidth Usage:</span>{" "}
                  {results.basePeriodNet.baseNetUsage.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
                </p>
                <p className="text-sm text-gray-700">
                  <span className="font-semibold">Energy Usage:</span>{" "}
                  {results.basePeriodEnergy.baseEnergyUsage.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
                </p>
                <p className="text-sm text-gray-700">
                  <span className="font-semibold">Tokens transfer count:</span>{" "}
                  {results.basePeriodTransfers.baseTransfersUsage.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
                </p>
              </div>

              <div className="bg-green-50 p-4 rounded-lg shadow-sm">
                <h3 className="text-md font-medium mb-2 text-green-800">Comparison Period</h3>
                <p className="text-sm text-gray-700">
                  <span className="font-semibold">Period:</span>{" "}
                  {new Date(results.newPeriodNet.startDate).toLocaleDateString()} to {new Date(results.newPeriodNet.endDate).toLocaleDateString()}
                </p>
                <p className="text-sm text-gray-700">
                  <span className="font-semibold">Bandwidth Usage:</span>{" "}
                  {results.newPeriodNet.newNetUsage.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
                </p>
                <p className="text-sm text-gray-700">
                  <span className="font-semibold">Energy Usage:</span>{" "}
                  {results.newPeriodEnergy.newEnergyUsage.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
                </p>
                <p className="text-sm text-gray-700">
                  <span className="font-semibold">Tokens transfer count:</span>{" "}
                  {results.newPeriodTransfers.newTransfersUsage.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
                </p>

              </div>

              <div className="bg-purple-50 p-4 rounded-lg shadow-sm">
                <h3 className="text-md font-medium mb-2 text-purple-800">Revenue Metrics</h3>
                <p className="text-sm text-gray-700">
                  <span className="font-semibold">Bandwidth Delta:</span>{" "}
                  {results.deltaNet.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") + " (" + results.growthNetPercentage + "%)"}
                </p>
                <p className="text-sm text-gray-700">
                  <span className="font-semibold">Energy Delta:</span>{" "}
                  {results.deltaEnergy.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") + " (" + results.growthEnergyPercentage + "%)"}
                </p>
                <p className="text-sm text-gray-700">
                  <span className="font-semibold">Token Transfer Delta:</span>{" "}
                  {results.deltaTransfers.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") + " (" + results.growthTransfersPercentage + "%)"}
                </p>
                <p className="text-sm text-gray-700">
                  <span className="font-semibold">Bandwidth Revenue:</span>{" "}
                  {((results.deltaNet * (netCostSun ?? 0) / 1000000).toFixed(2).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") + " TRX")}
                </p>
                <p className="text-sm text-gray-700">
                  <span className="font-semibold">Energy Revenue:</span>{" "}
                  {((results.deltaEnergy * (energyCostSun ?? 0) / 1000000).toFixed(2).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") + " TRX")}
                </p>

              </div>
            </div>


          </div>
        )}
      </div>
    </div >
  );
};

export default RevenueCalculator;
