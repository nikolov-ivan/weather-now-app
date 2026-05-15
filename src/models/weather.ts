export type CurrentWeather = {
  time: string
  timezone: string
  temperature: number
  apparentTemperature: number
  relativeHumidity: number
  precipitation: number
  weatherCode: number
  weatherDescription: string
  isDay: boolean
  cloudCover: number
  windSpeed: number
  windDirection: number
  uvIndex: number
  surfacePressure: number
  hourlyForecast: HourlyForecast[]
  dailyForecast: DailyForecast[]
  units: {
    temperature: string
    relativeHumidity: string
    precipitation: string
    windSpeed: string
    cloudCover: string
    uvIndex: string
    surfacePressure: string
  }
}

export type HourlyForecast = {
  time: string
  temperature: number
  weatherCode: number
  weatherDescription: string
  isDay: boolean
}

export type DailyForecast = {
  date: string
  weatherCode: number
  weatherDescription: string
  temperatureMax: number
  temperatureMin: number
}

const WEATHER_CODE_LABELS: Record<number, string> = {
  0: 'Clear sky',
  1: 'Mainly clear',
  2: 'Partly cloudy',
  3: 'Overcast',
  45: 'Fog',
  48: 'Depositing rime fog',
  51: 'Light drizzle',
  53: 'Moderate drizzle',
  55: 'Dense drizzle',
  56: 'Light freezing drizzle',
  57: 'Dense freezing drizzle',
  61: 'Slight rain',
  63: 'Moderate rain',
  65: 'Heavy rain',
  66: 'Light freezing rain',
  67: 'Heavy freezing rain',
  71: 'Slight snow fall',
  73: 'Moderate snow fall',
  75: 'Heavy snow fall',
  77: 'Snow grains',
  80: 'Slight rain showers',
  81: 'Moderate rain showers',
  82: 'Violent rain showers',
  85: 'Slight snow showers',
  86: 'Heavy snow showers',
  95: 'Thunderstorm',
  96: 'Thunderstorm with slight hail',
  99: 'Thunderstorm with heavy hail',
}

export function getWeatherCodeDescription(weatherCode: number): string {
  return WEATHER_CODE_LABELS[weatherCode] ?? 'Unknown conditions'
}

export function getWeatherCodeIcon(weatherCode: number, isDay = true) {
  if ([95, 96, 99].includes(weatherCode)) {
    return '⛈️'
  }

  if (
    [
      51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82,
    ].includes(weatherCode)
  ) {
    return '🌧️'
  }

  if ([71, 73, 75, 77, 85, 86].includes(weatherCode)) {
    return '❄️'
  }

  if ([45, 48].includes(weatherCode)) {
    return '🌫️'
  }

  if (weatherCode === 2) {
    return '⛅'
  }

  if (weatherCode === 3) {
    return '☁️'
  }

  return isDay ? '☀️' : '🌙'
}
