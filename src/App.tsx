import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Analytics } from '@vercel/analytics/react'
import { searchLocations } from './api/geocodingApi'
import { fetchVisitorCapital } from './api/visitorLocationApi'
import { fetchCurrentWeather } from './api/weatherApi'
import { SearchBox } from './components/SearchBox'
import type { Location } from './models/location'
import { getWeatherCodeIcon, type CurrentWeather } from './models/weather'
import { formatLastUpdated } from './utils/formatLastUpdated'
import './App.css'

const DEFAULT_QUERY = 'Varna'
const CURRENT_LOCATION_ID = -1
const GEOLOCATION_TIMEOUT_MS = 10000
const GEOLOCATION_MAX_AGE_MS = 300000
const WINDY_SPEED_THRESHOLD = 30
const LAST_UPDATED_REFRESH_MS = 60000

type WeatherVisualKind =
  | 'clear'
  | 'partly-cloudy'
  | 'cloudy'
  | 'fog'
  | 'rain'
  | 'snow'
  | 'storm'
  | 'wind'

function getWeatherVisualKind(weather: CurrentWeather): WeatherVisualKind {
  if ([95, 96, 99].includes(weather.weatherCode)) {
    return 'storm'
  }

  if (
    [
      51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82,
    ].includes(weather.weatherCode)
  ) {
    return 'rain'
  }

  if ([71, 73, 75, 77, 85, 86].includes(weather.weatherCode)) {
    return 'snow'
  }

  if ([45, 48].includes(weather.weatherCode)) {
    return 'fog'
  }

  if (weather.windSpeed >= WINDY_SPEED_THRESHOLD) {
    return 'wind'
  }

  if (weather.weatherCode === 0 || weather.weatherCode === 1) {
    return 'clear'
  }

  if (weather.weatherCode === 2) {
    return 'partly-cloudy'
  }

  return 'cloudy'
}

function WeatherVisual({ weather }: { weather: CurrentWeather }) {
  const visualKind = getWeatherVisualKind(weather)

  return (
    <div
      className={`weather-visual weather-visual--${visualKind} ${
        weather.isDay ? 'weather-visual--day' : 'weather-visual--night'
      }`}
      role="img"
      aria-label={`${weather.weatherDescription} weather animation`}
    >
      <div className="weather-visual__sky">
        <span className="weather-visual__sun" />
        <span className="weather-visual__moon" />
        <span className="weather-visual__cloud weather-visual__cloud--back" />
        <span className="weather-visual__cloud weather-visual__cloud--front" />
        <span className="weather-visual__bolt" />
        <span className="weather-visual__fog weather-visual__fog--top" />
        <span className="weather-visual__fog weather-visual__fog--middle" />
        <span className="weather-visual__fog weather-visual__fog--bottom" />
        <span className="weather-visual__wind weather-visual__wind--top" />
        <span className="weather-visual__wind weather-visual__wind--middle" />
        <span className="weather-visual__wind weather-visual__wind--bottom" />
        <span className="weather-visual__drop weather-visual__drop--one" />
        <span className="weather-visual__drop weather-visual__drop--two" />
        <span className="weather-visual__drop weather-visual__drop--three" />
        <span className="weather-visual__snow weather-visual__snow--one" />
        <span className="weather-visual__snow weather-visual__snow--two" />
        <span className="weather-visual__snow weather-visual__snow--three" />
      </div>
    </div>
  )
}

function formatCoordinate(value: number) {
  return value.toFixed(4)
}

function formatLocationLine(location: Location) {
  return [location.admin1, location.country].filter(Boolean).join(', ')
}

function formatPercentage(value: number, unit: string) {
  return `${Math.round(value)}${unit}`
}

function formatCompactTemperature(value: number, unit: string) {
  const roundedValue = Math.round(value)
  const normalizedUnit = unit.toLowerCase()

  if (normalizedUnit.includes('deg c') || normalizedUnit.includes('°c')) {
    return `${roundedValue}°C`
  }

  if (normalizedUnit.includes('deg f') || normalizedUnit.includes('°f')) {
    return `${roundedValue}°F`
  }

  return `${roundedValue} ${unit}`
}

function formatWeatherTime(time: string) {
  return time.slice(11, 16)
}

function formatWindSpeed(speed: number, unit: string) {
  return `${Math.round(speed)} ${unit}`
}

function formatUvIndex(value: number) {
  return String(Math.round(value))
}

function formatPressure(value: number, unit: string) {
  return `${Math.round(value)} ${unit}`
}

function formatForecastDay(date: string) {
  const [year, month, day] = date.split('-').map(Number)
  const parsedDate = new Date(Date.UTC(year, month - 1, day, 12))
  const weekday = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    timeZone: 'UTC',
  }).format(parsedDate)

  return weekday.charAt(0).toUpperCase() + weekday.slice(1)
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

type WeatherDashboardProps = {
  location: Location
  weather: CurrentWeather
  now: Date
  onChangeLocation: () => void
}

function WeatherDashboard({
  location,
  weather,
  now,
  onChangeLocation,
}: WeatherDashboardProps) {
  const weatherLabel = weather.weatherDescription
  const locationLine = formatLocationLine(location)
  const metrics = [
    {
      icon: '💧',
      label: 'Humidity',
      value: formatPercentage(
        weather.relativeHumidity,
        weather.units.relativeHumidity,
      ),
    },
    {
      icon: '🌬️',
      label: 'Wind',
      value: formatWindSpeed(weather.windSpeed, weather.units.windSpeed),
    },
    {
      icon: '☀️',
      label: 'UV index',
      value: formatUvIndex(weather.uvIndex),
    },
    {
      icon: '🧭',
      label: 'Pressure',
      value: formatPressure(weather.surfacePressure, weather.units.surfacePressure),
    },
  ]

  return (
    <section className="weather-panel" aria-label="Current conditions">
      <header className="weather-dashboard__header">
        <div>
          <h2>{location.name}</h2>
          {locationLine ? <p>{locationLine}</p> : null}
          <p className="weather-dashboard__updated">
            Updated {formatLastUpdated(weather.time, weather.timezone, now)}
          </p>
        </div>
        <button
          type="button"
          className="weather-dashboard__change-button"
          onClick={onChangeLocation}
        >
          Change location
        </button>
      </header>

      <div className="weather-dashboard__current">
        <div className="weather-dashboard__condition">
          <WeatherVisual weather={weather} />
          <p>{weatherLabel}</p>
        </div>
        <div className="weather-dashboard__temperature">
          <p>{formatCompactTemperature(weather.temperature, weather.units.temperature)}</p>
          <span>
            Feels like{' '}
            {formatCompactTemperature(
              weather.apparentTemperature,
              weather.units.temperature,
            )}
          </span>
        </div>
      </div>

      <dl className="weather-dashboard__metrics">
        {metrics.map((metric) => (
          <div key={metric.label} className="weather-dashboard__metric-card">
            <dt>
              <span aria-hidden="true">{metric.icon}</span>
              {metric.label}
            </dt>
            <dd>{metric.value}</dd>
          </div>
        ))}
      </dl>

      <section className="weather-dashboard__forecast-section">
        <h3>Hourly forecast</h3>
        <ol className="weather-dashboard__hourly-list">
          {weather.hourlyForecast.map((forecast) => (
            <li key={forecast.time}>
              <time dateTime={forecast.time}>{formatWeatherTime(forecast.time)}</time>
              <span aria-hidden="true">
                {getWeatherCodeIcon(forecast.weatherCode, forecast.isDay)}
              </span>
              <strong>
                {formatCompactTemperature(
                  forecast.temperature,
                  weather.units.temperature,
                )}
              </strong>
            </li>
          ))}
        </ol>
      </section>

      <section className="weather-dashboard__forecast-section">
        <h3>5-day forecast</h3>
        <ol className="weather-dashboard__daily-list">
          {weather.dailyForecast.map((forecast) => (
            <li key={forecast.date}>
              <time dateTime={forecast.date}>{formatForecastDay(forecast.date)}</time>
              <span aria-hidden="true">
                {getWeatherCodeIcon(forecast.weatherCode)}
              </span>
              <strong>
                {formatCompactTemperature(
                  forecast.temperatureMax,
                  weather.units.temperature,
                )}{' '}
                /{' '}
                {formatCompactTemperature(
                  forecast.temperatureMin,
                  weather.units.temperature,
                )}
              </strong>
            </li>
          ))}
        </ol>
      </section>
    </section>
  )
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
  const [now, setNow] = useState(() => new Date())
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
      setNow(new Date())
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
    if (!currentWeather) {
      return
    }

    const intervalId = window.setInterval(() => {
      setNow(new Date())
    }, LAST_UPDATED_REFRESH_MS)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [currentWeather])

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

  function focusCitySearch() {
    const searchInput = document.getElementById('city-search')

    searchInput?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    searchInput?.focus()
  }

  return (
    <div className="app-shell">
      <main className="page-main">
        <section
          className="weather-section weather-section--top"
          aria-label="Weather dashboard"
        >
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
            <WeatherDashboard
              location={selectedLocation}
              weather={currentWeather}
              now={now}
              onChangeLocation={focusCitySearch}
            />
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
