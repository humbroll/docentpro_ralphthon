'use client';

import Chip from '@mui/material/Chip';
import { TAG_COLORS, TAG_LABELS } from '@/types/constants';

interface TagChipProps {
  tag: string;
}

export function TagChip({ tag }: TagChipProps) {
  return (
    <Chip
      label={TAG_LABELS[tag] ?? tag}
      size="small"
      color={TAG_COLORS[tag] ?? 'default'}
      variant="filled"
    />
  );
}
