import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import App from '../App'

describe('smoke', () => {
  it('renders layout', () => {
    render(<App />)
    expect(screen.getByRole('combobox')).toBeDefined()
  })
})
