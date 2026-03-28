'use client';

import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Header from './Header';
import Footer from './Footer';
import ComparisonQueueFAB from './ComparisonQueueFAB';

interface AppShellProps {
  children: React.ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
      }}
    >
      <Header />
      <Container
        component="main"
        maxWidth="lg"
        sx={{ flex: 1, py: 2 }}
      >
        {children}
      </Container>
      <ComparisonQueueFAB />
      <Footer />
    </Box>
  );
}
