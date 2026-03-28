'use client';

import { useState } from 'react';
import TextField from '@mui/material/TextField';

interface OriginAirportInputProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
}

export function OriginAirportInput({ value, onChange, error }: OriginAirportInputProps) {
  const [localError, setLocalError] = useState<string | undefined>(undefined);

  const handleBlur = () => {
    if (value.length > 0 && !/^[A-Z]{3}$/.test(value)) {
      setLocalError('Enter a 3-letter IATA airport code');
    } else {
      setLocalError(undefined);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uppercased = e.target.value.toUpperCase();
    onChange(uppercased);
    if (localError) setLocalError(undefined);
  };

  return (
    <TextField
      fullWidth
      label="Origin Airport (IATA)"
      placeholder="e.g. ICN, LAX, JFK"
      value={value}
      onChange={handleChange}
      onBlur={handleBlur}
      error={!!localError || !!error}
      helperText={localError || error || ' '}
      slotProps={{
        htmlInput: {
          maxLength: 3,
          style: { textTransform: 'uppercase' },
        },
      }}
    />
  );
}
