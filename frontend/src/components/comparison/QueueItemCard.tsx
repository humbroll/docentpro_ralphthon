'use client';

import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Chip from '@mui/material/Chip';
import CloseIcon from '@mui/icons-material/Close';
import type { ComparisonQueueItem } from '@/types/frontend';
import { WEATHER_LABEL_COLORS } from '@/types/constants';
import dayjs from 'dayjs';

interface QueueItemCardProps {
  item: ComparisonQueueItem;
  onRemove: (id: string) => void;
}

export function QueueItemCard({ item, onRemove }: QueueItemCardProps) {
  const nights = dayjs(item.endDate).diff(dayjs(item.startDate), 'day');

  return (
    <Card variant="outlined" sx={{ minWidth: 200, position: 'relative' }}>
      <IconButton
        size="small"
        onClick={() => onRemove(item.id)}
        sx={{ position: 'absolute', top: 4, right: 4 }}
      >
        <CloseIcon fontSize="small" />
      </IconButton>
      <CardContent sx={{ pr: 4 }}>
        <Typography variant="subtitle2" fontWeight={600}>
          {item.destination}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {dayjs(item.startDate).format('MMM D')} &ndash; {dayjs(item.endDate).format('MMM D, YYYY')} ({nights}n)
        </Typography>

        <Stack direction="row" spacing={1} sx={{ mt: 1 }} flexWrap="wrap">
          <Chip label={`$${item.flightPrice.toFixed(0)}/pp`} size="small" variant="outlined" />
          <Chip label={`$${item.hotelPrice.toFixed(0)} hotel`} size="small" variant="outlined" />
          <Chip
            label={item.weather.label}
            size="small"
            sx={{
              backgroundColor: WEATHER_LABEL_COLORS[item.weather.label],
              color: '#fff',
              fontWeight: 500,
            }}
          />
        </Stack>
      </CardContent>
    </Card>
  );
}
