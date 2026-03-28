'use client';

import TextField from '@mui/material/TextField';

interface TravelerCountInputProps {
  value: number;
  onChange: (value: number) => void;
}

export function TravelerCountInput({ value, onChange }: TravelerCountInputProps) {
  return (
    <TextField
      fullWidth
      label="Travelers"
      type="number"
      value={value}
      onChange={(e) => {
        const num = parseInt(e.target.value, 10);
        if (!isNaN(num) && num >= 1 && num <= 100) onChange(num);
      }}
      slotProps={{
        htmlInput: {
          min: 1,
          max: 100,
          step: 1,
        },
      }}
      helperText={`${Math.ceil(value / 2)} room${Math.ceil(value / 2) !== 1 ? 's' : ''} needed`}
    />
  );
}
