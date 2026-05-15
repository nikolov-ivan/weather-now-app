import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'
import { searchLocations } from './api/geocodingApi'
import { reverseGeocodeLocation } from './api/reverseGeocodingApi'
import { fetchVisitorCapital } from './api/visitorLocationApi'
import { fetchCurrentWeather } from './api/weatherApi'
import { formatLastUpdated } from './utils/formatLastUpdated'
import type { CurrentWeather } from './models/weather'

vi.mock('./api/geocodingApi', () => ({
  searchLocations: vi.fn(),
}))

vi.mock('./api/reverseGeocodingApi', () => ({
  reverseGeocodeLocation: vi.fn(),
}))

vi.mock('./api/weatherApi', () => ({
  fetchCurrentWeather: vi.fn(),
}))

vi.mock('./api/visitorLocationApi', () => ({
  fetchVisitorCapital: vi.fn(),
}))

const mockedSearchLocations = vi.mocked(searchLocations)
const mockedReverseGeocodeLocation = vi.mocked(reverseGeocodeLocation)
const mockedFetchCurrentWeather = vi.mocked(fetchCurrentWeather)
const mockedFetchVisitorCapital = vi.mocked(fetchVisitorCapital)

function mockGeolocationSuccess(latitude: number, longitude: number) {
  const getCurrentPosition = vi.fn(
    (...args: Parameters<Geolocation['getCurrentPosition']>) => {
      const [success] = args

      success({
        coords: {
          latitude,
          longitude,
        } as GeolocationCoordinates,
        timestamp: Date.now(),
      } as GeolocationPosition)
    },
  )

  Object.defineProperty(window.navigator, 'geolocation', {
    configurable: true,
    value: {
      getCurrentPosition,
    },
  })

  return getCurrentPosition
}

function mockGeolocationError(code: number) {
  const getCurrentPosition = vi.fn(
    (...args: Parameters<Geolocation['getCurrentPosition']>) => {
      const [, error] = args

      error?.({
        code,
        message: 'Geolocation error',
        PERMISSION_DENIED: 1,
        POSITION_UNAVAILABLE: 2,
        TIMEOUT: 3,
      } as GeolocationPositionError)
    },
  )

  Object.defineProperty(window.navigator, 'geolocation', {
    configurable: true,
    value: {
      getCurrentPosition,
    },
  })

  return getCurrentPosition
}

function buildCurrentWeather(
  overrides: Partial<CurrentWeather> = {},
): CurrentWeather {
  return {
    time: '2026-05-14T08:45',
    timezone: 'Europe/Sofia',
    temperature: 18.4,
    apparentTemperature: 19.2,
    relativeHumidity: 63,
    precipitation: 0,
    weatherCode: 2,
    weatherDescription: 'Partly cloudy',
    isDay: true,
    cloudCover: 37,
    windSpeed: 14.8,
    windDirection: 128,
    uvIndex: 5.2,
    surfacePressure: 1018.4,
    hourlyForecast: [
      {
        time: '2026-05-14T09:00',
        temperature: 21,
        weatherCode: 0,
        weatherDescription: 'Clear sky',
        isDay: true,
      },
      {
        time: '2026-05-14T10:00',
        temperature: 22,
        weatherCode: 2,
        weatherDescription: 'Partly cloudy',
        isDay: true,
      },
      {
        time: '2026-05-14T11:00',
        temperature: 23,
        weatherCode: 61,
        weatherDescription: 'Slight rain',
        isDay: true,
      },
      {
        time: '2026-05-14T12:00',
        temperature: 24,
        weatherCode: 3,
        weatherDescription: 'Overcast',
        isDay: true,
      },
      {
        time: '2026-05-14T13:00',
        temperature: 25,
        weatherCode: 0,
        weatherDescription: 'Clear sky',
        isDay: true,
      },
      {
        time: '2026-05-14T14:00',
        temperature: 24,
        weatherCode: 1,
        weatherDescription: 'Mainly clear',
        isDay: true,
      },
    ],
    dailyForecast: [
      {
        date: '2026-05-14',
        weatherCode: 0,
        weatherDescription: 'Clear sky',
        temperatureMax: 24,
        temperatureMin: 15,
      },
      {
        date: '2026-05-15',
        weatherCode: 2,
        weatherDescription: 'Partly cloudy',
        temperatureMax: 26,
        temperatureMin: 16,
      },
      {
        date: '2026-05-16',
        weatherCode: 61,
        weatherDescription: 'Slight rain',
        temperatureMax: 22,
        temperatureMin: 13,
      },
      {
        date: '2026-05-17',
        weatherCode: 3,
        weatherDescription: 'Overcast',
        temperatureMax: 21,
        temperatureMin: 12,
      },
      {
        date: '2026-05-18',
        weatherCode: 0,
        weatherDescription: 'Clear sky',
        temperatureMax: 25,
        temperatureMin: 14,
      },
    ],
    units: {
      temperature: 'deg C',
      relativeHumidity: '%',
      precipitation: 'mm',
      windSpeed: 'km/h',
      cloudCover: '%',
      uvIndex: '',
      surfacePressure: 'hPa',
    },
    ...overrides,
  }
}

describe('formatLastUpdated', () => {
  const now = new Date('2026-05-15T03:45:30.000Z')

  it('shows minutes when the update is less than an hour old', () => {
    expect(formatLastUpdated('2026-05-15T06:44', 'Europe/Sofia', now)).toBe(
      '1 min ago',
    )
  })

  it('shows hours when the update is less than a day old', () => {
    expect(formatLastUpdated('2026-05-15T03:45', 'Europe/Sofia', now)).toBe(
      '3 hours ago',
    )
  })

  it('shows the date when the update is more than a day old', () => {
    expect(formatLastUpdated('2026-05-14T06:44', 'Europe/Sofia', now)).toBe(
      '14.05.2026, 06:44',
    )
  })
})

describe('App', () => {
  beforeEach(() => {
    mockedSearchLocations.mockReset()
    mockedReverseGeocodeLocation.mockReset()
    mockedFetchCurrentWeather.mockReset()
    mockedFetchVisitorCapital.mockReset()
    mockedReverseGeocodeLocation.mockResolvedValue({
      name: 'Sofia',
      country: 'Bulgaria',
      latitude: 42.6977,
      longitude: 23.3219,
      admin1: 'Sofia City Province',
      countryCode: 'BG',
    })
    mockedFetchVisitorCapital.mockResolvedValue(null)

    Object.defineProperty(window.navigator, 'geolocation', {
      configurable: true,
      value: undefined,
    })
  })

  it('shows the initial checkpoint prompt before the first search', () => {
    render(<App />)

    expect(
      screen.getByText('Start with Varna to validate the first checkpoint.'),
    ).toBeInTheDocument()
    expect(screen.getByDisplayValue('Varna')).toBeInTheDocument()
  })

  it('uses the detected visitor country capital as the default search query', async () => {
    mockedFetchVisitorCapital.mockResolvedValue({
      capital: 'Sofia',
      countryCode: 'BG',
      countryName: 'Bulgaria',
    })

    render(<App />)

    expect(await screen.findByDisplayValue('Sofia')).toBeInTheDocument()
  })

  it('does not overwrite a query typed before visitor country detection finishes', async () => {
    const user = userEvent.setup()
    let resolveVisitorCapital: (
      value: Awaited<ReturnType<typeof fetchVisitorCapital>>,
    ) => void = () => {}

    mockedFetchVisitorCapital.mockReturnValue(
      new Promise((resolve) => {
        resolveVisitorCapital = resolve
      }),
    )

    render(<App />)

    const input = screen.getByLabelText(/search city/i)

    await user.clear(input)
    await user.type(input, 'Paris')

    resolveVisitorCapital({
      capital: 'Sofia',
      countryCode: 'BG',
      countryName: 'Bulgaria',
    })

    await waitFor(() => {
      expect(input).toHaveValue('Paris')
    })
  })

  it('automatically loads current weather for the browser location when geolocation succeeds', async () => {
    const getCurrentPosition = mockGeolocationSuccess(42.6977, 23.3219)

    mockedFetchCurrentWeather.mockResolvedValue(buildCurrentWeather())

    render(<App />)

    expect(getCurrentPosition).toHaveBeenCalledTimes(1)

    await waitFor(() => {
      expect(mockedReverseGeocodeLocation).toHaveBeenCalledWith(
        42.6977,
        23.3219,
        expect.any(AbortSignal),
      )
    })

    await waitFor(() => {
      expect(mockedFetchCurrentWeather).toHaveBeenCalledWith(
        {
          latitude: 42.6977,
          longitude: 23.3219,
          timezone: undefined,
        },
        expect.any(AbortSignal),
      )
    })

    expect(
      await screen.findByText('Using your current location.'),
    ).toBeInTheDocument()
    expect(screen.getByText('Sofia')).toBeInTheDocument()
    expect(screen.getByText('Sofia City Province, Bulgaria')).toBeInTheDocument()
    expect(screen.getByText('18°C')).toBeInTheDocument()
  })

  it('falls back to a generic current location when reverse geocoding fails', async () => {
    mockGeolocationSuccess(42.6977, 23.3219)
    mockedReverseGeocodeLocation.mockRejectedValue(
      new Error('Unable to resolve current location city.'),
    )
    mockedFetchCurrentWeather.mockResolvedValue(buildCurrentWeather())

    render(<App />)

    expect(await screen.findByText('Current location')).toBeInTheDocument()
    expect(screen.queryByText('Detected from browser')).not.toBeInTheDocument()
  })

  it('shows a fallback message when browser location access is denied', async () => {
    mockGeolocationError(1)

    render(<App />)

    expect(
      await screen.findByText(
        'Location access was denied. Search for a city or retry with the location button.',
      ),
    ).toBeInTheDocument()
  })

  it('renders matching locations and current weather after a successful search', async () => {
    const user = userEvent.setup()
    mockGeolocationError(1)

    mockedSearchLocations.mockResolvedValue([
      {
        id: 726050,
        name: 'Varna',
        country: 'Bulgaria',
        latitude: 43.21912,
        longitude: 27.91024,
        admin1: 'Varna',
        countryCode: 'BG',
        timezone: 'Europe/Sofia',
      },
    ])

    mockedFetchCurrentWeather.mockResolvedValue(buildCurrentWeather())

    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Search' }))

    expect(mockedSearchLocations).toHaveBeenCalledWith(
      'Varna',
      expect.any(AbortSignal),
    )

    expect(mockedFetchCurrentWeather).toHaveBeenCalledWith(
      {
        latitude: 43.21912,
        longitude: 27.91024,
        timezone: 'Europe/Sofia',
      },
      expect.any(AbortSignal),
    )

    expect(await screen.findByText('Partly cloudy')).toBeInTheDocument()
    expect(
      screen.getByRole('img', {
        name: 'Partly cloudy weather animation',
      }),
    ).toBeInTheDocument()
    expect(screen.getByText('18°C')).toBeInTheDocument()
    expect(screen.getByText('Feels like 19°C')).toBeInTheDocument()
    expect(screen.getByText('Humidity')).toBeInTheDocument()
    expect(screen.getByText('Hourly forecast')).toBeInTheDocument()
    expect(screen.getByText('5-day forecast')).toBeInTheDocument()
  })

  it('renders a friendly error when the location search fails', async () => {
    const user = userEvent.setup()
    mockGeolocationError(1)

    mockedSearchLocations.mockRejectedValue(new Error('Network request failed.'))

    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Search' }))

    expect(
      await screen.findByText('Network request failed.'),
    ).toBeInTheDocument()
  })

  it('renders a friendly error when current weather loading fails', async () => {
    const user = userEvent.setup()
    mockGeolocationError(1)

    mockedSearchLocations.mockResolvedValue([
      {
        id: 726050,
        name: 'Varna',
        country: 'Bulgaria',
        latitude: 43.21912,
        longitude: 27.91024,
        admin1: 'Varna',
        countryCode: 'BG',
        timezone: 'Europe/Sofia',
      },
    ])

    mockedFetchCurrentWeather.mockRejectedValue(
      new Error('Unable to load current weather right now.'),
    )

    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Search' }))

    expect(
      await screen.findByText('Unable to load current weather right now.'),
    ).toBeInTheDocument()
  })
})
