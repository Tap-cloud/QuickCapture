import { CLAUDE_API_KEY } from '../config';

// ── Local synonym map (works without any API key) ────────────
// Bidirectional — searching any word finds all related ones

// Hierarchy rule:
//   BROAD terms list their specific children — so "food" finds ramen, pasta, etc.
//   SPECIFIC terms list only lateral peers — so "ramen" never expands up to "food"
//   (which would then drag in grilled cheese, pizza, anything tagged "food")
const SYNONYMS: Record<string, string[]> = {

  // ── FOOD: broad → lists specific dishes ──────────────────────
  food:       ['recipe', 'cooking', 'meal', 'cuisine', 'dish', 'ingredient', 'restaurant',
               'baking', 'diet', 'breakfast', 'dinner', 'lunch', 'snack',
               'ramen', 'pasta', 'pizza', 'sushi', 'burger', 'steak', 'chicken',
               'salmon', 'soup', 'salad', 'curry', 'taco', 'dessert', 'noodle', 'cheese'],
  recipe:     ['cooking', 'food', 'meal', 'cuisine', 'ingredient', 'dish', 'baking',
               'ramen', 'pasta', 'pizza', 'sushi', 'burger', 'chicken', 'salmon',
               'steak', 'curry', 'taco', 'dessert', 'salad', 'soup'],
  cooking:    ['recipe', 'food', 'meal', 'cuisine', 'kitchen', 'baking', 'grilling'],
  meal:       ['food', 'recipe', 'cooking', 'dish', 'lunch', 'dinner', 'breakfast'],
  restaurant: ['food', 'dining', 'cuisine', 'chef', 'eating'],
  baking:     ['recipe', 'cooking', 'food', 'dessert', 'cake', 'bread', 'pastry'],
  diet:       ['food', 'nutrition', 'health', 'meal', 'calories', 'eating'],

  // ── FOOD: specific dishes → only terms uniquely tied to that dish ──
  // Rule: no geographic terms (japanese, asian, italian), no broad categories (soup, food)
  // Those terms match too many unrelated things (rice bowl is also "japanese")
  ramen:   ['noodle', 'broth', 'tonkotsu', 'miso', 'shoyu', 'ramen-bowl'],
  pasta:   ['spaghetti', 'penne', 'fettuccine', 'carbonara', 'bolognese', 'noodle'],
  pizza:   ['pepperoni', 'mozzarella', 'dough', 'slice', 'pie'],
  sushi:   ['nigiri', 'sashimi', 'roll', 'raw-fish', 'wasabi', 'soy-sauce'],
  burger:  ['patty', 'bun', 'beef', 'cheeseburger', 'bbq'],
  chicken: ['poultry', 'roasted', 'breast', 'wings', 'thigh'],
  salmon:  ['fish', 'seafood', 'fillet', 'smoked'],
  steak:   ['beef', 'ribeye', 'sirloin', 'medium-rare', 'grill'],
  soup:    ['broth', 'stew', 'chowder', 'bisque'],
  salad:   ['greens', 'lettuce', 'dressing', 'tossed'],
  curry:   ['spice', 'coconut-milk', 'masala', 'tikka'],
  taco:    ['tortilla', 'salsa', 'burrito', 'quesadilla'],
  dessert: ['cake', 'chocolate', 'cookie', 'ice-cream', 'pastry', 'brownie'],
  noodle:  ['ramen', 'pasta', 'udon', 'soba', 'pho', 'lo-mein'],

  // ── FITNESS ──────────────────────────────────────────────────
  workout:  ['exercise', 'fitness', 'gym', 'training', 'health', 'sport', 'running', 'yoga'],
  exercise: ['workout', 'fitness', 'gym', 'training', 'health', 'sport'],
  fitness:  ['workout', 'exercise', 'gym', 'training', 'health', 'sport'],
  gym:      ['workout', 'exercise', 'fitness', 'training', 'weightlifting', 'weights'],
  running:  ['cardio', 'marathon', 'jogging', 'sprint', 'race'],
  sport:    ['athletic', 'competition', 'team', 'game'],
  training: ['workout', 'exercise', 'fitness', 'gym', 'sport', 'practice'],
  yoga:     ['meditation', 'stretch', 'flexibility', 'wellness', 'mindfulness'],

  // ── FINANCE ──────────────────────────────────────────────────
  money:     ['finance', 'investing', 'budget', 'savings', 'wealth', 'income'],
  investing: ['finance', 'money', 'stocks', 'trading', 'portfolio', 'wealth'],
  finance:   ['money', 'investing', 'budget', 'economics', 'wealth'],
  budget:    ['money', 'finance', 'savings', 'spending', 'expenses'],
  stocks:    ['investing', 'finance', 'trading', 'market', 'shares'],
  crypto:    ['bitcoin', 'blockchain', 'ethereum', 'defi', 'trading'],

  // ── TRAVEL ───────────────────────────────────────────────────
  travel:      ['trip', 'vacation', 'journey', 'destination', 'tourism', 'adventure'],
  trip:        ['travel', 'vacation', 'journey', 'destination', 'tourism'],
  vacation:    ['travel', 'trip', 'holiday', 'tourism', 'adventure', 'beach'],
  destination: ['travel', 'trip', 'tourism', 'location', 'place', 'country'],
  adventure:   ['travel', 'outdoors', 'explore', 'hiking', 'nature'],

  // ── TECH & CODING ────────────────────────────────────────────
  coding:      ['programming', 'development', 'software', 'tech', 'developer', 'code'],
  programming: ['coding', 'development', 'software', 'tech', 'code', 'developer'],
  technology:  ['tech', 'software', 'digital', 'coding', 'innovation', 'ai'],
  tech:        ['technology', 'software', 'digital', 'coding', 'programming', 'developer'],
  software:    ['tech', 'coding', 'programming', 'app', 'development'],
  developer:   ['coding', 'programming', 'tech', 'software', 'engineer'],
  design:      ['art', 'creative', 'ui', 'ux', 'graphic', 'visual', 'branding'],

  // ── HEALTH ───────────────────────────────────────────────────
  health:    ['fitness', 'wellness', 'medical', 'diet', 'exercise', 'nutrition'],
  wellness:  ['health', 'fitness', 'mental', 'meditation', 'nutrition', 'selfcare'],
  medical:   ['health', 'doctor', 'medicine', 'treatment', 'disease'],
  nutrition: ['diet', 'health', 'eating', 'vitamins', 'meal', 'food'],

  // ── MEDIA ────────────────────────────────────────────────────
  video:   ['youtube', 'film', 'watch', 'movie', 'clip', 'reel', 'streaming', 'vimeo'],
  youtube: ['video', 'watch', 'streaming', 'channel', 'clip'],
  movie:   ['film', 'cinema', 'watch', 'streaming', 'show'],
  film:    ['movie', 'cinema', 'watch', 'documentary', 'streaming'],
  podcast: ['episode', 'interview', 'host', 'transcript', 'show'],
  music:   ['song', 'artist', 'album', 'playlist', 'spotify', 'lyrics', 'genre', 'musician'],

  // ── READING ──────────────────────────────────────────────────
  article:  ['news', 'blog', 'post', 'reading', 'journalism', 'essay'],
  news:     ['article', 'journalism', 'current', 'media', 'headlines'],
  blog:     ['article', 'post', 'reading', 'writing', 'content'],
  book:     ['reading', 'literature', 'novel', 'nonfiction', 'fiction', 'author'],
  reading:  ['book', 'article', 'blog', 'literature'],

  // ── BUSINESS ─────────────────────────────────────────────────
  business:     ['startup', 'entrepreneur', 'company', 'career', 'work', 'professional'],
  startup:      ['business', 'entrepreneur', 'company', 'product', 'venture'],
  entrepreneur: ['startup', 'business', 'founder', 'company'],
  career:       ['work', 'job', 'professional', 'skill', 'resume'],

  // ── LEARNING ─────────────────────────────────────────────────
  tutorial:  ['guide', 'howto', 'learn', 'course', 'education', 'lesson'],
  learning:  ['tutorial', 'education', 'course', 'study', 'skill'],
  education: ['learning', 'tutorial', 'course', 'study', 'school'],
  course:    ['learning', 'tutorial', 'education', 'lesson', 'skill'],

  // ── ART ──────────────────────────────────────────────────────
  art:         ['design', 'creative', 'visual', 'illustration', 'drawing', 'painting'],
  creative:    ['art', 'design', 'illustration', 'photography', 'visual'],
  photography: ['photo', 'camera', 'art', 'visual', 'portrait', 'landscape'],

  // ── HOME ─────────────────────────────────────────────────────
  home:   ['house', 'interior', 'decor', 'furniture', 'diy', 'renovation'],
  diy:    ['craft', 'tutorial', 'project', 'build', 'home', 'make'],
  garden: ['plants', 'outdoor', 'nature', 'flower', 'grow'],
};

function expandWithSynonyms(query: string): string[] {
  const q = query.toLowerCase().trim();
  const terms = new Set<string>([q]);
  if (SYNONYMS[q]) {
    for (const t of SYNONYMS[q]) terms.add(t);
  }
  return [...terms];
}

// ── Relevance scoring ─────────────────────────────────────────
// Priority: description → title → tags → everything else
// Exact query match scores higher than synonym match at each level.
// Free-text checks use whole-word matching so "track" doesn't hit "tracking".

function wholeWord(text: string, word: string): boolean {
  try { return new RegExp(`\\b${word}\\b`).test(text); } catch { return false; }
}

// Minimum score a capture must reach to appear in results.
// A single incidental mention in the raw description won't clear this bar.
export const SCORE_THRESHOLD = 7;

// Priority order (what the user wrote beats everything):
//   1. content  — the note the user typed when saving
//   2. title    — the video/file title
//   3. tags     — auto-generated topic labels
//   4. summary  — AI-generated summary
//   5. description — raw video/page description (noisy; barely counts)
export function scoreCapture(
  c: { tags: string[]; title?: string | null; content: string; summary?: string | null; description?: string | null; category?: string | null; site_name?: string | null },
  query: string,
): number {
  const q = query.toLowerCase().trim();
  if (!q) return 0;

  const synonyms = SYNONYMS[q] ?? [];
  const note     = (c.content ?? '').toLowerCase();
  const title    = (c.title ?? '').toLowerCase();
  const tags     = c.tags.map(t => t.toLowerCase());
  const summary  = (c.summary ?? '').toLowerCase();
  const desc     = (c.description ?? '').toLowerCase();

  let score = 0;

  // Exact query hits — user note first, then title, then tags, then AI summary, then raw desc
  if (wholeWord(note, q))                                              score += 14;
  if (wholeWord(title, q))                                             score += 10;
  if (tags.some(t => t === q || t.includes(q)))                        score += 8;
  if (wholeWord(summary, q))                                           score += 5;
  if (wholeWord(desc, q))                                              score += 2; // barely counts

  // Synonym hits — same order, lower weights
  if (synonyms.some(s => wholeWord(note, s)))                          score += 9;
  if (synonyms.some(s => wholeWord(title, s)))                         score += 6;
  if (tags.some(t => synonyms.some(s => t === s || t.includes(s))))   score += 5;
  if (synonyms.some(s => wholeWord(summary, s)))                       score += 3;
  if (synonyms.some(s => wholeWord(desc, s)))                          score += 1; // barely counts

  return score;
}

// ── Valid collection tags (whitelist) ───────────────────────
// Only these tags appear as Smart Collections / sidebar — prevents
// random title words like "once", "again", "your" from showing up.
export const COLLECTION_TAGS = new Set([
  // Food
  'food', 'recipe', 'cooking', 'meal', 'restaurant', 'baking', 'diet',
  // Fitness
  'workout', 'exercise', 'fitness', 'gym', 'running', 'sport', 'training', 'yoga',
  // Finance
  'money', 'investing', 'finance', 'budget', 'stocks', 'crypto',
  // Travel
  'travel', 'trip', 'vacation', 'destination', 'adventure',
  // Tech
  'coding', 'programming', 'technology', 'tech', 'software', 'developer',
  // Design
  'design', 'art', 'creative', 'photography',
  // Health
  'health', 'wellness', 'medical', 'nutrition',
  // Media
  'video', 'youtube', 'movie', 'film', 'podcast', 'music',
  // Reading
  'article', 'news', 'blog', 'book', 'reading',
  // Business
  'business', 'startup', 'entrepreneur', 'career',
  // Learning
  'tutorial', 'learning', 'education', 'course',
  // Home
  'home', 'diy', 'garden',
  // Platforms
  'instagram', 'twitter', 'reddit', 'spotify', 'github', 'vimeo', 'pdf',
]);

// ── Search query expansion ───────────────────────────────────

const searchCache = new Map<string, string[]>();

export async function expandSearchQuery(query: string): Promise<string[]> {
  const q = query.toLowerCase().trim();
  if (!q) return [];
  if (searchCache.has(q)) return searchCache.get(q)!;

  // Always expand with local synonyms first (instant, no API needed)
  const localTerms = expandWithSynonyms(q);

  if (!CLAUDE_API_KEY.trim()) {
    searchCache.set(q, localTerms);
    return localTerms;
  }

  // Enhance with Claude if key is available
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
        max_tokens: 150,
        messages: [{
          role: 'user',
          content: `Return a JSON array of 6-10 lowercase tags semantically related to "${q}" for a personal notes app. Include synonyms, close concepts, and variations. Do NOT include words that just share letters but mean something different (e.g. "work" ≠ "workout"). Return ONLY a JSON array, no explanation.`,
        }],
      }),
    });

    if (response.ok) {
      const data = await response.json();
      const text: string = data?.content?.[0]?.text ?? '';
      const match = text.match(/\[[\s\S]*?\]/);
      if (match) {
        const parsed: unknown = JSON.parse(match[0]);
        if (Array.isArray(parsed)) {
          const claudeTerms = (parsed as unknown[])
            .filter((t): t is string => typeof t === 'string')
            .map(t => t.toLowerCase().trim());
          const allTerms = [...new Set([...localTerms, ...claudeTerms])];
          searchCache.set(q, allTerms);
          return allTerms;
        }
      }
    }
  } catch {
    // fall back to local expansion
  }

  searchCache.set(q, localTerms);
  return localTerms;
}

// ── Tag generation ───────────────────────────────────────────

const STOP_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has',
  'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may',
  'might', 'this', 'that', 'these', 'those', 'it', 'its', 'with', 'from',
  'by', 'as', 'into', 'i', 'you', 'he', 'she', 'we', 'they', 'my', 'your',
  'his', 'her', 'our', 'their', 'what', 'which', 'who', 'can', 'not', 'so',
  'if', 'then', 'than', 'when', 'where', 'how', 'about', 'up', 'out',
  'just', 'also', 'like', 'very', 'get', 'got', 'go', 'here', 'there',
  'http', 'https', 'www', 'com', 'watch', 'click', 'read', 'more', 'view',
  'via', 'amp', 'utm', 'source', 'ref',
]);

// Category keyword detectors — if any of these words appear in the content,
// we add the corresponding category tags automatically
const FOOD_WORDS = new Set([
  'recipe', 'cook', 'cooking', 'bake', 'baking', 'grill', 'grilling', 'roast', 'roasted',
  'ingredient', 'dinner', 'lunch', 'breakfast', 'meal', 'dish', 'cuisine', 'delicious',
  'cheese', 'chicken', 'pasta', 'pizza', 'ramen', 'burger', 'sandwich', 'steak',
  'salmon', 'soup', 'salad', 'noodle', 'sauce', 'dessert', 'snack', 'sushi', 'taco', 'curry',
]);
const FITNESS_WORDS = new Set([
  'workout', 'exercise', 'fitness', 'training', 'cardio', 'muscle', 'squat',
  'deadlift', 'yoga', 'running', 'marathon', 'weights', 'strength', 'reps',
]);
const FINANCE_WORDS = new Set([
  'stock', 'invest', 'investing', 'crypto', 'bitcoin', 'trading', 'finance',
  'budget', 'savings', 'wealth', 'portfolio', 'dividend', 'market', 'income',
]);
const TECH_WORDS = new Set([
  'coding', 'programming', 'javascript', 'python', 'react', 'algorithm',
  'database', 'backend', 'frontend', 'typescript', 'github', 'developer',
]);

function keywordTagger(content: string, url?: string): string[] {
  const tags = new Set<string>();

  // Detect source platform from URL
  if (url) {
    const u = url.toLowerCase();
    if (/youtube\.com|youtu\.be/.test(u))  { tags.add('video'); tags.add('youtube'); }
    if (/instagram\.com/.test(u))            tags.add('instagram');
    if (/twitter\.com|x\.com/.test(u))       tags.add('twitter');
    if (/reddit\.com/.test(u))               tags.add('reddit');
    if (/\.pdf$/.test(u))                    tags.add('pdf');
    if (/vimeo\.com/.test(u))               { tags.add('video'); tags.add('vimeo'); }
    if (/spotify\.com/.test(u))              tags.add('music');
    if (/github\.com/.test(u))               tags.add('coding');
  }

  // Extract keywords — strip raw URLs from text first
  const words = content
    .replace(/https?:\/\/\S+/g, ' ')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 3 && !STOP_WORDS.has(w));

  // Auto-add category tags based on detected content type
  if (words.some(w => FOOD_WORDS.has(w))) {
    tags.add('recipe');
    tags.add('food');
  }
  if (words.some(w => FITNESS_WORDS.has(w))) {
    tags.add('workout');
    tags.add('fitness');
  }
  if (words.some(w => FINANCE_WORDS.has(w))) {
    tags.add('investing');
    tags.add('finance');
  }
  if (words.some(w => TECH_WORDS.has(w))) {
    tags.add('coding');
    tags.add('tech');
  }

  // Add top frequency keywords too
  const freq = new Map<string, number>();
  for (const w of words) freq.set(w, (freq.get(w) ?? 0) + 1);

  [...freq.entries()]
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .forEach(([word]) => tags.add(word));

  return [...tags].slice(0, 8);
}

export async function generateTags(content: string, url?: string): Promise<string[]> {
  if (!CLAUDE_API_KEY.trim()) {
    return keywordTagger(content, url);
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
        max_tokens: 200,
        messages: [{
          role: 'user',
          content: `You are a content organizer. Generate 4-8 category tags for this saved content.

Rules:
- Always include the content type (recipe, video, article, tutorial, photo, link, pdf)
- Include topic categories like cuisine, food type, activity, subject, place
- Not too broad (not just "food") but not too specific (not "tonkatsu-ramen-with-chashu")
- All lowercase, single words preferred
- Think about what words someone would search to find this later

Examples:
- Instagram ramen post → ["ramen", "japanese", "recipe", "noodles", "food", "video"]
- YouTube workout → ["workout", "fitness", "video", "exercise", "health"]
- Tesla news article → ["tesla", "electric-cars", "technology", "news"]

Content:
${content.slice(0, 800)}

Return ONLY a JSON array, no explanation.`,
        }],
      }),
    });

    if (!response.ok) return keywordTagger(content, url);

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

  return keywordTagger(content, url);
}
