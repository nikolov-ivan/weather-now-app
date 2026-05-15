import { describe, expect, it, vi } from 'vitest'
import { reverseGeocodeLocation } from './reverseGeocodingApi'

describe('reverseGeocodeLocation', () => {
  it('maps reverse geocoding data into a location without an id', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        city: 'Sofia',
        locality: 'Sofia',
        principalSubdivision: 'Sofia City Province',
        countryName: 'Bulgaria',
        countryCode: 'BG',
      }),
    })

    vi.stubGlobal('fetch', fetchMock)

    const location = await reverseGeocodeLocation(42.6977, 23.3219)

    expect(fetchMock).toHaveBeenCalledTimes(1)

    const [requestUrl] = fetchMock.mock.calls[0] as [URL]
    expect(requestUrl.toString()).toContain('latitude=42.6977')
    expect(requestUrl.toString()).toContain('longitude=23.3219')
    expect(requestUrl.toString()).toContain('localityLanguage=en')

    expect(location).toEqual({
      name: 'Sofia',
      country: 'Bulgaria',
      latitude: 42.6977,
      longitude: 23.3219,
      admin1: 'Sofia City Province',
      countryCode: 'BG',
    })
  })

  it('falls back to locality when city is missing', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        locality: 'Varna',
        countryName: 'Bulgaria',
        countryCode: 'BG',
      }),
    })

    vi.stubGlobal('fetch', fetchMock)

    await expect(reverseGeocodeLocation(43.2141, 27.9147)).resolves.toEqual({
      name: 'Varna',
      country: 'Bulgaria',
      latitude: 43.2141,
      longitude: 27.9147,
      admin1: undefined,
      countryCode: 'BG',
    })
  })

  it('returns null when no readable location name is returned', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        countryCode: 'BG',
      }),
    })

    vi.stubGlobal('fetch', fetchMock)

    await expect(reverseGeocodeLocation(42.6977, 23.3219)).resolves.toBeNull()
  })

  it('throws when reverse geocoding fails', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({}),
    })

    vi.stubGlobal('fetch', fetchMock)

    await expect(reverseGeocodeLocation(42.6977, 23.3219)).rejects.toThrow(
      'Unable to resolve current location city.',
    )
  })
})
