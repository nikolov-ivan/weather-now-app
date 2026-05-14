type SearchBoxProps = {
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  isLoading: boolean
}

export function SearchBox({
  value,
  onChange,
  onSubmit,
  isLoading,
}: SearchBoxProps) {
  const canSubmit = value.trim().length >= 2 && !isLoading

  return (
    <form
      className="search-form"
      onSubmit={(event) => {
        event.preventDefault()
        onSubmit()
      }}
    >
      <label className="search-form__label" htmlFor="city-search">
        Search city
      </label>
      <div className="search-form__controls">
        <input
          id="city-search"
          className="search-form__input"
          type="search"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Varna"
          autoComplete="off"
          spellCheck={false}
        />
        <button
          className="search-form__button"
          type="submit"
          disabled={!canSubmit}
        >
          {isLoading ? 'Searching...' : 'Search'}
        </button>
      </div>
      <p className="search-form__hint">Use at least 2 characters.</p>
    </form>
  )
}
