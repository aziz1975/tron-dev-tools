"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import * as d3 from "d3";

const MonthlyTransactionVolume = () => {
  const [startDate, setStartDate] = useState("2024-01-01");
  const [endDate, setEndDate] = useState("2025-12-30");
  const [address, setAddress] = useState("");
  const [data, setData] = useState<{ month: number; amount: number }[]>([]);

  const fetchData = async () => {
    if (!address) {
      alert("Please enter a wallet address.");
      return;
    }

    const query = {
      query: `query MonthlyTransactionVolume {
        tron(network: tron) {
          transfers(
            currency: {is: "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t"}
            date: {since: "${startDate}", till: "${endDate}"}
            any: {receiver: {is: "${address}"}, sender: {is: "${address}"}}
          ) {
            date {
              month
            }
            amount(calculate: sum)
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
      if (response.data?.data?.tron?.transfers) {
        const transfers = response.data.data.tron.transfers.map((tx: any) => ({
          month: tx.date.month,
          amount: tx.amount,
        }));
        setData(transfers);
      } else {
        alert("No transactions found.");
      }
    } catch (error) {
      console.error(error);
      alert("Error fetching data.");
    }
  };

  useEffect(() => {
    if (data.length > 0) drawChart();
  }, [data]);

  const drawChart = () => {
    d3.select("#monthly-transaction-volume").selectAll("*").remove();

    const svgWidth = 1600,
      svgHeight = 600,
      margin = { top: 30, right: 30, bottom: 80, left: 80 },
      width = svgWidth - margin.left - margin.right,
      height = svgHeight - margin.top - margin.bottom;

    const svg = d3
      .select("#monthly-transaction-volume")
      .append("svg")
      .attr("width", svgWidth)
      .attr("height", svgHeight)
      .style("background", "#111")
      .style("border-radius", "10px");

    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    // Month Names
    const monthNames = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];

    // X Scale (Months)
    const x = d3
      .scaleBand()
      .domain(data.map((d) => monthNames[d.month - 1])) // Convert month number to name
      .range([0, width])
      .padding(0.2);

    // Y Scale (Transaction Volume)
    const y = d3
      .scaleLinear()
      .domain([0, d3.max(data, (d) => d.amount)!])
      .nice()
      .range([height, 0]);

    // Tooltip
    const tooltip = d3
      .select("#monthly-transaction-volume")
      .append("div")
      .style("position", "absolute")
      .style("background", "#222")
      .style("color", "#0ff")
      .style("padding", "8px")
      .style("border-radius", "5px")
      .style("display", "none")
      .style("pointer-events", "none");

    // X Axis
    const xAxis = d3.axisBottom(x);
    g.append("g")
      .attr("transform", `translate(0,${height})`)
      .call(xAxis)
      .selectAll("text")
      .attr("fill", "#0ff")
      .attr("transform", "rotate(-30)")
      .style("text-anchor", "end");

    // Y Axis
    g.append("g")
      .call(d3.axisLeft(y).tickFormat((d) => d3.format(".2s")(d as number) + " USDT"))
      .selectAll("text")
      .attr("fill", "red");

    // Bars
    g.selectAll(".bar")
      .data(data)
      .enter()
      .append("rect")
      .attr("x", (d) => x(monthNames[d.month - 1])!)
      .attr("y", (d) => y(d.amount))
      .attr("width", x.bandwidth())
      .attr("height", (d) => height - y(d.amount))
      .attr("fill", "red")
      .style("opacity", 0.8)
      .on("mouseover", function (event, d) {
        d3.select(this).style("opacity", 1);
        tooltip
          .style("display", "block")
          .html(`<b>${monthNames[d.month - 1]}</b><br/>USDT: ${d3.format(",")(d.amount)}`)
          .style("left", `${event.pageX + 10}px`)
          .style("top", `${event.pageY - 40}px`);
      })
      .on("mousemove", function (event) {
        tooltip.style("left", `${event.pageX + 10}px`).style("top", `${event.pageY - 40}px`);
      })
      .on("mouseout", function () {
        d3.select(this).style("opacity", 0.8);
        tooltip.style("display", "none");
      });
  };

  return (
    <div className="flex flex-col items-center p-6 bg-black text-white rounded-xl shadow-xl">
      <h2 className="text-2xl font-bold text-red-400 mb-4">Monthly USDT Transaction Volume</h2>
      <div className="flex gap-4 mb-4">
        <div>
          <label className="block text-red-300">Address:</label>
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="p-2 bg-gray-800 text-red-300 border border-red-400 rounded"
          />
        </div>
        <div>
          <label className="block text-red-300">Start Date:</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="p-2 bg-gray-800 text-red-300 border border-red-400 rounded"
          />
        </div>
        <div>
          <label className="block text-red-300">End Date:</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="p-2 bg-gray-800 text-red-300 border border-red-400 rounded"
          />
        </div>
        <button
          onClick={fetchData}
          className="p-2 bg-red-500 hover:bg-red-400 text-black font-bold rounded"
        >
          Fetch Data
        </button>
      </div>
      <div id="monthly-transaction-volume" className="p-4 w-full"></div>
    </div>
  );
};

export default MonthlyTransactionVolume;
