"use client";

import React from "react";
import UsdtTransferSimulation from "./UsdtTransferSimulation";
import UsdtTrc20EnergyCalculator from "./UsdtTrc20EnergyCalculator";

const UsdtTransferSimulationPage = () => {
  return (
    <div>
      <UsdtTransferSimulation />
      <br />
      <UsdtTrc20EnergyCalculator />
    </div>

  );
};

export default UsdtTransferSimulationPage;
