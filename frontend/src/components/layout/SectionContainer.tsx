'use client';

import { useRef, useEffect } from 'react';
import Box from '@mui/material/Box';
import Fade from '@mui/material/Fade';

interface SectionContainerProps {
  visible: boolean;
  children: React.ReactNode;
}

export function SectionContainer({ visible, children }: SectionContainerProps) {
  const ref = useRef<HTMLDivElement>(null);
  const prevVisible = useRef(visible);

  // Scroll into view when section first becomes visible
  useEffect(() => {
    if (visible && !prevVisible.current) {
      requestAnimationFrame(() => {
        ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
    prevVisible.current = visible;
  }, [visible]);

  return (
    <Fade
      in={visible}
      timeout={{ enter: 500, exit: 0 }}
      mountOnEnter
      unmountOnExit
      appear
    >
      <Box ref={ref} sx={{ mb: 6 }}>
        {children}
      </Box>
    </Fade>
  );
}
