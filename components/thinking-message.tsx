'use client';

import React from 'react';
import { motion } from 'framer-motion';

export function ThinkingMessage() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-2 text-muted-foreground p-4"
    >
      <div className="flex items-center gap-1">
        <motion.div
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 1, repeat: Infinity, delay: 0 }}
          className="w-1 h-1 bg-current rounded-full"
        />
        <motion.div
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 1, repeat: Infinity, delay: 0.2 }}
          className="w-1 h-1 bg-current rounded-full"
        />
        <motion.div
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 1, repeat: Infinity, delay: 0.4 }}
          className="w-1 h-1 bg-current rounded-full"
        />
      </div>
      <span className="text-sm">Thinking...</span>
    </motion.div>
  );
}
