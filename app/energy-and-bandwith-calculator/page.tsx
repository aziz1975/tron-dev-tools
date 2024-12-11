// app/sr-simulation/page.tsx
"use client";

import React from "react";
import SolidityCompiler from "./SolidityCompiler";
import ContractCallingEnergyCalculator from "./ContractCallingEnergyCalculator";
import ContractDeploymentEnergyCalculator from "./ContractDeploymentEnergyCalculator";

const EnergyAndBandwithCalculatorPage = () => {
  return (
    <div>
      <SolidityCompiler />
      <ContractDeploymentEnergyCalculator />
      <ContractCallingEnergyCalculator />
    </div>
  );
};

export default EnergyAndBandwithCalculatorPage;
