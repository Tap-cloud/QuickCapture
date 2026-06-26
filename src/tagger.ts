import { CLAUDE_API_KEY } from '../config';

const STOP_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has',
  'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may',
  'might', 'this', 'that', 'these', 'those', 'it', 'its', 'with', 'from',
  'by', 'as', 'into', 'i', 'you', 'he', 'she', 'we', 'they', 'my', 'your',
  'his', 'her', 'our', 'their', 'what', 'which', 'who', 'can', 'not', 'so',
  'if', 'then', 'than', 'when', 'where', 'how', 'about', 'up', 'out',
  'just', 'also', 'like', 'very', 'get', 'got', 'go', 'here', 'there',
  'http', 'https', 'www', 'com',
]);

function keywordTagger(content: string): string[] {
  const words = content
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 3 && !STOP_WORDS.has(w));

  const freq = new Map<string, number>();
  for (const word of words) {
    freq.set(word, (freq.get(word) ?? 0) + 1);
  }

  return [...freq.entries()]
    .sort(([, a], [, b]) => b - a)
    .slice(0, 6)
    .map(([word]) => word);
}

export async function generateTags(content: string): Promise<string[]> {
  if (!CLAUDE_API_KEY.trim()) {
    return keywordTagger(content);
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5',
        max_tokens: 128,
        messages: [
          {
            role: 'user',
            content: `Generate 4-8 descriptive tags for this saved note. Return ONLY a JSON array of lowercase strings, nothing else.\n\nNote:\n${content.slice(0, 800)}\n\nJSON array:`,
          },
        ],
      }),
    });

    if (!response.ok) return keywordTagger(content);

    const data = await response.json();
    const text: string = data?.content?.[0]?.text ?? '';
    const match = text.match(/\[[\s\S]*?\]/);
    if (match) {
      const parsed: unknown = JSON.parse(match[0]);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return (parsed as unknown[])
          .filter((t): t is string => typeof t === 'string')
          .map(t => t.toLowerCase().trim())
          .slice(0, 8);
      }
    }
  } catch {
    // fall back silently
  }

  return keywordTagger(content);
}
