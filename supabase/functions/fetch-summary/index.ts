import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { url } = await req.json()

    if (!url) {
      throw new Error('URL is required')
    }

    const response = await fetch(`https://r.jina.ai/${url}`, {
      headers: {
        'Authorization': 'Bearer jina_d6c977707c124d3c8d02dbfd1ab94f2a2coIdgQZgeSyRQ7G-UR0zPJ5BWcf',
        'Accept': 'text/plain',
        'X-With-Generated-Alt': 'true',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    })
    
    if (!response.ok) {
      if (response.status === 429) {
        throw new Error('Rate limit exceeded. Please try again later.')
      }
      throw new Error('Failed to fetch summary')
    }
    
    let content = await response.text()
    
    try {
      // Check if response is JSON
      const jsonContent = JSON.parse(content)
      content = jsonContent.data?.content || jsonContent.content || jsonContent.text || JSON.stringify(jsonContent)
    } catch {
      // Content is already text, continue
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
        .trim()

      // Remove duplicate lines and blank lines
      main = main
        .split('\n')
        .map(line => line.trim())
        .filter((line, idx, arr) => line && (!idx || line !== arr[idx - 1]))
        .join('\n')

      // Get all sentences and create longer summary (targeting ~300 words)
      const sentences = (main.match(/[^.!?]+[.!?]+/g) || [main])
        .map(s => s.trim())
        .filter(s => {
          if (s.length < 15) return false; // Filter out very short sentences
          if (/^(Home|News|Sport|Business|About|Contact|Menu|Search|Login)/i.test(s)) return false;
          if (/^\d+ hrs? ago|^\d+ min ago/i.test(s)) return false;
          if (/^Watch:|^Listen:|^Read more/i.test(s)) return false;
          return true;
        })

      const paragraphs: string[] = []
      let p = ''
      let totalWords = 0
      const targetWords = 300 // Target approximately 300 words
      
      for (let i = 0; i < sentences.length && totalWords < targetWords; ++i) {
        const sentence = sentences[i] + ' '
        const wordsInSentence = sentence.split(/\s+/).length
        
        p += sentence
        totalWords += wordsInSentence
        
        // Create paragraph breaks every 3-4 sentences or when reaching ~400 chars
        if ((i+1) % 3 === 0 || p.length > 400) {
          paragraphs.push(p.trim())
          p = ''
        }
      }
      if (p.trim().length) paragraphs.push(p.trim())

      // Join paragraphs and ensure we have a good length (aim for ~300 words)
      let summary = paragraphs.slice(0, 8).join('\n\n').trim()
      
      // Count words and adjust if needed
      const wordCount = summary.split(/\s+/).length
      if (wordCount < 50 && paragraphs.length > 8) {
        // If too short, include more paragraphs
        summary = paragraphs.slice(0, 12).join('\n\n').trim()
      }
      
      // Truncate if too long (over 350 words)
      const finalWordCount = summary.split(/\s+/).length
      if (finalWordCount > 350) {
        const words = summary.split(/\s+/)
        summary = words.slice(0, 300).join(' ') + '...'
      } else if (summary.length < main.length) {
        summary = summary.replace(/[.,!?\s]+$/, '') + '...'
      }

      // Human readbility: capitalize first letter if missed
      summary = summary.replace(/(^|\n)([a-z])/g, (m,a,b) => a + b.toUpperCase())
      // Remove stray citations or repeated wiki noise
      summary = summary.replace(/\[[^\]]*\]|\([^)]+\)/g, '')
      
      if (summary.length > 10) {
        return new Response(
          JSON.stringify({ summary }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          },
        )
      }
    }
    
    return new Response(
      JSON.stringify({ summary: 'No summary available for this page.' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
    
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: error.message,
        summary: null
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: error.message.includes('Rate limit') ? 429 : 500,
      },
    )
  }
})
