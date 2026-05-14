import { describe, expect, it, vi } from 'vitest'
import { fetchCurrentWeather } from './weatherApi'

describe('fetchCurrentWeather', () => {
  it('maps Open-Meteo current weather into the CurrentWeather model', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        timezone: 'Europe/Sofia',
        current_units: {
          time: 'iso8601',
          interval: 'seconds',
          temperature_2m: '°C',
          relative_humidity_2m: '%',
          apparent_temperature: '°C',
          is_day: '',
          precipitation: 'mm',
          weather_code: 'wmo code',
          cloud_cover: '%',
          wind_speed_10m: 'km/h',
          wind_direction_10m: '°',
        },
        current: {
          time: '2026-05-14T08:45',
          interval: 900,
          temperature_2m: 18.4,
          relative_humidity_2m: 63,
          apparent_temperature: 19.2,
          is_day: 1,
          precipitation: 0,
          weather_code: 2,
          cloud_cover: 37,
          wind_speed_10m: 14.8,
          wind_direction_10m: 128,
        },
      }),
    })

    vi.stubGlobal('fetch', fetchMock)

    const currentWeather = await fetchCurrentWeather({
      latitude: 43.21912,
      longitude: 27.91024,
      timezone: 'Europe/Sofia',
    })

    expect(fetchMock).toHaveBeenCalledTimes(1)

    const [requestUrl] = fetchMock.mock.calls[0] as [URL]

    expect(requestUrl.toString()).toContain('latitude=43.21912')
    expect(requestUrl.toString()).toContain('longitude=27.91024')
    expect(requestUrl.toString()).toContain('current=temperature_2m')
    expect(requestUrl.toString()).toContain('timezone=Europe%2FSofia')
    expect(requestUrl.toString()).toContain('wind_speed_unit=kmh')

    expect(currentWeather).toEqual({
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
  })

  it('throws the API reason when the weather request fails', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({
        error: true,
        reason: 'Weather API temporarily unavailable.',
      }),
    })

    vi.stubGlobal('fetch', fetchMock)

    await expect(
      fetchCurrentWeather({
        latitude: 43.21912,
        longitude: 27.91024,
      }),
    ).rejects.toThrow('Weather API temporarily unavailable.')
  })

  it('throws when the current weather payload is incomplete', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        timezone: 'Europe/Sofia',
      }),
    })

    vi.stubGlobal('fetch', fetchMock)

    await expect(
      fetchCurrentWeather({
        latitude: 43.21912,
        longitude: 27.91024,
      }),
    ).rejects.toThrow('Open-Meteo returned incomplete current weather data.')
  })
})
