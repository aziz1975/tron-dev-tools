import React, { useState } from 'react';
import axios from 'axios';
import * as d3 from 'd3';

const RevenueCalculator = () => {
  // State management
  const [walletAddress, setWalletAddress] = useState<string>('');
  const [initialPeriod, setInitialPeriod] = useState<{ startDate: string; endDate: string }>({
    startDate: '2024-09-01',
    endDate: '2024-09-30'
  });
  const [comparisonPeriod, setComparisonPeriod] = useState<{ startDate: string; endDate: string }>({
    startDate: '2024-10-01',
    endDate: '2024-10-31'
  });
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [results, setResults] = useState<null | { initialPeriod: { startDate: string; endDate: string; uniqueAddresses: number }; comparisonPeriod: { startDate: string; endDate: string; uniqueAddresses: number }; newAddresses: number; growthPercentage: string; newAddressPercentage: string }>(null);

  // Function to fetch transaction data
  const fetchTransactionData = async (address: string, startDate: string, endDate: string) => {
    const query = `
      query {
        tron(network: tron) {
          incoming_txs: transfers(
            receiver: {is: "${address}"}
            date: {after: "${startDate}", before: "${endDate}"}
          ) {
            sender {
              address
            }
            txHash
          }
          outgoing_txs: transfers(
            sender: {is: "${address}"}
            date: {after: "${startDate}", before: "${endDate}"}
          ) {
            receiver {
              address
            }
            txHash
          }
        }
      }
    `;

    try {
      const response = await axios({
        method: 'post',
        url: 'https://graphql.bitquery.io',
        headers: {
          'Content-Type': 'application/json',
          'X-API-KEY': 'BQYczoQmL9Tas2L96S4nnWKMZVPxroVA'
        },
        data: {
          query: query
        }
      });

      return response.data.data.tron;
    } catch (error) {
      console.error('Error fetching transaction data:', error);
      throw new Error('Failed to fetch transaction data');
    }
  };

  // Function to extract unique addresses from transactions
  const extractUniqueAddresses = (txData: { incoming_txs: { sender: { address: string } }[]; outgoing_txs: { receiver: { address: string } }[] }) => {
    const uniqueAddresses = new Set();

    // Process incoming transactions
    if (txData.incoming_txs) {
      txData.incoming_txs.forEach(tx => {
        if (tx.sender && tx.sender.address) {
          uniqueAddresses.add(tx.sender.address);
        }
      });
    }

    // Process outgoing transactions
    if (txData.outgoing_txs) {
      txData.outgoing_txs.forEach(tx => {
        if (tx.receiver && tx.receiver.address) {
          uniqueAddresses.add(tx.receiver.address);
        }
      });
    }

    return Array.from(uniqueAddresses);
  };

  // Function to analyze interaction growth
  const analyzeInteractionGrowth = async () => {
    if (!walletAddress) {
      setError('Please enter a wallet address');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Fetch transaction data for both periods
      const initialData = await fetchTransactionData(
        walletAddress,
        initialPeriod.startDate,
        initialPeriod.endDate
      );

      const comparisonData = await fetchTransactionData(
        walletAddress,
        comparisonPeriod.startDate,
        comparisonPeriod.endDate
      );

      // Extract unique addresses
      const initialAddresses = extractUniqueAddresses(initialData);
      const comparisonAddresses = extractUniqueAddresses(comparisonData);

      // Find new addresses in comparison period
      const newAddresses = comparisonAddresses.filter(addr =>
        !initialAddresses.includes(addr)
      );

      // Calculate growth statistics
      const growthResults = {
        initialPeriod: {
          startDate: initialPeriod.startDate,
          endDate: initialPeriod.endDate,
          uniqueAddresses: initialAddresses.length
        },
        comparisonPeriod: {
          startDate: comparisonPeriod.startDate,
          endDate: comparisonPeriod.endDate,
          uniqueAddresses: comparisonAddresses.length
        },
        newAddresses: newAddresses.length,
        growthPercentage: initialAddresses.length > 0
          ? ((comparisonAddresses.length - initialAddresses.length) / initialAddresses.length * 100).toFixed(2)
          : '0.00',
        newAddressPercentage: comparisonAddresses.length > 0
          ? ((newAddresses.length / comparisonAddresses.length) * 100).toFixed(2)
          : '0.00'
      };

      setResults(growthResults);
      renderChart(growthResults);
    } catch (err) {
      setError('Error analyzing interaction growth: ' + (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  // Function to render the chart
  const renderChart = (data: { initialPeriod: { startDate: string; endDate: string; uniqueAddresses: number }; comparisonPeriod: { startDate: string; endDate: string; uniqueAddresses: number }; newAddresses: number; growthPercentage: string; newAddressPercentage: string } | null) => {
    if (!data) return;

    // Clear previous chart
    d3.select("#growthChart").selectAll("*").remove();

    // Chart dimensions
    const width = 500;
    const height = 300;
    const margin = { top: 30, right: 30, bottom: 60, left: 60 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // Create SVG
    const svg = d3.select("#growthChart")
      .append("svg")
      .attr("width", width)
      .attr("height", height)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Data for bar chart
    const chartData = [
      { period: 'Initial Period', count: data.initialPeriod.uniqueAddresses },
      { period: 'Comparison Period', count: data.comparisonPeriod.uniqueAddresses }
    ];

    // X scale
    const x = d3.scaleBand()
      .domain(chartData.map(d => d.period))
      .range([0, innerWidth])
      .padding(0.3);

    // Y scale
    const y = d3.scaleLinear()
      .domain([0, d3.max(chartData, d => d.count) ?? 0 * 1.2])
      .range([innerHeight, 0]);

    // Draw X axis
    svg.append("g")
      .attr("transform", `translate(0,${innerHeight})`)
      .call(d3.axisBottom(x))
      .selectAll("text")
      .attr("transform", "translate(-10,0)rotate(-45)")
      .style("text-anchor", "end");

    // Draw Y axis
    svg.append("g")
      .call(d3.axisLeft(y));

    // Draw bars
    svg.selectAll(".bar")
      .data(chartData)
      .enter()
      .append("rect")
      .attr("class", "bar")
      .attr("x", d => x(d.period) ?? 0)
      .attr("y", d => y(d.count))
      .attr("width", x.bandwidth())
      .attr("height", d => innerHeight - y(d.count))
      .attr("fill", (d, i) => i === 0 ? "#4f93ce" : "#6ab04c");

    // Add title
    svg.append("text")
      .attr("x", innerWidth / 2)
      .attr("y", -margin.top / 2)
      .attr("text-anchor", "middle")
      .style("font-size", "16px")
      .style("font-weight", "bold")
      .text("Address Interaction Comparison");
  };

  return (
    <div className="bg-gray-100 min-h-screen p-6">
      <div className="max-w-6xl mx-auto bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold text-center text-gray-800 mb-6">TRON Address Interaction Growth Analysis</h1>

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
          </div>
          <div className="mb-4">

          </div>

          {/* Date Range Inputs */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border border-gray-200 p-4 rounded-lg">
              <h3 className="text-md font-medium mb-2 text-gray-700">Initial Period</h3>
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
              {loading ? "Analyzing..." : "Analyze Interaction Growth"}
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
                <h3 className="text-md font-medium mb-2 text-blue-800">Initial Period</h3>
                <p className="text-sm text-gray-700">
                  <span className="font-semibold">Date Range:</span>{" "}
                  {new Date(results.initialPeriod.startDate).toLocaleDateString()} to {new Date(results.initialPeriod.endDate).toLocaleDateString()}
                </p>
                <p className="text-sm text-gray-700">
                  <span className="font-semibold">Unique Addresses:</span>{" "}
                  {results.initialPeriod.uniqueAddresses}
                </p>
              </div>

              <div className="bg-green-50 p-4 rounded-lg shadow-sm">
                <h3 className="text-md font-medium mb-2 text-green-800">Comparison Period</h3>
                <p className="text-sm text-gray-700">
                  <span className="font-semibold">Date Range:</span>{" "}
                  {new Date(results.comparisonPeriod.startDate).toLocaleDateString()} to {new Date(results.comparisonPeriod.endDate).toLocaleDateString()}
                </p>
                <p className="text-sm text-gray-700">
                  <span className="font-semibold">Unique Addresses:</span>{" "}
                  {results.comparisonPeriod.uniqueAddresses}
                </p>
                <p className="text-sm text-gray-700">
                  <span className="font-semibold">New Addresses:</span>{" "}
                  {results.newAddresses}
                </p>
              </div>

              <div className="bg-purple-50 p-4 rounded-lg shadow-sm">
                <h3 className="text-md font-medium mb-2 text-purple-800">Growth Metrics</h3>
                <p className="text-sm text-gray-700">
                  <span className="font-semibold">Overall Growth:</span>{" "}
                  {results.growthPercentage}%
                </p>
                <p className="text-sm text-gray-700">
                  <span className="font-semibold">New Address %:</span>{" "}
                  {results.newAddressPercentage}%
                </p>
              </div>
            </div>

            {/* Chart Section */}
            <div className="mt-6">
              <h3 className="text-lg font-medium mb-4 text-gray-700">Visual Comparison</h3>

              {/* Render the chart or show a placeholder when no data is available */}
              <div id="growthChart" className="w-full h-80 bg-white p-4 border border-gray-200 rounded-lg flex justify-center items-center">
                {!results ? (
                  <p className="text-gray-500">Run analysis to generate visual comparison</p>
                ) : (
                  /* The D3 chart will be rendered here by the renderChart function */
                  <div className="w-full h-full" id="chartContainer"></div>
                )}
              </div>

              {/* Legend for the chart */}
              {results && (
                <div className="mt-4 flex items-center justify-center space-x-6">
                  <div className="flex items-center">
                    <div className="w-4 h-4 bg-blue-600 mr-2"></div>
                    <span className="text-sm">Initial Period</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-4 h-4 bg-green-600 mr-2"></div>
                    <span className="text-sm">Comparison Period</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RevenueCalculator;
