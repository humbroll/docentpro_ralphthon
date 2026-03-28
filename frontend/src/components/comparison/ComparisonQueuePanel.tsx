'use client';

import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import { QueueItemCard } from './QueueItemCard';
import type { ComparisonQueueItem } from '@/types/frontend';
import { MAX_QUEUE_SIZE } from '@/types/constants';

interface ComparisonQueuePanelProps {
  queue: ComparisonQueueItem[];
  onRemove: (id: string) => void;
  disabled: boolean;
}

export function ComparisonQueuePanel({ queue, onRemove, disabled }: ComparisonQueuePanelProps) {
  return (
    <Grid container spacing={2} sx={{ mb: 2 }}>
      {queue.map((item) => (
        <Grid key={item.id} size={{ xs: 12, sm: 6, md: 4 }}>
          <QueueItemCard item={item} onRemove={onRemove} disabled={disabled} />
        </Grid>
      ))}
      {queue.length < MAX_QUEUE_SIZE && (
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <Box
            sx={{
              minHeight: 160,
              border: '2px dashed',
              borderColor: 'divider',
              borderRadius: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Typography variant="body2" color="text.secondary">
              Add more options above
            </Typography>
          </Box>
        </Grid>
      )}
    </Grid>
  );
}
