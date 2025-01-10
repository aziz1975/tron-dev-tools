'use client';

import React from "react";
import Link from "next/link";
import { AppBar, Button, Container, Toolbar, Typography } from '@mui/material';
import { createTheme, ThemeProvider } from '@mui/material/styles';

const theme = createTheme({
    palette: {
        primary: {
            main: '#f44336', // Red color
        },
        secondary: {
            main: '#ff7961', // Light red color
        },
    },
});

const Navbar: React.FC = () => {
    return (
        <ThemeProvider theme={theme}>
            <Container style={{ padding: "30px" }}>
                <AppBar position="static" color="primary" style={{ borderRadius: "10px" }}>
                    <Toolbar>
                        <Typography variant="h6" style={{ flexGrow: 1 }}>
                            Tron Dev Tools
                        </Typography>

                        <Link href="/sr-simulation">
                            <Button color="inherit" sx={{ '&:hover': { color: '#fff', backgroundColor: '#b71c1c', fontWeight: 'bold' } }}>SR/SRP Simulation</Button>
                        </Link>
                        <Link href="/usdt-transfer-simulation">
                            <Button color="inherit" sx={{ '&:hover': { color: '#fff', backgroundColor: '#b71c1c', fontWeight: 'bold' } }}>USDT Transfer Simulation</Button>
                        </Link>
                        <Link href="/trx-trc10-transfer-simulation">
                            <Button color="inherit" sx={{ '&:hover': { color: '#fff', backgroundColor: '#b71c1c', fontWeight: 'bold' } }}>TRX/TRC10 Transfer Simulation</Button>
                        </Link>
                        <Link href="/energy-and-bandwith-calculator">
                            <Button color="inherit" sx={{ '&:hover': { color: '#fff', backgroundColor: '#b71c1c', fontWeight: 'bold' } }}>Energy and Bandwith Calculator</Button>
                        </Link>
                        <Link href="/usdt-trc20-energy-calculator">
                            <Button color="inherit" sx={{ '&:hover': { color: '#fff', backgroundColor: '#b71c1c', fontWeight: 'bold' } }}>Transaction Calculator</Button>
                        </Link>
                    </Toolbar>
                </AppBar>
            </Container>
        </ThemeProvider>
    );
};

export default Navbar;
