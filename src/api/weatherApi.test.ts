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
          temperature_2m: 'deg C',
          relative_humidity_2m: '%',
          apparent_temperature: 'deg C',
          is_day: '',
          precipitation: 'mm',
          weather_code: 'wmo code',
          cloud_cover: '%',
          uv_index: '',
          surface_pressure: 'hPa',
          wind_speed_10m: 'km/h',
          wind_direction_10m: 'deg',
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
          uv_index: 5.4,
          surface_pressure: 1018.2,
          wind_speed_10m: 14.8,
          wind_direction_10m: 128,
        },
        hourly_units: {
          time: 'iso8601',
          temperature_2m: 'deg C',
          weather_code: 'wmo code',
          is_day: '',
        },
        hourly: {
          time: [
            '2026-05-14T08:00',
            '2026-05-14T09:00',
            '2026-05-14T10:00',
            '2026-05-14T11:00',
            '2026-05-14T12:00',
            '2026-05-14T13:00',
            '2026-05-14T14:00',
          ],
          temperature_2m: [18, 19, 20, 21, 22, 23, 24],
          weather_code: [2, 2, 0, 61, 3, 1, 0],
          is_day: [1, 1, 1, 1, 1, 1, 1],
        },
        daily_units: {
          time: 'iso8601',
          weather_code: 'wmo code',
          temperature_2m_max: 'deg C',
          temperature_2m_min: 'deg C',
        },
        daily: {
          time: [
            '2026-05-14',
            '2026-05-15',
            '2026-05-16',
            '2026-05-17',
            '2026-05-18',
          ],
          weather_code: [0, 2, 61, 3, 0],
          temperature_2m_max: [24, 26, 22, 21, 25],
          temperature_2m_min: [15, 16, 13, 12, 14],
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
    expect(requestUrl.toString()).toContain('hourly=temperature_2m')
    expect(requestUrl.toString()).toContain('daily=weather_code')
    expect(requestUrl.toString()).toContain('timezone=Europe%2FSofia')
    expect(requestUrl.toString()).toContain('wind_speed_unit=kmh')
    expect(requestUrl.toString()).toContain('forecast_days=5')

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
      uvIndex: 5.4,
      surfacePressure: 1018.2,
      hourlyForecast: [
        {
          time: '2026-05-14T09:00',
          temperature: 19,
          weatherCode: 2,
          weatherDescription: 'Partly cloudy',
          isDay: true,
        },
        {
          time: '2026-05-14T10:00',
          temperature: 20,
          weatherCode: 0,
          weatherDescription: 'Clear sky',
          isDay: true,
        },
        {
          time: '2026-05-14T11:00',
          temperature: 21,
          weatherCode: 61,
          weatherDescription: 'Slight rain',
          isDay: true,
        },
        {
          time: '2026-05-14T12:00',
          temperature: 22,
          weatherCode: 3,
          weatherDescription: 'Overcast',
          isDay: true,
        },
        {
          time: '2026-05-14T13:00',
          temperature: 23,
          weatherCode: 1,
          weatherDescription: 'Mainly clear',
          isDay: true,
        },
        {
          time: '2026-05-14T14:00',
          temperature: 24,
          weatherCode: 0,
          weatherDescription: 'Clear sky',
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
