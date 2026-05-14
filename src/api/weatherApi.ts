import { getWeatherCodeDescription, type CurrentWeather } from '../models/weather'

const WEATHER_API_URL = 'https://api.open-meteo.com/v1/forecast'

const CURRENT_WEATHER_FIELDS = [
  'temperature_2m',
  'relative_humidity_2m',
  'apparent_temperature',
  'is_day',
  'precipitation',
  'weather_code',
  'cloud_cover',
  'wind_speed_10m',
  'wind_direction_10m',
] as const

type CurrentWeatherField = (typeof CURRENT_WEATHER_FIELDS)[number]

type CurrentWeatherRequest = {
  latitude: number
  longitude: number
  timezone?: string
}

type WeatherApiCurrent = Record<CurrentWeatherField, number> & {
  time: string
  interval: number
}

type WeatherApiCurrentUnits = Record<CurrentWeatherField, string> & {
  time: string
  interval: string
}

type WeatherApiResponse = {
  timezone?: string
  current?: WeatherApiCurrent
  current_units?: WeatherApiCurrentUnits
  error?: boolean
  reason?: string
}

export async function fetchCurrentWeather(
  request: CurrentWeatherRequest,
  signal?: AbortSignal,
): Promise<CurrentWeather> {
  const url = new URL(WEATHER_API_URL)
  url.searchParams.set('latitude', String(request.latitude))
  url.searchParams.set('longitude', String(request.longitude))
  url.searchParams.set('current', CURRENT_WEATHER_FIELDS.join(','))
  url.searchParams.set('temperature_unit', 'celsius')
  url.searchParams.set('wind_speed_unit', 'kmh')
  url.searchParams.set('precipitation_unit', 'mm')
  url.searchParams.set('timezone', request.timezone ?? 'auto')

  const response = await fetch(url, { signal })

  let data: WeatherApiResponse

  try {
    data = (await response.json()) as WeatherApiResponse
  } catch {
    throw new Error('Open-Meteo returned an unreadable weather response.')
  }

  if (!response.ok || data.error) {
    throw new Error(data.reason ?? 'Unable to load current weather right now.')
  }

  if (!data.current || !data.current_units || !data.timezone) {
    throw new Error('Open-Meteo returned incomplete current weather data.')
  }

  return {
    time: data.current.time,
    timezone: data.timezone,
    temperature: data.current.temperature_2m,
    apparentTemperature: data.current.apparent_temperature,
    relativeHumidity: data.current.relative_humidity_2m,
    precipitation: data.current.precipitation,
    weatherCode: data.current.weather_code,
    weatherDescription: getWeatherCodeDescription(data.current.weather_code),
    isDay: data.current.is_day === 1,
    cloudCover: data.current.cloud_cover,
    windSpeed: data.current.wind_speed_10m,
    windDirection: data.current.wind_direction_10m,
    units: {
      temperature: data.current_units.temperature_2m,
      relativeHumidity: data.current_units.relative_humidity_2m,
      precipitation: data.current_units.precipitation,
      windSpeed: data.current_units.wind_speed_10m,
      cloudCover: data.current_units.cloud_cover,
    },
  }
}
