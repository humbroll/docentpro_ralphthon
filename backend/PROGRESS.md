# Backend Implementation Progress

## Pre-Implementation — API Verification — COMPLETED
**Date**: 2026-03-28

### Amadeus API (City Search + Flights)
- **Auth**: OAuth2 via SDK, `hostname='test'` for sandbox
- **Key**: Old key (`HCBpoM...`) works, new key (`RCtnfe...`) is invalid
- **City Search Response** (`reference_data.locations.get`):
  - `resp.data` = list of location objects
  - Each object keys: `type`, `subType`, `name`, `detailedName`, `id`, `self`, `timeZoneOffset`, `iataCode`, `geoCode`, `address`, `analytics`
  - `geoCode`: `{"latitude": float, "longitude": float}`
  - `address.countryCode`: 2-letter ISO code (e.g., "FR")
  - `subType`: "CITY" or "AIRPORT"
  - Note: `keyword='Tokyo'` and `keyword='Seoul'` return 0 results in test env; `keyword='Paris'` and `keyword='London'` work. Test environment has limited city data.
- **Flight Search Response** (`shopping.flight_offers_search.get`):
  - `resp.data` = list of flight offer objects
  - Price extraction: `resp.data[0]["price"]["total"]` (string, e.g., "108.66")
  - Currency: `resp.data[0]["price"]["currency"]` (returns "EUR" in test env, NOT "USD")
  - Price keys: `currency`, `total`, `base`, `fees`, `grandTotal`
  - `grandTotal` includes fees; use `grandTotal` for the final price
  - **IMPORTANT**: Test env returns EUR. Use `currencyCode='USD'` param or convert. If Amadeus doesn't support currency param in test env, just return the price as-is with actual currency.

### LiteAPI (Hotel Search + Rates)
- **Search** (`GET /v3.0/data/hotels`): Status 200 OK
  - Response: `{"data": [hotel, ...]}`
  - Hotel keys: `id`, `name`, `hotelDescription`, `country`, `city`, `latitude`, `longitude`, `address`, `stars`, `rating`, `reviewCount`, `main_photo`, `thumbnail`, `chain`, `currency`, `facilityIds`
  - Distance must be calculated via Haversine from hotel lat/lng to city center
- **Rates** (`POST /v3.0/hotels/rates`): Status 200 OK
  - Request body: `{"hotelIds": [...], "checkin": "...", "checkout": "...", "occupancies": [{"adults": N}], "currency": "USD", "guestNationality": "US"}`
  - Response: `{"data": [{"hotelId": "...", "roomTypes": [{"rates": [{"retailRate": {"total": [{"amount": "...", "currency": "..."}]}}]}]}]}`
  - Note: sandbox mode (`"sandbox": true`)

### Open-Meteo (Historical Weather)
- **URL**: `https://archive-api.open-meteo.com/v1/archive`
- Status 200 OK, no auth needed
- Response structure:
  - Top-level keys: `latitude`, `longitude`, `generationtime_ms`, `utc_offset_seconds`, `timezone`, `timezone_abbreviation`, `elevation`, `daily_units`, `daily`
  - `daily` keys: `time` (list of date strings), `temperature_2m_max` (list of floats), `temperature_2m_min` (list of floats), `rain_sum` (list of floats, can be null → use 0.0)
  - Example: `{"time": ["2025-05-01", "2025-05-02"], "temperature_2m_max": [23.0, 18.9], "temperature_2m_min": [11.1, 14.4], "rain_sum": [0.0, 80.8]}`

---

**Next**: Phase 1 — Service Layer
