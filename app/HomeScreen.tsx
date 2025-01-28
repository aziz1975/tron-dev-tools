import React from 'react';
import { Container, Typography, Card, CardContent, CardHeader } from '@mui/material';


const HomeScreen = () => {
  return (
    <Container maxWidth="sm" style={{ padding: '2rem', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)' }}>
      <Card sx={{ background: 'linear-gradient(45deg, #e60916 30%,rgb(51, 38, 38) 90%)', borderRadius: '15px', boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)' }}>
        <CardHeader title="Welcome to TRON Dev Tools" sx={{ color: '#fff', fontWeight: 'bold', }} />
        <CardContent>
          <Typography variant="body2" color="white">
            This is your one-stop solution for TRON development tools.
          </Typography>
        </CardContent>
      </Card>
    </Container>
  );
};

export default HomeScreen;
