import type { Location } from '../models/location'

const GEOCODING_API_URL = 'https://geocoding-api.open-meteo.com/v1/search'
const MAX_RESULTS = 8

type GeocodingApiLocation = {
  id: number
  name: string
  country: string
  latitude: number
  longitude: number
  admin1?: string
  country_code?: string
  timezone?: string
}

type GeocodingApiResponse = {
  results?: GeocodingApiLocation[]
  error?: boolean
  reason?: string
}

export async function searchLocations(
  query: string,
  signal?: AbortSignal,
): Promise<Location[]> {
  const normalizedQuery = query.trim()

  if (normalizedQuery.length < 2) {
    return []
  }

  const url = new URL(GEOCODING_API_URL)
  url.searchParams.set('name', normalizedQuery)
  url.searchParams.set('count', String(MAX_RESULTS))
  url.searchParams.set('format', 'json')
  url.searchParams.set('language', 'en')

  const response = await fetch(url, { signal })

  let data: GeocodingApiResponse

  try {
    data = (await response.json()) as GeocodingApiResponse
  } catch {
    throw new Error('Open-Meteo returned an unreadable geocoding response.')
  }

  if (!response.ok || data.error) {
    throw new Error(data.reason ?? 'Unable to search locations right now.')
  }

  return (data.results ?? []).map((location) => ({
    id: location.id,
    name: location.name,
    country: location.country,
    latitude: location.latitude,
    longitude: location.longitude,
    admin1: location.admin1 || undefined,
    countryCode: location.country_code,
    timezone: location.timezone,
  }))
}
