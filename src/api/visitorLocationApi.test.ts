import { describe, expect, it, vi } from 'vitest'
import { fetchVisitorCapital } from './visitorLocationApi'

describe('fetchVisitorCapital', () => {
  it('maps the visitor country capital from the IP location response', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        country_capital: 'Sofia',
        country_code: 'BG',
        country_name: 'Bulgaria',
      }),
    })

    vi.stubGlobal('fetch', fetchMock)

    await expect(fetchVisitorCapital()).resolves.toEqual({
      capital: 'Sofia',
      countryCode: 'BG',
      countryName: 'Bulgaria',
    })

    expect(fetchMock).toHaveBeenCalledWith('https://ipapi.co/json/', {
      signal: undefined,
    })
  })

  it('returns null when the visitor country capital is missing', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        country_code: 'AQ',
        country_name: 'Antarctica',
      }),
    })

    vi.stubGlobal('fetch', fetchMock)

    await expect(fetchVisitorCapital()).resolves.toBeNull()
  })

  it('throws the service reason when IP location lookup fails', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({
        error: true,
        reason: 'Rate limit exceeded.',
      }),
    })

    vi.stubGlobal('fetch', fetchMock)

    await expect(fetchVisitorCapital()).rejects.toThrow('Rate limit exceeded.')
  })
})
