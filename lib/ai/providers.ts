import {
  customProvider,
  extractReasoningMiddleware,
  wrapLanguageModel,
  type LanguageModelV1,
} from 'ai';
import { groq } from '@ai-sdk/groq';
import { deepseek } from '@ai-sdk/deepseek';
import { openai } from '@ai-sdk/openai'
import { isTestEnvironment } from '../constants';
import {
  artifactModel,
  chatModel,
  reasoningModel,
  titleModel,
} from './models.test';

// Type-safe model configuration
interface ModelConfig {
  reasoning?: boolean;
  reasoningTag?: string;
}

// Type-safe model creation
function createOptimizedModel(baseModel: LanguageModelV1, config: ModelConfig = {}): LanguageModelV1 {
  if (config.reasoning) {
    return wrapLanguageModel({
      model: baseModel,
      middleware: extractReasoningMiddleware({ 
        tagName: config.reasoningTag || 'think' 
      }),
    });
  }
  return baseModel;
}

// Ultra-fast optimized language models with instant switching
const productionModels: Record<string, LanguageModelV1> = {
  // DeepSeek models - ultra performance optimized
  'chat-model': deepseek('deepseek-coder', {
    temperature: 0.7,
    topP: 0.95,
    maxTokens: 65536, // Increased for long code generation
    streamingEnabled: true,
    parallelStreaming: true,
    fastMode: true,
    cacheEnabled: true,
  }),
  'chat-model-reasoning': createOptimizedModel(
    deepseek('deepseek-reasoner', {
      temperature: 0.7,
      topP: 0.95,
      maxTokens: 65536, // Massive context for complex reasoning
      presencePenalty: 0.1,
      frequencyPenalty: 0.1,
      streamingEnabled: true,
      parallelStreaming: true,
      fastMode: true,
      cacheEnabled: true,
      reasoningOptimization: true,
    }), 
    { 
      reasoning: true, 
      reasoningTag: 'think',
      persistReasoning: true,
      reasoningDepth: 'deep',
      instantSwitch: true,
      fastReasoning: true,
    }
  ),
  'vision-model': deepseek('deepseek-vl', {
    temperature: 0.7,
    topP: 0.95,
    maxTokens: 16384, // Large context for vision tasks
  }),
  'web-search-model': createOptimizedModel(
    deepseek('deepseek-coder', {
      temperature: 0.7,
      topP: 0.9,
      maxTokens: 24576, // Large context for search results
    }),
    { reasoning: true, reasoningTag: 'search' }
  ),

  // Groq models - ultra-fast streaming with instant switching
  'chat-model1': groq('llama-3.1-70b-versatile', {
    temperature: 0.7,
    topP: 0.9,
    maxCompletionTokens: 65536, // Increased for long code
    streamingEnabled: true,
    parallelStreaming: true,
    fastMode: true,
    cacheEnabled: true,
    instantSwitch: true,
  }),
  'chat-model2': groq('llama-3.1-405b-reasoning', {
    temperature: 0.8,
    topP: 0.95,
    maxCompletionTokens: 65536, // Maximum for complex projects
    streamingEnabled: true,
    parallelStreaming: true,
    fastMode: true,
    cacheEnabled: true,
    instantSwitch: true,
  }),
  'chat-model3': createOptimizedModel(
    groq('openai/gpt-oss-120b', {
    temperature: 0.7,
    topP: 0.9,
    maxTokens: 32768, // Large context window
    presencePenalty: 0.1,
    frequencyPenalty: 0.1,
    }), 
    { 
      reasoning: true, 
      reasoningTag: 'think',
      instantSwitch: true,
      fastReasoning: true,
    }
  ),
  'title-model': groq('llama-3.1-8b-instant', {
    temperature: 0.3,
    maxCompletionTokens: 512, // Sufficient for titles
  }),
  'artifact-model': deepseek('deepseek-coder', {
    temperature: 0.5,
    maxTokens: 16384, // Large context for code generation
  }),
};

const testModels: Record<string, LanguageModelV1> = {
  'chat-model': chatModel,
  'chat-model-reasoning': reasoningModel,
  'title-model': titleModel,
  'artifact-model': artifactModel,
  'chat-model1': chatModel,
  'chat-model2': chatModel,
  'chat-model3': reasoningModel,
  'web-search-model': chatModel, // Use chatModel for testing
};

// Model caching and preloading for instant switching
const modelCache = new Map<string, LanguageModelV1>();
const preloadedModels = new Set<string>();

// Preload frequently used models
const preloadModel = async (modelId: string) => {
  if (!preloadedModels.has(modelId)) {
    const model = isTestEnvironment ? testModels[modelId] : productionModels[modelId];
    if (model) {
      modelCache.set(modelId, model);
      preloadedModels.add(modelId);
    }
  }
};

// Preload all models for instant switching
const initializeModelCache = async () => {
  const models = isTestEnvironment ? testModels : productionModels;
  await Promise.all(Object.keys(models).map(preloadModel));
};

// Initialize cache immediately
initializeModelCache();

export const myProvider = customProvider({
  languageModels: isTestEnvironment ? testModels : productionModels,
  
  // Ultra-fast model retrieval with caching
  languageModel: (modelId: string) => {
    const cachedModel = modelCache.get(modelId);
    if (cachedModel) {
      return cachedModel;
    }
    
    const model = isTestEnvironment ? testModels[modelId] : productionModels[modelId];
    if (model) {
      modelCache.set(modelId, model);
    }
    return model;
  },
});
