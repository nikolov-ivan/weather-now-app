import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'
import { searchLocations } from './api/geocodingApi'
import { fetchVisitorCapital } from './api/visitorLocationApi'
import { fetchCurrentWeather } from './api/weatherApi'
import { formatLastUpdated } from './utils/formatLastUpdated'
import type { CurrentWeather } from './models/weather'

vi.mock('./api/geocodingApi', () => ({
  searchLocations: vi.fn(),
}))

vi.mock('./api/weatherApi', () => ({
  fetchCurrentWeather: vi.fn(),
}))

vi.mock('./api/visitorLocationApi', () => ({
  fetchVisitorCapital: vi.fn(),
}))

const mockedSearchLocations = vi.mocked(searchLocations)
const mockedFetchVisitorCapital = vi.mocked(fetchVisitorCapital)
const mockedFetchCurrentWeather = vi.mocked(fetchCurrentWeather)
const lastSelectedLocationStorageKey = 'weather-now:last-selected-location'

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

const sofiaLocation = {
  id: 727011,
  name: 'Sofia',
  country: 'Bulgaria',
  latitude: 42.6977,
  longitude: 23.3219,
  admin1: 'Sofia City Province',
  countryCode: 'BG',
  timezone: 'Europe/Sofia',
}

const varnaLocation = {
  id: 726050,
  name: 'Varna',
  country: 'Bulgaria',
  latitude: 43.21912,
  longitude: 27.91024,
  admin1: 'Varna',
  countryCode: 'BG',
  timezone: 'Europe/Sofia',
}

async function chooseCityFromInlineSearch(
  user: ReturnType<typeof userEvent.setup>,
  buttonName: string,
  query: string,
  resultName = query,
) {
  await user.click(screen.getByRole('button', { name: buttonName }))
  await user.type(screen.getByLabelText(buttonName), query)
  await user.click(
    await screen.findByRole('button', {
      name: new RegExp(`Select ${resultName}`, 'i'),
    }),
  )
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
    mockedFetchVisitorCapital.mockReset()
    mockedFetchCurrentWeather.mockReset()
    window.localStorage.clear()
  })

  it('loads the visitor country capital when no city is stored', async () => {
    mockedFetchVisitorCapital.mockResolvedValue({
      capital: 'Sofia',
      countryCode: 'BG',
      countryName: 'Bulgaria',
    })
    mockedSearchLocations.mockResolvedValue([sofiaLocation])
    mockedFetchCurrentWeather.mockResolvedValue(buildCurrentWeather())

    render(<App />)

    await waitFor(() => {
      expect(mockedSearchLocations).toHaveBeenCalledWith(
        'Sofia',
        expect.any(AbortSignal),
      )
    })
    await waitFor(() => {
      expect(mockedFetchCurrentWeather).toHaveBeenCalledWith(
        {
          latitude: 42.6977,
          longitude: 23.3219,
          timezone: 'Europe/Sofia',
        },
        expect.any(AbortSignal),
      )
    })

    expect(await screen.findByText('Partly cloudy')).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'Sofia', level: 2 }),
    ).toBeInTheDocument()
    expect(window.localStorage.getItem(lastSelectedLocationStorageKey)).toContain(
      '"name":"Sofia"',
    )
  })

  it('renders the weather dashboard after the default city loads', async () => {
    window.localStorage.setItem(
      lastSelectedLocationStorageKey,
      JSON.stringify(varnaLocation),
    )
    mockedFetchCurrentWeather.mockResolvedValue(buildCurrentWeather())

    render(<App />)

    expect(await screen.findByText('Partly cloudy')).toBeInTheDocument()
    expect(mockedFetchVisitorCapital).not.toHaveBeenCalled()
    expect(mockedSearchLocations).not.toHaveBeenCalled()
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

  it('expands the change location control and loads weather from a dropdown result', async () => {
    const user = userEvent.setup()
    window.localStorage.setItem(
      lastSelectedLocationStorageKey,
      JSON.stringify(varnaLocation),
    )

    mockedSearchLocations.mockResolvedValue([sofiaLocation])
    mockedFetchCurrentWeather
      .mockResolvedValueOnce(buildCurrentWeather())
      .mockResolvedValueOnce(
        buildCurrentWeather({
          temperature: 12.4,
          apparentTemperature: 11.8,
          weatherCode: 3,
          weatherDescription: 'Overcast',
        }),
      )

    render(<App />)

    expect(await screen.findByText('Partly cloudy')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Varna', level: 2 })).toBeInTheDocument()

    await chooseCityFromInlineSearch(user, 'Change location', 'Sofia')

    await waitFor(() => {
      expect(mockedFetchCurrentWeather).toHaveBeenLastCalledWith(
        {
          latitude: 42.6977,
          longitude: 23.3219,
          timezone: 'Europe/Sofia',
        },
        expect.any(AbortSignal),
      )
    })
    expect(await screen.findByText('Overcast')).toBeInTheDocument()
    expect(screen.getByText('12°C')).toBeInTheDocument()
    expect(window.localStorage.getItem(lastSelectedLocationStorageKey)).toContain(
      '"name":"Sofia"',
    )
  })

  it('renders a friendly error when the location search fails', async () => {
    const user = userEvent.setup()
    window.localStorage.setItem(
      lastSelectedLocationStorageKey,
      JSON.stringify(varnaLocation),
    )

    mockedFetchCurrentWeather.mockResolvedValue(buildCurrentWeather())
    mockedSearchLocations.mockRejectedValue(new Error('Network request failed.'))

    render(<App />)

    expect(await screen.findByText('Partly cloudy')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Varna', level: 2 })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Change location' }))
    await user.type(screen.getByLabelText('Change location'), 'Varna')

    expect(
      await screen.findByText('Network request failed.'),
    ).toBeInTheDocument()
  })

  it('renders a friendly error when selected weather loading fails', async () => {
    const user = userEvent.setup()
    window.localStorage.setItem(
      lastSelectedLocationStorageKey,
      JSON.stringify(varnaLocation),
    )

    mockedSearchLocations.mockResolvedValue([sofiaLocation])
    mockedFetchCurrentWeather
      .mockResolvedValueOnce(buildCurrentWeather())
      .mockRejectedValueOnce(new Error('Unable to load current weather right now.'))

    render(<App />)

    expect(await screen.findByText('Partly cloudy')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Varna', level: 2 })).toBeInTheDocument()
    await chooseCityFromInlineSearch(user, 'Change location', 'Sofia')

    expect(
      await screen.findByText('Unable to load current weather right now.'),
    ).toBeInTheDocument()
  })
})
