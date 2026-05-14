import { useEffect, useMemo, useRef, useState } from 'react'
import { searchLocations } from './api/geocodingApi'
import { SearchBox } from './components/SearchBox'
import type { Location } from './models/location'
import './App.css'

const DEFAULT_QUERY = 'Varna'

function formatCoordinate(value: number) {
  return value.toFixed(4)
}

function formatLocationLine(location: Location) {
  return [location.admin1, location.country].filter(Boolean).join(', ')
}

function App() {
  const [query, setQuery] = useState(DEFAULT_QUERY)
  const [locations, setLocations] = useState<Location[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const abortControllerRef = useRef<AbortController | null>(null)

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort()
    }
  }, [])

  const statusMessage = useMemo(() => {
    if (error) {
      return error
    }

    if (isLoading) {
      return 'Searching for matching locations...'
    }

    if (!hasSearched) {
      return 'Start with Varna to validate the first checkpoint.'
    }

    if (locations.length === 0) {
      return 'No matching locations found.'
    }

    if (locations.length === 1) {
      return 'Found 1 matching location.'
    }

    return `Found ${locations.length} matching locations.`
  }, [error, hasSearched, isLoading, locations.length])

  async function handleSearch() {
    const normalizedQuery = query.trim()

    if (normalizedQuery.length < 2) {
      abortControllerRef.current?.abort()
      abortControllerRef.current = null
      setHasSearched(false)
      setLocations([])
      setError('Enter at least 2 characters to search for a city.')
      setIsLoading(false)
      return
    }

    abortControllerRef.current?.abort()
    const controller = new AbortController()
    abortControllerRef.current = controller

    setHasSearched(true)
    setIsLoading(true)
    setError(null)

    try {
      const results = await searchLocations(normalizedQuery, controller.signal)
      setLocations(results)
    } catch (searchError) {
      if (
        searchError instanceof DOMException &&
        searchError.name === 'AbortError'
      ) {
        return
      }

      setLocations([])
      setError(
        searchError instanceof Error
          ? searchError.message
          : 'Unable to search locations right now.',
      )
    } finally {
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null
        setIsLoading(false)
      }
    }
  }

  return (
    <div className="app-shell">
      <header className="page-header">
        <p className="page-header__eyebrow">WeatherNow</p>
        <h1>City lookup for the first project checkpoint</h1>
        <p className="page-header__intro">
          Search a city and inspect the latitude and longitude returned by
          Open-Meteo geocoding.
        </p>
      </header>

      <main className="page-main">
        <section className="search-band" aria-label="City search">
          <div className="search-band__inner">
            <SearchBox
              value={query}
              onChange={setQuery}
              onSubmit={() => {
                void handleSearch()
              }}
              isLoading={isLoading}
            />
            <p
              className={`status-message${error ? ' status-message--error' : ''}`}
              aria-live="polite"
            >
              {statusMessage}
            </p>
          </div>
        </section>

        <section className="results-section" aria-labelledby="results-title">
          <div className="results-section__header">
            <div>
              <h2 id="results-title">Matching locations</h2>
              <p>Each result includes the coordinates needed for weather data.</p>
            </div>
          </div>

          {locations.length > 0 ? (
            <ul className="results-grid">
              {locations.map((location) => (
                <li key={location.id} className="result-card">
                  <article>
                    <div className="result-card__top">
                      <div>
                        <h3>{location.name}</h3>
                        <p>{formatLocationLine(location)}</p>
                      </div>
                    </div>
                    <dl className="result-card__details">
                      <div>
                        <dt>Latitude</dt>
                        <dd>{formatCoordinate(location.latitude)}</dd>
                      </div>
                      <div>
                        <dt>Longitude</dt>
                        <dd>{formatCoordinate(location.longitude)}</dd>
                      </div>
                      <div>
                        <dt>Country code</dt>
                        <dd>{location.countryCode ?? 'N/A'}</dd>
                      </div>
                      <div>
                        <dt>Timezone</dt>
                        <dd>{location.timezone ?? 'N/A'}</dd>
                      </div>
                    </dl>
                  </article>
                </li>
              ))}
            </ul>
          ) : (
            <div className="results-empty">
              <p>
                {hasSearched
                  ? 'Try another city name if you need a different match.'
                  : 'Results will appear here after the first search.'}
              </p>
            </div>
          )}
        </section>
      </main>
    </div>
  )
}

export default App
