export function normalizePhrase(input: string): string {
  // Compare guesses in a forgiving way:
  // - lowercase
  // - trim
  // - collapse whitespace
  // - remove punctuation (keep letters/numbers/spaces)
  return input
    .toLowerCase()
    .trim()
    .replace(/[’']/g, "'")
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ");
}

export function maskPhrase(phrase: string): string {
  // show spaces and punctuation, hide letters/numbers
  return phrase.replace(/[A-Za-z0-9]/g, "■");
}


