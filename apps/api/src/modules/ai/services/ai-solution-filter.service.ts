import { Injectable, Logger } from '@nestjs/common';

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

  /**
   * Analyse la réponse générée par l'IA et filtre toute divulgation de solution brute (RM-11).
   */
  filterResponse(rawContent: string, labSlug?: string): { content: string; filtered: boolean } {
    for (const pattern of this.explicitSolutionPatterns) {
      if (pattern.test(rawContent)) {
        this.logger.warn(
          `[AiSolutionFilter] Détection d'un motif de solution complète dans la réponse pour le lab ${labSlug || 'inconnu'}`
        );

        return {
          content: [
            "💡 **[Indice Pédagogique OpenSIO]**",
            "",
            "En tant que tuteur Mentor, mon rôle est de t'accompagner sans faire le travail à ta place. Je ne peux pas te fournir la solution brute ou le fichier clé en main.",
            "",
            "**Pistes pour débloquer la situation :**",
            "1. Relis attentivement les consignes et les critères d'évaluation de l'atelier.",
            "2. Utilise le terminal du lab pour inspecter l'état actuel (`ip a`, `cat ...`, `systemctl status ...`).",
            "3. Si tu es vraiment bloqué(e), n'hésite pas à débloquer un indice dans l'atelier (section « Indices »).",
          ].join('\n'),
          filtered: true,
        };
      }
    }

    return {
      content: rawContent,
      filtered: false,
    };
  }
}
