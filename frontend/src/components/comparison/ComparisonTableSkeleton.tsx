'use client';

import Box from '@mui/material/Box';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';

export function ComparisonTableSkeleton() {
  return (
    <Box sx={{ py: 3 }}>
      <Stack spacing={1}>
        <Skeleton variant="rectangular" height={48} />
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} variant="rectangular" height={40} />
        ))}
      </Stack>
    </Box>
  );
}
