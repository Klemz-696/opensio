import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import React from 'react';
import { LessonCompleteButton } from '../components/lessons/lesson-complete-button';
import * as progressApi from '../lib/api/progress-api';

describe('LessonCompleteButton', () => {
  it('affiche le bouton "Marquer comme terminée" si non terminée', () => {
    render(
      <LessonCompleteButton
        lessonSlug="adressage-ipv4"
        isInitiallyCompleted={false}
        token="test-token"
      />,
    );

    expect(screen.getByText('Marquer comme terminée')).toBeDefined();
  });

  it('affiche "Leçon validée" et la date si déjà terminée', () => {
    render(
      <LessonCompleteButton
        lessonSlug="adressage-ipv4"
        isInitiallyCompleted={true}
        completedAt="2026-08-24T12:00:00Z"
        token="test-token"
      />,
    );

    expect(screen.getByText('Leçon validée')).toBeDefined();
    expect(screen.getByText(/Terminée le/)).toBeDefined();
  });

  it('appelle l\'API completeLesson au clic et bascule à l\'état validé', async () => {
    const completeSpy = vi.spyOn(progressApi, 'completeLesson').mockResolvedValue({
      lessonId: 'l-1',
      lessonSlug: 'adressage-ipv4',
      status: 'completed',
      timeSpentSeconds: 60,
      completedAt: '2026-08-24T12:00:00Z',
      updatedAt: '2026-08-24T12:00:00Z',
    });

    const onStatusChange = vi.fn();

    render(
      <LessonCompleteButton
        lessonSlug="adressage-ipv4"
        isInitiallyCompleted={false}
        token="test-token"
        onStatusChange={onStatusChange}
      />,
    );

    const button = screen.getByText('Marquer comme terminée');
    fireEvent.click(button);

    await waitFor(() => {
      expect(completeSpy).toHaveBeenCalledWith('adressage-ipv4', undefined, 'test-token');
      expect(screen.getByText('Leçon validée')).toBeDefined();
      expect(onStatusChange).toHaveBeenCalledWith(true);
    });
  });
});
