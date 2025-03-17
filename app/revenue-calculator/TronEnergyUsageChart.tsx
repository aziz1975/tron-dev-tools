"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import * as d3 from "d3";

const TronEnergyUsageChart = () => {
    const [startDate, setStartDate] = useState("2024-01-01");
    const [endDate, setEndDate] = useState("2024-12-30");
    const [address, setAddress] = useState("");
    const [data, setData] = useState<{ date: string; energy: number }[]>([]);

    const fetchData = async () => {
        if (!startDate || !endDate || !address) {
            alert("Please enter a valid address and date range.");
            return;
        }

        const query = {
            query: `query DailyUSDTTransactionCount {
        tron(network: tron) {
          transfers(
            currency: {is: "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t"}
            date: {since: "${startDate}", till: "${endDate}"}
            sender: {is: "${address}"}
          ) {
            date {
              date
            }
            energyUsageTotal
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
                const energyData = response.data.data.tron.transfers.map((tx: any) => ({
                    date: tx.date.date,
                    energy: tx.energyUsageTotal,
                }));
                setData(energyData);
            } else {
                alert("No data found.");
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
        d3.select("#energy-usage-chart").selectAll("*").remove();

        const svgWidth = 1600,
            svgHeight = 600,
            margin = { top: 30, right: 30, bottom: 100, left: 60 },
            width = svgWidth - margin.left - margin.right,
            height = svgHeight - margin.top - margin.bottom;

        const svg = d3
            .select("#energy-usage-chart")
            .append("svg")
            .attr("width", svgWidth)
            .attr("height", svgHeight)
            .style("background", "#111")
            .style("border-radius", "10px");

        const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

        const parsedData = data.map(d => ({ ...d, date: new Date(d.date) }));

        const x = d3
            .scaleTime()
            .domain(d3.extent(parsedData, d => d.date) as [Date, Date])
            .range([0, width]);

        const y = d3
            .scaleLinear()
            .domain([0, d3.max(parsedData, d => d.energy) as number])
            .nice()
            .range([height, 0]);

        const formatNumber = (num: number) => num.toLocaleString("en-US");

        const tooltip = d3
            .select("#chart")
            .append("div")
            .style("position", "absolute")
            .style("background", "#222")
            .style("color", "#0ff")
            .style("padding", "8px")
            .style("border-radius", "5px")
            .style("display", "none")
            .style("pointer-events", "none")
            .style("font-size", "14px");

        g.selectAll(".bar")
            .data(parsedData)
            .enter()
            .append("rect")
            .attr("x", d => x(d.date)!)
            .attr("y", d => y(d.energy))
            .attr("width", 5)
            .attr("height", d => height - y(d.energy))
            .attr("fill", "red")
            .style("opacity", 0.8)
            .on("mouseover", function (event, d) {
                d3.select(this).style("opacity", 1);
                tooltip
                    .style("display", "block")
                    .html(`
        <b>${d3.timeFormat("%b %d, %Y")(d.date)}</b><br/>
        🔥 <b>Energy Used:</b> ${formatNumber(d.energy)}
      `)
                    .style("left", `${event.pageX + 10}px`)
                    .style("top", `${event.pageY - 40}px`);
            })
            .on("mousemove", function (event) {
                tooltip
                    .style("left", `${event.pageX + 10}px`)
                    .style("top", `${event.pageY - 40}px`);
            })
            .on("mouseout", function () {
                d3.select(this).style("opacity", 0.8);
                tooltip.style("display", "none");
            });


        const xAxis = d3.axisBottom(x)
            .ticks(d3.timeMonth.every(1))
            .tickFormat(d3.timeFormat("%b %d"));

        g.append("g")
            .attr("transform", `translate(0,${height})`)
            .call(xAxis)
            .selectAll("text")
            .attr("fill", "#0ff")
            .attr("transform", "rotate(-30)")
            .style("text-anchor", "end");

        g.append("g")
            .call(d3.axisLeft(y))
            .selectAll("text")
            .attr("fill", "red");

        g.selectAll(".bar")
            .data(parsedData)
            .enter()
            .append("rect")
            .attr("x", d => x(d.date)!)
            .attr("y", d => y(d.energy))
            .attr("width", 5)
            .attr("height", d => height - y(d.energy))
            .attr("fill", "red")
            .style("opacity", 0.8)
            .on("mouseover", function (event, d) {
                d3.select(this).style("opacity", 1);
                tooltip
                    .style("display", "block")
                    .html(`<b>${d3.timeFormat("%b %d, %Y")(d.date)}</b><br/>Energy Used: ${d.energy}`)
                    .style("left", `${event.pageX + 10}px`)
                    .style("top", `${event.pageY - 40}px`);
            })
            .on("mousemove", function (event) {
                tooltip
                    .style("left", `${event.pageX + 10}px`)
                    .style("top", `${event.pageY - 40}px`);
            })
            .on("mouseout", function () {
                d3.select(this).style("opacity", 0.8);
                tooltip.style("display", "none");
            });
    };

    return (
        <div className="flex flex-col items-center p-6 bg-black text-white rounded-xl shadow-xl">
            <h2 className="text-2xl font-bold text-red-400 mb-4">Tron Daily Energy Usage</h2>
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
            <div id="energy-usage-chart" className="p-4 w-full"></div>
        </div>
    );
};

export default TronEnergyUsageChart;
