'use client';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import EventNoteOutlinedIcon from '@mui/icons-material/EventNoteOutlined';
import { ComparisonQueuePanel } from './ComparisonQueuePanel';
import { CompareButton } from './CompareButton';
import { BestOptionBanner } from './BestOptionBanner';
import { ScoreSummaryCards } from './ScoreSummaryCards';
import { ComparisonTable } from './ComparisonTable';
import { ComparisonTableSkeleton } from './ComparisonTableSkeleton';
import { CostBreakdownChart } from './CostBreakdownChart';
import { ScoreComparisonChart } from './ScoreComparisonChart';
import { InlineError } from '../shared/InlineError';
import { EmptyState } from '../shared/EmptyState';
import { useComparisonQueue } from '@/context/ComparisonQueueContext';
import { MIN_COMPARE_SIZE, MAX_QUEUE_SIZE } from '@/types/constants';

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

  const isLoading = comparisonResult.state === 'loading';

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
          <ComparisonQueuePanel
            queue={queue}
            onRemove={removeItem}
            disabled={isLoading}
          />

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
              disabled={isLoading}
            >
              Clear All
            </Button>

            <CompareButton
              count={count}
              isFull={isFull}
              isLoading={isLoading}
              onCompare={compareTrips}
            />
          </Stack>
        </Box>
      )}

      {/* Loading State */}
      {comparisonResult.state === 'loading' && (
        <ComparisonTableSkeleton />
      )}

      {/* Error State */}
      {comparisonResult.state === 'error' && (
        <InlineError
          message={comparisonResult.error ?? 'Failed to compare options.'}
          onRetry={compareTrips}
        />
      )}

      {/* Results */}
      {comparisonResult.state === 'success' && comparisonResult.data && (
        <Box sx={{ mt: 3 }}>
          {/* Winner Banner */}
          {(() => {
            const bestOption = comparisonResult.data.options[comparisonResult.data.best_option_index];
            return bestOption ? <BestOptionBanner option={bestOption} /> : null;
          })()}

          {/* Score Summary Chips */}
          <ScoreSummaryCards options={comparisonResult.data.options} />

          {/* Charts */}
          <CostBreakdownChart options={comparisonResult.data.options} />
          <ScoreComparisonChart options={comparisonResult.data.options} />

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
