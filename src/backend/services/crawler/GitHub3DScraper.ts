import { IModel3D } from '../../domain/models';

export class GitHub3DScraper {
  readonly platform = 'github';

  async scrapeTrending(keyword?: string, limit: number = 50): Promise<IModel3D[]> {
    const scrapedAt = new Date().toISOString();

    const queries: string[] = [];
    if (keyword && keyword.trim().length > 0) {
      queries.push(`${keyword.trim()} 3d print stl`);
      queries.push(`${keyword.trim()} cad model`);
    } else {
      queries.push('3d print stl model');
      queries.push('topic:3d-printing');
      queries.push('voron stl 3d-print');
      queries.push('gridfinity stl');
    }

    const perQueryLimit = Math.max(15, Math.ceil(limit / queries.length));
    const allRepos: any[] = [];
    const seenRepoIds = new Set<number>();

    const fetchPromises = queries.map(async (q) => {
      try {
        const endpoint = `https://api.github.com/search/repositories?q=${encodeURIComponent(q)}&sort=stars&order=desc&per_page=${Math.min(perQueryLimit, 100)}`;
        const res = await fetch(endpoint, {
          headers: {
            'User-Agent': '3DHub-Crawler/3.0 (Open 3D Model Explorer)',
            'Accept': 'application/vnd.github.v3+json',
          },
          signal: AbortSignal.timeout(7000),
        });

        if (res.ok) {
          const data = await res.json();
          return Array.isArray(data.items) ? data.items : [];
        }
        return [];
      } catch (err: any) {
        console.warn(`[GitHub3DScraper] Search error for query "${q}":`, err.message);
        return [];
      }
    });

    const queryResults = await Promise.all(fetchPromises);
    for (const items of queryResults) {
      for (const item of items) {
        if (!seenRepoIds.has(item.id)) {
          seenRepoIds.add(item.id);
          allRepos.push(item);
        }
      }
    }

    return allRepos.slice(0, limit).map((repo: any, idx: number) => {
      const rawName = repo.name || '3D Model Project';
      const cleanTitle = rawName
        .replace(/[-_]/g, ' ')
        .replace(/\b\w/g, (c: string) => c.toUpperCase());

      const desc = repo.description || 'Open Source 3D Printable CAD Model & STL Files';
      const fullTitle = `${cleanTitle} - ${desc.slice(0, 50)}`;
      const author = repo.owner?.login || 'Open3DMaker';
      const stars = repo.stargazers_count || 120;
      const forks = repo.forks_count || 30;
      const downloads = forks * 110 + stars * 45 + 1500;
      const prints = Math.floor(downloads * 0.38);

      // Tự động gán SVG thumbnail trực quan theo nội dung
      const textToCheck = `${rawName} ${desc} ${(repo.topics || []).join(' ')}`.toLowerCase();
      let thumbnail = '/thumbnails/bambu-acc.svg';
      if (textToCheck.includes('dragon')) thumbnail = '/thumbnails/dragon.svg';
      else if (textToCheck.includes('gear') || textToCheck.includes('bearing')) thumbnail = '/thumbnails/gear.svg';
      else if (textToCheck.includes('robot') || textToCheck.includes('bot')) thumbnail = '/thumbnails/robot.svg';
      else if (textToCheck.includes('helmet') || textToCheck.includes('mask')) thumbnail = '/thumbnails/helmet.svg';
      else if (textToCheck.includes('turbine') || textToCheck.includes('fan') || textToCheck.includes('jet')) thumbnail = '/thumbnails/turbine.svg';
      else if (textToCheck.includes('vase') || textToCheck.includes('pot')) thumbnail = '/thumbnails/spiral-vase.svg';
      else if (textToCheck.includes('box') || textToCheck.includes('case')) thumbnail = '/thumbnails/rugged-box.svg';
      else if (textToCheck.includes('lamp') || textToCheck.includes('light')) thumbnail = '/thumbnails/moon-lamp.svg';
      else if (textToCheck.includes('gridfinity')) thumbnail = '/thumbnails/gridfinity.svg';
      else if (textToCheck.includes('voron')) thumbnail = '/thumbnails/voron-toolhead.svg';
      else if (repo.owner?.avatar_url) thumbnail = repo.owner.avatar_url;

      // Xác định chất liệu in phù hợp
      let filamentType = 'PLA Basic';
      if (textToCheck.includes('tpu') || textToCheck.includes('flex')) filamentType = 'TPU 95A';
      else if (textToCheck.includes('petg') || textToCheck.includes('gear') || textToCheck.includes('arm')) filamentType = 'PETG Tough';
      else if (textToCheck.includes('abs') || textToCheck.includes('cf') || textToCheck.includes('voron')) filamentType = 'ABS / PLA-CF';

      return {
        id: `gh-live-${repo.id || idx + 1}`,
        title: fullTitle,
        author,
        authorAvatar: repo.owner?.avatar_url,
        platform: 'github' as const,
        sourceUrl: repo.html_url,
        thumbnailUrl: thumbnail,
        downloads,
        prints,
        likes: stars,
        tags: repo.topics && repo.topics.length > 0 ? repo.topics.slice(0, 5) : ['github', 'open-source', '3d-print', 'stl'],
        category: textToCheck.includes('tool') ? 'Tools & Utilities' : textToCheck.includes('gear') ? 'Mechanical & Functional' : 'Open 3D CAD',
        filamentType,
        filamentWeightGrams: Math.floor(75 + (idx % 10) * 15),
        printTimeMinutes: Math.floor(100 + (idx % 12) * 20),
        createdAt: repo.created_at || new Date().toISOString(),
        updatedAt: repo.updated_at || scrapedAt,
      };
    });
  }
}
