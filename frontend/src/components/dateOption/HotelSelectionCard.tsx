'use client';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardHeader from '@mui/material/CardHeader';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import Chip from '@mui/material/Chip';
import HotelIcon from '@mui/icons-material/Hotel';
import ApartmentOutlinedIcon from '@mui/icons-material/ApartmentOutlined';
import { InlineError } from '../shared/InlineError';
import type { HotelOption } from '@/types/api';
import type { LoadingState } from '@/types/frontend';

interface HotelSelectionCardProps {
  state: LoadingState;
  hotels: HotelOption[] | null;
  error: string | null;
  onRetry: () => void;
  selectedHotel: HotelOption | null;
  onSelectHotel: (hotel: HotelOption) => void;
}

export function HotelSelectionCard({
  state,
  hotels,
  error,
  onRetry,
  selectedHotel,
  onSelectHotel,
}: HotelSelectionCardProps) {
  return (
    <Card variant="outlined" sx={{ height: '100%' }}>
      <CardHeader
        avatar={<HotelIcon color="primary" />}
        title="Hotels"
        titleTypographyProps={{ variant: 'h6' }}
      />
      <CardContent>
        {state === 'loading' && (
          <Stack spacing={1}>
            <Skeleton variant="rectangular" height={72} />
            <Skeleton variant="rectangular" height={72} />
            <Skeleton variant="rectangular" height={72} />
          </Stack>
        )}

        {state === 'error' && (
          <InlineError message={error ?? 'Failed to load hotels.'} onRetry={onRetry} />
        )}

        {state === 'success' && hotels && hotels.length > 0 && (
          <List disablePadding>
            {hotels.map((hotel, index) => (
              <ListItemButton
                key={hotel.hotel_id}
                selected={selectedHotel?.hotel_id === hotel.hotel_id}
                onClick={() => onSelectHotel(hotel)}
                sx={{ borderRadius: 1, mb: 0.5 }}
              >
                <ListItemText
                  primary={
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <Typography variant="body2" fontWeight={500}>
                        {hotel.hotel_name}
                      </Typography>
                      {index === 0 && (
                        <Chip label="Cheapest" size="small" color="success" variant="outlined" />
                      )}
                    </Stack>
                  }
                  secondary={
                    <Stack direction="row" spacing={2}>
                      <Typography variant="caption">
                        ${hotel.total_price.toFixed(2)} total
                      </Typography>
                      {hotel.rating != null && (
                        <Typography variant="caption">
                          Rating: {hotel.rating.toFixed(1)}/5
                        </Typography>
                      )}
                      {hotel.distance != null && (
                        <Typography variant="caption">
                          {hotel.distance.toFixed(1)} km from center
                        </Typography>
                      )}
                    </Stack>
                  }
                />
              </ListItemButton>
            ))}
          </List>
        )}

        {state === 'success' && hotels && hotels.length === 0 && (
          <Box sx={{ textAlign: 'center', py: 3 }}>
            <ApartmentOutlinedIcon sx={{ fontSize: 40, color: 'text.disabled', mb: 1 }} />
            <Typography variant="body2" color="text.secondary" fontWeight={500}>
              No hotels available
            </Typography>
            <Typography variant="caption" color="text.disabled">
              Try adjusting your dates or destination.
            </Typography>
          </Box>
        )}

        {state === 'idle' && (
          <Typography variant="body2" color="text.secondary">
            Select dates to see hotel options.
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}
