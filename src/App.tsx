import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Analytics } from '@vercel/analytics/react'
import { searchLocations } from './api/geocodingApi'
import { fetchVisitorCapital } from './api/visitorLocationApi'
import { fetchCurrentWeather } from './api/weatherApi'
import { SearchBox } from './components/SearchBox'
import type { Location } from './models/location'
import type { CurrentWeather } from './models/weather'
import './App.css'

const DEFAULT_QUERY = 'Varna'
const CURRENT_LOCATION_ID = -1
const GEOLOCATION_TIMEOUT_MS = 10000
const GEOLOCATION_MAX_AGE_MS = 300000

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

function buildCurrentLocation(latitude: number, longitude: number): Location {
  return {
    id: CURRENT_LOCATION_ID,
    name: 'Current location',
    country: 'Detected from browser',
    latitude,
    longitude,
  }
}

function getGeolocationErrorMessage(error: GeolocationPositionError): string {
  switch (error.code) {
    case 1:
      return 'Location access was denied. Search for a city or retry with the location button.'
    case 2:
      return 'Your location could not be determined. Search for a city or retry.'
    case 3:
      return 'Location detection timed out. Search for a city or retry.'
    default:
      return 'Location detection failed. Search for a city or retry.'
  }
}

function App() {
  const geolocationSupported =
    typeof navigator !== 'undefined' && 'geolocation' in navigator
  const [query, setQuery] = useState(DEFAULT_QUERY)
  const [locations, setLocations] = useState<Location[]>([])
  const [searchError, setSearchError] = useState<string | null>(null)
  const [isSearchLoading, setIsSearchLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [selectedLocationId, setSelectedLocationId] = useState<number | null>(
    null,
  )
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null)
  const [currentWeather, setCurrentWeather] = useState<CurrentWeather | null>(
    null,
  )
  const [weatherError, setWeatherError] = useState<string | null>(null)
  const [isWeatherLoading, setIsWeatherLoading] = useState(false)
  const [isLocatingUser, setIsLocatingUser] = useState(geolocationSupported)
  const [locationMessage, setLocationMessage] = useState<string | null>(
    geolocationSupported
      ? 'Trying to detect your current location...'
      : 'Browser location is unavailable. Search for a city instead.',
  )
  const [locationMessageTone, setLocationMessageTone] = useState<
    'neutral' | 'success' | 'error'
  >(geolocationSupported ? 'neutral' : 'error')
  const searchAbortControllerRef = useRef<AbortController | null>(null)
  const weatherAbortControllerRef = useRef<AbortController | null>(null)
  const autoLocationAllowedRef = useRef(true)
  const canApplyDetectedDefaultQueryRef = useRef(true)
  const loadCurrentWeatherRef = useRef<(location: Location) => Promise<void>>(
    async () => {},
  )

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
    setSelectedLocation(null)
    setCurrentWeather(null)
    setWeatherError(null)
    setIsWeatherLoading(false)
  }

  const loadCurrentWeather = useCallback(async (location: Location) => {
    setSelectedLocation(location)
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
  }, [])

  useEffect(() => {
    loadCurrentWeatherRef.current = loadCurrentWeather
  }, [loadCurrentWeather])

  useEffect(() => {
    const controller = new AbortController()

    void fetchVisitorCapital(controller.signal)
      .then((visitorCapital) => {
        if (!visitorCapital || !canApplyDetectedDefaultQueryRef.current) {
          return
        }

        setQuery(visitorCapital.capital)
      })
      .catch((error) => {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return
        }
      })

    return () => {
      controller.abort()
    }
  }, [])

  async function requestCurrentLocation(manual = false) {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setLocationMessage(
        'Browser location is unavailable. Search for a city instead.',
      )
      setLocationMessageTone('error')
      setIsLocatingUser(false)
      return
    }

    setIsLocatingUser(true)
    setLocationMessage(
      manual
        ? 'Detecting your current location...'
        : 'Trying to detect your current location...',
    )
    setLocationMessageTone('neutral')

    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (!manual && !autoLocationAllowedRef.current) {
          return
        }

        setIsLocatingUser(false)
        setLocationMessage('Using your current location.')
        setLocationMessageTone('success')

        const currentLocation = buildCurrentLocation(
          position.coords.latitude,
          position.coords.longitude,
        )

        void loadCurrentWeather(currentLocation)
      },
      (error) => {
        if (!manual && !autoLocationAllowedRef.current) {
          return
        }

        setIsLocatingUser(false)
        setLocationMessage(getGeolocationErrorMessage(error))
        setLocationMessageTone('error')
      },
      {
        enableHighAccuracy: false,
        timeout: GEOLOCATION_TIMEOUT_MS,
        maximumAge: GEOLOCATION_MAX_AGE_MS,
      },
    )
  }

  function handleQueryChange(nextQuery: string) {
    canApplyDetectedDefaultQueryRef.current = false
    setQuery(nextQuery)
  }

  async function handleSearch() {
    const normalizedQuery = query.trim()
    autoLocationAllowedRef.current = false
    canApplyDetectedDefaultQueryRef.current = false
    setIsLocatingUser(false)

    if (locationMessageTone !== 'error') {
      setLocationMessage(null)
    }

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

  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      return () => {
        autoLocationAllowedRef.current = false
        searchAbortControllerRef.current?.abort()
        weatherAbortControllerRef.current?.abort()
      }
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (!autoLocationAllowedRef.current) {
          return
        }

        setIsLocatingUser(false)
        setLocationMessage('Using your current location.')
        setLocationMessageTone('success')

        const currentLocation = buildCurrentLocation(
          position.coords.latitude,
          position.coords.longitude,
        )

        void loadCurrentWeatherRef.current(currentLocation)
      },
      (error) => {
        if (!autoLocationAllowedRef.current) {
          return
        }

        setIsLocatingUser(false)
        setLocationMessage(getGeolocationErrorMessage(error))
        setLocationMessageTone('error')
      },
      {
        enableHighAccuracy: false,
        timeout: GEOLOCATION_TIMEOUT_MS,
        maximumAge: GEOLOCATION_MAX_AGE_MS,
      },
    )

    return () => {
      autoLocationAllowedRef.current = false
      searchAbortControllerRef.current?.abort()
      weatherAbortControllerRef.current?.abort()
    }
  }, [])

  return (
    <div className="app-shell">
      <main className="page-main">
        <section className="weather-section weather-section--top" aria-labelledby="weather-title">
          <div className="results-section__header">
            <div>
              <h2 id="weather-title">Current weather</h2>
              <p>
                {selectedLocation
                  ? `Live model conditions for ${selectedLocation.name}.`
                  : isLocatingUser
                    ? 'Trying to detect your current location.'
                    : 'Run a city search first to load current conditions.'}
              </p>
            </div>
          </div>

          {!selectedLocation ? (
            <div className="results-empty">
              <p>
                {isLocatingUser
                  ? 'Waiting for browser location access before loading weather.'
                  : 'Choose a matching location to fetch current weather data.'}
              </p>
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

        <section className="search-band" aria-label="City search">
          <div className="search-band__inner">
            <SearchBox
              value={query}
              onChange={handleQueryChange}
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
            <div className="search-band__actions">
              <button
                type="button"
                className="secondary-button"
                onClick={() => {
                  autoLocationAllowedRef.current = false
                  void requestCurrentLocation(true)
                }}
                disabled={isLocatingUser}
              >
                {isLocatingUser ? 'Detecting location...' : 'Use my location'}
              </button>
              {locationMessage ? (
                <p
                  className={`assistive-message assistive-message--${locationMessageTone}`}
                  aria-live="polite"
                >
                  {locationMessage}
                </p>
              ) : null}
            </div>
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
                        autoLocationAllowedRef.current = false
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
      </main>
      <Analytics />
    </div>
  )
}

export default App
