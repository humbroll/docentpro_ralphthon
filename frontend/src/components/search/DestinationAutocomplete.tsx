'use client';

import { useState, useRef, useEffect } from 'react';
import Autocomplete from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';
import CircularProgress from '@mui/material/CircularProgress';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { searchDestinations } from '@/lib/api';
import type { DestinationResult } from '@/types/api';
import { MIN_SEARCH_QUERY_LENGTH, SEARCH_DEBOUNCE_MS } from '@/types/constants';

interface DestinationAutocompleteProps {
  value: DestinationResult | null;
  onChange: (destination: DestinationResult | null) => void;
  error?: string;
}

export function DestinationAutocomplete({ value, onChange, error }: DestinationAutocompleteProps) {
  const [inputValue, setInputValue] = useState('');
  const [options, setOptions] = useState<DestinationResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | undefined>(undefined);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const fetchDestinations = async (query: string): Promise<void> => {
    setIsLoading(true);
    setFetchError(undefined);
    try {
      const results = await searchDestinations(query);
      setOptions(results);
    } catch {
      setFetchError('Failed to search destinations. Please try again.');
      setOptions([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (newInputValue: string) => {
    setInputValue(newInputValue);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (newInputValue.length < MIN_SEARCH_QUERY_LENGTH) {
      setOptions([]);
      setFetchError(undefined);
      return;
    }
    debounceRef.current = setTimeout(() => {
      fetchDestinations(newInputValue);
    }, SEARCH_DEBOUNCE_MS);
  };

  return (
    <Autocomplete<DestinationResult, false, false, false>
      fullWidth
      options={options}
      getOptionLabel={(opt) => `${opt.name}, ${opt.country}`}
      isOptionEqualToValue={(opt, val) =>
        opt.name === val.name && opt.country === val.country
      }
      filterOptions={(x) => x}
      loading={isLoading}
      value={value}
      onChange={(_e, newValue) => onChange(newValue)}
      inputValue={inputValue}
      onInputChange={(_e, newInput, reason) => {
        if (reason === 'input') handleInputChange(newInput);
        if (reason === 'clear' || reason === 'reset') {
          setInputValue(newInput);
          setOptions([]);
          setFetchError(undefined);
        }
      }}
      noOptionsText={
        inputValue.length < MIN_SEARCH_QUERY_LENGTH
          ? 'Type at least 3 characters'
          : 'No destinations found'
      }
      renderInput={(params) => (
        <TextField
          {...params}
          id="destination-search-input"
          label="Destination"
          placeholder="e.g. Tokyo, Paris, New York"
          error={!!fetchError || !!error}
          helperText={fetchError || error || (inputValue.length === 0 ? 'Type at least 3 characters to search' : ' ')}
          slotProps={{
            input: {
              ...params.InputProps,
              endAdornment: (
                <>
                  {isLoading ? <CircularProgress color="inherit" size={20} /> : null}
                  {params.InputProps.endAdornment}
                </>
              ),
            },
          }}
        />
      )}
      renderOption={(props, option) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { key, ...restProps } = props;
        return (
          <li key={`${option.name}-${option.iata_code ?? option.country}`} {...restProps}>
            <Box>
              <Typography variant="body1">
                {option.name}, {option.country}
              </Typography>
              {option.iata_code && (
                <Typography variant="caption" color="text.secondary">
                  Airport: {option.iata_code}
                </Typography>
              )}
            </Box>
          </li>
        );
      }}
    />
  );
}
