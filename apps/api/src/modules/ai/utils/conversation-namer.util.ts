/**
 * Générateur de titre automatique à partir du premier message utilisateur.
 * Troncature propre sans appel LLM.
 */
export function generateAutoConversationTitle(messageContent: string, maxLength = 50): string {
  if (!messageContent || !messageContent.trim()) {
    return 'Nouvelle discussion';
  }

  // 1. Nettoyer les sauts de ligne et le formatage Markdown basique
  const cleaned = messageContent
    .replace(/[#*`_~[\]()]/g, '')
    .trim()
    .replace(/\s+/g, ' ');

  // 2. Extraire la première phrase si applicable
  const firstSentenceMatch = cleaned.match(/^([^.!?\n]+[.!?]?)/);
  const sentence = (firstSentenceMatch ? firstSentenceMatch[1] : cleaned).trim();

  if (sentence.length <= maxLength) {
    return sentence;
  }

  // 3. Troncature propre sans couper un mot
  const sub = sentence.substring(0, maxLength);
  const lastSpaceIndex = sub.lastIndexOf(' ');

  if (lastSpaceIndex > maxLength * 0.6) {
    return `${sub.substring(0, lastSpaceIndex).trim()}...`;
  }

  return `${sub.trim()}...`;
}
