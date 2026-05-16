export type WeatherSceneAnimationKind =
  | 'sunny'
  | 'cloudy'
  | 'fog'
  | 'rain'
  | 'snow'
  | 'storm'
  | 'wind'

type WeatherSceneAnimationProps = {
  kind: WeatherSceneAnimationKind
  label: string
}

export function WeatherSceneAnimation({
  kind,
  label,
}: WeatherSceneAnimationProps) {
  return (
    <div
      className={`weather-scene-animation weather-scene-animation--${kind}`}
      role="img"
      aria-label={`${label} weather animation`}
    >
      <span className="weather-scene__glow" aria-hidden="true" />
      <span className="weather-scene__horizon" aria-hidden="true" />

      <div className="weather-scene__sun-wrap" aria-hidden="true">
        <span className="weather-scene__sun-rays" />
        <span className="weather-scene__sun" />
      </div>

      <span
        className="weather-scene__cloud weather-scene__cloud--one"
        aria-hidden="true"
      />
      <span
        className="weather-scene__cloud weather-scene__cloud--two"
        aria-hidden="true"
      />
      <span
        className="weather-scene__cloud weather-scene__cloud--three"
        aria-hidden="true"
      />
      <span
        className="weather-scene__cloud weather-scene__cloud--four"
        aria-hidden="true"
      />

      <span
        className="weather-scene__rain weather-scene__rain--one"
        aria-hidden="true"
      />
      <span
        className="weather-scene__rain weather-scene__rain--two"
        aria-hidden="true"
      />
      <span
        className="weather-scene__rain weather-scene__rain--three"
        aria-hidden="true"
      />
      <span
        className="weather-scene__rain weather-scene__rain--four"
        aria-hidden="true"
      />

      <span
        className="weather-scene__snow weather-scene__snow--one"
        aria-hidden="true"
      />
      <span
        className="weather-scene__snow weather-scene__snow--two"
        aria-hidden="true"
      />
      <span
        className="weather-scene__snow weather-scene__snow--three"
        aria-hidden="true"
      />
      <span
        className="weather-scene__snow weather-scene__snow--four"
        aria-hidden="true"
      />

      <span
        className="weather-scene__fog weather-scene__fog--one"
        aria-hidden="true"
      />
      <span
        className="weather-scene__fog weather-scene__fog--two"
        aria-hidden="true"
      />
      <span
        className="weather-scene__fog weather-scene__fog--three"
        aria-hidden="true"
      />
      <span
        className="weather-scene__fog weather-scene__fog--four"
        aria-hidden="true"
      />

      <span
        className="weather-scene__wind weather-scene__wind--one"
        aria-hidden="true"
      />
      <span
        className="weather-scene__wind weather-scene__wind--two"
        aria-hidden="true"
      />
      <span
        className="weather-scene__wind weather-scene__wind--three"
        aria-hidden="true"
      />
      <span
        className="weather-scene__wind weather-scene__wind--four"
        aria-hidden="true"
      />

      <span className="weather-scene__lightning" aria-hidden="true" />
      <span className="weather-scene__flash" aria-hidden="true" />
    </div>
  )
}
