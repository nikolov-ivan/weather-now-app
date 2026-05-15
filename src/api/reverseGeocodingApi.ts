import type { Location } from '../models/location'

const REVERSE_GEOCODING_API_URL =
  'https://api.bigdatacloud.net/data/reverse-geocode-client'

export type ReverseGeocodedLocation = Omit<Location, 'id'>

type ReverseGeocodingApiResponse = {
  city?: string
  locality?: string
  principalSubdivision?: string
  countryName?: string
  countryCode?: string
}

function getFirstAvailableName(
  response: ReverseGeocodingApiResponse,
): string | null {
  return (
    response.city?.trim() ||
    response.locality?.trim() ||
    response.principalSubdivision?.trim() ||
    response.countryName?.trim() ||
    null
  )
}

export async function reverseGeocodeLocation(
  latitude: number,
  longitude: number,
  signal?: AbortSignal,
): Promise<ReverseGeocodedLocation | null> {
  const url = new URL(REVERSE_GEOCODING_API_URL)
  url.searchParams.set('latitude', String(latitude))
  url.searchParams.set('longitude', String(longitude))
  url.searchParams.set('localityLanguage', 'en')

  const response = await fetch(url, { signal })

  let data: ReverseGeocodingApiResponse

  try {
    data = (await response.json()) as ReverseGeocodingApiResponse
  } catch {
    throw new Error('Reverse geocoding returned an unreadable response.')
  }

  if (!response.ok) {
    throw new Error('Unable to resolve current location city.')
  }

  const name = getFirstAvailableName(data)

  if (!name) {
    return null
  }

  const country = data.countryName?.trim() ?? ''
  const admin1 =
    data.principalSubdivision?.trim() &&
    data.principalSubdivision.trim() !== name
      ? data.principalSubdivision.trim()
      : undefined

  return {
    name,
    country,
    latitude,
    longitude,
    admin1,
    countryCode: data.countryCode,
  }
}
