'use client';

import { useState, useEffect, useCallback } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import CloseIcon from '@mui/icons-material/Close';
import { SearchSection } from '@/components/search/SearchSection';
import { CalendarSection } from '@/components/calendar/CalendarSection';
import { DateOptionBuilderSection } from '@/components/dateOption/DateOptionBuilderSection';
import { ComparisonSection } from '@/components/comparison/ComparisonSection';
import { SectionContainer } from '@/components/layout/SectionContainer';
import { WEATHER_LABEL_COLORS } from '@/types/constants';
import { useComparisonQueue } from '@/context/ComparisonQueueContext';
import { getFlightPrice, searchHotels, getWeather, extractApiError } from '@/lib/api';
import type { DestinationResult, HotelOption } from '@/types/api';
import type {
  SelectedDestination,
  DateRange,
  DateDetailResults,
} from '@/types/frontend';

const INITIAL_DETAIL_RESULTS: DateDetailResults = {
  flight: { state: 'idle', data: null, error: null },
  hotels: { state: 'idle', data: null, error: null },
  weather: { state: 'idle', data: null, error: null },
};

export default function HomePage() {
  // ── Search params ──
  const [selectedDestination, setSelectedDestination] = useState<SelectedDestination | null>(null);
  const [originAirport, setOriginAirport] = useState('');
  const [travelerCount, setTravelerCount] = useState(1);

  // ── Date selection ──
  const [dateRange, setDateRange] = useState<DateRange | null>(null);

  // ── Date detail results ──
  const [dateDetailResults, setDateDetailResults] = useState<DateDetailResults>(INITIAL_DETAIL_RESULTS);
  const [selectedHotel, setSelectedHotel] = useState<HotelOption | null>(null);

  // ── Queue for progressive reveal + inline display ──
  const { queue, count: queueCount, removeItem } = useComparisonQueue();

  // ── Derived visibility ──
  const showCalendar = selectedDestination !== null;
  const showDateDetails = dateRange !== null;
  const showComparison = queueCount >= 1;

  // ── Handlers ──
  const handleDestinationChange = (dest: DestinationResult | null) => {
    // Cascading reset
    setDateRange(null);
    setDateDetailResults(INITIAL_DETAIL_RESULTS);
    setSelectedHotel(null);

    if (!dest) {
      setSelectedDestination(null);
      return;
    }

    // Backend already returns city center coords
    setSelectedDestination({
      name: dest.name,
      latitude: dest.latitude,
      longitude: dest.longitude,
      country: dest.country,
      iata_code: dest.iata_code,
    });
  };

  const handleDateRangeConfirm = useCallback((range: DateRange) => {
    setDateRange(range);
    setDateDetailResults(INITIAL_DETAIL_RESULTS);
    setSelectedHotel(null);
  }, []);

  // ── Fetch date details ──
  const fetchFlightPrice = useCallback(async () => {
    if (!selectedDestination || !dateRange) return;
    if (!selectedDestination.iata_code) {
      setDateDetailResults((prev) => ({
        ...prev,
        flight: { state: 'error', data: null, error: 'This destination has no airport code. Flight lookup unavailable.' },
      }));
      return;
    }
    if (originAirport.length !== 3) {
      setDateDetailResults((prev) => ({
        ...prev,
        flight: { state: 'error', data: null, error: 'Enter a 3-letter origin airport code to see flight prices.' },
      }));
      return;
    }
    setDateDetailResults((prev) => ({
      ...prev,
      flight: { state: 'loading', data: null, error: null },
    }));
    try {
      const result = await getFlightPrice({
        origin: originAirport,
        destination: selectedDestination.iata_code,
        departure_date: dateRange.startDate,
        return_date: dateRange.endDate,
        traveler_count: travelerCount,
      });
      setDateDetailResults((prev) => ({
        ...prev,
        flight: { state: 'success', data: result, error: null },
      }));
    } catch (err) {
      const apiErr = extractApiError(err);
      setDateDetailResults((prev) => ({
        ...prev,
        flight: { state: 'error', data: null, error: apiErr.message },
      }));
    }
  }, [selectedDestination, dateRange, originAirport, travelerCount]);

  const fetchHotels = useCallback(async () => {
    if (!selectedDestination || !dateRange) return;
    setDateDetailResults((prev) => ({
      ...prev,
      hotels: { state: 'loading', data: null, error: null },
    }));
    try {
      const result = await searchHotels({
        destination: selectedDestination.name,
        latitude: selectedDestination.latitude,
        longitude: selectedDestination.longitude,
        checkin_date: dateRange.startDate,
        checkout_date: dateRange.endDate,
        traveler_count: travelerCount,
      });
      setDateDetailResults((prev) => ({
        ...prev,
        hotels: { state: 'success', data: result, error: null },
      }));
      // Auto-select cheapest hotel
      if (result.length > 0) {
        setSelectedHotel(result[0]);
      }
    } catch (err) {
      const apiErr = extractApiError(err);
      setDateDetailResults((prev) => ({
        ...prev,
        hotels: { state: 'error', data: null, error: apiErr.message },
      }));
    }
  }, [selectedDestination, dateRange, travelerCount]);

  const fetchWeather = useCallback(async () => {
    if (!selectedDestination || !dateRange) return;
    setDateDetailResults((prev) => ({
      ...prev,
      weather: { state: 'loading', data: null, error: null },
    }));
    try {
      const result = await getWeather({
        latitude: selectedDestination.latitude,
        longitude: selectedDestination.longitude,
        start_date: dateRange.startDate,
        end_date: dateRange.endDate,
      });
      setDateDetailResults((prev) => ({
        ...prev,
        weather: { state: 'success', data: result, error: null },
      }));
    } catch (err) {
      const apiErr = extractApiError(err);
      setDateDetailResults((prev) => ({
        ...prev,
        weather: { state: 'error', data: null, error: apiErr.message },
      }));
    }
  }, [selectedDestination, dateRange]);

  // Auto-fetch when dateRange changes
  useEffect(() => {
    if (dateRange && selectedDestination) {
      fetchFlightPrice();
      fetchHotels();
      fetchWeather();
    }
  }, [dateRange, selectedDestination, fetchFlightPrice, fetchHotels, fetchWeather]);

  return (
    <>
      {/* Section 1: Search (always visible) */}
      <SearchSection
        selectedDestination={selectedDestination}
        onDestinationChange={handleDestinationChange}
        originAirport={originAirport}
        onOriginAirportChange={setOriginAirport}
        travelerCount={travelerCount}
        onTravelerCountChange={setTravelerCount}
      />

      {/* Section 2: Calendar (after destination selected) */}
      <SectionContainer visible={showCalendar}>
        {selectedDestination && (
          <CalendarSection
            destination={selectedDestination}
            onDateRangeConfirm={handleDateRangeConfirm}
          />
        )}
      </SectionContainer>

      {/* Section 3: Date Details (after date range confirmed) */}
      <SectionContainer visible={showDateDetails}>
        {/* Queued options comparison table */}
        {queueCount > 0 && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
              Queued for comparison ({queueCount})
            </Typography>
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: 'grey.50' }}>
                    <TableCell sx={{ fontWeight: 600 }}>Dates</TableCell>
                    <TableCell sx={{ fontWeight: 600 }} align="right">Flight/pp</TableCell>
                    <TableCell sx={{ fontWeight: 600 }} align="right">Hotel</TableCell>
                    <TableCell sx={{ fontWeight: 600 }} align="right">Total/pp</TableCell>
                    <TableCell sx={{ fontWeight: 600 }} align="center">Weather</TableCell>
                    <TableCell sx={{ fontWeight: 600 }} align="right">Score</TableCell>
                    <TableCell padding="checkbox" />
                  </TableRow>
                </TableHead>
                <TableBody>
                  {queue.map((item) => {
                    const totalPerPerson = item.flightPrice + item.hotelPrice / item.travelerCount;
                    return (
                      <TableRow key={item.id} hover>
                        <TableCell>
                          <Typography variant="body2" fontWeight={500}>
                            {new Date(item.startDate).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
                            {' – '}
                            {new Date(item.endDate).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {item.destination}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">${item.flightPrice.toFixed(0)}</TableCell>
                        <TableCell align="right">${item.hotelPrice.toFixed(0)}</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 600 }}>
                          ${totalPerPerson.toFixed(0)}
                        </TableCell>
                        <TableCell align="center">
                          <Chip
                            label={`${item.weather.label} (${item.weather.weather_score.toFixed(0)})`}
                            size="small"
                            sx={{
                              bgcolor: WEATHER_LABEL_COLORS[item.weather.label] ?? 'grey.400',
                              color: '#fff',
                              fontWeight: 500,
                              fontSize: '0.7rem',
                            }}
                          />
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" fontWeight={500}>
                            {item.weather.weather_score.toFixed(0)}
                          </Typography>
                        </TableCell>
                        <TableCell padding="checkbox">
                          <IconButton size="small" onClick={() => removeItem(item.id)}>
                            <CloseIcon fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}

        {selectedDestination && dateRange && (
          <DateOptionBuilderSection
            destination={selectedDestination}
            dateRange={dateRange}
            results={dateDetailResults}
            originAirport={originAirport}
            travelerCount={travelerCount}
            selectedHotel={selectedHotel}
            onSelectHotel={setSelectedHotel}
            onRetryFlight={fetchFlightPrice}
            onRetryHotels={fetchHotels}
            onRetryWeather={fetchWeather}
          />
        )}
      </SectionContainer>

      {/* Section 4: Comparison (after ≥1 queue items) */}
      <SectionContainer visible={showComparison}>
        <ComparisonSection />
      </SectionContainer>
    </>
  );
}
