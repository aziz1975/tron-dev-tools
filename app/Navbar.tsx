'use client';

import React from "react";
import Link from "next/link";
import { AppBar, Container, Toolbar, Typography, Tabs, Tab } from '@mui/material';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import Image from 'next/image';

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
            <AppBar position="static" style={{ backgroundColor: "#e60916", marginBottom: '20px' }}>
                <Container maxWidth="xl">
                    <Toolbar>
                        <Typography variant="h6" component="div" sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', color: 'white' }}>
                            <Image src="/images/tron-logo.jpeg" alt="Tron Logo" width={80} height={80} style={{ marginRight: '10px' }} />
                        </Typography>
                        <Tabs sx={{
                            background: 'linear-gradient(45deg, #e60916 30%, #ff8e53 90%)',
                            borderRadius: 5,
                            boxShadow: '0 3px 5px 2px rgba(255, 105, 135, .3)',
                        }}>
                            <Tab label="Energy Calculator" component={Link} href="/energy-and-bandwith-calculator" sx={{
                                '&:hover': {
                                    backgroundColor: 'rgba(255, 255, 255, 0.2)',
                                    transform: 'scale(1.05)',
                                    transition: 'transform 0.2s',
                                },
                                fontWeight: 'bold',
                                color: 'white',
                            }} />
                            <Tab label="SR Simulation" component={Link} href="/sr-simulation" sx={{
                                '&:hover': {
                                    backgroundColor: 'rgba(255, 255, 255, 0.2)',
                                    transform: 'scale(1.05)',
                                    transition: 'transform 0.2s',
                                },
                                fontWeight: 'bold',
                                color: 'white',
                            }} />
                            <Tab label="USDT Transfer Simulation" component={Link} href="/usdt-transfer-simulation" sx={{
                                '&:hover': {
                                    backgroundColor: 'rgba(255, 255, 255, 0.2)',
                                    transform: 'scale(1.05)',
                                    transition: 'transform 0.2s',
                                },
                                fontWeight: 'bold',
                                color: 'white',
                            }} />
                            <Tab label="TRX/Trc10 Transfer Simulation" component={Link} href="/trx-trc10-transfer-simulation" sx={{
                                '&:hover': {
                                    backgroundColor: 'rgba(255, 255, 255, 0.2)',
                                    transform: 'scale(1.05)',
                                    transition: 'transform 0.2s',
                                },
                                fontWeight: 'bold',
                                color: 'white',
                            }} />
                        </Tabs>
                    </Toolbar>
                </Container>
            </AppBar>
        </ThemeProvider>
    );
};

export default Navbar;
