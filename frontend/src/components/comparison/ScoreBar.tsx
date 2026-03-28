'use client';

import Box from '@mui/material/Box';
import LinearProgress from '@mui/material/LinearProgress';
import Typography from '@mui/material/Typography';

interface ScoreBarProps {
  score: number;
  maxScore?: number;
}

function getScoreColor(score: number): 'success' | 'info' | 'warning' | 'error' {
  if (score >= 70) return 'success';
  if (score >= 60) return 'info';
  if (score >= 40) return 'warning';
  return 'error';
}

export function ScoreBar({ score, maxScore = 100 }: ScoreBarProps) {
  const normalized = Math.min((score / maxScore) * 100, 100);

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <Box sx={{ flex: 1 }}>
        <LinearProgress
          variant="determinate"
          value={normalized}
          color={getScoreColor(score)}
          sx={{ height: 8, borderRadius: 4 }}
        />
      </Box>
      <Typography variant="body2" fontWeight={600} sx={{ minWidth: 40, textAlign: 'right' }}>
        {score.toFixed(1)}
      </Typography>
    </Box>
  );
}
