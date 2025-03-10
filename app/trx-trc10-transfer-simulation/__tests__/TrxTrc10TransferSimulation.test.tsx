import React from 'react';
import { render, screen } from '@testing-library/react';
import UsdtTransferSimulation from '../TrxTrc10TransferSimulation';

describe('SRSimulation Component', () => {
  it('renders the heading correctly', () => {
    render(<UsdtTransferSimulation />);

    // Assert that the heading is rendered
    expect(screen.getByText(/Simulate TRX\/TRC10 Transfer Bandwidth Cost/i)).toBeInTheDocument();
  });
});
