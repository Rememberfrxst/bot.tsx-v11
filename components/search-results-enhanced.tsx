'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { ExternalLink, Globe, Clock } from 'lucide-react';

interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  domain: string;
}

interface SearchResultsEnhancedProps {
  results: SearchResult[];
  query: string;
  isLoading?: boolean;
  totalResults?: string;
  searchTime?: number;
}

export function SearchResultsEnhanced({
  results,
  query,
  isLoading = false,
  totalResults,
  searchTime,
}: SearchResultsEnhancedProps) {
  if (isLoading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800 mt-4"
      >
        <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
          <div className="animate-spin w-4 h-4 border-2 border-blue-600 dark:border-blue-400 border-t-transparent rounded-full"></div>
          <span className="font-medium">Searching the web...</span>
        </div>
        <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">
          Looking for the latest information about "{query}"
        </p>
      </motion.div>
    );
  }

  if (!results || results.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700 mt-4"
      >
        <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
          <Globe className="w-4 h-4" />
          <span className="font-medium">No web results found</span>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          No search results found for "{query}". Try different keywords.
        </p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="mt-4 p-4 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 rounded-lg border border-green-200 dark:border-green-800"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
            <Globe className="w-4 h-4" />
            <span className="font-medium">Web Search Results</span>
          </div>
          {totalResults && (
            <span className="text-xs text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/40 px-2 py-1 rounded-full">
              {totalResults} results
            </span>
          )}
        </div>
        {searchTime && (
          <div className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
            <Clock className="w-3 h-3" />
            {searchTime.toFixed(2)}s
          </div>
        )}
      </div>

      {/* Search Query */}
      <div className="mb-4 p-2 bg-white/60 dark:bg-black/20 rounded border border-green-100 dark:border-green-800">
        <p className="text-sm text-green-800 dark:text-green-200">
          <span className="font-medium">Query:</span> "{query}"
        </p>
      </div>

      {/* Results */}
      <div className="space-y-3">
        {results.map((result, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className="p-3 bg-white/70 dark:bg-black/20 rounded-lg border border-green-100 dark:border-green-800 hover:border-green-300 dark:hover:border-green-600 transition-colors group"
          >
            {/* Title and Link */}
            <div className="flex items-start justify-between gap-2 mb-2">
              <a
                href={result.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-700 dark:text-blue-300 hover:text-blue-900 dark:hover:text-blue-100 font-medium text-sm leading-tight group-hover:underline transition-colors flex-1"
              >
                {result.title}
              </a>
              <ExternalLink className="w-3 h-3 text-gray-400 dark:text-gray-500 flex-shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>

            {/* Domain */}
            <div className="flex items-center gap-1 mb-2">
              <div className="w-3 h-3 bg-green-500 rounded-full flex-shrink-0"></div>
              <span className="text-xs text-green-700 dark:text-green-400 font-medium">
                {result.domain}
              </span>
            </div>

            {/* Snippet */}
            <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed line-clamp-3">
              {result.snippet}
            </p>

            {/* Full URL */}
            <div className="mt-2 pt-2 border-t border-green-100 dark:border-green-800">
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                {result.url}
              </p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Footer */}
      <div className="mt-4 pt-3 border-t border-green-200 dark:border-green-800">
        <p className="text-xs text-green-600 dark:text-green-400 text-center">
          🔍 Web search powered by Google Custom Search API • Click any result to visit the source
        </p>
      </div>
    </motion.div>
  );
}
