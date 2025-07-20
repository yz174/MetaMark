const axios = require('axios');

const fetchMetadata = async (url) => {
  try {
    // Fetch the HTML content
    const response = await axios.get(url, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    const html = response.data;
    
    // Extract title
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : new URL(url).hostname;
    
    // Extract favicon
    let favicon = null;
    
    // Try to find favicon in various formats
    const iconLinkMatch = html.match(/<link[^>]+rel=["'](?:icon|shortcut icon)["'][^>]*>/i);
    if (iconLinkMatch) {
      const hrefMatch = iconLinkMatch[0].match(/href=["']([^"']+)["']/i);
      if (hrefMatch) {
        favicon = hrefMatch[1];
      }
    }
    
    // If no favicon found, try default location
    if (!favicon) {
      favicon = '/favicon.ico';
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
    
    return { title, favicon };
  } catch (error) {
    console.error('Error fetching metadata:', error.message);
    return {
      title: new URL(url).hostname,
      favicon: null
    };
  }
};

const fetchSummary = async (url) => {
  try {
    const response = await axios.get(`https://r.jina.ai/${url}`, {
      timeout: 30000,
      headers: {
        'Authorization': 'Bearer jina_d6c977707c124d3c8d02dbfd1ab94f2a2coIdgQZgeSyRQ7G-UR0zPJ5BWcf',
        'Accept': 'text/plain',
        'X-With-Generated-Alt': 'true',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    let content = response.data;
    
    // If response is an object, try to extract the content
    if (typeof content === 'object') {
      content = content.data?.content || content.content || content.text || JSON.stringify(content);
    }
    
    // Clean up the content for a premium user experience
    if (typeof content === 'string') {
      let main = content
        // Remove markdown/image/code blocks
        .replace(/```[\s\S]*?```/g, '')
        .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
        // Remove HTML tags
        .replace(/<[^>]*>/g, '')
        // Remove markdown reference brackets and URLs
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
        .replace(/\(https?:\/\/[^)]+\)/g, '')
        // Remove metadata: lines with 'Title:', 'URL Source:', etc
        .replace(/^.*?:.*$/gm, l => /(title|url|source|published|markdown|foundat|\*\s)/i.test(l) ? '' : l)
        // Remove unordered/ordered lists markers
        .replace(/^([ \t]*[-*+] |^\d+\. )/gm, '')
        // Remove extra asterisks/markdown
        .replace(/[*_`#>~\-]+/g, ' ')
        // Remove redundant whitespace
        .replace(/\s{3,}/g, '  ')
        .trim();

      // Remove duplicate lines and blank lines
      main = main
        .split('\n')
        .map(line => line.trim())
        .filter((line, idx, arr) => line && (!idx || line !== arr[idx - 1]))
        .join('\n');

      // Get all sentences and group 2-3 together for paragraphs
      const sentences = (main.match(/[^.!?]+[.!?]+/g) || [main])
        .map(s => s.trim())
        .filter(Boolean);

      const paragraphs = [];
      let p = '';
      for (let i = 0; i < sentences.length; ++i) {
        p += sentences[i] + ' ';
        // After 2 sentences or ~320 chars, start new paragraph
        if ((i+1) % 2 === 0 || p.length > 320) {
          paragraphs.push(p.trim());
          p = '';
        }
      }
      if (p.trim().length) paragraphs.push(p.trim());

      // Join back as paragraphs; add ellipsis if truncated
      let summary = paragraphs.slice(0, 6).join('\n\n').trim();
      if (summary.length < main.length) {
        summary = summary.replace(/[.,!?\s]+$/, '') + '...';
      }

      // Human readbility: capitalize first letter if missed
      summary = summary.replace(/(^|\n)([a-z])/g, (m,a,b) => a + b.toUpperCase());
      // Remove stray citations or repeated wiki noise
      summary = summary.replace(/\[[^\]]*\]|\([^)]+\)/g, '');
      // Final cleanup
      return summary.length > 10 ? summary : 'No summary available for this page.';
    }

    return 'Unable to generate summary.';
  } catch (error) {
    console.error('Error fetching summary:', error.message);
    
    // Handle rate limiting
    if (error.response && error.response.status === 429) {
      throw new Error('Rate limit exceeded. Please try again later.');
    }
    
    return null;
  }
};

module.exports = { fetchMetadata, fetchSummary };
