/* eslint-disable */
"use client";

import React, { useState, useEffect, useRef } from "react";
import * as d3 from 'd3';

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
  avgDailyTotalEnergyUsed?: string;
  avgDailyBurnEnergyUsed?: string;
  avgDailyStakingEnergyUsed?: string;
  minDailyTotalEnergyUsed?: string;
  maxDailyTotalEnergyUsed?: string;
  totalEnergyUsed?: string;
  avgDailyTotalBandwidthUsed?: string;
  avgDailyBurnBandwidthUsed?: string;
  avgDailyStakingBandwidthUsed?: string;
  minDailyTotalBandwidthUsed?: string;
  maxDailyTotalBandwidthUsed?: string;
  totalBandwidthUsed?: string;
  dailyData?: DailyData[];
  error?: null | string;
}

const ResourceCalculator: React.FC = () => {
  const [addresses, setAddresses] = useState<string[]>([]);
  const [inputAddress, setInputAddress] = useState<string>("");
  const [results, setResults] = useState<AnalysisResult[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [file, setFile] = useState<File | null>(null);

  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [calculationType, setCalculationType] = useState<string>("2"); // "2"=Energy, "3"=Bandwidth

  useEffect(() => {
    const today = new Date();
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(today.getFullYear() - 1);
    setEndDate(today.toISOString().split('T')[0]);
    setStartDate(oneYearAgo.toISOString().split('T')[0]);
  }, []);

  const isValidTronAddress = (address: string): boolean =>
    /^T[A-Za-z0-9]{33}$/.test(address);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    const reader = new FileReader();
    reader.onload = ev => {
      const text = ev.target?.result as string;
      const lines = text.split(',').map(l => l.trim());
      const valids = lines.filter(isValidTronAddress);
      if (valids.length) {
        setAddresses(valids);
        setError("");
      } else {
        setError("No valid TRON addresses found in the CSV file.");
      }
    };
    reader.readAsText(f);
  };

  const handleAddAddress = () => {
    if (!inputAddress) {
      setError("Please enter a TRON wallet address.");
      return;
    }
    if (!isValidTronAddress(inputAddress)) {
      setError("Please enter a valid TRON wallet address.");
      return;
    }
    if (addresses.includes(inputAddress)) {
      setError("This address is already in the list.");
      return;
    }
    setAddresses([...addresses, inputAddress]);
    setInputAddress("");
    setError("");
  };

  const removeAddress = (addr: string) =>
    setAddresses(addresses.filter(a => a !== addr));

  const getCalculationTypeLabel = (type: string) => {
    switch (type) {
      case "2": return "Daily Energy Usage";
      case "3": return "Daily Bandwidth Usage";
      default: return "Unknown";
    }
  };

  const formatResultData = (r: AnalysisResult) => {
    if (r.error) return { display: "Error", raw: 0 };
    const count = r.dataPoints || 1;
    const fmt = (n: number) =>
      n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");

    if (calculationType === "2") {
      const avg = parseFloat(r.totalEnergyUsed || "0") / count;
      return {
        display_avgTotal: fmt(avg),
        display_avgBurn: fmt(parseFloat(r.avgDailyBurnEnergyUsed || "0")),
        display_avgStaking: fmt(parseFloat(r.avgDailyStakingEnergyUsed || "0")),
        display_minTotal: fmt(parseFloat(r.minDailyTotalEnergyUsed || "0")),
        display_maxTotal: fmt(parseFloat(r.maxDailyTotalEnergyUsed || "0")),
        raw: avg
      };
    } else {
      const avg = parseFloat(r.totalBandwidthUsed || "0") / count;
      return {
        display_avgTotal: fmt(avg),
        display_avgBurn: fmt(parseFloat(r.avgDailyBurnBandwidthUsed || "0")),
        display_avgStaking: fmt(parseFloat(r.avgDailyStakingBandwidthUsed || "0")),
        display_minTotal: fmt(parseFloat(r.minDailyTotalBandwidthUsed || "0")),
        display_maxTotal: fmt(parseFloat(r.maxDailyTotalBandwidthUsed || "0")),
        raw: avg
      };
    }
  };

  const fetchAddressData = async (address: string): Promise<AnalysisResult> => {
    try {
      const startTs = new Date(startDate).getTime();
      const endTs = new Date(endDate).getTime();
      const resp = await fetch(
        `https://apilist.tronscanapi.com/api/account/analysis?address=${address}&type=${calculationType}&start_timestamp=${startTs}&end_timestamp=${endTs}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'TRON-PRO-API-KEY': process.env.TRON_PRO_API_KEY || ""
          }
        }
      );
      if (!resp.ok) throw new Error(resp.statusText);
      const data = await resp.json();
      console.log("Fetched data for address:", address, data);

      const result: AnalysisResult = {
        address,
        dataPoints: data.data?.length || 0,
        startDate, endDate,
        calculationType: getCalculationTypeLabel(calculationType),
        avgDailyTotalEnergyUsed: data.avg_energy_used || null,
        avgDailyBurnEnergyUsed: data.energy_burn || null,
        avgDailyStakingEnergyUsed: data.energy_usage || null,
        totalEnergyUsed: data.total_energy_used || null,
        avgDailyTotalBandwidthUsed: data.avg_bandwidth_used || null,
        avgDailyBurnBandwidthUsed: data.net_burn || null,
        avgDailyStakingBandwidthUsed: data.net_usage || null,
        totalBandwidthUsed: data.total_bandwidth_used || null,
        dailyData: data.data || [],
        error: null
      };
      if (!result.dailyData || result.dailyData.length === 0) {
        return { ...result, error: "No data available for the selected period" };
      }

      const arr = result.dailyData;
      if (calculationType === "2") {
        const totals = arr.map(d =>
          parseFloat(d.energy_usage || "0")
          + parseFloat(d.energy_burn || "0")
          + parseFloat(d.origin_energy_usage || "0")
        );
        console.log("Totals:", totals);
        const min = Math.min(...totals);
        const max = Math.max(...totals);
        const sum = totals.reduce((a, b) => a + b, 0);
        const burnSum = arr.reduce((s, d) => s + parseFloat(d.energy_burn || "0"), 0);
        const stakeSum = arr.reduce((s, d) => s + parseFloat(d.energy_usage || "0"), 0);

        result.minDailyTotalEnergyUsed = min.toFixed(2);
        result.maxDailyTotalEnergyUsed = max.toFixed(2);
        result.avgDailyBurnEnergyUsed = (burnSum / totals.length).toFixed(2);
        result.avgDailyStakingEnergyUsed = (stakeSum / totals.length).toFixed(2);
        result.avgDailyTotalEnergyUsed = (sum / totals.length).toFixed(2);
        result.totalEnergyUsed = sum.toFixed(2);
      } else {
        const totalsBW = arr.map(d =>
          parseFloat(d.net_usage || "0")
          + parseFloat(d.net_burn || "0")
        );
        const minBW = Math.min(...totalsBW);
        const maxBW = Math.max(...totalsBW);
        const sumBW = totalsBW.reduce((a, b) => a + b, 0);
        const burnSumBW = arr.reduce((s, d) => s + parseFloat(d.net_burn || "0"), 0);
        const stakeSumBW = arr.reduce((s, d) => s + parseFloat(d.net_usage || "0"), 0);

        result.minDailyTotalBandwidthUsed = minBW.toFixed(2);
        result.maxDailyTotalBandwidthUsed = maxBW.toFixed(2);
        result.avgDailyBurnBandwidthUsed = (burnSumBW / totalsBW.length).toFixed(2);
        result.avgDailyStakingBandwidthUsed = (stakeSumBW / totalsBW.length).toFixed(2);
        result.avgDailyTotalBandwidthUsed = (sumBW / totalsBW.length).toFixed(2);
        result.totalBandwidthUsed = sumBW.toFixed(2);
      }

      return result;
    } catch (err) {
      return {
        address,
        calculationType: getCalculationTypeLabel(calculationType),
        error: err instanceof Error ? err.message : "Unknown error"
      };
    }
  };

  const calculateAll = async () => {
    if (addresses.length === 0) { setError("Please enter at least one TRON wallet address."); return; }
    if (!startDate || !endDate) { setError("Please select both start and end dates."); return; }
    if (new Date(startDate).getTime() > new Date(endDate).getTime()) {
      setError("Start date must be before end date."); return;
    }

    setLoading(true);
    setResults([]);
    const arr: AnalysisResult[] = [];
    for (const addr of addresses) {
      arr.push(await fetchAddressData(addr));
    }
    setResults(arr);
    setError("");
    setLoading(false);
  };

  const clearAll = () => {
    setAddresses([]);
    setInputAddress("");
    setResults([]);
    setError("");
    setFile(null);
  };

  const calculationTypeOptions = [
    { value: "2", label: "Energy Consumption" },
    { value: "3", label: "Bandwidth Consumption" }
  ];

  interface ResultsVisualizationProps {
    results: AnalysisResult[];
    calculationType: string;
  }
  const ResultsVisualization: React.FC<ResultsVisualizationProps> = ({ results, calculationType }) => {
    const chartRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      if (!chartRef.current) return;
      const svgContainer = d3.select(chartRef.current);
      svgContainer.selectAll("*").remove();
      const data = results.filter(r => !r.error);
      if (!data.length) return;

      const margin = { top: 40, right: 30, bottom: 60, left: 60 };
      const width = 800 - margin.left - margin.right;
      const height = 400 - margin.top - margin.bottom;

      const svg = svgContainer.append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

      const xScale = d3.scaleBand()
        .domain(data.map(d => d.address!.substring(0, 10) + "..."))
        .range([0, width])
        .padding(0.3);

      const key = calculationType === "2"
        ? "avgDailyTotalEnergyUsed"
        : "avgDailyTotalBandwidthUsed";

      const maxVal = d3.max(data, d => parseFloat(d[key] || "0") * 1.2) || 0;
      const yScale = d3.scaleLinear().domain([0, maxVal]).range([height, 0]);

      svg.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(xScale))
        .selectAll("text")
        .attr("transform", "translate(-10,0)rotate(-45)")
        .style("text-anchor", "end")
        .style("fill", "black");

      svg.append("g")
        .call(d3.axisLeft(yScale))
        .selectAll("text")
        .style("fill", "black");

      svg.append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", -margin.left + 80)
        .attr("x", -height / 2)
        .attr("text-anchor", "middle")
        .text(calculationType === "2"
          ? "Daily Avg Energy Usage"
          : "Daily Avg Bandwidth Usage"
        );

      svg.selectAll(".bar")
        .data(data)
        .enter()
        .append("rect")
        .attr("class", "bar")
        .attr("x", d => xScale(d.address!.substring(0, 10) + "...")!)
        .attr("y", d => yScale(parseFloat(d[key] || "0")))
        .attr("width", xScale.bandwidth())
        .attr("height", d => height - yScale(parseFloat(d[key] || "0")))
        .attr("fill", calculationType === "2" ? "#4f93ce" : "#6ab04c")
        .on("mouseover", function (event, d) {
          d3.select(this)
            .attr("fill", calculationType === "2" ? "#2a5d8c" : "#3e6b29");
          svg.append("text")
            .attr("class", "tooltip")
            .attr("x", xScale(d.address!.substring(0, 10) + "...")! + xScale.bandwidth() / 2)
            .attr("y", yScale(parseFloat(d[key] || "0")) - 10)
            .attr("text-anchor", "middle")
            .style("font-size", "12px")
            .text(parseFloat(d[key] || "0").toFixed(2));
        })
        .on("mouseout", function () {
          d3.select(this)
            .attr("fill", calculationType === "2" ? "#4f93ce" : "#6ab04c");
          svg.selectAll(".tooltip").remove();
        });

      svg.append("text")
        .attr("x", width / 2)
        .attr("y", -margin.top / 2)
        .attr("text-anchor", "middle")
        .style("font-size", "16px")
        .style("font-weight", "bold")
        .text(calculationType === "2"
          ? "Daily Avg Energy Usage by Address"
          : "Daily Avg Bandwidth Usage by Address"
        );
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
        <h1 className="text-3xl font-bold text-center text-gray-800 mb-6">
          TRON Resource Calculator
        </h1>

        {/* Input Section */}
        <div className="mb-8 bg-gray-50 p-4 rounded-lg">
          <h2 className="text-xl font-semibold mb-4 text-gray-700">
            Input Parameters
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="w-full px-4 py-2 border text-gray-700 border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="w-full px-4 py-2 border text-gray-700 border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Resource Type
              </label>
              <select
                value={calculationType}
                onChange={e => setCalculationType(e.target.value)}
                className="w-full px-4 py-2 border text-gray-700 border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              >
                {calculationTypeOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-4 mb-4">
            <input
              type="text"
              placeholder="Enter TRON Wallet Address (starts with T)"
              value={inputAddress}
              onChange={e => setInputAddress(e.target.value)}
              className="flex-1 px-4 py-2 border text-gray-700 border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleAddAddress}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Add Address
            </button>
          </div>

          <div className="mb-4">
            <p className="text-sm text-gray-600 mb-2">
              Or upload a CSV file with addresses (one per line):
            </p>
            <input
              type="file"
              accept=".csv,.txt"
              onChange={handleFileUpload}
              className="block w-full file:py-2 file:px-4 file:bg-blue-50 file:text-blue-700 file:rounded-md"
            />
          </div>

          {error && <p className="text-red-500 mt-2">{error}</p>}

          {addresses.length > 0 && (
            <div className="mt-4">
              <h3 className="text-lg font-medium mb-2">Addresses to Process:</h3>
              <ul className="max-h-40 overflow-y-auto bg-white border border-gray-200 rounded-md p-2">
                {addresses.map((addr, i) => (
                  <li
                    key={i}
                    className="flex justify-between items-center py-1 border-b last:border-0"
                  >
                    <span className="font-mono text-sm text-gray-800">{addr}</span>
                    <button
                      onClick={() => removeAddress(addr)}
                      className="text-red-500 hover:text-red-700"
                    >
                      ✕
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-4 flex gap-4">
            <button
              onClick={calculateAll}
              disabled={loading || !addresses.length}
              className={`px-6 py-2 text-white rounded-md transition-colors ${loading || !addresses.length
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-green-600 hover:bg-green-700"
                }`}
            >
              {loading ? "Calculating..." : "Calculate"}
            </button>
            <button
              onClick={clearAll}
              className="px-6 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
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
              <span className="text-sm text-gray-500 ml-2">
                ({new Date(startDate).toLocaleDateString()} to{" "}
                {new Date(endDate).toLocaleDateString()})
              </span>
            </h2>
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white border border-gray-200 rounded-lg shadow-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="py-3 px-4 text-left text-xs font-semibold text-gray-600 uppercase">
                      Address
                    </th>
                    <th className="py-3 px-4 text-right text-xs font-semibold text-gray-600 uppercase">
                      Average
                    </th>
                    <th className="py-3 px-4 text-right text-xs font-semibold text-gray-600 uppercase">
                      Min
                    </th>
                    <th className="py-3 px-4 text-right text-xs font-semibold text-gray-600 uppercase">
                      Max
                    </th>
                    <th className="py-3 px-4 text-right text-xs font-semibold text-gray-600 uppercase">
                      Data Points
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((res, i) => {
                    const fmt = formatResultData(res);
                    return (
                      <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                        <td className="py-3 px-4 font-mono text-sm text-gray-700">
                          {res.address}
                        </td>

                        {/* Merged Average column */}
                        <td className="py-3 px-4 text-right text-sm text-gray-700">
                          <div>{fmt.display_avgTotal}</div>
                          <div className="text-gray-500">
                            (TRX Burning: {fmt.display_avgBurn})
                          </div>
                          <div className="text-gray-500">
                            (TRX Staking: {fmt.display_avgStaking})
                          </div>
                        </td>

                        <td className="py-3 px-4 text-right text-sm text-gray-700">
                          {fmt.display_minTotal}
                        </td>
                        <td className="py-3 px-4 text-right text-sm text-gray-700">
                          {fmt.display_maxTotal}
                        </td>
                        <td className="py-3 px-4 text-right text-sm text-gray-700">
                          {res.error ? "Error" : res.dataPoints}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

            </div>

            <ResultsVisualization
              results={results}
              calculationType={calculationType}
            />

            <div className="mt-6 bg-blue-50 p-4 rounded-lg shadow-sm">
              <h3 className="text-lg font-bold text-blue-800 mb-2">
                Summary Statistics
              </h3>
              {calculationType === "2" && (
                <p className="text-sm text-gray-700">
                  <span className="font-semibold">
                    Total Energy Consumed during period:
                  </span>{" "}
                  {results
                    .filter(r => !r.error)
                    .reduce(
                      (sum, r) => sum + parseFloat(r.totalEnergyUsed || "0"),
                      0
                    )
                    .toFixed(2)
                    .replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
                </p>
              )}
              {calculationType === "3" && (
                <p className="text-sm text-gray-700">
                  <span className="font-semibold">
                    Total Bandwidth Consumed during period:
                  </span>{" "}
                  {results
                    .filter(r => !r.error)
                    .reduce(
                      (sum, r) =>
                        sum + parseFloat(r.totalBandwidthUsed || "0"),
                      0
                    )
                    .toFixed(2)}
                </p>
              )}
              <p className="text-sm text-gray-700 mt-1">
                <span className="font-semibold">Accounts number:</span>{" "}
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
