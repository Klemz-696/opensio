import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import HomePage from '../app/page';

describe('HomePage (Lot 0 baseline)', () => {
  it('renders OpenSIO heading and Lot 0 badge', () => {
    render(<HomePage />);
    expect(screen.getByRole('heading', { name: 'OpenSIO', level: 1 })).toBeDefined();
    expect(screen.getByText(/Lot 0 — Socle Monorepo/i)).toBeDefined();
  });
});
