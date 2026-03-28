// frontend/src/types/index.ts — Re-export barrel

export type {
  ErrorResponse,
  FlightPriceRequest,
  FlightPrice,
  HotelSearchRequest,
  HotelOption,
  WeatherRequest,
  WeatherSummary,
  WeatherDay,
  CalendarRequest,
  CalendarResponse,
  CalendarDay,
  WeatherSummaryInput,
  CompareOptionInput,
  CompareRequest,
  CompareResponse,
  DestinationResult,
  TripOption,
} from "./api";

export type {
  SectionId,
  LoadingState,
  WeatherLabel,
  TripTag,
  SelectedDestination,
  SearchParams,
  DateRange,
  DateDetailResults,
  CalendarWeatherState,
  ComparisonQueueItem,
  ComparisonResultState,
  ComparisonQueueContextValue,
  AsyncState,
  SectionVisibility,
} from "./frontend";

export {
  MAX_QUEUE_SIZE,
  MIN_COMPARE_SIZE,
  MIN_SEARCH_QUERY_LENGTH,
  SEARCH_DEBOUNCE_MS,
  CALENDAR_MONTH_RANGE,
  MAX_HOTEL_RESULTS,
  API_BASE_URL,
  WEATHER_LABEL_COLORS,
  RAIN_SIGNAL_COLORS,
  TAG_COLORS,
  TAG_LABELS,
  CURRENCY_SYMBOL,
  CURRENCY_CODE,
} from "./constants";
