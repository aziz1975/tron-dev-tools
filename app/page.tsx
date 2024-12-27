"use client";

import React from "react";
import Link from "next/link";

const Page = () => {
  return (
    <div style={{ fontFamily: "Arial, sans-serif", padding: "20px" }}>
      <h1
        style={{
          color: "#333",
          textAlign: "center",
          marginBottom: "20px",
          fontSize: "36px",
          fontWeight: "bold",
        }}
      >
        Welcome to TRON Dev Tools
      </h1>

      <div style={{ textAlign: "center", marginBottom: "20px" }}>
        <Link href="/sr-simulation">
          <button
            style={{
              backgroundColor: "#007bff",
              color: "#fff",
              padding: "10px 20px",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              marginRight: "10px",
            }}
          >
            SR/SRP Simulation
          </button>
        </Link>

        <Link href="/usdt-transfer-simulation">
          <button
            style={{
              backgroundColor: "#007bff",
              color: "#fff",
              padding: "10px 20px",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              marginRight: "10px",
            }}
          >
            USDT Transfer Simulation
          </button>
        </Link>

        <Link href="/trx-trc10-transfer-simulation">
          <button
            style={{
              backgroundColor: "#007bff",
              color: "#fff",
              padding: "10px 20px",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              marginRight: "10px",
            }}
          >
            TRX/TRC10 Transfer Simulation
          </button>
        </Link>

        <Link href="/energy-and-bandwith-calculator">
          <button
            style={{
              backgroundColor: "#007bff",
              color: "#fff",
              padding: "10px 20px",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              marginRight: "10px",
            }}
          >
            Energy and Bandwith Calculator
          </button>
        </Link>

        <Link href="/usdt-trc20-energy-calculator">
          <button
            style={{
              backgroundColor: "#007bff",
              color: "#fff",
              padding: "10px 20px",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              marginRight: "10px",
            }}
          >
            USDT-TRC20 Energy Calculator
          </button>
        </Link>


        {/* Add more links/buttons for additional components here */}
      </div>
    </div>
  );
};

export default Page;
