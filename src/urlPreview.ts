export interface URLMeta {
  title: string;
  description: string;
  thumbnail: string;
  siteName: string;
}

export function isUrl(text: string): boolean {
  return /^https?:\/\/\S+/.test(text.trim());
}

export async function fetchURLMeta(url: string): Promise<URLMeta> {
  // Try noembed first — works great for YouTube, Vimeo, Twitter, etc.
  // Normalize YouTube Shorts URL → regular watch URL so noembed resolves it correctly
  let embedUrl = url;
  const shortsMatch = url.match(/youtube\.com\/shorts\/([^?&#/]+)/);
  if (shortsMatch) {
    embedUrl = `https://www.youtube.com/watch?v=${shortsMatch[1]}`;
  }

  try {
    const res = await fetch(`https://noembed.com/embed?url=${encodeURIComponent(embedUrl)}`);
    if (res.ok) {
      const data = await res.json() as Record<string, string>;
      if (data.title && !data.error) {
        return {
          title: data.title ?? '',
          description: data.author_name ? `by ${data.author_name}` : '',
          thumbnail: data.thumbnail_url ?? '',
          siteName: data.provider_name ?? '',
        };
      }
    }
  } catch {}

  // Fall back to parsing og: meta tags from the page (mobile only — CORS blocks this on web)
  if (typeof window !== 'undefined' && window.location?.protocol?.startsWith('http')) {
    return { title: '', description: '', thumbnail: '', siteName: '' };
  }
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'facebookexternalhit/1.1' },
    });
    const html = await res.text();

    const get = (prop: string) =>
      html.match(new RegExp(`<meta[^>]+property=["']${prop}["'][^>]+content=["']([^"']+)["']`, 'i'))?.[1] ??
      html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${prop}["']`, 'i'))?.[1] ??
      '';

    const title = get('og:title') || html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1] || '';
    const description = get('og:description');
    const thumbnail = get('og:image');

    const siteNameMeta =
      html.match(/<meta[^>]+property=["']og:site_name["'][^>]+content=["']([^"']+)["']/i)?.[1] ??
      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:site_name["']/i)?.[1] ?? '';

    return { title, description, thumbnail, siteName: siteNameMeta };
  } catch {}

  return { title: '', description: '', thumbnail: '', siteName: '' };
}
