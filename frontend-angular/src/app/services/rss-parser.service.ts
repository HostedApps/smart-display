import { Injectable } from '@angular/core';

export interface RssItem {
  title: string;
  link?: string;
  description?: string;
  pubDate?: Date;
  source?: string;
}

export interface RssFeedResult {
  title: string;
  items: RssItem[];
}

@Injectable({ providedIn: 'root' })
export class RssParserService {
  parse(xmlData: string): RssFeedResult {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlData, 'text/xml');
    
    // Check for parse error
    const parseError = doc.querySelector('parsererror');
    if (parseError) {
      console.error('XML Parse Error in RSS Feed', parseError.textContent);
      return { title: '', items: [] };
    }

    // Try standard RSS 2.0 (<channel><item>)
    const channel = doc.querySelector('channel');
    if (channel) {
      const feedTitle = channel.querySelector('title')?.textContent?.trim() || 'News Feed';
      const items: RssItem[] = [];
      const itemNodes = channel.querySelectorAll('item');

      itemNodes.forEach(node => {
        const title = node.querySelector('title')?.textContent?.trim() || 'Untitled';
        const link = node.querySelector('link')?.textContent?.trim() || '';
        const rawDesc = node.querySelector('description')?.textContent?.trim() || '';
        const pubDateStr = node.querySelector('pubDate')?.textContent?.trim() || '';
        const pubDate = pubDateStr ? new Date(pubDateStr) : undefined;
        
        // Strip HTML tags from description for a clean text preview
        const description = this.stripHtml(rawDesc);

        items.push({
          title,
          link,
          description: description.length > 140 ? description.substring(0, 137) + '...' : description,
          pubDate,
          source: feedTitle
        });
      });

      return { title: feedTitle, items };
    }

    // Try Atom Feed (<feed><entry>)
    const feed = doc.querySelector('feed');
    if (feed) {
      const feedTitle = feed.querySelector('title')?.textContent?.trim() || 'News Feed';
      const items: RssItem[] = [];
      const entryNodes = feed.querySelectorAll('entry');

      entryNodes.forEach(node => {
        const title = node.querySelector('title')?.textContent?.trim() || 'Untitled';
        const link = node.querySelector('link')?.getAttribute('href') || '';
        const rawSummary = node.querySelector('summary')?.textContent?.trim() || 
                           node.querySelector('content')?.textContent?.trim() || '';
        const updatedStr = node.querySelector('updated')?.textContent?.trim() || 
                           node.querySelector('published')?.textContent?.trim() || '';
        const pubDate = updatedStr ? new Date(updatedStr) : undefined;

        const description = this.stripHtml(rawSummary);

        items.push({
          title,
          link,
          description: description.length > 140 ? description.substring(0, 137) + '...' : description,
          pubDate,
          source: feedTitle
        });
      });

      return { title: feedTitle, items };
    }

    return { title: 'News Feed', items: [] };
  }

  private stripHtml(html: string): string {
    if (!html) return '';
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    return tempDiv.textContent || tempDiv.innerText || '';
  }
}
