import { useState } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { SearchBox } from './SearchBox'

describe('SearchBox', () => {
  it('submits the current city query', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()

    function SearchBoxHarness() {
      const [value, setValue] = useState('')

      return (
        <SearchBox
          value={value}
          onChange={setValue}
          onSubmit={onSubmit}
          isLoading={false}
        />
      )
    }

    render(<SearchBoxHarness />)

    const input = screen.getByLabelText(/search city/i)

    await user.type(input, 'Varna')

    expect(input).toHaveValue('Varna')

    await user.click(screen.getByRole('button', { name: 'Search' }))

    expect(onSubmit).toHaveBeenCalledTimes(1)
  })

  it('shows the loading state and disables submit while searching', () => {
    render(
      <SearchBox
        value="Varna"
        onChange={vi.fn()}
        onSubmit={vi.fn()}
        isLoading
      />,
    )

    expect(
      screen.getByRole('button', { name: 'Searching...' }),
    ).toBeDisabled()
  })
})
