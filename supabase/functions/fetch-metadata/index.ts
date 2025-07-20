import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface RequestBody {
  url: string;
}

interface MetadataResponse {
  title: string;
  favicon: string | null;
  description: string;
}

interface ErrorResponse {
  error: string;
  title: null;
  favicon: null;
  description: null;
}

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body: RequestBody = await req.json()
    const { url } = body

    if (!url) {
      throw new Error('URL is required')
    }

    // Validate URL format
    let urlObj: URL;
    try {
      urlObj = new URL(url);
    } catch {
      throw new Error('Invalid URL format');
    }

    // Fetch the HTML content
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    })
    
    if (!response.ok) {
      throw new Error(`Failed to fetch URL: ${response.status}`);
    }
    
    const html = await response.text()
    
    // Extract title
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
    const title = titleMatch ? titleMatch[1].trim() : urlObj.hostname
    
    // Extract favicon
    let favicon: string | null = null
    
    // Try to find favicon in various formats
    const iconLinkMatch = html.match(/<link[^>]+rel=["'](?:icon|shortcut icon|apple-touch-icon)["'][^>]*>/i)
    if (iconLinkMatch) {
      const hrefMatch = iconLinkMatch[0].match(/href=["']([^"']+)["']/i)
      if (hrefMatch) {
        favicon = hrefMatch[1]
      }
    }
    
    // Make favicon URL absolute
    if (favicon && !favicon.startsWith('http')) {
      if (favicon.startsWith('//')) {
        favicon = urlObj.protocol + favicon
      } else if (favicon.startsWith('/')) {
        favicon = urlObj.protocol + '//' + urlObj.host + favicon
      } else {
        favicon = urlObj.protocol + '//' + urlObj.host + '/' + favicon
      }
    }

    // Use Google Favicon service as fallback
    if (!favicon) {
      favicon = `https://www.google.com/s2/favicons?domain=${urlObj.hostname}&sz=32`;
    }

    // Extract description
    let description = ''
    const descriptionMatch = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i)
    if (descriptionMatch) {
      description = descriptionMatch[1].trim()
    }
    
    const responseData: MetadataResponse = { title, favicon, description };
    
    return new Response(
      JSON.stringify(responseData),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    const errorResponse: ErrorResponse = {
      error: error instanceof Error ? error.message : 'Unknown error',
      title: null,
      favicon: null,
      description: null
    };
    
    return new Response(
      JSON.stringify(errorResponse),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
})
