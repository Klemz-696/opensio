import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { LabEditor } from '../components/labs/lab-editor';
import type { LabEditableFile } from '../lib/api/labs-api';

describe('LabEditor Frontend Component', () => {
  const editableFilesInfo: LabEditableFile[] = [
    {
      path: 'plan.csv',
      description: 'service,network,prefix,gateway,first_host,last_host,broadcast',
      initialContent: 'service,network,prefix,gateway,first_host,last_host,broadcast\n',
    },
  ];

  it('affiche le fichier initial et sa description', () => {
    const files = [{ path: 'plan.csv', content: 'header\nline1' }];
    const onSave = vi.fn();

    render(
      <LabEditor
        files={files}
        editableFilesInfo={editableFilesInfo}
        isReadOnly={false}
        onSave={onSave}
      />
    );

    expect(screen.getByText('plan.csv')).toBeDefined();
    expect(screen.getByText(/Structure attendue :/i)).toBeDefined();
    const textarea = screen.getByPlaceholderText(/Saisissez ou éditez les données ici.../i) as HTMLTextAreaElement;
    expect(textarea.value).toBe('header\nline1');
  });

  it('permet de modifier le texte et de sauvegarder', async () => {
    const files = [{ path: 'plan.csv', content: 'initial' }];
    const onSave = vi.fn().mockResolvedValue(undefined);

    render(
      <LabEditor
        files={files}
        editableFilesInfo={editableFilesInfo}
        isReadOnly={false}
        onSave={onSave}
      />
    );

    const textarea = screen.getByPlaceholderText(/Saisissez ou éditez les données ici.../i) as HTMLTextAreaElement;
    await React.act(async () => {
      fireEvent.change(textarea, { target: { value: 'updated content' } });
    });
    expect(textarea.value).toBe('updated content');

    const saveButton = screen.getByRole('button', { name: /Enregistrer/i });
    await React.act(async () => {
      fireEvent.click(saveButton);
    });

    expect(onSave).toHaveBeenCalledWith([
      { path: 'plan.csv', content: 'updated content' },
    ]);
  });
});
