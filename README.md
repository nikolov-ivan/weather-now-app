# WeatherNow

WeatherNow is a small weather app built with React, TypeScript, and Vite. The project is being developed milestone by milestone, starting with a clean MVP and expanding toward a deployable portfolio-quality app.

The current implementation covers the first functional checkpoint:

`Search a city like Varna and get latitude/longitude from Open-Meteo geocoding.`

## Current Status

- `TASK-003` complete: `Location` model added
- `TASK-004` complete: Open-Meteo geocoding API client added
- `TASK-005` partial: search UI added and connected to live geocoding results
- Loading and error states are in place for city search

## Features Available Now

- Search for a city by name
- Fetch matching locations from the Open-Meteo Geocoding API
- Display:
  - city name
  - country / region
  - latitude
  - longitude
  - timezone
- Handle loading and error states in the UI

## Tech Stack

- React 19
- TypeScript
- Vite
- Open-Meteo Geocoding API

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

- Add `weatherApi.ts` for current weather data
- Let the user select a location result and load weather details
- Add a current weather card
- Add a 7-day forecast component
- Prepare the first deployment

## Project Goal

Build a small but real weather website that can be deployed online early, then improved incrementally with better UX, tests, screenshots, and CI.

## Data Source

Weather and geocoding data are powered by Open-Meteo:

- https://open-meteo.com/
- https://open-meteo.com/en/docs/geocoding-api
