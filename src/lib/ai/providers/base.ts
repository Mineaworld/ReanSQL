export interface AIProvider {
  /**
   * Generates an answer (or completion) from the provider.
   * @param prompt
   */
  generateAnswer(prompt: string): Promise<string>;
}