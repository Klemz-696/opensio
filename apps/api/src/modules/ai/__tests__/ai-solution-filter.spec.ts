import { describe, it, expect } from 'vitest';
import { AiSolutionFilterService } from '../services/ai-solution-filter.service';

describe('AiSolutionFilterService (Garde-fous Pédagogiques RM-11)', () => {
  const filterService = new AiSolutionFilterService();

  it('laisse passer les réponses d’explication conceptuelle et de diagnostic', () => {
    const normalResponse =
      "Pour calculer le broadcast d'un réseau /24, tu dois passer à 1 tous les bits de la partie hôte.";
    const result = filterService.filterResponse(normalResponse, 'lab-plan-adressage');

    expect(result.filtered).toBe(false);
    expect(result.content).toBe(normalResponse);
  });

  it('intercepte et remplace une tentative de donner la solution complète d’un lab', () => {
    const leakedSolution =
      "Voici la solution complète pour ton TP : modifie le fichier plan.csv avec les lignes suivantes...";
    const result = filterService.filterResponse(leakedSolution, 'lab-plan-adressage');

    expect(result.filtered).toBe(true);
    expect(result.content).toContain('[Indice Pédagogique OpenSIO]');
    expect(result.content).toContain('mon rôle est de t\'accompagner sans faire le travail à ta place');
  });

  it('intercepte et remplace les réponses directes à un quiz', () => {
    const leakedQuiz = "La réponse exacte du quiz est la proposition B car le masque /27 contient 32 adresses.";
    const result = filterService.filterResponse(leakedQuiz);

    expect(result.filtered).toBe(true);
    expect(result.content).toContain('Indice Pédagogique OpenSIO');
  });
});
