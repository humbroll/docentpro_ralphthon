'use client';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  subtitle?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function EmptyState({ icon, title, subtitle, action }: EmptyStateProps) {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 1.5,
        py: 6,
        px: 2,
      }}
    >
      {icon && (
        <Box sx={{ fontSize: 48, color: 'text.disabled' }}>
          {icon}
        </Box>
      )}
      <Typography variant="h6" color="text.secondary" textAlign="center">
        {title}
      </Typography>
      {subtitle && (
        <Typography variant="body2" color="text.disabled" textAlign="center">
          {subtitle}
        </Typography>
      )}
      {action && (
        <Button variant="text" color="primary" size="medium" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </Box>
  );
}
