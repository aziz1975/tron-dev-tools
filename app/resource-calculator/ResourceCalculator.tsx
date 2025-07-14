/* eslint-disable */
"use client";

import React, { useState, useEffect, useRef } from "react";
import * as d3 from 'd3';

// Represents a daily data record for all analysis types
interface DailyData {
  day?: string;            // for type 0 & 1
  timestamp?: string;      // for type 2 & 3

  // Volume (type 0)
  trx_amount?: string;
  usdt_amount?: string;

  // Transfer count (type 1)
  transfer_count?: number;
  token_count?: number;

  // Energy usage (type 2)
  energy_usage?: string;
  energy_burn?: string;
  origin_energy_usage?: string;

  // Bandwidth usage (type 3)
  net_usage?: string;
  net_burn?: string;
}

// Aggregated results per address
interface AnalysisResult {
  address: string;
  dataPoints: number;
  startDate: string;
  endDate: string;
  calculationType: string;

  // Energy metrics (type 2)
  totalEnergyUsed?: string;
  avgDailyTotalEnergyUsed?: string;
  avgDailyBurnEnergyUsed?: string;
  avgDailyStakingEnergyUsed?: string;
  minDailyTotalEnergyUsed?: string;
  maxDailyTotalEnergyUsed?: string;

  // Bandwidth metrics (type 3)
  totalBandwidthUsed?: string;
  avgDailyTotalBandwidthUsed?: string;
  avgDailyBurnBandwidthUsed?: string;
  avgDailyStakingBandwidthUsed?: string;
  minDailyTotalBandwidthUsed?: string;
  maxDailyTotalBandwidthUsed?: string;

  dailyData: DailyData[];
  error?: string;
}

const ResourceCalculator: React.FC = () => {
  const [addresses, setAddresses] = useState<string[]>([]);
  const [inputAddress, setInputAddress] = useState<string>("");
  const [results, setResults] = useState<AnalysisResult[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [file, setFile] = useState<File | null>(null);

  // Date range
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  // Which metric table to fetch (only type 2 or 3 controls main table)
  const [calculationType, setCalculationType] = useState<string>("2"); // "2"=Energy, "3"=Bandwidth

  // Summaries always shown
  const [totalTransfers, setTotalTransfers] = useState<number>(0);
  const [totalTrxVolume, setTotalTrxVolume] = useState<string>("0");
  const [totalUsdtVolume, setTotalUsdtVolume] = useState<string>("0");

  // Initialize dates to past year
  useEffect(() => {
    const today = new Date();
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(today.getFullYear() - 1);
    setEndDate(today.toISOString().split('T')[0]);
    setStartDate(oneYearAgo.toISOString().split('T')[0]);
  }, []);

  // TRON address validator
  const isValidTronAddress = (address: string): boolean =>
    /^T[A-Za-z0-9]{33}$/.test(address);

  // CSV file upload handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    const reader = new FileReader();
    reader.onload = ev => {
      const text = ev.target?.result as string;
      // split by newline or comma
      const lines = text.split(/[,\n]/).map(l => l.trim()).filter(Boolean);
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

  // Manual address add
  const handleAddAddress = () => {
    if (!inputAddress) { setError("Please enter a TRON wallet address."); return; }
    if (!isValidTronAddress(inputAddress)) { setError("Please enter a valid TRON wallet address."); return; }
    if (addresses.includes(inputAddress)) { setError("This address is already in the list."); return; }
    setAddresses(prev => [...prev, inputAddress]);
    setInputAddress("");
    setError("");
  };

  const removeAddress = (addr: string) => setAddresses(prev => prev.filter(a => a !== addr));

  const getCalculationTypeLabel = (type: string): string => {
    switch (type) {
      case "2": return "Daily Energy Usage";
      case "3": return "Daily Bandwidth Usage";
      default:  return "Unknown";
    }
  };

  // Format numbers with 2 decimals and comma separators
  const formatNumber = (n: number): string => n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");

  // Fetch raw daily data for an address/type
  const fetchAnalysis = async (address: string, type: string): Promise<DailyData[]> => {
    const startTs = new Date(startDate).getTime();
    const endTs = new Date(endDate).getTime();
    const resp = await fetch(
      `https://apilist.tronscanapi.com/api/account/analysis?address=${address}&type=${type}&start_timestamp=${startTs}&end_timestamp=${endTs}`,
      { method: 'GET', headers: { 'Content-Type': 'application/json', 'TRON-PRO-API-KEY': process.env.TRON_PRO_API_KEY || "" } }
    );
    if (!resp.ok) throw new Error(resp.statusText);
    const data = await resp.json();
    return (data.data as DailyData[]) || [];
  };

  // Fetch main (energy/bandwidth) results
  const fetchMainResults = async (): Promise<AnalysisResult[]> => {
    const promiseArr = addresses.map(async address => {
      const daily = await fetchAnalysis(address, calculationType);
      const base: AnalysisResult = {
        address,
        dataPoints: daily.length,
        startDate,
        endDate,
        calculationType: getCalculationTypeLabel(calculationType),
        dailyData: daily,
      };

      if (calculationType === "2") {
        // Energy
        const totals = daily.map(d =>
          parseFloat(d.energy_usage ?? "0") +
          parseFloat(d.energy_burn   ?? "0") +
          parseFloat(d.origin_energy_usage ?? "0")
        );
        const sum = totals.reduce((a, b) => a + b, 0);
        const burnSum  = daily.reduce((s, d) => s + parseFloat(d.energy_burn ?? "0"), 0);
        const stakeSum = daily.reduce((s, d) => s + parseFloat(d.energy_usage ?? "0"), 0);
        Object.assign(base, {
          totalEnergyUsed: formatNumber(sum),
          avgDailyTotalEnergyUsed: formatNumber(sum / totals.length),
          avgDailyBurnEnergyUsed: formatNumber(burnSum / totals.length),
          avgDailyStakingEnergyUsed: formatNumber(stakeSum / totals.length),
          minDailyTotalEnergyUsed: formatNumber(Math.min(...totals)),
          maxDailyTotalEnergyUsed: formatNumber(Math.max(...totals)),
        });
      } else if (calculationType === "3") {
        // Bandwidth
        const totals = daily.map(d =>
          parseFloat(d.net_usage ?? "0") +
          parseFloat(d.net_burn   ?? "0")
        );
        const sum = totals.reduce((a, b) => a + b, 0);
        const burnSum  = daily.reduce((s, d) => s + parseFloat(d.net_burn ?? "0"), 0);
        const usageSum = daily.reduce((s, d) => s + parseFloat(d.net_usage ?? "0"), 0);
        Object.assign(base, {
          totalBandwidthUsed: formatNumber(sum),
          avgDailyTotalBandwidthUsed: formatNumber(sum / totals.length),
          avgDailyBurnBandwidthUsed: formatNumber(burnSum / totals.length),
          avgDailyStakingBandwidthUsed: formatNumber(usageSum / totals.length),
          minDailyTotalBandwidthUsed: formatNumber(Math.min(...totals)),
          maxDailyTotalBandwidthUsed: formatNumber(Math.max(...totals)),
        });
      }
      return base;
    });
    return Promise.all(promiseArr);
  };

  // Fetch summary totals: transfers and volume
  const fetchSummaries = async () => {
    // Transfers (type 1)
    const transferDays = await Promise.all(addresses.map(addr => fetchAnalysis(addr, "1")));
    const transfers = transferDays.flat().reduce((sum, d) => sum + (d.transfer_count ?? 0), 0);
    setTotalTransfers(transfers);
    // Volume (type 0)
    const volumeDays = await Promise.all(addresses.map(addr => fetchAnalysis(addr, "0")));
    const trxSum  = volumeDays.flat().reduce((s, d) => s + parseFloat(d.trx_amount ?? "0"), 0);
    const usdtSum = volumeDays.flat().reduce((s, d) => s + parseFloat(d.usdt_amount ?? "0"), 0);
    setTotalTrxVolume(formatNumber(trxSum));
    setTotalUsdtVolume(formatNumber(usdtSum));
  };

  const calculateAll = async () => {
    if (!addresses.length) { setError("Please enter at least one TRON wallet address."); return; }
    if (!startDate || !endDate) { setError("Please select both start and end dates."); return; }
    if (new Date(startDate) > new Date(endDate)) { setError("Start date must be before end date."); return; }

    setLoading(true);
    setError("");
    try {
      const main = await fetchMainResults();
      setResults(main);
      await fetchSummaries();
    } catch (e: any) {
      setError(e.message || 'Error fetching data');
    }
    setLoading(false);
  };

  const clearAll = () => {
    setAddresses([]);
    setInputAddress("");
    setResults([]);
    setError("");
    setFile(null);
    setTotalTransfers(0);
    setTotalTrxVolume("0");
    setTotalUsdtVolume("0");
  };

  const calculationTypeOptions = [
    { value: "2", label: "Energy Consumption" },
    { value: "3", label: "Bandwidth Consumption" },
  ];

  // Visualization for types 2 & 3
  interface VizProps { results: AnalysisResult[]; calculationType: string; }
  const ResultsVisualization: React.FC<VizProps> = ({ results, calculationType }) => {
    const ref = useRef<HTMLDivElement>(null);
    useEffect(() => {
      if (!ref.current) return;
      const svgContainer = d3.select(ref.current);
      svgContainer.selectAll("*").remove();
      if (calculationType !== "2" && calculationType !== "3") return;
      const data = results.filter(r => !r.error && r.dailyData.length);
      if (!data.length) return;
      const margin = { top: 40, right: 30, bottom: 60, left: 60 };
      const width = 800 - margin.left - margin.right;
      const height = 400 - margin.top - margin.bottom;
      const svg = svgContainer.append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g").attr("transform", `translate(${margin.left},${margin.top})`);
      const key = calculationType === "2" ? "avgDailyTotalEnergyUsed" : "avgDailyTotalBandwidthUsed";
      const parseVal = (d: AnalysisResult) => parseFloat((d as any)[key] || "0");
      const maxVal = d3.max(data, parseVal) || 0;
      const xScale = d3.scaleBand().domain(data.map(d => d.address.slice(0,10)+"...")).range([0,width]).padding(0.3);
      const yScale = d3.scaleLinear().domain([0, maxVal*1.2]).range([height,0]);
      svg.append("g").attr("transform", `translate(0,${height})`).call(d3.axisBottom(xScale)).selectAll("text").attr("transform","translate(-10,0)rotate(-45)").style("text-anchor","end");
      svg.append("g").call(d3.axisLeft(yScale));
      svg.selectAll(".bar").data(data).enter().append("rect")
        .attr("class","bar")
        .attr("x", d=> xScale(d.address.slice(0,10)+"...")!)
        .attr("y", d=> yScale(parseVal(d)))
        .attr("width", xScale.bandwidth())
        .attr("height", d=> height - yScale(parseVal(d)))
        .attr("fill", calculationType === "2" ? "#4f93ce" : "#6ab04c");
      svg.append("text").attr("x",width/2).attr("y",-margin.top/2).attr("text-anchor","middle").style("font-size","16px").style("font-weight","bold")
        .text(calculationType === "2" ? "Daily Avg Energy Usage by Address" : "Daily Avg Bandwidth Usage by Address");
    }, [results, calculationType]);
    return <div className="mt-8"><h3 className="text-lg font-bold mb-4">Visualization</h3><div ref={ref} className="overflow-x-auto bg-white p-4 rounded-lg shadow-sm border border-gray-200" style={{ minHeight: 400 }} /></div>;
  };

  return (
    <div className="bg-gray-100 min-h-screen p-6">
      <div className="max-w-6xl mx-auto bg-white rounded-lg shadow-md p-6">
        <h1 className="text-3xl font-bold text-center text-gray-800 mb-6">TRON Resource Calculator</h1>

        {/* Inputs */}
        <div className="mb-8 bg-gray-50 p-4 rounded-lg">
          <h2 className="text-xl font-semibold mb-4 text-gray-700">Input Parameters</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
              <input type="date" value={startDate} onChange={e=>setStartDate(e.target.value)} className="w-full px-4 py-2 border text-gray-700 border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"/></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
              <input type="date" value={endDate} onChange={e=>setEndDate(e.target.value)} className="w-full px-4 py-2 border text-gray-700 border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"/></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Resource Type</label>
              <select value={calculationType} onChange={e=>setCalculationType(e.target.value)} className="w-full px-4 py-2 border text-gray-700 border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500">
                {calculationTypeOptions.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}
              </select></div>
          </div>
          <div className="flex flex-col md:flex-row gap-4 mb-4">
            <input type="text" placeholder="Enter TRON Wallet Address (starts with T)" value={inputAddress} onChange={e=>setInputAddress(e.target.value)} className="flex-1 px-4 py-2 border text-gray-700 border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"/>
            <button onClick={handleAddAddress} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">Add Address</button>
          </div>
          <div className="mb-4"><p className="text-sm text-gray-600 mb-2">Or upload a CSV file with addresses (one per line):</p>
            <input type="file" accept=".csv,.txt" onChange={handleFileUpload} className="block w-full file:py-2 file:px-4 file:bg-blue-50 file:text-blue-700 file:rounded-md"/></div>
          {error && <p className="text-red-500 mt-2">{error}</p>}
          {addresses.length>0 && <div className="mt-4"><h3 className="text-lg font-medium mb-2">Addresses to Process:</h3>
            <ul className="max-h-40 overflow-y-auto bg-white border border-gray-200 rounded-md p-2">
              {addresses.map((a,i)=><li key={i} className="flex justify-between py-1 border-b last:border-0"><span className="font-mono text-sm text-gray-800">{a}</span><button onClick={()=>removeAddress(a)} className="text-red-500 hover:text-red-700">✕</button></li>)}
            </ul></div>}
          <div className="mt-4 flex gap-4">
            <button onClick={calculateAll} disabled={loading||!addresses.length} className={`px-6 py-2 text-white rounded-md transition-colors ${loading||!addresses.length?'bg-gray-400 cursor-not-allowed':'bg-green-600 hover:bg-green-700'}`}>{loading?'Calculating...':'Calculate'}</button>
            <button onClick={clearAll} className="px-6 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700">Clear All</button>
          </div>
        </div>

        {/* Results */}
        {results.length>0 && (
          <div>
            {/* Summary Tables Always */}
            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
              
              <div className="bg-white p-4 rounded-lg shadow-sm"><h4 className="font-semibold">Total Transfers Count</h4><p className="text-2xl font-bold">{totalTransfers.toLocaleString()}</p></div>
              <div className="bg-white p-4 rounded-lg shadow-sm"><h4 className="font-semibold">Total TRX Volume</h4><p className="text-2xl font-bold">{totalTrxVolume}</p></div>
              <div className="bg-white p-4 rounded-lg shadow-sm"><h4 className="font-semibold">Total USDT Volume</h4><p className="text-2xl font-bold">{totalUsdtVolume}</p></div>
              <div>(These are the totals for all the addresses)</div>
            </div>

            {/* Main Table for Energy/Bandwidth */}
            {(calculationType==="2"||calculationType==="3") && <div className="mt-8 overflow-x-auto">
              <h2 className="text-xl font-semibold mb-4 text-gray-700">Results - {getCalculationTypeLabel(calculationType)}</h2>
              <table className="min-w-full bg-white border border-gray-200 rounded-lg shadow-sm">
                <thead className="bg-gray-50"><tr>
                  <th className="py-3 px-4 text-left text-xs font-semibold text-gray-600 uppercase">Address</th>
                  <th className="py-3 px-4 text-right text-xs font-semibold text-gray-600 uppercase">Average</th>
                  <th className="py-3 px-4 text-right text-xs font-semibold text-gray-600 uppercase">Min</th>
                  <th className="py-3 px-4 text-right text-xs font-semibold text-gray-600 uppercase">Max</th>
                  <th className="py-3 px-4 text-right text-xs font-semibold text-gray-600 uppercase">Data Points</th>
                </tr></thead>
                <tbody>
                  {results.map((r,i)=>{
                    const avg = calculationType==="2"?r.avgDailyTotalEnergyUsed:r.avgDailyTotalBandwidthUsed;
                    const burn = calculationType==="2"?r.avgDailyBurnEnergyUsed:r.avgDailyBurnBandwidthUsed;
                    const stake= calculationType==="2"?r.avgDailyStakingEnergyUsed:r.avgDailyStakingBandwidthUsed;
                    const min  = calculationType==="2"?r.minDailyTotalEnergyUsed:r.minDailyTotalBandwidthUsed;
                    const max  = calculationType==="2"?r.maxDailyTotalEnergyUsed:r.maxDailyTotalBandwidthUsed;
                    return <tr key={i} className={i%2===0?'bg-white':'bg-gray-50'}>
                      <td className="py-3 px-4 font-mono text-sm text-gray-700">{r.address}</td>
                      <td className="py-3 px-4 text-right text-sm text-gray-700"><div>{avg}</div><div className="text-gray-500">(TRX Burning: {burn})</div><div className="text-gray-500">(TRX Staking: {stake})</div></td>
                      <td className="py-3 px-4 text-right text-sm text-gray-700">{min}</td>
                      <td className="py-3 px-4 text-right text-sm text-gray-700">{max}</td>
                      <td className="py-3 px-4 text-right text-sm text-gray-700">{r.dataPoints}</td>
                    </tr>})}
                </tbody>
              </table>
            </div>}

            {/* Visualization */}
            <ResultsVisualization results={results} calculationType={calculationType} />
          </div>
        )}
      </div>
    </div>
  );
};

export default ResourceCalculator;
