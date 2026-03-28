'use client';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
}

export function EmptyState({ title, description, icon }: EmptyStateProps) {
  return (
    <Box
      sx={{
        textAlign: 'center',
        py: 6,
        px: 2,
      }}
    >
      {icon && (
        <Box sx={{ mb: 2, color: 'text.secondary', fontSize: 48 }}>
          {icon}
        </Box>
      )}
      <Typography variant="h6" color="text.secondary" gutterBottom>
        {title}
      </Typography>
      {description && (
        <Typography variant="body2" color="text.secondary">
          {description}
        </Typography>
      )}
    </Box>
  );
}
