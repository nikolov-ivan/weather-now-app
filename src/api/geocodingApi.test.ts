import { describe, expect, it, vi } from 'vitest'
import { searchLocations } from './geocodingApi'

describe('searchLocations', () => {
  it('returns an empty list without calling fetch for queries shorter than 2 characters', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    await expect(searchLocations('V')).resolves.toEqual([])
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('maps Open-Meteo geocoding results into the Location model', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        results: [
          {
            id: 726050,
            name: 'Varna',
            country: 'Bulgaria',
            latitude: 43.21912,
            longitude: 27.91024,
            admin1: 'Varna',
            country_code: 'BG',
            timezone: 'Europe/Sofia',
          },
        ],
      }),
    })

    vi.stubGlobal('fetch', fetchMock)

    const results = await searchLocations('Varna')

    expect(fetchMock).toHaveBeenCalledTimes(1)

    const [requestUrl] = fetchMock.mock.calls[0] as [URL]
    expect(requestUrl.toString()).toContain('name=Varna')
    expect(requestUrl.toString()).toContain('count=8')
    expect(requestUrl.toString()).toContain('format=json')
    expect(requestUrl.toString()).toContain('language=en')

    expect(results).toEqual([
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
  })

  it('throws the API reason when the request fails', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({
        error: true,
        reason: 'Daily request limit reached.',
      }),
    })

    vi.stubGlobal('fetch', fetchMock)

    await expect(searchLocations('Varna')).rejects.toThrow(
      'Daily request limit reached.',
    )
  })
})
