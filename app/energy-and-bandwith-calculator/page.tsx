// app/sr-simulation/page.tsx
"use client";

import React from "react";
import ContractDeploymentEnergyCalculator from "./ContractDeploymentEnergyCalculator";
import ContractCallingEnergyCalculator from "./ContractCallingEnergyCalculator";

const EnergyAndBandwithCalculatorPage = () => {
  return (
    <div>
      <ContractDeploymentEnergyCalculator />
      <ContractCallingEnergyCalculator />
    </div>
  );
};

export default EnergyAndBandwithCalculatorPage;
