'use client';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import type { CalendarDay } from '@/types/api';
import { WEATHER_LABEL_COLORS } from '@/types/constants';
import dayjs from 'dayjs';

interface CalendarDayCellProps {
  date: dayjs.Dayjs;
  weather: CalendarDay | null;
  isInRange: boolean;
  isStart: boolean;
  isEnd: boolean;
  isHovered: boolean;
  onClick: (date: dayjs.Dayjs) => void;
  onHover: (date: dayjs.Dayjs | null) => void;
  disabled: boolean;
}

export function CalendarDayCell({
  date,
  weather,
  isInRange,
  isStart,
  isEnd,
  isHovered,
  onClick,
  onHover,
  disabled,
}: CalendarDayCellProps) {
  const bgColor = weather?.weather_label
    ? `${WEATHER_LABEL_COLORS[weather.weather_label]}20`
    : 'transparent';

  const borderColor = isStart || isEnd
    ? 'primary.main'
    : isInRange || isHovered
      ? 'primary.light'
      : 'divider';

  return (
    <Box
      onClick={() => !disabled && onClick(date)}
      onMouseEnter={() => !disabled && onHover(date)}
      onMouseLeave={() => onHover(null)}
      sx={{
        height: 80,
        p: 0.5,
        border: 1,
        borderColor,
        borderRadius: 1,
        backgroundColor: isInRange || isHovered ? 'action.hover' : bgColor,
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.4 : 1,
        '&:hover': disabled ? {} : { backgroundColor: 'action.hover' },
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <Typography variant="caption" fontWeight={600} lineHeight={1.2}>
        {date.date()}
      </Typography>

      {weather?.temp_high != null && weather?.temp_low != null && (
        <Typography variant="caption" sx={{ fontSize: '0.65rem', lineHeight: 1.3 }}>
          {Math.round(weather.temp_high)}° / {Math.round(weather.temp_low)}°
        </Typography>
      )}

      {weather?.rain_mm != null && weather.rain_mm > 0 && (
        <Typography variant="caption" sx={{ fontSize: '0.6rem', lineHeight: 1.3, color: 'info.main' }}>
          {'💧'} {weather.rain_mm.toFixed(1)}mm
        </Typography>
      )}

      {weather?.weather_label && (
        <Typography
          variant="caption"
          fontWeight={500}
          sx={{
            fontSize: '0.6rem',
            lineHeight: 1.3,
            color: WEATHER_LABEL_COLORS[weather.weather_label],
          }}
        >
          {weather.weather_label}
        </Typography>
      )}
    </Box>
  );
}
