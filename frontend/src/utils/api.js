import { supabase } from './supabaseClient';

const api = {
  // Fetch metadata from URL
  async fetchMetadata(url) {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      
      const html = await response.text();
      
      // Extract title
      const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
      const title = titleMatch ? titleMatch[1].trim() : new URL(url).hostname;
      
      // Extract favicon with multiple fallback strategies
      let favicon = null;
      
      // Try to find favicon in various formats
      const iconLinkMatch = html.match(/<link[^>]+rel=["'](?:icon|shortcut icon|apple-touch-icon)["'][^>]*>/i);
      if (iconLinkMatch) {
        const hrefMatch = iconLinkMatch[0].match(/href=["']([^"']+)["']/i);
        if (hrefMatch) {
          favicon = hrefMatch[1];
        }
      }
      
      // Try different favicon selectors
      if (!favicon) {
        const appleIconMatch = html.match(/<link[^>]+rel=["']apple-touch-icon["'][^>]*>/i);
        if (appleIconMatch) {
          const hrefMatch = appleIconMatch[0].match(/href=["']([^"']+)["']/i);
          if (hrefMatch) {
            favicon = hrefMatch[1];
          }
        }
      }
      
      // Try meta property for favicon
      if (!favicon) {
        const metaIconMatch = html.match(/<meta[^>]+property=["']og:image["'][^>]*>/i);
        if (metaIconMatch) {
          const contentMatch = metaIconMatch[0].match(/content=["']([^"']+)["']/i);
          if (contentMatch) {
            favicon = contentMatch[1];
          }
        }
      }
      
      // Make favicon URL absolute
      if (favicon && !favicon.startsWith('http')) {
        const urlObj = new URL(url);
        if (favicon.startsWith('//')) {
          favicon = urlObj.protocol + favicon;
        } else if (favicon.startsWith('/')) {
          favicon = urlObj.protocol + '//' + urlObj.host + favicon;
        } else {
          favicon = urlObj.protocol + '//' + urlObj.host + '/' + favicon;
        }
      }
      
      // Use Google Favicon service as fallback
      if (!favicon) {
        const urlObj = new URL(url);
        favicon = `https://www.google.com/s2/favicons?domain=${urlObj.hostname}&sz=32`;
      }

      // Extract description
      let description = '';
      const descriptionMatch = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i);
      if (descriptionMatch) {
        description = descriptionMatch[1].trim();
      }
      
      return { title, favicon, description };
    } catch (error) {
      console.error('Error fetching metadata:', error);
      return {
        title: new URL(url).hostname,
        favicon: null,
        description: null
      };
    }
  },

  // Fetch summary using Jina AI
  async fetchSummary(url) {
    try {
      const response = await fetch(`https://r.jina.ai/${url}`, {
        headers: {
          'Authorization': 'Bearer jina_d6c977707c124d3c8d02dbfd1ab94f2a2coIdgQZgeSyRQ7G-UR0zPJ5BWcf',
          'Accept': 'text/plain',
          'X-With-Generated-Alt': 'true',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      
      if (!response.ok) {
        if (response.status === 429) {
          throw new Error('Rate limit exceeded. Please try again later.');
        }
        throw new Error('Failed to fetch summary');
      }
      
      let content = await response.text();
      
      if (!content || content.trim().length === 0) {
        return 'No content available for this page.';
      }
      
      // Enhanced content processing for better summaries
      let cleanContent = content;
      
      // Step 1: Remove obvious metadata headers (but preserve content)
      cleanContent = cleanContent
        .replace(/^Title:\s*.*$/gm, '')
        .replace(/^URL Source:\s*.*$/gm, '')
        .replace(/^Published Time:\s*.*$/gm, '')
        .replace(/^Warning:\s*.*$/gm, '')
        .replace(/^Markdown Content:\s*$/gm, '')
        .replace(/^=+$/gm, '') // Remove separator lines
        .trim();

      // Step 2: Clean up but preserve meaningful content
      cleanContent = cleanContent
        // Remove code blocks and images
        .replace(/```[\s\S]*?```/g, '')
        .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
        // Convert markdown links to plain text
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
        // Remove excessive markdown formatting
        .replace(/#{1,6}\s*/g, '') // Headers
        .replace(/\*{1,2}([^*]+)\*{1,2}/g, '$1') // Bold/italic
        .replace(/`([^`]+)`/g, '$1') // Inline code
        // Clean up navigation and UI elements
        .replace(/Skip to content|Navigation Menu|Toggle navigation/gi, '')
        .replace(/Sign in|Sign up|Sign out|Appearance settings/gi, '')
        .replace(/Search or jump to\.\.\.|Search code, repositories|Cancel|Submit feedback/gi, '')
        .replace(/We read every piece of feedback/gi, '')
        // Remove excessive whitespace and normalize
        .replace(/\s{3,}/g, ' ')
        .replace(/\n{3,}/g, '\n\n')
        .trim();

    // Step 3: Extract meaningful sentences and create longer summary (~300 words)
    if (cleanContent.length > 50) {
      // Split into sentences and filter out navigation/menu items
      const sentences = cleanContent
        .split(/[.!?]+/)
        .map(s => s.trim())
        .filter(s => {
          if (s.length < 15) return false; // Filter out very short sentences
          if (/^(Home|News|Sport|Business|About|Contact|Menu|Search|Login)/i.test(s)) return false; // Navigation
          if (/^\d+ hrs? ago|^\d+ min ago/i.test(s)) return false; // Timestamps
          if (/^Watch:|^Listen:|^Read more/i.test(s)) return false; // Action prompts
          return true;
        })

      if (sentences.length > 0) {
        // Create paragraphs from sentences, targeting ~300 words
        let summary = '';
        let currentParagraph = '';
        let totalWords = 0;
        const targetWords = 300;
        
        for (let i = 0; i < sentences.length && totalWords < targetWords; i++) {
          const sentence = sentences[i].trim();
          if (sentence) {
            const wordsInSentence = sentence.split(/\s+/).length;
            currentParagraph += sentence + '. ';
            totalWords += wordsInSentence;
            
            // Create paragraph breaks every 3-4 sentences or when reaching ~400 chars
            if ((i + 1) % 3 === 0 || currentParagraph.length > 400) {
              summary += currentParagraph.trim() + '\n\n';
              currentParagraph = '';
            }
          }
        }
        if (currentParagraph.trim().length) {
          summary += currentParagraph.trim();
        }
        
        summary = summary.trim();
        
        // Ensure we have a good length but don't exceed 350 words
        const finalWordCount = summary.split(/\s+/).length;
        if (finalWordCount > 350) {
          const words = summary.split(/\s+/);
          summary = words.slice(0, 300).join(' ') + '...';
        } else if (summary.length > 50) {
          // Add ellipsis if this seems to be truncated content
          const lastChar = summary.slice(-1);
          if (!['.', '!', '?'].includes(lastChar)) {
            summary += '...';
          }
        }
        
        // Ensure proper capitalization
        summary = summary.replace(/^([a-z])/g, (match) => match.toUpperCase());
        
        return summary.length > 20 ? summary : 'Content extracted but unable to generate meaningful summary.';
      }
    }      // Fallback: if no good sentences found, try to extract first meaningful paragraph
      const paragraphs = cleanContent.split('\n\n').filter(p => p.trim().length > 30);
      if (paragraphs.length > 0) {
        let fallbackSummary = paragraphs[0].trim();
        if (fallbackSummary.length > 300) {
          fallbackSummary = fallbackSummary.substring(0, 297) + '...';
        }
        return fallbackSummary;
      }
      
      return 'No meaningful content could be extracted from this page.';
      
    } catch (error) {
      console.error('Error fetching summary:', error);
      throw error;
    }
  },
  // Bookmark operations
  async getBookmarks() {
    const { data, error } = await supabase
      .from('bookmarks')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  async addBookmark(bookmark) {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) throw new Error('Not authenticated');

    let bookmarkData;
    let url;

    // If only URL is provided, fetch metadata and summary
    if (typeof bookmark === 'object' && bookmark.url && !bookmark.title) {
      url = bookmark.url;
      try {
        const metadata = await this.fetchMetadata(url);
        bookmarkData = { ...bookmark, ...metadata };
      } catch (error) {
        console.warn('Failed to fetch metadata:', error);
        bookmarkData = bookmark;
      }
    } else if (typeof bookmark === 'string') {
      // If bookmark is just a URL string
      url = bookmark;
      try {
        const metadata = await this.fetchMetadata(url);
        bookmarkData = { url, ...metadata };
      } catch (error) {
        console.warn('Failed to fetch metadata:', error);
        bookmarkData = { url };
      }
    } else {
      bookmarkData = bookmark;
      url = bookmark.url;
    }

    // Try to fetch summary
    if (url && !bookmarkData.summary) {
      try {
        const summary = await this.fetchSummary(url);
        bookmarkData.summary = summary;
      } catch (error) {
        console.warn('Failed to fetch summary:', error);
        // Continue without summary - user can fetch it later
      }
    }

    const { data, error } = await supabase
      .from('bookmarks')
      .insert([
        { 
          ...bookmarkData,
          user_id: user.id
        }
      ])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateBookmark(id, updates) {
    // If needsSummary is true, fetch the summary
    if (updates.needsSummary) {
      const bookmark = (await supabase
        .from('bookmarks')
        .select('url')
        .eq('id', id)
        .single()
      ).data;

      if (!bookmark) {
        throw new Error('Bookmark not found');
      }

      try {
        const summary = await this.fetchSummary(bookmark.url);
        updates = { ...updates, summary };
        delete updates.needsSummary;
      } catch (error) {
        throw new Error('Failed to fetch summary: ' + error.message);
      }
    }

    const { data, error } = await supabase
      .from('bookmarks')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteBookmark(id) {
    const { error } = await supabase
      .from('bookmarks')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  }
};

export default api;
