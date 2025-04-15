"use client";

import React, { useState, useEffect, useRef } from "react";
import * as d3 from 'd3';


interface MonthlyData {
  [key: string]: {
    totalEnergyUsed: number;
    totalBandwidthUsed: number;
    days: number;
  };
}

interface DailyData {
  timestamp: string;
  energy_usage?: string;
  energy_burn?: string;
  origin_energy_usage?: string;
  net_usage?: string;
  net_burn?: string;
}

interface AnalysisResult {
  address?: string;
  dataPoints?: number;
  startDate?: string;
  endDate?: string;
  calculationType?: string;
  avgEnergyUsed?: string; // Make sure to include this line
  totalEnergyUsed?: string;
  avgMonthlyEnergyUsed?: string;
  avgBandwidthUsed?: string;
  totalBandwidthUsed?: string;
  avgMonthlyBandwidthUsed?: string;
  dailyData?: DailyData[];
  error?: null | string;
}


const ResourceCalculator: React.FC = () => {
  const [addresses, setAddresses] = useState<string[]>([]);
  const [inputAddress, setInputAddress] = useState<string>("");
  const [walletName, setWalletName] = useState<string>("");
  const [results, setResults] = useState<AnalysisResult[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [file, setFile] = useState<File | null>(null);

  // State for date range and calculation type
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [calculationType, setCalculationType] = useState<string>("2"); // Default to Energy Consumption

  // Initialize with one year date range
  useEffect(() => {
    const today = new Date();
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(today.getFullYear() - 1);

    setEndDate(today.toISOString().split('T')[0]);
    setStartDate(oneYearAgo.toISOString().split('T')[0]);
  }, []);

  // Function to validate TRON address (simple validation)
  const isValidTronAddress = (address: string): boolean => {
    return /^T[A-Za-z0-9]{33}$/.test(address);
  };

  // Parse CSV file
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = event.target.files?.[0];
    if (!uploadedFile) return;

    setFile(uploadedFile);

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split(',');
      const validAddresses: string[] = [];

      lines.forEach(line => {
        const trimmedLine = line.trim();
        if (trimmedLine && isValidTronAddress(trimmedLine)) {
          validAddresses.push(trimmedLine);
        }
      });

      if (validAddresses.length > 0) {
        setAddresses(validAddresses);
        setError("");
      } else {
        setError("No valid TRON addresses found in the CSV file.");
      }
    };
    reader.readAsText(uploadedFile);
  };

  // Add single address
  const handleAddAddress = () => {
    if (!inputAddress) {
      setError("Please enter a TRON wallet address.");
      return;
    }

    if (!isValidTronAddress(inputAddress)) {
      setError("Please enter a valid TRON wallet address.");
      return;
    }

    if (!addresses.includes(inputAddress)) {
      setAddresses([...addresses, inputAddress]);
      setInputAddress("");
      setError("");
    } else {
      setError("This address is already in the list.");
    }
  };

  // Remove address from list
  const removeAddress = (addressToRemove: string) => {
    setAddresses(addresses.filter(address => address !== addressToRemove));
  };

  // Format display based on calculation type
  const getCalculationTypeLabel = (type: string) => {
    switch (type) {
      case "2": return "Monthly Energy Usage";
      case "3": return "Monthly Bandwidth Usage";
      default: return "Unknown";
    }
  };



  // Format data for display based on calculation type
  const formatResultData = (result: AnalysisResult) => {
    if (result.error) return { display: "Error", raw: 0 };
    let rawAvgDailyEnergy = parseFloat(result.totalEnergyUsed || "0") / (result.dataPoints || 1);
    let rawAvgDailyBandwidth = parseFloat(result.totalBandwidthUsed || "0") / (result.dataPoints || 1);

    switch (calculationType) {
      case "2":
        return {
          display: `${rawAvgDailyEnergy.toFixed(2).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`,
          raw: rawAvgDailyEnergy
        };
      case "3":
        return {
          display: `${rawAvgDailyBandwidth.toFixed(2).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")} Bandwidth/month`,
          raw: rawAvgDailyBandwidth
        };
      default:
        return { display: "Unknown", raw: 0 };
    }
  };


  // Function to calculate monthly averages
  /*
  const calculateMonthlyAverage = (dailyData: DailyData[]) => {
    if (!dailyData || dailyData.length === 0) return 0;

    // Group by month
    const monthlyData: MonthlyData = {};

    dailyData.forEach(day => {
      // Extract year and month from timestamp
      const date = new Date(parseInt(day.timestamp));
      const yearMonth = `${date.getFullYear()}-${date.getMonth() + 1}`;

      if (!monthlyData[yearMonth]) {
        monthlyData[yearMonth] = {
          totalEnergyUsed: 0,
          totalBandwidthUsed: 0,
          days: 0
        };
      }

      // Add energy data
      if (calculationType === "2") {
        const usage = parseFloat(String(day.energy_usage || 0));
        const burn = parseFloat(String(day.energy_burn || 0));
        const origin = parseFloat(String(day.origin_energy_usage || 0));
        monthlyData[yearMonth].totalEnergyUsed += usage + burn + origin;
      }

      // Add bandwidth data
      if (calculationType === "3") {
        const usage = parseFloat(String(day.net_usage || 0));
        const burn = parseFloat(String(day.net_burn || 0));
        monthlyData[yearMonth].totalBandwidthUsed += usage + burn;
      }
      monthlyData[yearMonth].days++;
    });

    // Calculate average per month
    const months = Object.keys(monthlyData);
    let totalMonthlyAverage = 0;

    months.forEach(month => {
      if (calculationType === "2") {
        const monthAvg = monthlyData[month].totalEnergyUsed;
        totalMonthlyAverage += monthAvg;
      } else if (calculationType === "3") {
        const monthAvg = monthlyData[month].totalBandwidthUsed;
        totalMonthlyAverage += monthAvg;
      }
    });


    return totalMonthlyAverage / 12;
  };*/

  // Fetch data for a single address
  const fetchAddressData = async (address: string) => {
    try {
      // Convert dates to timestamps
      const startTimestamp = new Date(startDate).getTime();
      const endTimestamp = new Date(endDate).getTime() + 86400000; // Add one day to include the end date

      // Fetch data using the specified analysis API endpoint
      const analysisResponse = await fetch(
        `https://apilist.tronscanapi.com/api/account/analysis?address=${address}&type=${calculationType}&start_timestamp=${startTimestamp}&end_timestamp=${endTimestamp}`
      );

      if (!analysisResponse.ok) {
        throw new Error(`Error fetching analysis data: ${analysisResponse.statusText}`);
      }

      const analysisData = await analysisResponse.json();

      // Process data based on calculation type
      const result = {
        address,
        dataPoints: analysisData.data?.length || 0,
        startDate,
        endDate,
        calculationType: getCalculationTypeLabel(calculationType),
        avgEnergyUsed: analysisData.avg_energy_used || null, // Ensure this is defined
        totalEnergyUsed: analysisData.total_energy_used || null, // Ensure this is defined
        avgMonthlyEnergyUsed: analysisData.avg_monthly_energy_used || null, // Ensure this is defined
        avgBandwidthUsed: analysisData.avg_bandwidth_used || null, // Ensure this is defined
        totalBandwidthUsed: analysisData.total_bandwidth_used || null, // Ensure this is defined
        avgMonthlyBandwidthUsed: analysisData.avg_monthly_bandwidth_used || null, // Ensure this is defined
        dailyData: analysisData.data || [], // Ensure this is defined
        error: null
      };

      if (!analysisData.data || analysisData.data.length === 0) {
        return {
          ...result,
          error: "No data available for the selected period"
        };
      }

      switch (calculationType) {
        case "2": // Energy consumption
          const totalEnergyUsed = analysisData.data.reduce((sum: number, day: DailyData) => {
            const usage = parseFloat(String(day.energy_usage || 0));
            const burn = parseFloat(String(day.energy_burn || 0));
            const origin = parseFloat(String(day.origin_energy_usage || 0));
            return sum + usage + burn + origin;
          }, 0);

          result.avgEnergyUsed = (totalEnergyUsed / analysisData.data.length).toFixed(2);
          result.totalEnergyUsed = totalEnergyUsed.toFixed(2);

          // Calculate monthly average
          // result.avgMonthlyEnergyUsed = calculateMonthlyAverage(analysisData.data).toFixed(2);
          break;

        case "3": // Bandwidth consumption
          const totalBandwidthUsed = analysisData.data.reduce((sum: number, day: DailyData) => {
            const usage = parseFloat(String(day.net_usage || 0));
            const burn = parseFloat(String(day.net_burn || 0));
            return sum + usage + burn;
          }, 0);

          result.avgBandwidthUsed = (totalBandwidthUsed / analysisData.data.length).toFixed(2);
          result.totalBandwidthUsed = totalBandwidthUsed.toFixed(2);

          // Calculate monthly average
          //  result.avgMonthlyBandwidthUsed = calculateMonthlyAverage(analysisData.data).toFixed(2);
          break;
      }

      // Store the raw data for potential charts
      result.dailyData = analysisData.data;

      return result;
    } catch (error) {
      console.error("Error fetching data for address:", address, error);
      return {
        address,
        calculationType: getCalculationTypeLabel(calculationType),
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  };

  // Calculate for all addresses
  const calculateAll = async () => {
    if (addresses.length === 0) {
      setError("Please enter at least one TRON wallet address.");
      return;
    }

    if (!startDate || !endDate) {
      setError("Please select both start and end dates.");
      return;
    }

    const startTimestamp = new Date(startDate).getTime();
    const endTimestamp = new Date(endDate).getTime();

    if (startTimestamp > endTimestamp) {
      setError("Start date must be before end date.");
      return;
    }

    setLoading(true);
    setResults([]);

    try {
      const resultsArray = [];

      for (const address of addresses) {
        const result = await fetchAddressData(address);
        resultsArray.push(result);
      }

      setResults(resultsArray);
      setError("");
    } catch (error) {
      console.error("Error calculating resources:", error);
      setError("An error occurred while fetching data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Clear all data
  const clearAll = () => {
    setAddresses([]);
    setInputAddress("");
    setResults([]);
    setError("");
    setFile(null);
  };

  // Get calculation type options
  const calculationTypeOptions = [
    { value: "2", label: "Energy Consumption" },
    { value: "3", label: "Bandwidth Consumption" }
  ];

  // Define the component props type
  interface ResultsVisualizationProps {
    results: AnalysisResult[];
    calculationType: string;
  }
  // Add visualization component for the results
  const ResultsVisualization: React.FC<ResultsVisualizationProps> = ({ results, calculationType }) => {
    const chartRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      if (results.length > 0 && chartRef.current) {
        // Clear previous visualizations
        d3.select(chartRef.current).selectAll("*").remove();

        // Set up dimensions
        const margin = { top: 40, right: 30, bottom: 60, left: 60 };
        const width = 800 - margin.left - margin.right;
        const height = 400 - margin.top - margin.bottom;

        // Create SVG
        const svg = d3.select(chartRef.current)
          .append("svg")
          .attr("width", width + margin.left + margin.right)
          .attr("height", height + margin.top + margin.bottom)
          .append("g")
          .attr("transform", `translate(${margin.left},${margin.top})`);

        // Group data by address for bar chart
        const validResults = results.filter(r => !r.error);

        if (validResults.length === 0) return;

        // Create scales
        const xScale = d3.scaleBand()
          .domain(validResults.map(r => r.address?.substring(0, 10) + "..."))
          .range([0, width])
          .padding(0.3);

        let maxValue: number | undefined;
        let valueKey: keyof AnalysisResult = "avgMonthlyEnergyUsed";

        switch (calculationType) {
          case "2":
            valueKey = "avgMonthlyEnergyUsed";
            maxValue = d3?.max(validResults, d => parseFloat(String(d[valueKey] || "0")) * 1.2);
            break;
          case "3":
            valueKey = "avgMonthlyBandwidthUsed";
            maxValue = d3?.max(validResults, d => parseFloat(String(d[valueKey] || "0")) * 1.2);
            break;
        }

        const yScale = d3.scaleLinear()
          .domain([0, maxValue || 0])
          .range([height, 0]);

        // Add X axis
        svg.append("g")
          .attr("transform", `translate(0, ${height})`)
          .call(d3.axisBottom(xScale))
          .selectAll("text")
          .attr("transform", "translate(-10,0)rotate(-45)")
          .style("text-anchor", "end");

        // Add Y axis
        svg.append("g")
          .call(d3.axisLeft(yScale));

        // Add Y axis label
        svg.append("text")
          .attr("transform", "rotate(-90)")
          .attr("y", -margin.left + 20)
          .attr("x", -height / 2)
          .attr("text-anchor", "middle")
          .text(calculationType === "2" ? "Monthly Energy Usage" : "Monthly Bandwidth Usage");

        // Add bars with type-safe D3 event handling
        svg.selectAll(".bar")
          .data(validResults)
          .enter()
          .append("rect")
          .attr("class", "bar")
          .attr("x", d => xScale(d.address?.substring(0, 10) + "...") || 0)
          .attr("y", d => yScale(parseFloat(d[valueKey] || "0")))
          .attr("width", xScale.bandwidth())
          .attr("height", d => height - yScale(parseFloat(d[valueKey] || "0")))
          .attr("fill", calculationType === "2" ? "#4f93ce" : "#6ab04c")
          .on("mouseover", function (this: SVGRectElement, event: MouseEvent, d: AnalysisResult) {
            d3.select(this).attr("fill", calculationType === "2" ? "#2a5d8c" : "#3e6b29");

            // Show tooltip
            svg.append("text")
              .attr("class", "tooltip")
              .attr("x", (xScale(d.address?.substring(0, 10) + "...") || 0) + xScale.bandwidth() / 2)
              .attr("y", yScale(parseFloat(d[valueKey] || "0")) - 10)
              .attr("text-anchor", "middle")
              .style("font-size", "12px")
              .text(`${parseFloat(d[valueKey] || "0").toFixed(2)}`);
          })
          .on("mouseout", function (this: SVGRectElement) {
            d3.select(this).attr("fill", calculationType === "2" ? "#4f93ce" : "#6ab04c");
            svg.selectAll(".tooltip").remove();
          });

        // Add title
        svg.append("text")
          .attr("x", width / 2)
          .attr("y", -margin.top / 2)
          .attr("text-anchor", "middle")
          .style("font-size", "16px")
          .style("font-weight", "bold")
          .text(calculationType === "2" ? "Monthly Energy Usage by Address" : "Monthly Bandwidth Usage by Address");
      }
    }, [results, calculationType]);

    return (
      <div className="mt-8">
        <h3 className="text-lg font-bold mb-4">Visualization</h3>
        <div
          ref={chartRef}
          className="overflow-x-auto bg-white p-4 rounded-lg shadow-sm border border-gray-200"
          style={{ minHeight: "400px" }}
        />
      </div>
    );
  };

  return (
    <div className="bg-gray-100 min-h-screen p-6">
      <div className="max-w-6xl mx-auto bg-white rounded-lg shadow-md p-6">
        <h1 className="text-3xl font-bold text-center text-gray-800 mb-6">TRON Resource Calculator</h1>

        {/* Input Section */}
        <div className="mb-8 bg-gray-50 p-4 rounded-lg">
          <h2 className="text-xl font-semibold mb-4 text-gray-700">Input Parameters</h2>

          {/* Date Range and Calculation Type */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full text-gray-700 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-4 py-2 text-gray-700 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Resource Type</label>
              <select
                value={calculationType}
                onChange={(e) => setCalculationType(e.target.value)}
                className="w-full px-4 py-2 text-gray-700 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {calculationTypeOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Address Input */}
          <div className="flex flex-col md:flex-row gap-4 mb-4">
            <input
              type="text"
              className="flex-1 px-4 py-2 border text-gray-700 border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter TRON Wallet Address (starts with T)"
              value={inputAddress}
              onChange={(e) => setInputAddress(e.target.value)}
            />
            <input
              type="text"
              value={walletName}
              disabled
              onChange={(e) => setWalletName(e.target.value)}
              placeholder="Enter Wallet Name"
              className="flex-1 px-4 py-2 border text-gray-700 border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleAddAddress}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Add Address
            </button>
          </div>

          {/* CSV Upload */}
          <div className="mb-4">
            <p className="text-sm text-gray-600 mb-2">Or upload a CSV file with addresses (one per line):</p>
            <input
              type="file"
              accept=".csv,.txt"
              onChange={handleFileUpload}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
          </div>

          {error && <p className="text-red-500 mt-2">{error}</p>}

          {/* Addresses List */}
          {addresses.length > 0 && (
            <div className="mt-4">
              <h3 className="text-lg font-medium mb-2">Addresses to Process:</h3>
              <ul className="max-h-40 overflow-y-auto bg-white border border-gray-200 rounded-md p-2">
                {addresses.map((address, index) => (
                  <li key={index} className="flex justify-between items-center py-1 border-b border-gray-100 last:border-0">
                    <span className="text-gray-800 font-mono text-sm">{address}</span>
                    <button
                      onClick={() => removeAddress(address)}
                      className="text-red-500 hover:text-red-700"
                    >
                      ✕
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Action Buttons */}
          <div className="mt-4 flex gap-4">
            <button
              onClick={calculateAll}
              disabled={loading || addresses.length === 0}
              className={`px-6 py-2 rounded-md text-white ${loading || addresses.length === 0
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-green-600 hover:bg-green-700"
                } transition-colors`}
            >
              {loading ? "Calculating..." : "Calculate"}
            </button>

            <button
              onClick={clearAll}
              className="px-6 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
            >
              Clear All
            </button>
          </div>
        </div>

        {/* Results Section */}
        {results.length > 0 && (
          <div className="mt-8">
            <h2 className="text-xl font-semibold mb-4 text-gray-700">
              Results - {getCalculationTypeLabel(calculationType)}
              <span className="ml-2 text-sm font-normal text-gray-500">
                ({new Date(startDate).toLocaleDateString()} to {new Date(endDate).toLocaleDateString()})
              </span>
            </h2>

            <div className="overflow-x-auto">
              <table className="min-w-full bg-white border border-gray-200 rounded-lg shadow-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="py-3 px-4 border-b text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Address</th>
                    <th className="py-3 px-4 border-b text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      {calculationType === "2" ? "Daily Avg. Energy" : "Daily Avg. Bandwidth"}
                    </th>
                    <th className="py-3 px-4 border-b text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Data Points</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((result, index) => {
                    const formattedData = formatResultData(result);
                    return (
                      <tr key={index} className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                        <td className="py-3 px-4 border-b text-gray-700 text-sm font-mono">{result.address}</td>
                        <td className="py-3 px-4 border-b text-gray-700 text-sm text-right">{formattedData.display}</td>
                        <td className="py-3 px-4 border-b text-gray-700 text-sm text-right">{result.error ? "Error" : result.dataPoints}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Add D3.js Visualization */}
            <ResultsVisualization results={results} calculationType={calculationType} />

            {/* Summary Stats */}
            <div className="mt-6 bg-blue-50 p-4 rounded-lg shadow-sm">
              <h3 className="text-lg font-bold text-blue-800 mb-2">Summary Statistics</h3>

              {calculationType === "2" && (
                <p className="text-sm text-gray-700">
                  <span className="font-semibold">Total Energy Consumed:</span>{" "}
                  {(results
                    .filter(r => !r.error)
                    .reduce((sum, item) => sum + parseFloat(String(item.totalEnergyUsed || 0)), 0) / 12
                  ).toFixed(2).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
                </p>
              )}

              {calculationType === "3" && (
                <p className="text-sm text-gray-700">
                  <span className="font-semibold">Total Bandwidth Consumed:</span>{" "}
                  {(results
                    .filter(r => !r.error)
                    .reduce((sum, item) => sum + parseFloat(String(item.totalBandwidthUsed || 0)), 0) / 12
                  ).toFixed(2)}
                </p>
              )}

              <p className="text-sm text-gray-700 mt-1">
                <span className="font-semibold">Successful Addresses:</span>{" "}
                {results.filter(r => !r.error).length} of {results.length}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ResourceCalculator;