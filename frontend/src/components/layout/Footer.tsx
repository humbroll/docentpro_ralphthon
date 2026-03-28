'use client';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

export default function Footer() {
  return (
    <Box
      component="footer"
      sx={{
        py: 2,
        px: 3,
        mt: 'auto',
        borderTop: 1,
        borderColor: 'divider',
        textAlign: 'center',
      }}
    >
      <Typography variant="body2" color="text.secondary">
        WhenToGo — Find the best dates for your next trip
      </Typography>
    </Box>
  );
}
