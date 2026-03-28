'use client';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import Tooltip from '@mui/material/Tooltip';
import CircularProgress from '@mui/material/CircularProgress';
import Chip from '@mui/material/Chip';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import EventNoteOutlinedIcon from '@mui/icons-material/EventNoteOutlined';
import { QueueItemCard } from './QueueItemCard';
import { ComparisonTable } from './ComparisonTable';
import { InlineError } from '../shared/InlineError';
import { EmptyState } from '../shared/EmptyState';
import { useComparisonQueue } from '@/context/ComparisonQueueContext';
import { MIN_COMPARE_SIZE, MAX_QUEUE_SIZE, TAG_COLORS, TAG_LABELS } from '@/types/constants';
import dayjs from 'dayjs';

export function ComparisonSection() {
  const {
    queue,
    count,
    isFull,
    removeItem,
    clearQueue,
    comparisonResult,
    compareTrips,
    resetComparison,
  } = useComparisonQueue();

  const canCompare = count >= MIN_COMPARE_SIZE;

  const compareTooltip = canCompare
    ? ''
    : isFull
      ? `Comparison queue is full (max ${MAX_QUEUE_SIZE})`
      : `Add at least ${MIN_COMPARE_SIZE} date options to compare`;

  return (
    <Box id="comparison-section" sx={{ mb: 6 }}>
      <Typography variant="h5" component="h2" fontWeight={600} gutterBottom>
        Compare Date Options ({count} of {MAX_QUEUE_SIZE})
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Add at least {MIN_COMPARE_SIZE} date options to compare side by side.
      </Typography>

      {/* Empty Queue State */}
      {count === 0 && (
        <EmptyState
          icon={<EventNoteOutlinedIcon sx={{ fontSize: 48 }} />}
          title="No date options added yet"
          subtitle="Search for a destination and select travel dates to build comparison options."
          action={{
            label: 'Search Destinations',
            onClick: () => {
              window.scrollTo({ top: 0, behavior: 'smooth' });
              setTimeout(() => {
                document.getElementById('destination-search-input')?.focus();
              }, 500);
            },
          }}
        />
      )}

      {/* Queue Items */}
      {count > 0 && (
        <Box sx={{ mb: 3 }}>
          <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
            {queue.map((item) => (
              <QueueItemCard key={item.id} item={item} onRemove={removeItem} />
            ))}
            {count < MAX_QUEUE_SIZE && (
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

          {/* Sub-minimum alert */}
          {count === 1 && (
            <Alert severity="info" sx={{ mb: 2 }}>
              Add at least 1 more date option to enable comparison.
            </Alert>
          )}

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

            <Tooltip title={compareTooltip} arrow>
              <span>
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
              </span>
            </Tooltip>
          </Stack>
        </Box>
      )}

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
          {(() => {
            const bestOption = comparisonResult.data.options[comparisonResult.data.best_option_index];
            return bestOption ? (
              <Alert
                icon={<EmojiEventsIcon />}
                severity="success"
                sx={{ mb: 3 }}
              >
                <Typography variant="subtitle1" fontWeight={600}>
                  Best Overall: {bestOption.destination},{' '}
                  {dayjs(bestOption.start_date).format('MMM D')}
                  &ndash;
                  {dayjs(bestOption.end_date).format('MMM D, YYYY')}
                  {' '}&mdash; Score: {bestOption.overall_score.toFixed(1)}
                </Typography>
              </Alert>
            ) : null;
          })()}

          {/* Score Summary Chips */}
          <Stack direction="row" spacing={1} sx={{ mb: 3 }} flexWrap="wrap" useFlexGap>
            {comparisonResult.data.options.map((opt, i) =>
              opt.tags.map((tag) => (
                <Chip
                  key={`${i}-${tag}`}
                  label={`${TAG_LABELS[tag] ?? tag}: ${opt.destination} ${dayjs(opt.start_date).format('MMM D')}-${dayjs(opt.end_date).format('D')}`}
                  color={TAG_COLORS[tag] ?? 'default'}
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
