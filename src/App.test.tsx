import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
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

describe('App', () => {
  beforeEach(() => {
    mockedSearchLocations.mockReset()
    mockedFetchCurrentWeather.mockReset()
  })

  it('shows the initial checkpoint prompt before the first search', () => {
    render(<App />)

    expect(
      screen.getByText('Start with Varna to validate the first checkpoint.'),
    ).toBeInTheDocument()
    expect(screen.getByDisplayValue('Varna')).toBeInTheDocument()
  })

  it('renders matching locations and current weather after a successful search', async () => {
    const user = userEvent.setup()

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
        temperature: '°C',
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
    expect(screen.getByText('18.4 °C')).toBeInTheDocument()
    expect(screen.getByText('Feels like 19.2 °C')).toBeInTheDocument()
  })

  it('renders a friendly error when the location search fails', async () => {
    const user = userEvent.setup()

    mockedSearchLocations.mockRejectedValue(new Error('Network request failed.'))

    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Search' }))

    expect(
      await screen.findByText('Network request failed.'),
    ).toBeInTheDocument()
  })

  it('renders a friendly error when current weather loading fails', async () => {
    const user = userEvent.setup()

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
