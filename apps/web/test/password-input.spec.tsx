import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PasswordInput } from '../components/ui/password-input';

describe('PasswordInput Component', () => {
  it('affiche un champ de type password par défaut', () => {
    render(<PasswordInput id="pwd" placeholder="Mon mot de passe" />);

    const input = screen.getByPlaceholderText('Mon mot de passe') as HTMLInputElement;
    expect(input.type).toBe('password');
    expect(screen.getByLabelText('Afficher le mot de passe')).toBeDefined();
  });

  it('bascule vers type="text" après avoir cliqué sur le bouton de visibilité', () => {
    render(<PasswordInput id="pwd" placeholder="Mon mot de passe" />);

    const input = screen.getByPlaceholderText('Mon mot de passe') as HTMLInputElement;
    const toggleBtn = screen.getByLabelText('Afficher le mot de passe');

    fireEvent.click(toggleBtn);
    expect(input.type).toBe('text');
    expect(screen.getByLabelText('Masquer le mot de passe')).toBeDefined();

    fireEvent.click(screen.getByLabelText('Masquer le mot de passe'));
    expect(input.type).toBe('password');
  });

  it('affiche le message d\'erreur si la prop error est fournie', () => {
    render(
      <PasswordInput
        id="pwd"
        placeholder="Mon mot de passe"
        error="Mot de passe trop court"
      />,
    );

    expect(screen.getByText('Mot de passe trop court')).toBeDefined();
  });
});
