'use client';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import Chip from '@mui/material/Chip';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import { QueueItemCard } from './QueueItemCard';
import { ComparisonTable } from './ComparisonTable';
import { InlineError } from '../shared/InlineError';
import { useComparisonQueue } from '@/context/ComparisonQueueContext';
import { MIN_COMPARE_SIZE } from '@/types/constants';
import dayjs from 'dayjs';

export function ComparisonSection() {
  const {
    queue,
    count,
    removeItem,
    clearQueue,
    comparisonResult,
    compareTrips,
    resetComparison,
  } = useComparisonQueue();

  const canCompare = count >= MIN_COMPARE_SIZE;

  return (
    <Box sx={{ mb: 6 }}>
      <Typography variant="h5" component="h2" fontWeight={600} gutterBottom>
        Compare Options
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Add at least {MIN_COMPARE_SIZE} date options to compare. Maximum 5.
      </Typography>

      {/* Zone A: Queue Management */}
      <Box sx={{ mb: 3 }}>
        <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
          {queue.map((item) => (
            <QueueItemCard key={item.id} item={item} onRemove={removeItem} />
          ))}
          {count < 5 && (
            <Box
              sx={{
                minWidth: 200,
                height: 130,
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
          )}
        </Stack>

        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Button
            variant="outlined"
            color="error"
            size="small"
            startIcon={<DeleteSweepIcon />}
            onClick={clearQueue}
            disabled={count === 0}
          >
            Clear All
          </Button>

          <Button
            variant="contained"
            size="large"
            startIcon={<CompareArrowsIcon />}
            onClick={compareTrips}
            disabled={!canCompare || comparisonResult.state === 'loading'}
          >
            {comparisonResult.state === 'loading' ? (
              <>
                <CircularProgress size={20} color="inherit" sx={{ mr: 1 }} />
                Comparing...
              </>
            ) : (
              `Compare (${count})`
            )}
          </Button>
        </Stack>
      </Box>

      {/* Zone B: Comparison Results */}
      {comparisonResult.state === 'error' && (
        <InlineError
          message={comparisonResult.error ?? 'Failed to compare options.'}
          onRetry={compareTrips}
        />
      )}

      {comparisonResult.state === 'success' && comparisonResult.data && (
        <Box sx={{ mt: 3 }}>
          {/* Winner Banner */}
          {comparisonResult.data.options.length > 0 && (
            <Alert
              icon={<EmojiEventsIcon />}
              severity="success"
              sx={{ mb: 3 }}
            >
              <Typography variant="subtitle1" fontWeight={600}>
                Best Overall: {comparisonResult.data.options[comparisonResult.data.best_option_index].destination},{' '}
                {dayjs(comparisonResult.data.options[comparisonResult.data.best_option_index].start_date).format('MMM D')}
                &ndash;
                {dayjs(comparisonResult.data.options[comparisonResult.data.best_option_index].end_date).format('MMM D, YYYY')}
                {' '}&mdash; Score: {comparisonResult.data.options[comparisonResult.data.best_option_index].overall_score.toFixed(1)}
              </Typography>
            </Alert>
          )}

          {/* Score Summary Chips */}
          <Stack direction="row" spacing={1} sx={{ mb: 3 }} flexWrap="wrap" useFlexGap>
            {comparisonResult.data.options.map((opt, i) =>
              opt.tags.map((tag) => (
                <Chip
                  key={`${i}-${tag}`}
                  label={`${tag === 'cheapest' ? 'Cheapest' : tag === 'best_weather' ? 'Best Weather' : 'Best Overall'}: ${opt.destination} ${dayjs(opt.start_date).format('MMM D')}-${dayjs(opt.end_date).format('D')}`}
                  color={tag === 'cheapest' ? 'success' : tag === 'best_weather' ? 'info' : 'warning'}
                />
              ))
            )}
          </Stack>

          {/* Comparison Table */}
          <ComparisonTable
            options={comparisonResult.data.options}
            bestIndex={comparisonResult.data.best_option_index}
          />

          {/* Compare Again Button */}
          <Box sx={{ mt: 3, textAlign: 'center' }}>
            <Button variant="outlined" onClick={resetComparison}>
              Compare Again
            </Button>
          </Box>
        </Box>
      )}
    </Box>
  );
}
