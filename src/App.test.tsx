import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'
import { searchLocations } from './api/geocodingApi'
import { fetchCurrentWeather } from './api/weatherApi'

vi.mock('./api/geocodingApi', () => ({
  searchLocations: vi.fn(),
}))

vi.mock('./api/weatherApi', () => ({
  fetchCurrentWeather: vi.fn(),
}))

const mockedSearchLocations = vi.mocked(searchLocations)
const mockedFetchCurrentWeather = vi.mocked(fetchCurrentWeather)

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

describe('App', () => {
  beforeEach(() => {
    mockedSearchLocations.mockReset()
    mockedFetchCurrentWeather.mockReset()

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

  it('automatically loads current weather for the browser location when geolocation succeeds', async () => {
    const getCurrentPosition = mockGeolocationSuccess(42.6977, 23.3219)

    mockedFetchCurrentWeather.mockResolvedValue({
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
      units: {
        temperature: 'deg C',
        relativeHumidity: '%',
        precipitation: 'mm',
        windSpeed: 'km/h',
        cloudCover: '%',
      },
    })

    render(<App />)

    expect(getCurrentPosition).toHaveBeenCalledTimes(1)

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
    expect(screen.getByText('Current location')).toBeInTheDocument()
    expect(screen.getByText('18.4 deg C')).toBeInTheDocument()
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

    mockedFetchCurrentWeather.mockResolvedValue({
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
      units: {
        temperature: 'deg C',
        relativeHumidity: '%',
        precipitation: 'mm',
        windSpeed: 'km/h',
        cloudCover: '%',
      },
    })

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
    expect(screen.getByText('18.4 deg C')).toBeInTheDocument()
    expect(screen.getByText('Feels like 19.2 deg C')).toBeInTheDocument()
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
