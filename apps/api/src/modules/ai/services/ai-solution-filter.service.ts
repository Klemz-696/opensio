import { Injectable, Logger } from '@nestjs/common';

export interface CircumventionCheckResult {
  isCircumvention: boolean;
  matchedLabSlug?: string;
  matchedLabTitle?: string;
  reason?: string;
}

@Injectable()
export class AiSolutionFilterService {
  private readonly logger = new Logger(AiSolutionFilterService.name);

  private readonly explicitSolutionPatterns: RegExp[] = [
    /voici (la|les) solutions? compl[èe]tes?/i,
    /voici le fichier .* compl[eè]t[e]? à (copier|coller)/i,
    /la r[eé]ponse exacte (au|du) quiz est/i,
    /les r[eé]ponses correctes sont\s*:\s*[A-D0-9,\s]+/i,
    /solution cl[eé] en main/i,
  ];

  private readonly circumventionRequestPatterns: RegExp[] = [
    /(donne|donnez|fournis|partage|copie|envoie)[-\s]moi (la|les)?\s*solutions?(\s*compl[eè]tes?)?/i,
    /(donne|donnez|fournis|partage)[-\s]moi (le|les)?\s*(fichiers?|réponses?|lignes?)\s*(de\s*config|de\s*configuration|du\s*lab|du\s*tp|du\s*quiz)/i,
    /solution\s*(compl[eè]te|directe|clé\s*en\s*main)\s*(du|pour\s*le|pour\s*l'atelier|du\s*lab|du\s*tp)/i,
    /résous\s*(tout\s*le|le|l'atelier|le\s*lab|le\s*tp|le\s*quiz)/i,
  ];

  /**
   * Détecte si un prompt utilisateur dans une conversation tente de contourner
   * les garde-fous en demandant la solution brute d'un atelier ou d'un quiz.
   */
  detectCircumvention(
    userPrompt: string,
    knownLabs: Array<{ slug: string; title: string }> = []
  ): CircumventionCheckResult {
    const lowerPrompt = userPrompt.toLowerCase();

    // 1. Vérifier si le prompt contient une formule de demande de solution directe
    let matchesPattern = false;
    for (const pattern of this.circumventionRequestPatterns) {
      if (pattern.test(lowerPrompt)) {
        matchesPattern = true;
        break;
      }
    }

    if (!matchesPattern) {
      return { isCircumvention: false };
    }

    // 2. Vérifier si un lab du catalogue est expressément ciblé
    for (const lab of knownLabs) {
      const lowerSlug = lab.slug.toLowerCase();
      const lowerTitle = lab.title.toLowerCase();

      if (lowerPrompt.includes(lowerSlug) || lowerPrompt.includes(lowerTitle)) {
        this.logger.warn(
          `[AiSolutionFilter] Tentative de contournement détectée pour le lab ${lab.slug} via discussion générale.`
        );
        return {
          isCircumvention: true,
          matchedLabSlug: lab.slug,
          matchedLabTitle: lab.title,
          reason: `Demande directe de la solution du lab '${lab.title}' (${lab.slug})`,
        };
      }
    }

    // Si la demande est générique mais cible les labs/quiz de manière insistante
    if (lowerPrompt.includes('lab') || lowerPrompt.includes('tp') || lowerPrompt.includes('quiz') || lowerPrompt.includes('atelier')) {
      this.logger.warn(`[AiSolutionFilter] Tentative de contournement générique détectée.`);
      return {
        isCircumvention: true,
        reason: 'Demande directe de solution de lab / quiz',
      };
    }

    return { isCircumvention: false };
  }

  /**
   * Analyse la réponse générée par l'IA et filtre toute divulgation de solution brute (RM-11).
   */
  filterResponse(
    rawContent: string,
    context?: { isEvaluated?: boolean; labSlug?: string; isCircumvention?: boolean }
  ): { content: string; filtered: boolean } {
    // Si c'est une tentative avérée de contournement ou si le filtre textuel matche
    const matchesPattern = this.explicitSolutionPatterns.some((pattern) => pattern.test(rawContent));

    if (matchesPattern || context?.isCircumvention) {
      this.logger.warn(
        `[AiSolutionFilter] Interception de solution (Lab: ${context?.labSlug || 'général'}, Évalué: ${Boolean(context?.isEvaluated)})`
      );

      return {
        content: this.getRefusalMessage(context?.labSlug),
        filtered: true,
      };
    }

    return {
      content: rawContent,
      filtered: false,
    };
  }

  /**
   * Message de refus pédagogique constructif respectant la charte OpenSIO (§28 / RM-11).
   */
  getRefusalMessage(labSlug?: string): string {
    return [
      "💡 **[Indice Pédagogique Mentor OpenSIO]**",
      "",
      "En tant que tuteur Mentor, mon rôle est de t'accompagner dans ton apprentissage sans faire l'exercice à ta place. Je ne peux pas te fournir la solution brute, le code complet ou les fichiers de configuration prêts à l'emploi.",
      "",
      "**Pistes pour avancer de manière autonome :**",
      "1. Relis l'énoncé, les objectifs et les critères d'évaluation de l'atelier.",
      "2. Utilise le terminal interactif pour diagnostiquer l'environnement (`ip a`, `cat ...`, `systemctl status ...`).",
      "3. Si tu es bloqué(e), débloque un indice officiel dans la section « Indices » du lab.",
      labSlug ? `4. Revois la documentation et les fiches méthodologiques associées à cet atelier.` : '',
    ]
      .filter(Boolean)
      .join('\n');
  }
}
