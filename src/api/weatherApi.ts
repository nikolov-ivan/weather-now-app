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
  'uv_index',
  'surface_pressure',
  'wind_speed_10m',
  'wind_direction_10m',
] as const

const HOURLY_WEATHER_FIELDS = [
  'temperature_2m',
  'weather_code',
  'is_day',
] as const

const DAILY_WEATHER_FIELDS = [
  'weather_code',
  'temperature_2m_max',
  'temperature_2m_min',
] as const

type CurrentWeatherField = (typeof CURRENT_WEATHER_FIELDS)[number]
type HourlyWeatherField = (typeof HOURLY_WEATHER_FIELDS)[number]
type DailyWeatherField = (typeof DAILY_WEATHER_FIELDS)[number]

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

type WeatherApiHourly = Record<HourlyWeatherField, number[]> & {
  time: string[]
}

type WeatherApiHourlyUnits = Record<HourlyWeatherField, string> & {
  time: string
}

type WeatherApiDaily = Record<DailyWeatherField, number[]> & {
  time: string[]
}

type WeatherApiDailyUnits = Record<DailyWeatherField, string> & {
  time: string
}

type WeatherApiResponse = {
  timezone?: string
  current?: WeatherApiCurrent
  current_units?: WeatherApiCurrentUnits
  hourly?: WeatherApiHourly
  hourly_units?: WeatherApiHourlyUnits
  daily?: WeatherApiDaily
  daily_units?: WeatherApiDailyUnits
  error?: boolean
  reason?: string
}

function mapHourlyForecast(hourly: WeatherApiHourly, currentTime: string) {
  const nextHourIndex = hourly.time.findIndex((time) => time >= currentTime)
  const startIndex = nextHourIndex >= 0 ? nextHourIndex : 0

  return hourly.time.slice(startIndex, startIndex + 6).map((time, index) => {
    const sourceIndex = startIndex + index
    const weatherCode = hourly.weather_code[sourceIndex]

    return {
      time,
      temperature: hourly.temperature_2m[sourceIndex],
      weatherCode,
      weatherDescription: getWeatherCodeDescription(weatherCode),
      isDay: hourly.is_day[sourceIndex] === 1,
    }
  })
}

function mapDailyForecast(daily: WeatherApiDaily) {
  return daily.time.slice(0, 5).map((date, index) => {
    const weatherCode = daily.weather_code[index]

    return {
      date,
      weatherCode,
      weatherDescription: getWeatherCodeDescription(weatherCode),
      temperatureMax: daily.temperature_2m_max[index],
      temperatureMin: daily.temperature_2m_min[index],
    }
  })
}

export async function fetchCurrentWeather(
  request: CurrentWeatherRequest,
  signal?: AbortSignal,
): Promise<CurrentWeather> {
  const url = new URL(WEATHER_API_URL)
  url.searchParams.set('latitude', String(request.latitude))
  url.searchParams.set('longitude', String(request.longitude))
  url.searchParams.set('current', CURRENT_WEATHER_FIELDS.join(','))
  url.searchParams.set('hourly', HOURLY_WEATHER_FIELDS.join(','))
  url.searchParams.set('daily', DAILY_WEATHER_FIELDS.join(','))
  url.searchParams.set('temperature_unit', 'celsius')
  url.searchParams.set('wind_speed_unit', 'kmh')
  url.searchParams.set('precipitation_unit', 'mm')
  url.searchParams.set('timezone', request.timezone ?? 'auto')
  url.searchParams.set('forecast_days', '5')

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

  if (!data.hourly || !data.hourly_units || !data.daily || !data.daily_units) {
    throw new Error('Open-Meteo returned incomplete forecast data.')
  }

  const hourlyForecast = mapHourlyForecast(data.hourly, data.current.time)
  const dailyForecast = mapDailyForecast(data.daily)

  if (hourlyForecast.length === 0 || dailyForecast.length === 0) {
    throw new Error('Open-Meteo returned incomplete forecast data.')
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
    uvIndex: data.current.uv_index,
    surfacePressure: data.current.surface_pressure,
    hourlyForecast,
    dailyForecast,
    units: {
      temperature: data.current_units.temperature_2m,
      relativeHumidity: data.current_units.relative_humidity_2m,
      precipitation: data.current_units.precipitation,
      windSpeed: data.current_units.wind_speed_10m,
      cloudCover: data.current_units.cloud_cover,
      uvIndex: data.current_units.uv_index,
      surfacePressure: data.current_units.surface_pressure,
    },
  }
}
