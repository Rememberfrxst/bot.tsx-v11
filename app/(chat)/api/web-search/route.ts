import { NextRequest } from 'next/server';

export const runtime = 'edge';
export const maxDuration = 30;

interface GoogleSearchResult {
  title: string;
  link: string;
  snippet: string;
  displayLink: string;
  formattedUrl: string;
}

interface GoogleSearchResponse {
  items?: GoogleSearchResult[];
  searchInformation?: {
    totalResults: string;
    searchTime: number;
  };
}

export interface WebSearchResult {
  title: string;
  url: string;
  snippet: string;
  domain: string;
}

export async function POST(request: NextRequest) {
  try {
    const { query } = await request.json();

    if (!query || typeof query !== 'string') {
      return Response.json(
        { error: 'Search query is required' },
        { status: 400 }
      );
    }

    const apiKey = process.env.GOOGLE_API_KEY;
    const searchEngineId = process.env.GOOGLE_SEARCH_ENGINE_ID;

    if (!apiKey || !searchEngineId) {
      console.error('Missing Google API credentials');
      return Response.json(
        { error: 'Web search service is not configured' },
        { status: 500 }
      );
    }

    // Construct Google Custom Search API URL
    const searchParams = new URLSearchParams({
      key: apiKey,
      cx: searchEngineId,
      q: query,
      num: '8', // Get up to 8 results
      safe: 'active', // Enable safe search
    });

    const searchUrl = `https://www.googleapis.com/customsearch/v1?${searchParams}`;

    // Fetch search results from Google
    const response = await fetch(searchUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Checkbox AI Web Search Bot/1.0',
      },
    });

    if (!response.ok) {
      console.error('Google API error:', response.status, response.statusText);
      
      if (response.status === 403) {
        return Response.json(
          { error: 'API key limit exceeded or invalid. Please check your Google API credentials.' },
          { status: 403 }
        );
      }
      
      return Response.json(
        { error: 'Search service temporarily unavailable' },
        { status: 503 }
      );
    }

    const data: GoogleSearchResponse = await response.json();

    // Transform results to our format
    const results: WebSearchResult[] = (data.items || []).map((item) => ({
      title: item.title,
      url: item.link,
      snippet: item.snippet,
      domain: item.displayLink || new URL(item.link).hostname,
    }));

    return Response.json({
      results,
      query,
      totalResults: data.searchInformation?.totalResults || '0',
      searchTime: data.searchInformation?.searchTime || 0,
    });

  } catch (error) {
    console.error('Web search error:', error);
    return Response.json(
      { error: 'Failed to perform web search' },
      { status: 500 }
    );
  }
}
