'use client';

import Fab from '@mui/material/Fab';
import Badge from '@mui/material/Badge';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import { useComparisonQueue } from '@/context/ComparisonQueueContext';
import { MAX_QUEUE_SIZE } from '@/types/constants';

export default function ComparisonQueueFAB() {
  const { count } = useComparisonQueue();

  if (count === 0) return null;

  return (
    <Fab
      color="primary"
      aria-label={`${count} item${count !== 1 ? 's' : ''} in comparison queue`}
      sx={{ position: 'fixed', bottom: 24, right: 24 }}
    >
      <Badge
        badgeContent={count}
        color={count >= MAX_QUEUE_SIZE ? 'error' : 'secondary'}
      >
        <CompareArrowsIcon />
      </Badge>
    </Fab>
  );
}
