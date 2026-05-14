import { useEffect, useMemo, useRef, useState } from 'react'
import { searchLocations } from './api/geocodingApi'
import { fetchCurrentWeather } from './api/weatherApi'
import { SearchBox } from './components/SearchBox'
import type { Location } from './models/location'
import type { CurrentWeather } from './models/weather'
import './App.css'

const DEFAULT_QUERY = 'Varna'

function formatCoordinate(value: number) {
  return value.toFixed(4)
}

function formatLocationLine(location: Location) {
  return [location.admin1, location.country].filter(Boolean).join(', ')
}

function formatTemperature(value: number, unit: string) {
  return `${value.toFixed(1)} ${unit}`
}

function formatPercentage(value: number, unit: string) {
  return `${Math.round(value)}${unit}`
}

function formatPrecipitation(value: number, unit: string) {
  return `${value.toFixed(1)} ${unit}`
}

function formatObservationTime(time: string, timezone: string) {
  return `${time.replace('T', ' ')} (${timezone})`
}

function getWindDirectionLabel(direction: number) {
  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']
  const normalizedDirection = ((direction % 360) + 360) % 360
  const index = Math.round(normalizedDirection / 45) % directions.length
  return directions[index]
}

function formatWind(direction: number, speed: number, unit: string) {
  return `${Math.round(speed)} ${unit} ${Math.round(direction)}deg ${getWindDirectionLabel(direction)}`
}

function App() {
  const [query, setQuery] = useState(DEFAULT_QUERY)
  const [locations, setLocations] = useState<Location[]>([])
  const [searchError, setSearchError] = useState<string | null>(null)
  const [isSearchLoading, setIsSearchLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [selectedLocationId, setSelectedLocationId] = useState<number | null>(
    null,
  )
  const [currentWeather, setCurrentWeather] = useState<CurrentWeather | null>(
    null,
  )
  const [weatherError, setWeatherError] = useState<string | null>(null)
  const [isWeatherLoading, setIsWeatherLoading] = useState(false)
  const searchAbortControllerRef = useRef<AbortController | null>(null)
  const weatherAbortControllerRef = useRef<AbortController | null>(null)

  const selectedLocation = useMemo(
    () =>
      locations.find((location) => location.id === selectedLocationId) ?? null,
    [locations, selectedLocationId],
  )

  useEffect(() => {
    return () => {
      searchAbortControllerRef.current?.abort()
      weatherAbortControllerRef.current?.abort()
    }
  }, [])

  const statusMessage = useMemo(() => {
    if (searchError) {
      return searchError
    }

    if (isSearchLoading) {
      return 'Searching for matching locations...'
    }

    if (!hasSearched) {
      return 'Start with Varna to validate the first checkpoint.'
    }

    if (locations.length === 0) {
      return 'No matching locations found.'
    }

    if (locations.length === 1) {
      return 'Found 1 matching location.'
    }

    return `Found ${locations.length} matching locations.`
  }, [hasSearched, isSearchLoading, locations.length, searchError])

  function clearWeatherState() {
    weatherAbortControllerRef.current?.abort()
    weatherAbortControllerRef.current = null
    setSelectedLocationId(null)
    setCurrentWeather(null)
    setWeatherError(null)
    setIsWeatherLoading(false)
  }

  async function loadCurrentWeather(location: Location) {
    setSelectedLocationId(location.id)
    weatherAbortControllerRef.current?.abort()

    const controller = new AbortController()
    weatherAbortControllerRef.current = controller

    setCurrentWeather(null)
    setWeatherError(null)
    setIsWeatherLoading(true)

    try {
      const nextCurrentWeather = await fetchCurrentWeather(
        {
          latitude: location.latitude,
          longitude: location.longitude,
          timezone: location.timezone,
        },
        controller.signal,
      )

      setCurrentWeather(nextCurrentWeather)
    } catch (weatherLoadError) {
      if (
        weatherLoadError instanceof DOMException &&
        weatherLoadError.name === 'AbortError'
      ) {
        return
      }

      setCurrentWeather(null)
      setWeatherError(
        weatherLoadError instanceof Error
          ? weatherLoadError.message
          : 'Unable to load current weather right now.',
      )
    } finally {
      if (weatherAbortControllerRef.current === controller) {
        weatherAbortControllerRef.current = null
        setIsWeatherLoading(false)
      }
    }
  }

  async function handleSearch() {
    const normalizedQuery = query.trim()

    if (normalizedQuery.length < 2) {
      searchAbortControllerRef.current?.abort()
      searchAbortControllerRef.current = null
      clearWeatherState()
      setHasSearched(false)
      setLocations([])
      setSearchError('Enter at least 2 characters to search for a city.')
      setIsSearchLoading(false)
      return
    }

    searchAbortControllerRef.current?.abort()
    const controller = new AbortController()
    searchAbortControllerRef.current = controller

    setHasSearched(true)
    setIsSearchLoading(true)
    setSearchError(null)

    try {
      const results = await searchLocations(normalizedQuery, controller.signal)

      setLocations(results)

      const firstMatch = results[0]

      if (!firstMatch) {
        clearWeatherState()
        return
      }

      void loadCurrentWeather(firstMatch)
    } catch (locationSearchError) {
      if (
        locationSearchError instanceof DOMException &&
        locationSearchError.name === 'AbortError'
      ) {
        return
      }

      setLocations([])
      clearWeatherState()
      setSearchError(
        locationSearchError instanceof Error
          ? locationSearchError.message
          : 'Unable to search locations right now.',
      )
    } finally {
      if (searchAbortControllerRef.current === controller) {
        searchAbortControllerRef.current = null
        setIsSearchLoading(false)
      }
    }
  }

  return (
    <div className="app-shell">
      <header className="page-header">
        <p className="page-header__eyebrow">WeatherNow</p>
        <h1>Search a city and load current conditions</h1>
        <p className="page-header__intro">
          The app now resolves cities with Open-Meteo geocoding and loads live
          current weather for the selected location.
        </p>
      </header>

      <main className="page-main">
        <section className="search-band" aria-label="City search">
          <div className="search-band__inner">
            <SearchBox
              value={query}
              onChange={setQuery}
              onSubmit={() => {
                void handleSearch()
              }}
              isLoading={isSearchLoading}
            />
            <p
              className={`status-message${searchError ? ' status-message--error' : ''}`}
              aria-live="polite"
            >
              {statusMessage}
            </p>
          </div>
        </section>

        <section className="results-section" aria-labelledby="results-title">
          <div className="results-section__header">
            <div>
              <h2 id="results-title">Matching locations</h2>
              <p>Select a result to load current weather for that location.</p>
            </div>
          </div>

          {locations.length > 0 ? (
            <ul className="results-grid">
              {locations.map((location) => {
                const isSelected = selectedLocationId === location.id

                return (
                  <li
                    key={location.id}
                    className={`result-card${isSelected ? ' result-card--selected' : ''}`}
                  >
                    <button
                      type="button"
                      className="result-card__button"
                      onClick={() => {
                        void loadCurrentWeather(location)
                      }}
                    >
                      <div className="result-card__top">
                        <div>
                          <h3>{location.name}</h3>
                          <p>{formatLocationLine(location)}</p>
                        </div>
                      </div>
                      <dl className="result-card__details">
                        <div>
                          <dt>Latitude</dt>
                          <dd>{formatCoordinate(location.latitude)}</dd>
                        </div>
                        <div>
                          <dt>Longitude</dt>
                          <dd>{formatCoordinate(location.longitude)}</dd>
                        </div>
                        <div>
                          <dt>Country code</dt>
                          <dd>{location.countryCode ?? 'N/A'}</dd>
                        </div>
                        <div>
                          <dt>Timezone</dt>
                          <dd>{location.timezone ?? 'N/A'}</dd>
                        </div>
                      </dl>
                      <p className="result-card__selection">
                        {isSelected
                          ? 'Current weather loaded for this location.'
                          : 'Load current weather for this location.'}
                      </p>
                    </button>
                  </li>
                )
              })}
            </ul>
          ) : (
            <div className="results-empty">
              <p>
                {hasSearched
                  ? 'Try another city name if you need a different match.'
                  : 'Results will appear here after the first search.'}
              </p>
            </div>
          )}
        </section>

        <section className="weather-section" aria-labelledby="weather-title">
          <div className="results-section__header">
            <div>
              <h2 id="weather-title">Current weather</h2>
              <p>
                {selectedLocation
                  ? `Live model conditions for ${selectedLocation.name}.`
                  : 'Run a city search first to load current conditions.'}
              </p>
            </div>
          </div>

          {!selectedLocation ? (
            <div className="results-empty">
              <p>Choose a matching location to fetch current weather data.</p>
            </div>
          ) : isWeatherLoading ? (
            <div className="results-empty">
              <p>Loading current weather...</p>
            </div>
          ) : weatherError ? (
            <div className="results-empty">
              <p className="status-message--error">{weatherError}</p>
            </div>
          ) : currentWeather ? (
            <section className="weather-panel" aria-label="Current conditions">
              <div className="weather-panel__headline">
                <div className="weather-panel__summary">
                  <p className="weather-panel__eyebrow">
                    {selectedLocation.name}
                  </p>
                  <h3>{currentWeather.weatherDescription}</h3>
                  <p>{formatLocationLine(selectedLocation)}</p>
                </div>
                <div className="weather-panel__temperature">
                  <span>
                    {formatTemperature(
                      currentWeather.temperature,
                      currentWeather.units.temperature,
                    )}
                  </span>
                  <p className="weather-panel__subtext">
                    Feels like{' '}
                    {formatTemperature(
                      currentWeather.apparentTemperature,
                      currentWeather.units.temperature,
                    )}
                  </p>
                </div>
              </div>

              <dl className="weather-panel__metrics">
                <div>
                  <dt>Observed at</dt>
                  <dd>
                    {formatObservationTime(
                      currentWeather.time,
                      currentWeather.timezone,
                    )}
                  </dd>
                </div>
                <div>
                  <dt>Day / night</dt>
                  <dd>{currentWeather.isDay ? 'Daytime' : 'Nighttime'}</dd>
                </div>
                <div>
                  <dt>Humidity</dt>
                  <dd>
                    {formatPercentage(
                      currentWeather.relativeHumidity,
                      currentWeather.units.relativeHumidity,
                    )}
                  </dd>
                </div>
                <div>
                  <dt>Cloud cover</dt>
                  <dd>
                    {formatPercentage(
                      currentWeather.cloudCover,
                      currentWeather.units.cloudCover,
                    )}
                  </dd>
                </div>
                <div>
                  <dt>Precipitation</dt>
                  <dd>
                    {formatPrecipitation(
                      currentWeather.precipitation,
                      currentWeather.units.precipitation,
                    )}
                  </dd>
                </div>
                <div>
                  <dt>Wind</dt>
                  <dd>
                    {formatWind(
                      currentWeather.windDirection,
                      currentWeather.windSpeed,
                      currentWeather.units.windSpeed,
                    )}
                  </dd>
                </div>
              </dl>
            </section>
          ) : (
            <div className="results-empty">
              <p>Choose a matching location to fetch current weather data.</p>
            </div>
          )}
        </section>
      </main>
    </div>
  )
}

export default App
