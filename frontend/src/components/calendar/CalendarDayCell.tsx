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
  const isEndpoint = isStart || isEnd;
  const weatherColor = weather?.weather_label
    ? WEATHER_LABEL_COLORS[weather.weather_label]
    : null;

  // Background: endpoint = primary.main, in-range = primary.light alpha,
  // hovered = weather color alpha or action.hover, else weather alpha
  const bgColor = isEndpoint
    ? 'primary.main'
    : isInRange
      ? 'rgba(25, 118, 210, 0.12)'
      : isHovered && weatherColor
        ? `${weatherColor}4D` // ~30% alpha
        : isHovered
          ? 'action.hover'
          : weatherColor
            ? `${weatherColor}26` // ~15% alpha
            : 'transparent';

  const borderColor = isEndpoint
    ? 'primary.main'
    : isInRange
      ? 'primary.light'
      : isHovered
        ? 'primary.light'
        : 'divider';

  // Text color overrides for selected endpoint cells
  const textColor = isEndpoint ? 'primary.contrastText' : 'text.primary';
  const secondaryTextColor = isEndpoint ? 'primary.contrastText' : 'text.secondary';
  const rainColor = isEndpoint ? 'primary.contrastText' : 'info.main';
  const labelColor = isEndpoint
    ? 'primary.contrastText'
    : weatherColor ?? 'text.secondary';

  // Accessibility label
  const ariaLabel = weather
    ? `${date.format('MMMM D, YYYY')}, ${weather.weather_label ?? 'No'} weather, high ${Math.round(weather.temp_high ?? 0)}°C, rainfall ${(weather.rain_mm ?? 0).toFixed(1)}mm`
    : date.format('MMMM D, YYYY');

  return (
    <Box
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-label={ariaLabel}
      aria-disabled={disabled}
      onClick={() => !disabled && onClick(date)}
      onKeyDown={(e) => {
        if (!disabled && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onClick(date);
        }
      }}
      onMouseEnter={() => !disabled && onHover(date)}
      onMouseLeave={() => onHover(null)}
      sx={{
        height: 80,
        p: 0.5,
        border: 1,
        borderColor,
        borderRadius: 1,
        backgroundColor: bgColor,
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.4 : 1,
        transition: 'background-color 150ms ease, border-color 150ms ease',
        '&:hover': disabled
          ? {}
          : {
              backgroundColor: isEndpoint
                ? 'primary.dark'
                : weatherColor
                  ? `${weatherColor}4D`
                  : 'action.hover',
            },
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <Typography variant="caption" fontWeight={600} lineHeight={1.2} color={textColor}>
        {date.date()}
      </Typography>

      {weather?.temp_high != null && weather?.temp_low != null && (
        <Typography variant="caption" sx={{ fontSize: '0.65rem', lineHeight: 1.3, color: secondaryTextColor }}>
          {Math.round(weather.temp_high)}° / {Math.round(weather.temp_low)}°
        </Typography>
      )}

      {weather?.rain_mm != null && weather.rain_mm > 0 && (
        <Typography variant="caption" sx={{ fontSize: '0.6rem', lineHeight: 1.3, color: rainColor }}>
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
            color: labelColor,
          }}
        >
          {weather.weather_label}
        </Typography>
      )}
    </Box>
  );
}
