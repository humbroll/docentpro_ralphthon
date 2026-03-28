'use client';

import Button from '@mui/material/Button';
import Tooltip from '@mui/material/Tooltip';
import AddIcon from '@mui/icons-material/Add';
import CheckIcon from '@mui/icons-material/Check';

interface AddToQueueButtonProps {
  onClick: () => void;
  disabled: boolean;
  justAdded: boolean;
  isFull: boolean;
  isDuplicate: boolean;
  allLoaded: boolean;
  originValid: boolean;
  tooltip: string;
}

export function AddToQueueButton({
  onClick,
  disabled,
  justAdded,
  isFull,
  isDuplicate,
  tooltip,
}: AddToQueueButtonProps) {
  const label = justAdded
    ? 'Added!'
    : isDuplicate
      ? 'Already in Queue'
      : isFull
        ? 'Queue Full'
        : 'Add to Queue';

  return (
    <Tooltip title={tooltip} arrow open={justAdded || undefined}>
      <span>
        <Button
          variant="contained"
          size="large"
          color={justAdded ? 'success' : 'primary'}
          startIcon={justAdded ? <CheckIcon /> : <AddIcon />}
          onClick={onClick}
          disabled={disabled}
        >
          {label}
        </Button>
      </span>
    </Tooltip>
  );
}
