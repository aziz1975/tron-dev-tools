"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import * as d3 from "d3";

const TronWalletBalanceChart = () => {
  const [startDate, setStartDate] = useState("2024-01-01");
  const [endDate, setEndDate] = useState("2024-12-30");
  const [address, setAddress] = useState("");
  const [data, setData] = useState<{ date: string; balance: number }[]>([]);

  const getDateRange = (start: string, end: string) => {
    const dates = [];
    const currentDate = new Date(start);
    const endDate = new Date(end);
    while (currentDate <= endDate) {
      dates.push(currentDate.toISOString().split("T")[0]);
      currentDate.setDate(currentDate.getDate() + 1);
    }
    return dates;
  };

  const fetchData = async () => {
    if (!startDate || !endDate || !address) {
      alert("Please enter a valid address and date range.");
      return;
    }

    const dates = getDateRange(startDate, endDate);
    const balances: { date: string; balance: number }[] = [];

    for (const date of dates) {
      const query = {
        query: `query MyQuery {
          tron(network: tron) {
            address(address: {is: "${address}"}) {
              balances(
                currency: {is: "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t"}
                date: {till: "${date}"}
              ) {
                value
              }
            }
          }
        }`,
        variables: "{}",
      };

      const config = {
        method: "post",
        url: "https://graphql.bitquery.io",
        headers: {
          "Content-Type": "application/json",
          "X-API-KEY": "BQYczoQmL9Tas2L96S4nnWKMZVPxroVA",
        },
        data: JSON.stringify(query),
      };

      try {
        const response = await axios.request(config);
        const balance = response.data?.data?.tron?.address?.[0]?.balances?.[0]?.value || 0;
        balances.push({ date, balance });
      } catch (error) {
        console.error(`Error fetching data for ${date}`, error);
      }
    }

    setData(balances);
  };

  useEffect(() => {
    if (data.length > 0) drawChart();
  }, [data]);

  const drawChart = () => {
    d3.select("#usd-chart").selectAll("*").remove();
    const svgWidth = 1600, svgHeight = 600;
    const margin = { top: 30, right: 30, bottom: 80, left: 60 };
    const width = svgWidth - margin.left - margin.right;
    const height = svgHeight - margin.top - margin.bottom;

    const svg = d3.select("#usd-chart").append("svg")
      .attr("width", svgWidth)
      .attr("height", svgHeight)
      .style("background", "#111")
      .style("border-radius", "10px");

    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);
    const parsedData = data.map(d => ({ ...d, date: new Date(d.date) }));
    const x = d3.scaleTime().domain(d3.extent(parsedData, d => d.date) as [Date, Date]).range([0, width]);
    const y = d3.scaleLinear().domain([0, d3.max(parsedData, d => d.balance) as number]).nice().range([height, 0]);
    
    g.append("g").attr("transform", `translate(0,${height})`).call(d3.axisBottom(x).ticks(d3.timeMonth.every(1)).tickFormat(d3.timeFormat("%b-%y")))
      .selectAll("text").attr("fill", "#0ff").attr("transform", "rotate(-30)").style("text-anchor", "end");
    
    g.append("g").call(d3.axisLeft(y)).selectAll("text").attr("fill", "red");
    
    g.append("path").datum(parsedData).attr("fill", "none").attr("stroke", "red").attr("stroke-width", 2).attr("d", d3.line<{ date: Date, balance: number }>().x(d => x(d.date)!).y(d => y(d.balance)));
  };

  return (
    <div className="flex flex-col items-center p-6 bg-black text-white rounded-xl shadow-xl">
      <h2 className="text-2xl font-bold text-red-400 mb-4">USDT Wallet Balance on Tron</h2>
      <div className="flex gap-4 mb-4">
        <div>
          <label className="block text-red-300">Address:</label>
          <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} className="p-2 bg-gray-800 text-red-300 border border-red-400 rounded" />
        </div>
        <div>
          <label className="block text-red-300">Start Date:</label>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="p-2 bg-gray-800 text-red-300 border border-red-400 rounded" />
        </div>
        <div>
          <label className="block text-red-300">End Date:</label>
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="p-2 bg-gray-800 text-red-300 border border-red-400 rounded" />
        </div>
        <button onClick={fetchData} className="p-2 bg-red-500 hover:bg-red-400 text-black font-bold rounded">Fetch Data</button>
      </div>
      <div id="usd-chart" className="p-4 w-full"></div>
    </div>
  );
};

export default TronWalletBalanceChart;
