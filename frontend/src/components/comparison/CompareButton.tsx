'use client';

import Button from '@mui/material/Button';
import Tooltip from '@mui/material/Tooltip';
import CircularProgress from '@mui/material/CircularProgress';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import { MIN_COMPARE_SIZE, MAX_QUEUE_SIZE } from '@/types/constants';

interface CompareButtonProps {
  count: number;
  isFull: boolean;
  isLoading: boolean;
  onCompare: () => void;
}

export function CompareButton({ count, isFull, isLoading, onCompare }: CompareButtonProps) {
  const canCompare = count >= MIN_COMPARE_SIZE;

  const tooltip = canCompare
    ? ''
    : isFull
      ? `Comparison queue is full (max ${MAX_QUEUE_SIZE})`
      : `Add at least ${MIN_COMPARE_SIZE} options to compare`;

  return (
    <Tooltip title={tooltip} arrow>
      <span>
        <Button
          variant="contained"
          size="large"
          startIcon={<CompareArrowsIcon />}
          onClick={onCompare}
          disabled={!canCompare || isLoading}
        >
          {isLoading ? (
            <>
              <CircularProgress size={20} color="inherit" sx={{ mr: 1 }} />
              Comparing...
            </>
          ) : (
            `Compare (${count})`
          )}
        </Button>
      </span>
    </Tooltip>
  );
}
