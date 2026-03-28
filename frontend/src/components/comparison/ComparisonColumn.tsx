'use client';

import TableCell from '@mui/material/TableCell';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import type { TripOption } from '@/types/api';
import dayjs from 'dayjs';

interface ComparisonColumnProps {
  option: TripOption;
  index: number;
  isBest: boolean;
}

export function ComparisonColumnHeader({ option, index, isBest }: ComparisonColumnProps) {
  return (
    <TableCell
      align="center"
      sx={{
        fontWeight: 600,
        backgroundColor: isBest ? 'rgba(76, 175, 80, 0.1)' : undefined,
      }}
    >
      <Typography variant="subtitle2" fontWeight={600}>
        Option {index + 1}
      </Typography>
      <Typography variant="caption" color="text.secondary">
        {option.destination}, {dayjs(option.start_date).format('MMM D')}
      </Typography>
      {isBest && (
        <Chip
          label="Best Overall"
          size="small"
          color="warning"
          sx={{ display: 'block', mt: 0.5, mx: 'auto', width: 'fit-content' }}
        />
      )}
    </TableCell>
  );
}
