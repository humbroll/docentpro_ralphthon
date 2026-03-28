'use client';

import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';

interface InlineErrorProps {
  message: string;
  onRetry: () => void;
}

export function InlineError({ message, onRetry }: InlineErrorProps) {
  return (
    <Box>
      <Alert severity="error">{message}</Alert>
      <Box sx={{ mt: 1 }}>
        <Button variant="outlined" size="small" onClick={onRetry}>
          Retry
        </Button>
      </Box>
    </Box>
  );
}
