'use client';

import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';

interface InlineErrorProps {
  message: string;
  onRetry: () => void;
}

export function InlineError({ message, onRetry }: InlineErrorProps) {
  return (
    <Alert
      severity="error"
      action={
        <Button color="error" size="small" onClick={onRetry}>
          Retry
        </Button>
      }
    >
      {message}
    </Alert>
  );
}
