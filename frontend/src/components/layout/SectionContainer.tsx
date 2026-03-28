'use client';

import Box from '@mui/material/Box';
import Fade from '@mui/material/Fade';

interface SectionContainerProps {
  visible: boolean;
  children: React.ReactNode;
}

export function SectionContainer({ visible, children }: SectionContainerProps) {
  if (!visible) return null;

  return (
    <Fade in={visible} timeout={400}>
      <Box sx={{ mb: 6 }}>
        {children}
      </Box>
    </Fade>
  );
}
