import React from 'react';
import { render, screen } from '@testing-library/react';
import UsdtTransferSimulation from '../UsdtTransferSimulation';

describe('SRSimulation Component', () => {
  it('renders the heading correctly', () => {
    render(<UsdtTransferSimulation />);

    // Assert that the heading is rendered
    expect(screen.getByText(/Simulate USDT Transfer Costs/i)).toBeInTheDocument();
  });
});
