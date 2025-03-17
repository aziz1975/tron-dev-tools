"use client";

import React from "react";
import RevenueCalculator from "./RevenueCalculator";
import TronWalletAssets from "./TronWalletAssets";
import TronUSDTBalanceChart from "./TronUSDTBalanceChart";
import TronUSDTTransactionChart from "./TronUSDTTransactionChart";
import TronEnergyUsageChart from "./TronEnergyUsageChart";
import MonthlyTransactionVolume from "./MonthlyTransactionVolume";

const RevenueCalculatorPage = () => {
  return (
    <div>
      <RevenueCalculator />
      <TronWalletAssets />
      <TronUSDTBalanceChart />
      <TronUSDTTransactionChart />
      <TronEnergyUsageChart />
      <MonthlyTransactionVolume />
    </div>
  );
};

export default RevenueCalculatorPage;
