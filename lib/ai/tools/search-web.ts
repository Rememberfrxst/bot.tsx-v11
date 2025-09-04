import { tool } from 'ai';
import { z } from 'zod';
import type { WebSearchResult } from '@/app/(chat)/api/web-search/route';

// Schema for the searchWeb tool
const searchWebSchema = z.object({
  query: z.string().describe('The search query to look up on the web'),
});

export const searchWeb = tool({
  description: `Search the web for current information, news, facts, and data. Use this when the user asks for:
  - Current events, news, or recent developments
  - Real-time information like weather, stock prices, sports scores
  - Latest information about people, companies, or topics
  - Factual data that might have changed recently
  - Verification of current information
  - Research on recent topics or trends`,
  parameters: searchWebSchema,
  execute: async ({ query }) => {
    try {
      console.log(`🔍 Searching web for: "${query}"`);

      const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/web-search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Web search failed');
      }

      const data = await response.json();
      const results: WebSearchResult[] = data.results || [];

      if (results.length === 0) {
        return `No web search results found for "${query}". The search may have been too specific or the information might not be available online.`;
      }

      // Format results for the AI to process
      let formattedResults = `Web search results for "${query}":\n\n`;
      
      results.forEach((result, index) => {
        formattedResults += `${index + 1}. **${result.title}**\n`;
        formattedResults += `   URL: ${result.url}\n`;
        formattedResults += `   Source: ${result.domain}\n`;
        formattedResults += `   Summary: ${result.snippet}\n\n`;
      });

      formattedResults += `\nFound ${results.length} results in ${data.searchTime}s. Total available: ${data.totalResults}`;

      // Also store results for the UI to display
      global.lastSearchResults = {
        query,
        results,
        timestamp: Date.now(),
      };

      return formattedResults;

    } catch (error) {
      console.error('searchWeb tool error:', error);
      return `I encountered an error while searching the web: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again or rephrase your search query.`;
    }
  },
});
