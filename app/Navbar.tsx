'use client';

import React from "react";
import Link from "next/link";
import { AppBar, Container, Toolbar, Typography, Tabs, Tab } from '@mui/material';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import Image from 'next/image';

const theme = createTheme({
    palette: {
        primary: {
            main: '#ff5733', // Red color
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
                <Container maxWidth="lg">

                    <Toolbar>
                        <Typography variant="h6" component="div" sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', color: 'white' }}>
                            <Link href="/">
                                <Image src="/images/tron-logo.jpeg" alt="Tron Logo" width={70} height={70} style={{ marginRight: '8px' }} />
                            </Link>
                        </Typography>
                        <Tabs sx={{
                            background: 'linear-gradient(45deg,rgb(216, 46, 52) 30%,rgb(50, 40, 40) 90%)',
                            borderRadius: 5,
                            boxShadow: '0 3px 5px 2px rgba(18, 17, 17, 0.3)',
                            justifyContent: "left"
                        }}>
                            <Tab label="Smart Contracts" component={Link} href="/energy-and-bandwith-calculator" sx={{
                                '&:hover': {
                                    backgroundColor: 'rgba(255, 255, 255, 0.2)',
                                    transform: 'scale(1.05)',
                                    transition: 'transform 0.2s',
                                },
                                color: 'white',
                                fontSize: 12
                            }} />
                            <Tab label="SR Rewards" component={Link} href="/sr-simulation" sx={{
                                '&:hover': {
                                    backgroundColor: 'rgba(255, 255, 255, 0.2)',
                                    transform: 'scale(1.05)',
                                    transition: 'transform 0.2s',
                                },
                                color: 'white',
                                fontSize: 12
                            }} />
                            <Tab label="USDT Transfers" component={Link} href="/usdt-transfer-simulation" sx={{
                                '&:hover': {
                                    backgroundColor: 'rgba(255, 255, 255, 0.2)',
                                    transform: 'scale(1.05)',
                                    transition: 'transform 0.2s',
                                },
                                color: 'white',
                                fontSize: 12
                            }} />
                            <Tab label="Resource Calculator" component={Link} href="/resource-calculator" sx={{
                                '&:hover': {
                                    backgroundColor: 'rgba(255, 255, 255, 0.2)',
                                    transform: 'scale(1.05)',
                                    transition: 'transform 0.2s',
                                },
                                color: 'white',
                                fontSize: 12
                            }} />
                            <Tab label="Revenue Calculator" component={Link} href="/revenue-calculator" sx={{
                                '&:hover': {
                                    backgroundColor: 'rgba(255, 255, 255, 0.2)',
                                    transform: 'scale(1.05)',
                                    transition: 'transform 0.2s',
                                },
                                color: 'white',
                                fontSize: 12
                            }} />
                            <Tab label="TRX/Trc10 Transfers" component={Link} href="/trx-trc10-transfer-simulation" sx={{
                                '&:hover': {
                                    backgroundColor: 'rgba(255, 255, 255, 0.2)',
                                    transform: 'scale(1.05)',
                                    transition: 'transform 0.2s',
                                },
                                color: 'white',
                                fontSize: 12
                            }} />

                        </Tabs>
                    </Toolbar>
                </Container>
            </AppBar>
        </ThemeProvider>
    );
};

export default Navbar;
