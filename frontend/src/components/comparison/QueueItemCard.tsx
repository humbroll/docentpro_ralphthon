'use client';

import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Grid from '@mui/material/Grid';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import CloseIcon from '@mui/icons-material/Close';
import type { ComparisonQueueItem } from '@/types/frontend';
import { WEATHER_LABEL_COLORS } from '@/types/constants';
import dayjs from 'dayjs';

interface QueueItemCardProps {
  item: ComparisonQueueItem;
  onRemove: (id: string) => void;
  disabled?: boolean;
}

export function QueueItemCard({ item, onRemove, disabled }: QueueItemCardProps) {
  const nights = dayjs(item.endDate).diff(dayjs(item.startDate), 'day');

  return (
    <Card variant="outlined" sx={{ minWidth: 220, maxWidth: 280 }}>
      <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
        {/* Header: destination + close */}
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
          <div>
            <Typography variant="subtitle1" fontWeight={600} lineHeight={1.3}>
              {item.destination}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {dayjs(item.startDate).format('MMM D')} &ndash; {dayjs(item.endDate).format('MMM D, YYYY')} ({nights}n)
            </Typography>
          </div>
          <IconButton
            size="small"
            onClick={() => onRemove(item.id)}
            disabled={disabled}
            aria-label={`Remove ${item.destination}`}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </Stack>

        <Divider sx={{ my: 1 }} />

        {/* 2x2 stats grid */}
        <Grid container spacing={1} columns={2}>
          <Grid size={1}>
            <Typography variant="caption" color="text.secondary">Flight/pp</Typography>
            <Typography variant="body2" fontWeight={500}>${item.flightPrice.toFixed(0)}</Typography>
          </Grid>
          <Grid size={1}>
            <Typography variant="caption" color="text.secondary">Hotel</Typography>
            <Typography variant="body2" fontWeight={500}>${item.hotelPrice.toFixed(0)}</Typography>
          </Grid>
          <Grid size={1}>
            <Typography variant="caption" color="text.secondary">Weather</Typography>
            <Chip
              label={item.weather.label}
              size="small"
              sx={{
                backgroundColor: WEATHER_LABEL_COLORS[item.weather.label],
                color: '#fff',
                fontWeight: 500,
                height: 20,
                fontSize: '0.7rem',
              }}
            />
          </Grid>
          <Grid size={1}>
            <Typography variant="caption" color="text.secondary">Travelers</Typography>
            <Typography variant="body2" fontWeight={500}>{item.travelerCount}</Typography>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
}
