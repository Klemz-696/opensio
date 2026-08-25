import { describe, it, expect } from 'vitest';
import { AiSolutionFilterService } from '../services/ai-solution-filter.service';

describe('AiSolutionFilterService (Garde-fous Pédagogiques RM-11 & Détection de Contournement)', () => {
  const filterService = new AiSolutionFilterService();

  const mockLabs = [
    { slug: 'plan-adressage-pme', title: "Plan d'adressage d'une PME" },
    { slug: 'configuration-dns-bind9', title: 'Configuration DNS Bind9' },
  ];

  it('laisse passer les réponses d’explication conceptuelle et de diagnostic', () => {
    const normalResponse =
      "Pour calculer le broadcast d'un réseau /24, tu dois passer à 1 tous les bits de la partie hôte.";
    const result = filterService.filterResponse(normalResponse, { labSlug: 'plan-adressage-pme' });

    expect(result.filtered).toBe(false);
    expect(result.content).toBe(normalResponse);
  });

  it('intercepte et remplace une tentative de donner la solution complète d’un lab', () => {
    const leakedSolution =
      "Voici la solution complète pour ton TP : modifie le fichier plan.csv avec les lignes suivantes...";
    const result = filterService.filterResponse(leakedSolution, { labSlug: 'plan-adressage-pme' });

    expect(result.filtered).toBe(true);
    expect(result.content).toContain('[Indice Pédagogique Mentor OpenSIO]');
    expect(result.content).toContain('mon rôle est de t\'accompagner dans ton apprentissage sans faire l\'exercice à ta place');
  });

  it('détecte une tentative de contournement ciblant un lab existant dans une discussion générale', () => {
    const prompt = "Donne-moi la solution complète du lab plan-adressage-pme s'il te plaît";
    const check = filterService.detectCircumvention(prompt, mockLabs);

    expect(check.isCircumvention).toBe(true);
    expect(check.matchedLabSlug).toBe('plan-adressage-pme');
  });

  it('détecte une demande générique de fichier de configuration complet', () => {
    const prompt = "Donne-moi le fichier de configuration complet pour le lab";
    const check = filterService.detectCircumvention(prompt, mockLabs);

    expect(check.isCircumvention).toBe(true);
  });

  it('ne déclenche pas de faux positif sur une question théorique légitime', () => {
    const prompt = "Comment fonctionne la directive forwarders dans named.conf sous Bind9 ?";
    const check = filterService.detectCircumvention(prompt, mockLabs);

    expect(check.isCircumvention).toBe(false);
  });
});
