import type { SuggestionRule, SuggestionContext } from '../../suggestions/types.js';
import type { SuggestionData } from '../db/writer.js';
import type { BundleInput } from '@smappy/core';
import {
  loadLLMConfig,
  type LLMIntegrationConfig,
  type PartialLLMIntegrationConfig,
} from '../../config/llm.js';
import { generateText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { ollama } from 'ollama-ai-provider-v2';

/**
 * Options for the LLM analyzer
 */
export interface LLMAnalyzerOptions {
  /** Optional configuration overrides */
  config?: PartialLLMIntegrationConfig | LLMIntegrationConfig;
  /** Custom time provider for rate limiting */
  now?: () => number;
}

/**
 * Analyzer that delegates suggestion generation to an LLM provider using the AI SDK
 */
const rateLimiterRegistry = new Map<string, RateLimiter>();

export class LLMAnalyzer implements SuggestionRule {
  readonly id = 'llm-advanced-analyzer';
  readonly name = 'LLM-Powered Analyzer';
  readonly description = 'Generates contextual bundle analysis suggestions using LLM providers';

  private readonly config: LLMIntegrationConfig;
  private readonly rateLimiter?: RateLimiter;
  private readonly now: () => number;

  constructor(options: LLMAnalyzerOptions = {}) {
    const resolvedConfig =
      'enabled' in (options.config ?? {}) && 'apiBaseUrl' in (options.config ?? {})
        ? (options.config as LLMIntegrationConfig)
        : loadLLMConfig(options.config as PartialLLMIntegrationConfig | undefined);

    this.config = resolvedConfig;
    this.now = options.now ?? Date.now;

    if (this.config.enabled && this.config.rateLimitPerMinute > 0) {
      this.rateLimiter = acquireRateLimiter(this.config, this.now);
    }
  }

  async execute(context: SuggestionContext): Promise<SuggestionData[]> {
    if (!this.config.enabled) {
      return [];
    }

    if (this.rateLimiter && !this.rateLimiter.tryConsume()) {
      return [this.buildRateLimitSuggestion()];
    }

    const userPrompt = this.buildPrompt(context);
    if (!userPrompt) {
      return [];
    }

    try {
      const model = this.createModel();
      const result = await generateText({
        model,
        messages: [
          { role: 'system', content: DEFAULT_SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
        maxOutputTokens: this.config.maxTokens,
        temperature: this.config.temperature,
      });

      const suggestions = this.parseSuggestions(result.text);

      if (suggestions.length === 0) {
        return [
          this.buildFallbackSuggestion('No structured suggestions were returned by the LLM.'),
        ];
      }

      return suggestions;
    } catch (error) {
      console.error('[LLMAnalyzer] Failed to generate suggestions', error);
      return [
        this.buildFallbackSuggestion(
          `Unable to generate AI suggestions at this time. ${(error as Error).message ?? 'Unknown error.'}`,
        ),
      ];
    }
  }

  private createModel() {
    const { provider, model, apiKey, apiBaseUrl } = this.config;

    switch (provider) {
      case 'openai': {
        const openai = createOpenAI({
          apiKey,
          baseURL: apiBaseUrl !== 'https://api.openai.com/v1' ? apiBaseUrl : undefined,
        });
        return openai(model);
      }
      case 'anthropic': {
        const anthropic = createAnthropic({
          apiKey,
          baseURL: apiBaseUrl !== 'https://api.anthropic.com/v1' ? apiBaseUrl : undefined,
        });
        return anthropic(model);
      }
      case 'ollama':
        return ollama(model);
      default:
        throw new Error(`Unsupported LLM provider: ${provider}`);
    }
  }

  private buildPrompt(context: SuggestionContext): string | null {
    if (context.modules.length === 0) {
      return null;
    }

    const topModules = [...context.modules]
      .sort((a, b) => b.bundledSize - a.bundledSize)
      .slice(0, 5)
      .map((module) => {
        const exportPreview = module.exports?.slice(0, 5) ?? [];
        return {
          path: module.filePath,
          size: formatBytes(module.bundledSize),
          originalSize: formatBytes(module.originalSize ?? module.bundledSize),
          isThirdParty: module.isThirdParty,
          packageName: module.packageName,
          exportCount: module.exports?.length ?? 0,
          exportPreview,
        };
      });

    const dependencySample = context.dependencies.slice(0, 10).map((dep) => ({
      importer: dep.importerPath,
      imported: dep.importedPath,
      type: dep.type,
      symbols: dep.importedSymbols?.slice(0, 5) ?? [],
    }));

    const chunkSummary = context.chunks.slice(0, 5).map((chunk) => ({
      name: chunk.name,
      isEntry: chunk.isEntry,
      isAsync: chunk.isAsync,
      moduleCount: chunk.moduleIds.length,
    }));

    const bundleSummary = context.bundles.slice(0, 5).map((bundle) => {
      const bundleWithSize = bundle as BundleInput & { size?: number };
      const size =
        typeof bundleWithSize.size === 'number' ? formatBytes(bundleWithSize.size) : undefined;
      return {
        fileName: bundle.fileName,
        type: bundle.type,
        size,
      };
    });

    const payload = {
      totals: {
        modules: context.modules.length,
        dependencies: context.dependencies.length,
        bundles: context.bundles.length,
        chunks: context.chunks.length,
      },
      topModules,
      dependencySample,
      chunkSummary,
      bundleSummary,
    };

    return `You are assisting with optimizing JavaScript bundles. Analyse the provided data and return actionable suggestions as JSON.

Rules:
- Propose concrete optimizations that reference specific modules, chunks, or dependencies when possible.
- Prefer three to five suggestions prioritized by impact.
- Severity must be one of "critical", "warning", or "info".
- The JSON response must be an array of suggestion objects with the shape:
  [{"type": string, "severity": "critical" | "warning" | "info", "title": string, "description": string, "links": [{"entityType": "Module" | "Symbol" | "Dependency" | "Chunk", "entityPath"?: string}]}]
- If a field is unknown, omit it rather than inventing data.

Bundle analysis snapshot:
${JSON.stringify(payload, null, 2)}`;
  }

  private parseSuggestions(response: string): SuggestionData[] {
    const cleaned = this.stripCodeFences(response);

    let parsed: unknown;
    try {
      parsed = JSON.parse(cleaned);
    } catch (error) {
      console.warn('[LLMAnalyzer] Failed to parse LLM response as JSON', error, cleaned);
      return [];
    }

    if (!Array.isArray(parsed)) {
      return [];
    }

    const suggestions: SuggestionData[] = [];
    for (const entry of parsed) {
      if (!entry || typeof entry !== 'object') {
        continue;
      }

      const typedEntry = entry as Record<string, unknown>;
      const title = normalizeString(typedEntry.title) ?? 'AI Suggestion';
      const description = normalizeString(typedEntry.description) ?? '';
      const type = normalizeString(typedEntry.type) ?? 'LLM_SUGGESTION';
      const severity = normalizeSeverity(typedEntry.severity);
      const links = normalizeLinks(typedEntry.links);

      const attributedDescription = this.appendAttribution(description);

      suggestions.push({
        type,
        severity,
        title,
        description: attributedDescription,
        links,
      });
    }

    return suggestions;
  }

  private stripCodeFences(input: string): string {
    const trimmed = input.trim();
    if (trimmed.startsWith('```')) {
      const withoutStart = trimmed.replace(/^```[a-zA-Z]*\n?/, '');
      return withoutStart.replace(/```$/, '').trim();
    }
    return trimmed;
  }

  private appendAttribution(description: string): string {
    const attribution = this.config.attribution?.trim();
    if (!attribution) {
      return description;
    }

    const attributionToken = `_${attribution}_`;

    if (description.includes(attributionToken)) {
      return description;
    }

    const trimmed = description.trimEnd();
    const suffix = trimmed.length > 0 ? `\n\n${attributionToken}.` : `${attributionToken}.`;
    return `${trimmed}${suffix}`;
  }

  private buildRateLimitSuggestion(): SuggestionData {
    const providerName = this.getProviderName();
    return {
      type: 'LLM_RATE_LIMIT',
      severity: 'info',
      title: `${providerName} rate limit reached`,
      description: this.appendAttribution(
        `${providerName} requests are temporarily paused to respect rate limits. Suggestions will resume automatically shortly.`,
      ),
    };
  }

  private buildFallbackSuggestion(reason: string): SuggestionData {
    const providerName = this.getProviderName();
    return {
      type: 'LLM_FALLBACK',
      severity: 'info',
      title: `${providerName} suggestions unavailable`,
      description: this.appendAttribution(reason),
    };
  }

  private getProviderName(): string {
    switch (this.config.provider) {
      case 'openai':
        return 'OpenAI';
      case 'anthropic':
        return 'Anthropic Claude';
      case 'ollama':
        return 'Local AI';
      default:
        return 'LLM provider';
    }
  }
}

const DEFAULT_SYSTEM_PROMPT =
  'You are an expert front-end performance engineer. Generate concise, high impact optimization suggestions based on the provided bundle analysis data.';

class RateLimiter {
  private readonly windowMs = 60_000;
  private timestamps: number[] = [];
  private limit: number;

  constructor(
    limit: number,
    private readonly now: () => number,
  ) {
    this.limit = Math.max(1, Math.floor(limit));
  }

  tryConsume(): boolean {
    const current = this.now();
    const startWindow = current - this.windowMs;
    this.timestamps = this.timestamps.filter((timestamp) => timestamp >= startWindow);

    if (this.timestamps.length >= this.limit) {
      return false;
    }

    this.timestamps.push(current);
    return true;
  }

  updateLimit(limit: number): void {
    this.limit = Math.max(1, Math.floor(limit));
  }
}

function normalizeString(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function normalizeSeverity(value: unknown): 'critical' | 'warning' | 'info' {
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'critical' || normalized === 'warning' || normalized === 'info') {
      return normalized;
    }
    if (normalized === 'high' || normalized === 'severe') {
      return 'critical';
    }
    if (normalized === 'medium') {
      return 'warning';
    }
  }
  return 'info';
}

function normalizeLinks(value: unknown): SuggestionData['links'] {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const links = value
    .map((entry) => {
      if (!entry || typeof entry !== 'object') {
        return undefined;
      }
      const record = entry as Record<string, unknown>;
      const entityTypeRaw = normalizeString(record.entityType) ?? '';
      const entityType = normalizeEntityType(entityTypeRaw);
      if (!entityType) {
        return undefined;
      }

      const entityPath = normalizeString(record.entityPath);
      return {
        entityType,
        entityPath,
      };
    })
    .filter((link): link is NonNullable<typeof link> => Boolean(link));

  return links.length > 0 ? links : undefined;
}

function normalizeEntityType(
  value: string,
): NonNullable<SuggestionData['links']>[number]['entityType'] | undefined {
  const normalized = value.trim().toLowerCase();
  switch (normalized) {
    case 'module':
      return 'Module';
    case 'symbol':
      return 'Symbol';
    case 'dependency':
    case 'dependencies':
      return 'Dependency';
    case 'chunk':
      return 'Chunk';
    default:
      return undefined;
  }
}

function formatBytes(size: number | undefined): string {
  if (size === undefined || !Number.isFinite(size)) {
    return 'unknown';
  }

  if (size < 1024) {
    return `${size}B`;
  }
  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)}KB`;
  }
  return `${(size / (1024 * 1024)).toFixed(1)}MB`;
}

function acquireRateLimiter(config: LLMIntegrationConfig, now: () => number): RateLimiter {
  if (now !== Date.now) {
    return new RateLimiter(config.rateLimitPerMinute, now);
  }

  const key = `${config.provider}:${config.apiBaseUrl}`;
  const existing = rateLimiterRegistry.get(key);

  if (existing) {
    existing.updateLimit(config.rateLimitPerMinute);
    return existing;
  }

  const limiter = new RateLimiter(config.rateLimitPerMinute, now);
  rateLimiterRegistry.set(key, limiter);
  return limiter;
}
