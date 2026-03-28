'use client';

import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Badge from '@mui/material/Badge';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import { useComparisonQueue } from '@/context/ComparisonQueueContext';

export default function Header() {
  const { count } = useComparisonQueue();

  return (
    <AppBar position="static" elevation={1}>
      <Toolbar>
        <Stack direction="row" alignItems="center" spacing={2} sx={{ flexGrow: 1 }}>
          <Typography
            variant="h6"
            component="div"
            sx={{ fontWeight: 700 }}
          >
            WhenToGo
          </Typography>
          <Stack direction="row" alignItems="center" spacing={0.5} sx={{ opacity: 0.8 }}>
            <Typography variant="caption" sx={{ color: 'inherit', fontSize: '0.7rem' }}>
              featured by
            </Typography>
            <img
              src="/docentpro-logo.png"
              alt="DocentPro"
              style={{ height: 20, objectFit: 'contain' }}
            />
          </Stack>
        </Stack>

        {count > 0 && (
          <Badge
            badgeContent={count}
            color="secondary"
            aria-label={`${count} item${count !== 1 ? 's' : ''} in comparison queue`}
          >
            <CompareArrowsIcon />
          </Badge>
        )}
      </Toolbar>
    </AppBar>
  );
}
