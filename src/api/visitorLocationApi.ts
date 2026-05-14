const VISITOR_LOCATION_API_URL = 'https://ipapi.co/json/'

export type VisitorCapital = {
  capital: string
  countryCode?: string
  countryName?: string
}

type VisitorLocationApiResponse = {
  country_capital?: string
  country_code?: string
  country_name?: string
  error?: boolean
  reason?: string
}

export async function fetchVisitorCapital(
  signal?: AbortSignal,
): Promise<VisitorCapital | null> {
  const response = await fetch(VISITOR_LOCATION_API_URL, { signal })

  let data: VisitorLocationApiResponse

  try {
    data = (await response.json()) as VisitorLocationApiResponse
  } catch {
    throw new Error('IP location service returned an unreadable response.')
  }

  if (!response.ok || data.error) {
    throw new Error(data.reason ?? 'Unable to detect visitor country.')
  }

  const capital = data.country_capital?.trim()

  if (!capital) {
    return null
  }

  return {
    capital,
    countryCode: data.country_code?.trim() || undefined,
    countryName: data.country_name?.trim() || undefined,
  }
}
