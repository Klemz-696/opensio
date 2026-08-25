import { describe, it, expect } from 'vitest';
import { generateAutoConversationTitle } from '../utils/conversation-namer.util';

describe('generateAutoConversationTitle', () => {
  it('génère un titre par défaut si le message est vide ou composé d’espaces', () => {
    expect(generateAutoConversationTitle('')).toBe('Nouvelle discussion');
    expect(generateAutoConversationTitle('   \n\t  ')).toBe('Nouvelle discussion');
  });

  it('nettoie le formatage Markdown et conserve les phrases courtes', () => {
    const title = generateAutoConversationTitle('## Comment configurer *VLAN 10* sur Cisco ?');
    expect(title).toBe('Comment configurer VLAN 10 sur Cisco ?');
  });

  it('extrait la première phrase lorsque le message est multi-phrases', () => {
    const title = generateAutoConversationTitle(
      'Explique-moi le protocole OSPF. Ensuite nous parlerons de BGP et des routes statiques.'
    );
    expect(title).toBe('Explique-moi le protocole OSPF.');
  });

  it('tronque proprement au mot près si la première phrase dépasse la longueur maximale', () => {
    const longMessage =
      'Quels sont les avantages et les inconvénients d’une topologie réseau en étoile par rapport à un maillage global en entreprise ?';
    const title = generateAutoConversationTitle(longMessage, 45);
    expect(title.length).toBeLessThanOrEqual(48);
    expect(title.endsWith('...')).toBe(true);
    expect(title).not.toContain('étoilep'); // Vérifie pas de coupe au milieu d'un mot
  });
});
