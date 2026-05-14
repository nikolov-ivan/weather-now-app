import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, beforeEach, vi } from 'vitest'
import App from './App'
import { searchLocations } from './api/geocodingApi'

vi.mock('./api/geocodingApi', () => ({
  searchLocations: vi.fn(),
}))

const mockedSearchLocations = vi.mocked(searchLocations)

describe('App', () => {
  beforeEach(() => {
    mockedSearchLocations.mockReset()
  })

  it('shows the initial checkpoint prompt before the first search', () => {
    render(<App />)

    expect(
      screen.getByText('Start with Varna to validate the first checkpoint.'),
    ).toBeInTheDocument()
    expect(screen.getByDisplayValue('Varna')).toBeInTheDocument()
  })

  it('renders matching locations after a successful search', async () => {
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

    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Search' }))

    expect(mockedSearchLocations).toHaveBeenCalledWith(
      'Varna',
      expect.any(AbortSignal),
    )

    expect(await screen.findByText('Found 1 matching location.')).toBeInTheDocument()
    expect(screen.getByText('43.2191')).toBeInTheDocument()
    expect(screen.getByText('27.9102')).toBeInTheDocument()
    expect(screen.getByText('Europe/Sofia')).toBeInTheDocument()
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
})
