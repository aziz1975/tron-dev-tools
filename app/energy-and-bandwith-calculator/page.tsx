// app/sr-simulation/page.tsx
"use client";

import React from "react";
import dynamic from 'next/dynamic';
import ContractDeployer from "./ContractDeployer";
const SolidityCompiler = dynamic(() => import('./SolidityCompiler'), { ssr: false })
const ContractCallingEnergyCalculator = dynamic(() => import('./ContractCallingEnergyCalculator'), { ssr: false })
const ContractDeploymentEnergyCalculator = dynamic(() => import('./ContractDeploymentEnergyCalculator'), { ssr: false })

const EnergyAndBandwithCalculatorPage = () => {
  return (
    <div>
      <ContractCallingEnergyCalculator />
      <SolidityCompiler />
      <ContractDeploymentEnergyCalculator />
      <ContractDeployer />
    </div>
  );
};

export default EnergyAndBandwithCalculatorPage;
