'use client';

import React, { useState } from "react";
import Link from "next/link";
import { AppBar, Container, Toolbar, Typography, Tabs, Tab } from '@mui/material';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import Image from 'next/image';
import { usePathname } from 'next/navigation'; // for setting tab based on URL

const theme = createTheme({
    palette: {
        primary: {
            main: '#ff5733',
        },
        secondary: {
            main: '#ff7961',
        },
    },
});

const tabRoutes = [
    "/energy-and-bandwith-calculator",
    "/sr-simulation",
    "/usdt-transfer-simulation",
    "/resource-calculator",
    "/revenue-calculator",
    "/trx-trc10-transfer-simulation"
];

const Navbar: React.FC = () => {
    const pathname = usePathname();
    const currentTabIndex = tabRoutes.indexOf(pathname); // returns -1 if not found
    const [value, setValue] = useState(currentTabIndex !== -1 ? currentTabIndex : 0);

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
                        <Tabs
                            value={value}
                            onChange={(event, newValue) => setValue(newValue)}
                            textColor="inherit"  // Prevents default primary text
                            TabIndicatorProps={{
                                style: {
                                    backgroundColor: 'white', // ✅ Change this to any color you like
                                    fontWeight: "bold"
                                }
                            }}
                            sx={{
                                background: 'linear-gradient(45deg,rgb(216, 46, 52) 30%,rgb(50, 40, 40) 90%)',
                                borderRadius: 5,
                                boxShadow: '0 3px 5px 2px rgba(18, 17, 17, 0.3)',
                                justifyContent: "left"
                            }}
                        >
                            {tabRoutes.map((route, index) => (
                                <Tab
                                    key={route}
                                    label={
                                        [
                                            "Smart Contracts",
                                            "SR Rewards",
                                            "USDT Transfers",
                                            "Resource Calculator",
                                            "Revenue Calculator",
                                            "TRX/Trc10 Transfers"
                                        ][index]
                                    }
                                    component={Link}
                                    href={route}
                                    sx={{
                                        '&:hover': {
                                            backgroundColor: 'rgba(255, 255, 255, 0.2)',
                                            transform: 'scale(1.05)',
                                            transition: 'transform 0.2s',
                                        },
                                        color: 'white',
                                        fontWeight: "bold",
                                        fontSize: 12
                                    }}
                                />
                            ))}
                        </Tabs>
                    </Toolbar>
                </Container>
            </AppBar>
        </ThemeProvider>
    );
};

export default Navbar;
