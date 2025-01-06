// app/sr-simulation/page.tsx
"use client";

import React from "react";
import dynamic from 'next/dynamic';
const SolidityCompiler = dynamic(() => import('./SolidityCompiler'), { ssr: false })
const ContractCallingEnergyCalculator = dynamic(() => import('./ContractCallingEnergyCalculator'), { ssr: false })

const EnergyAndBandwithCalculatorPage = () => {
  return (
    <div>
      <SolidityCompiler />
      <ContractCallingEnergyCalculator />
    </div>
  );
};

export default EnergyAndBandwithCalculatorPage;
