'use client';

import { useState, useEffect, useCallback } from 'react';
import { SearchSection } from '@/components/search/SearchSection';
import { CalendarSection } from '@/components/calendar/CalendarSection';
import { DateOptionBuilderSection } from '@/components/dateOption/DateOptionBuilderSection';
import { ComparisonSection } from '@/components/comparison/ComparisonSection';
import { SectionContainer } from '@/components/layout/SectionContainer';
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

  // ── Queue count for progressive reveal ──
  const { count: queueCount } = useComparisonQueue();

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
