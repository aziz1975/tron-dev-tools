import React from 'react';
import { render, screen } from '@testing-library/react';
import UsdtTrc20EnergyCalculator from '../UsdtTrc20EnergyCalculator';

describe('SRSimulation Component', () => {
  it('renders the heading correctly', () => {
    render(<UsdtTrc20EnergyCalculator />);

    // Assert that the heading is rendered
    expect(screen.getByText(/Transaction Calculator/i)).toBeInTheDocument();
  });
});
