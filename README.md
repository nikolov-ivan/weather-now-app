# WeatherNow

WeatherNow is a small weather app built with React, TypeScript, and Vite. The project is being developed milestone by milestone, starting with a clean MVP and expanding toward a deployable portfolio-quality app.

The current implementation now covers:

- `Search a city like Varna and get latitude/longitude from Open-Meteo geocoding`
- `Load current weather for the selected matching location`
- `Auto-detect current browser location and load weather for it`
- `Use the visitor country capital as the default city search value`

## Current Status

- `TASK-003` complete: `Location` model added
- `TASK-004` complete: Open-Meteo geocoding API client added
- `TASK-005` complete: search UI added and connected to live geocoding results
- `TASK-006` complete: current weather API client added and wired to the app
- Loading and error states are in place for both city search and current weather

## Features Available Now

- Search for a city by name
- Pre-fill city search with the visitor country's capital
- Auto-detect the user's current browser location on load
- Fetch matching locations from the Open-Meteo Geocoding API
- Auto-load current weather for the first matching location
- Switch current weather by selecting a different matching location
- Display:
  - city name
  - country / region
  - latitude
  - longitude
  - timezone
  - current temperature
  - apparent temperature
  - humidity
  - cloud cover
  - precipitation
  - wind
- Handle loading and error states in the UI

## Tech Stack

- React 19
- TypeScript
- Vite
- Open-Meteo Geocoding API
- Open-Meteo Forecast API
- ipapi IP Location API

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Start the development server

```bash
npm run dev
```

### 3. Open the app

By default, Vite will print a local URL in the terminal, typically:

```text
http://localhost:5173/
```

## Available Scripts

```bash
npm run dev
npm run build
npm run lint
npm run test
npm run preview
```

## Build Status

The project currently passes:

- `npm run build`
- `npm run lint`
- `npm run test`

## Next Steps

- Add a 7-day forecast component
- Refine the current weather surface into a dedicated reusable component
- Prepare the first deployment

## Project Goal

Build a small but real weather website that can be deployed online early, then improved incrementally with better UX, tests, screenshots, and CI.

## Data Source

Weather and geocoding data are powered by Open-Meteo:

- https://open-meteo.com/
- https://open-meteo.com/en/docs/geocoding-api
- https://open-meteo.com/en/docs
- https://ipapi.co/api/
