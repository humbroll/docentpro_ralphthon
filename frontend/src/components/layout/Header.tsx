'use client';

import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Badge from '@mui/material/Badge';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import { useComparisonQueue } from '@/context/ComparisonQueueContext';

export default function Header() {
  const { count } = useComparisonQueue();

  return (
    <AppBar position="static" elevation={1}>
      <Toolbar>
        <Typography
          variant="h6"
          component="div"
          sx={{ flexGrow: 1, fontWeight: 700 }}
        >
          WhenToGo
        </Typography>

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
