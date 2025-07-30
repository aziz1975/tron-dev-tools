'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { AppBar, Container, Toolbar, Tabs, Tab } from '@mui/material';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import Image from 'next/image';
import { usePathname } from 'next/navigation';

// 1. Define nav items as objects for true dynamic mapping
const navItems = [
  { path: '/energy-and-bandwith-calculator', label: 'Smart Contracts' },
  { path: '/sr-simulation',                   label: 'SR Rewards' },
  { path: '/usdt-transfer-simulation',        label: 'USDT Transfers' },
  { path: '/resource-calculator',             label: 'Resource Calculator' },
  { path: '/revenue-calculator',              label: 'Revenue Calculator' },
  { path: '/trx-trc10-transfer-simulation',   label: 'TRX/TRC10 Transfers' },
  { path: '/tron-debug',                      label: 'TRON Debug' }
];

const theme = createTheme({
  palette: {
    primary: { main: '#ff5733' },
    secondary: { main: '#ff7961' }
  }
});

const Navbar: React.FC = () => {
  const pathname = usePathname();
  const currentTab = navItems.findIndex(item => item.path === pathname);
  const [value, setValue] = useState(currentTab >= 0 ? currentTab : 0);

  return (
    <ThemeProvider theme={theme}>
      <AppBar position="static" sx={{ backgroundColor: '#e60916', mb: 2 }}>
        <Container maxWidth="lg">
          <Toolbar disableGutters>
            <Link href="/">
              <Image
                src="/images/tron-logo.jpeg"
                alt="Tron Logo"
                width={70}
                height={70}
                style={{ marginRight: 12, cursor: 'pointer' }}
              />
            </Link>

            <Tabs
              value={value}
              onChange={(_, newValue) => setValue(newValue)}
              variant="scrollable"
              scrollButtons="auto"
              allowScrollButtonsMobile
              textColor="inherit"
              TabIndicatorProps={{ style: { backgroundColor: 'white' } }}
              sx={{
                flexGrow: 1,
                ml: 2,
                background: 'linear-gradient(45deg, rgb(216,46,52) 30%, rgb(50,40,40) 90%)',
                borderRadius: 1,
                boxShadow: '0 3px 5px 2px rgba(18,17,17,0.3)'
              }}
            >
              {navItems.map((item) => (
                <Tab
                  key={item.path}
                  label={item.label}
                  component={Link}
                  href={item.path}
                  sx={{
                    '&:hover': {
                      backgroundColor: 'rgba(255,255,255,0.2)',
                      transform: 'scale(1.05)',
                      transition: 'transform 0.2s'
                    },
                    color: 'white',
                    fontWeight: 'bold',
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
