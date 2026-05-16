import { useCallback, useEffect, useRef, useState } from 'react'
import { Analytics } from '@vercel/analytics/react'
import { searchLocations } from './api/geocodingApi'
import { fetchVisitorCapital } from './api/visitorLocationApi'
import { fetchCurrentWeather } from './api/weatherApi'
import {
  WeatherSceneAnimation,
  type WeatherSceneAnimationKind,
} from './components/WeatherSceneAnimation'
import type { Location } from './models/location'
import { getWeatherCodeIcon, type CurrentWeather } from './models/weather'
import { formatLastUpdated } from './utils/formatLastUpdated'
import './App.css'

const WINDY_SPEED_THRESHOLD = 30
const LAST_UPDATED_REFRESH_MS = 60000
const INLINE_LOCATION_RESULTS_LIMIT = 5
const INLINE_LOCATION_SEARCH_DELAY_MS = 180
const LAST_SELECTED_LOCATION_STORAGE_KEY = 'weather-now:last-selected-location'
const FALLBACK_LOCATION: Location = {
  id: 726050,
  name: 'Varna',
  country: 'Bulgaria',
  latitude: 43.21912,
  longitude: 27.91024,
  admin1: 'Varna',
  countryCode: 'BG',
  timezone: 'Europe/Sofia',
}

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

function getWeatherSceneAnimationKind(
  weather: CurrentWeather,
): WeatherSceneAnimationKind | null {
  const visualKind = getWeatherVisualKind(weather)

  if (weather.isDay && ['clear', 'partly-cloudy'].includes(visualKind)) {
    return 'sunny'
  }

  if (visualKind === 'clear' || visualKind === 'partly-cloudy') {
    return null
  }

  return visualKind
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

function isStoredLocation(value: unknown): value is Location {
  if (!value || typeof value !== 'object') {
    return false
  }

  const location = value as Partial<Location>

  return (
    typeof location.id === 'number' &&
    Number.isFinite(location.id) &&
    typeof location.name === 'string' &&
    location.name.trim().length > 0 &&
    typeof location.country === 'string' &&
    typeof location.latitude === 'number' &&
    Number.isFinite(location.latitude) &&
    typeof location.longitude === 'number' &&
    Number.isFinite(location.longitude)
  )
}

function readLastSelectedLocation() {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    const storedLocation = window.localStorage.getItem(
      LAST_SELECTED_LOCATION_STORAGE_KEY,
    )

    if (!storedLocation) {
      return null
    }

    const parsedLocation = JSON.parse(storedLocation)

    if (!isStoredLocation(parsedLocation)) {
      window.localStorage.removeItem(LAST_SELECTED_LOCATION_STORAGE_KEY)
      return null
    }

    return parsedLocation
  } catch {
    return null
  }
}

function saveLastSelectedLocation(location: Location) {
  if (typeof window === 'undefined') {
    return
  }

  try {
    window.localStorage.setItem(
      LAST_SELECTED_LOCATION_STORAGE_KEY,
      JSON.stringify(location),
    )
  } catch {
    // Storage can be unavailable in restricted browsing modes.
  }
}

async function resolveVisitorCapitalLocation(signal: AbortSignal) {
  const visitorCapital = await fetchVisitorCapital(signal)

  if (!visitorCapital) {
    return FALLBACK_LOCATION
  }

  const matchingLocations = await searchLocations(visitorCapital.capital, signal)
  const countryCode = visitorCapital.countryCode?.toUpperCase()

  return (
    matchingLocations.find(
      (location) => location.countryCode?.toUpperCase() === countryCode,
    ) ??
    matchingLocations[0] ??
    FALLBACK_LOCATION
  )
}

type WeatherDashboardProps = {
  location: Location
  weather: CurrentWeather
  now: Date
  onSelectLocation: (location: Location) => void
}

type InlineLocationSearchProps = {
  onSelectLocation: (location: Location) => void
  buttonLabel?: string
  label?: string
}

function InlineLocationSearch({
  onSelectLocation,
  buttonLabel = 'Change location',
  label = 'Change location',
}: InlineLocationSearchProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Location[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (!isExpanded) {
      return
    }

    inputRef.current?.focus()
  }, [isExpanded])

  useEffect(() => {
    if (!isExpanded) {
      return
    }

    const normalizedQuery = query.trim()

    if (normalizedQuery.length < 2) {
      return
    }

    const controller = new AbortController()
    const searchTimeoutId = window.setTimeout(() => {
      setIsLoading(true)
      setError(null)

      void searchLocations(normalizedQuery, controller.signal)
        .then((nextResults) => {
          setResults(nextResults.slice(0, INLINE_LOCATION_RESULTS_LIMIT))
        })
        .catch((locationSearchError) => {
          if (
            locationSearchError instanceof DOMException &&
            locationSearchError.name === 'AbortError'
          ) {
            return
          }

          setResults([])
          setError(
            locationSearchError instanceof Error
              ? locationSearchError.message
              : 'Unable to search locations right now.',
          )
        })
        .finally(() => {
          if (!controller.signal.aborted) {
            setIsLoading(false)
          }
        })
    }, INLINE_LOCATION_SEARCH_DELAY_MS)

    return () => {
      window.clearTimeout(searchTimeoutId)
      controller.abort()
    }
  }, [isExpanded, query])

  function selectLocation(location: Location) {
    setIsExpanded(false)
    setQuery('')
    setResults([])
    setError(null)
    onSelectLocation(location)
  }

  function handleQueryChange(nextQuery: string) {
    setQuery(nextQuery)

    if (nextQuery.trim().length < 2) {
      setResults([])
      setError(null)
      setIsLoading(false)
    }
  }

  if (!isExpanded) {
    return (
      <button
        type="button"
        className="weather-dashboard__change-button"
        onClick={() => setIsExpanded(true)}
      >
        {buttonLabel}
      </button>
    )
  }

  return (
    <div className="inline-location-search">
      <label className="inline-location-search__label" htmlFor="inline-city-search">
        {label}
      </label>
      <div className="inline-location-search__control">
        <input
          ref={inputRef}
          id="inline-city-search"
          className="inline-location-search__input"
          type="search"
          value={query}
          onChange={(event) => handleQueryChange(event.target.value)}
          placeholder="Type a city"
          autoComplete="off"
          spellCheck={false}
        />
        <button
          type="button"
          className="inline-location-search__close"
          aria-label="Close location search"
          onClick={() => {
            setIsExpanded(false)
            setQuery('')
            setResults([])
            setError(null)
          }}
        >
          x
        </button>
      </div>
      {isLoading ? (
        <p className="inline-location-search__status">Searching...</p>
      ) : null}
      {error ? (
        <p className="inline-location-search__status inline-location-search__status--error">
          {error}
        </p>
      ) : null}
      {results.length > 0 ? (
        <ul className="inline-location-search__results">
          {results.map((result) => {
            const resultLine = formatLocationLine(result) || result.timezone

            return (
              <li key={result.id}>
                <button
                  type="button"
                  aria-label={`Select ${result.name}${
                    resultLine ? `, ${resultLine}` : ''
                  }`}
                  onClick={() => selectLocation(result)}
                >
                  <span>{result.name}</span>
                  <small>{resultLine}</small>
                </button>
              </li>
            )
          })}
        </ul>
      ) : null}
    </div>
  )
}

function WeatherDashboard({
  location,
  weather,
  now,
  onSelectLocation,
}: WeatherDashboardProps) {
  const weatherLabel = weather.weatherDescription
  const temperature = formatCompactTemperature(
    weather.temperature,
    weather.units.temperature,
  )
  const feelsLike = formatCompactTemperature(
    weather.apparentTemperature,
    weather.units.temperature,
  )
  const sceneAnimationKind = getWeatherSceneAnimationKind(weather)
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
    <section
      className={`weather-panel${
        sceneAnimationKind
          ? ` weather-panel--animated weather-panel--${sceneAnimationKind}`
          : ''
      }`}
      aria-label="Current conditions"
    >
      {sceneAnimationKind ? (
        <WeatherSceneAnimation
          kind={sceneAnimationKind}
          label={weather.weatherDescription}
        />
      ) : null}

      <header className="weather-dashboard__header">
        <div>
          <h2>{location.name}</h2>
          {locationLine ? <p>{locationLine}</p> : null}
          <p className="weather-dashboard__updated">
            Updated {formatLastUpdated(weather.time, weather.timezone, now)}
          </p>
        </div>
        <InlineLocationSearch onSelectLocation={onSelectLocation} />
      </header>

      <div className="weather-dashboard__current">
        <div className="weather-dashboard__condition">
          {sceneAnimationKind ? null : (
            <WeatherVisual weather={weather} />
          )}
          <p>{weatherLabel}</p>
        </div>
        <div className="weather-dashboard__temperature">
          <p>{temperature}</p>
          <span>Feels like {feelsLike}</span>
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

type WeatherStatusPanelProps = {
  title: string
  message: string
  messageTone?: 'neutral' | 'success' | 'error'
  onSelectLocation?: (location: Location) => void
}

function WeatherStatusPanel({
  title,
  message,
  messageTone = 'neutral',
  onSelectLocation,
}: WeatherStatusPanelProps) {
  return (
    <section className="weather-panel weather-panel--empty" aria-label={title}>
      <div className="weather-empty-state">
        <h2>{title}</h2>
        <p className={`weather-empty-state__message weather-empty-state__message--${messageTone}`}>
          {message}
        </p>
        {onSelectLocation ? (
          <InlineLocationSearch
            onSelectLocation={onSelectLocation}
            buttonLabel="Search city"
            label="Search city"
          />
        ) : null}
      </div>
    </section>
  )
}

function App() {
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null)
  const [currentWeather, setCurrentWeather] = useState<CurrentWeather | null>(
    null,
  )
  const [now, setNow] = useState(() => new Date())
  const [weatherError, setWeatherError] = useState<string | null>(null)
  const [isWeatherLoading, setIsWeatherLoading] = useState(true)
  const weatherAbortControllerRef = useRef<AbortController | null>(null)
  const initialLocationAbortControllerRef = useRef<AbortController | null>(null)
  const hasSelectedLocationRef = useRef(false)

  const loadCurrentWeather = useCallback(async (location: Location) => {
    setSelectedLocation(location)
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

  const handleSelectLocation = useCallback(
    (location: Location) => {
      hasSelectedLocationRef.current = true
      initialLocationAbortControllerRef.current?.abort()
      initialLocationAbortControllerRef.current = null
      saveLastSelectedLocation(location)
      void loadCurrentWeather(location)
    },
    [loadCurrentWeather],
  )

  useEffect(() => {
    const initialLocationController = new AbortController()
    initialLocationAbortControllerRef.current = initialLocationController

    const savedLocation = readLastSelectedLocation()
    const initialLocationPromise = savedLocation
      ? Promise.resolve(savedLocation)
      : resolveVisitorCapitalLocation(initialLocationController.signal).catch(
          (error) => {
            if (
              error instanceof DOMException &&
              error.name === 'AbortError'
            ) {
              throw error
            }

            return FALLBACK_LOCATION
          },
        )

    void initialLocationPromise
      .then((initialLocation) => {
        if (
          initialLocationController.signal.aborted ||
          hasSelectedLocationRef.current
        ) {
          return
        }

        setSelectedLocation(initialLocation)
        setCurrentWeather(null)
        setWeatherError(null)
        setIsWeatherLoading(true)

        weatherAbortControllerRef.current?.abort()
        const weatherController = new AbortController()
        weatherAbortControllerRef.current = weatherController

        return fetchCurrentWeather(
          {
            latitude: initialLocation.latitude,
            longitude: initialLocation.longitude,
            timezone: initialLocation.timezone,
          },
          weatherController.signal,
        )
          .then((nextCurrentWeather) => {
            if (weatherAbortControllerRef.current !== weatherController) {
              return
            }

            setCurrentWeather(nextCurrentWeather)
            setNow(new Date())
            saveLastSelectedLocation(initialLocation)
          })
          .catch((weatherLoadError) => {
            if (
              weatherLoadError instanceof DOMException &&
              weatherLoadError.name === 'AbortError'
            ) {
              return
            }

            if (weatherAbortControllerRef.current !== weatherController) {
              return
            }

            setWeatherError(
              weatherLoadError instanceof Error
                ? weatherLoadError.message
                : 'Unable to load current weather right now.',
            )
          })
          .finally(() => {
            if (weatherAbortControllerRef.current === weatherController) {
              weatherAbortControllerRef.current = null
              setIsWeatherLoading(false)
            }
          })
      })
      .catch((error) => {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return
        }
      })

    return () => {
      initialLocationController.abort()
      weatherAbortControllerRef.current?.abort()
    }
  }, [])

  return (
    <div className="app-shell">
      <main className="page-main">
        <section
          className="weather-section weather-section--top"
          aria-label="Weather dashboard"
        >
          {isWeatherLoading ? (
            <WeatherStatusPanel
              title={selectedLocation?.name ?? 'Loading local weather'}
              message={
                selectedLocation
                  ? 'Loading current weather...'
                  : 'Finding the capital for your country...'
              }
              onSelectLocation={selectedLocation ? undefined : handleSelectLocation}
            />
          ) : weatherError && selectedLocation ? (
            <WeatherStatusPanel
              title={selectedLocation.name}
              message={weatherError}
              messageTone="error"
              onSelectLocation={handleSelectLocation}
            />
          ) : currentWeather && selectedLocation ? (
            <WeatherDashboard
              location={selectedLocation}
              weather={currentWeather}
              now={now}
              onSelectLocation={handleSelectLocation}
            />
          ) : (
            <WeatherStatusPanel
              title={selectedLocation?.name ?? 'Choose location'}
              message="Search for a city to load current weather."
              onSelectLocation={handleSelectLocation}
            />
          )}
        </section>
      </main>
      <Analytics />
    </div>
  )
}

export default App
