import React from 'react';
import { render, screen } from '@testing-library/react';
import SRSimulation from '../SRSimulation';

describe('SRSimulation Component', () => {
  it('renders the heading correctly', () => {
    render(<SRSimulation />);

    // Assert that the heading is rendered
    expect(screen.getByText(/SR \/ SRP Rewards Simulator/i)).toBeInTheDocument();
  });
});
