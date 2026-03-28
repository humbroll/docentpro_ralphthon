# Trip Timing AI
## Product Requirements Document (PRD)
Version: v1  
Date: 2026-03-28  

---

## 1. Overview

### Product Name
Trip Timing AI

### One-liner
A web application that helps users find the best travel dates by comparing flight prices, hotel prices, and weather across date ranges.

### Core Value
Users can quickly understand:
- Which dates are cheaper
- Which dates have better weather
- Which option is the best overall tradeoff

---

## 2. Goals

### Primary Goal
Enable users to choose optimal travel dates based on:
- Flight cost
- Hotel cost
- Weather quality

### Secondary Goal
Enable event organizers to estimate total travel cost based on:
- Event dates
- Number of attendees

---

## 3. Scope

### Phase 1 (MVP)
- Destination search
- Calendar with weather overlay
- Date range selection
- Flight lowest price lookup
- Hotel list and selection
- Comparison queue
- Comparison table
- Traveler count input
- Deterministic best option (no AI)

### Phase 2
- Magic Button (automatic date optimization)
- AI-based recommendation

### Out of Scope
- Booking flow
- Authentication
- Payments
- Forecast weather
- Multi-city trips

---

## 4. User Flows

### Flow A: Traveler
1. Search destination
2. Select destination
3. View calendar with weather
4. Select start and end date
5. Fetch:
   - Flight price
   - Hotel options
   - Weather data
6. Select hotel
7. Add to comparison queue
8. Repeat for other dates
9. Compare options

### Flow B: Event Host
1. Search destination
2. Enter attendee count
3. Select date ranges
4. Compare total group cost

### Flow C: Phase 2 (Magic Button)
1. Input destination
2. Click Magic Button
3. System evaluates candidate dates
4. Returns best options

---

## 5. Functional Requirements

### 5.1 Destination Search
- City-based search
- User selects destination

**Required Data**
- Name
- Latitude / Longitude
- Country

---

### 5.2 Calendar
- Two-month view
- Weather shown per day
- Date range selection

---

### 5.3 Date Selection
- Start date + End date
- Future dates only
- Flexible trip length

---

### 5.4 Flight Pricing
- Source: Amadeus API
- Round trip only
- Economy only
- Lowest price only

**Group Mode**

total_flight_cost = flight_price * traveler_count

---

### 5.5 Hotel Pricing
- Source: LiteAPI
- Top 5 hotels
- Sorted by total stay price
- User selects 1 hotel

**Room Calculation**

rooms_needed = ceil(traveler_count / 2)

---

### 5.6 Weather
- Historical weather data
- Score normalized (0–100)

**Inputs**
- Temperature comfort
- Rain penalty

---

### 5.7 Comparison Queue
- Max 5 items
- Local state only
- Allow remove
- Prevent duplicates

---

### 5.8 Comparison Table

**Columns**
- Destination
- Dates
- Flight cost
- Hotel cost
- Weather score
- Total cost
- Cost per person
- Group cost
- Tags

---

### 5.9 Scoring Logic

overall_score =
0.7 * cost_score +
0.3 * weather_score

**Tags**
- cheapest
- best_weather
- best_overall

---

### 5.10 Magic Button (Phase 2)
- Auto-generate candidate date ranges
- Evaluate each option
- Return best options with summary

---

## 6. Tech Collaboration Model

### Team Structure
- 1 Frontend
- 1 Backend

### Repository
- Single GitHub repo
- Hackathon-specific project

### Workflow
- Shared API contract
- Frontend uses mock data
- Backend implements contract
- Integration happens later

---

## 7. API Contract Principles

### Must Include
- selected_range
- calendar_cells
- hotel options
- weather summary
- best_option

### Rules
- Contract must be frozen before development
- No breaking changes without agreement

---

## 8. Data Models

### SearchInput

destination
origin_airport
start_date
end_date
traveler_count

### HotelOption

hotel_id
hotel_name
distance
total_price
rating

### WeatherSummary

average_temp
rain_signal
weather_score
label

### TripOption

destination
start_date
end_date
flight_price
hotel_price
weather_score
traveler_count
total_trip_cost
cost_per_person
tags
overall_score

---

## 9. Frontend Responsibilities
- Search UI
- Calendar UI
- Weather overlay
- Date selection
- Hotel selection
- Comparison UI
- Mock data integration

---

## 10. Backend Responsibilities
- Destination search API
- Flight API integration
- Hotel API integration
- Weather adapter
- Scoring logic
- Response formatting

---

## 11. UX Principles

### Key Idea
This is a **decision tool**, not just a data viewer.

### UI Must Show
- Current selection
- Savings vs alternatives
- Best option clearly
- Simple comparison

---

## 12. Fixed Decisions (v1)

- Web app only
- City-based search
- User inputs origin airport
- Round trip only
- Economy only
- Top 5 hotels
- 1 hotel per option
- Historical weather only
- Queue max 5 items
- Local state only
- Deterministic scoring in Phase 1

---

## 13. Open Questions

- Destination search source
- Weather scoring formula
- Hotel proximity logic
- Room calculation rule (final)
- Magic button search range

---

## 14. Phase Plan

### Phase 1
- Search + Calendar
- Weather display
- Date selection

### Phase 2
- API integrations
- Trip calculation

### Phase 3
- Comparison UI
- Best tags

### Phase 4
- Integration + polish

### Phase 5
- Magic Button

---

## 15. Success Criteria

- User can search a destination
- User can select date range
- System returns pricing + weather
- User can compare multiple options
- Best option is clearly identifiable


