import type { SuggestionRule, SuggestionContext } from '../../suggestions/types.js';
import type { SuggestionData } from '../db/writer.js';
import {
  loadLLMConfig,
  type LLMIntegrationConfig,
  type PartialLLMIntegrationConfig,
} from '../../config/llm.js';

/**
 * Options for the LLM analyzer
 */
export interface LLMAnalyzerOptions {
  /** Optional configuration overrides */
  config?: PartialLLMIntegrationConfig | LLMIntegrationConfig;
  /** Custom LLM client implementation (useful for testing) */
  client?: LLMClient;
  /** Custom fetch implementation (node-fetch, mocks, etc.) */
  fetchImpl?: typeof fetch;
  /** Custom time provider for rate limiting */
  now?: () => number;
}

/**
 * LLM client interface
 */
export interface LLMClient {
  /** Generate content from the provider */
  generate(request: LLMGenerationRequest): Promise<string>;
  /** Human readable provider name */
  providerName(): string;
}

/**
 * LLM generation request
 */
export interface LLMGenerationRequest {
  systemPrompt: string;
  userPrompt: string;
  maxTokens: number;
  temperature: number;
}

/**
 * Analyzer that delegates suggestion generation to an LLM provider
 */
const rateLimiterRegistry = new Map<string, RateLimiter>();

export class LLMAnalyzer implements SuggestionRule {
  readonly id = 'llm-advanced-analyzer';
  readonly name = 'LLM-Powered Analyzer';
  readonly description = 'Generates contextual bundle analysis suggestions using LLM providers';

  private readonly config: LLMIntegrationConfig;
  private readonly client?: LLMClient;
  private readonly rateLimiter?: RateLimiter;
  private readonly now: () => number;

  constructor(options: LLMAnalyzerOptions = {}) {
    const resolvedConfig =
      'enabled' in (options.config ?? {}) && 'apiBaseUrl' in (options.config ?? {})
        ? (options.config as LLMIntegrationConfig)
        : loadLLMConfig(options.config as PartialLLMIntegrationConfig | undefined);

    this.config = resolvedConfig;
    this.now = options.now ?? Date.now;

    if (this.config.enabled) {
      this.client = options.client ?? createLLMClient(this.config, options.fetchImpl);

      if (this.config.rateLimitPerMinute > 0) {
        this.rateLimiter = acquireRateLimiter(this.config, this.now);
      }
    } else {
      this.client = undefined;
    }
  }

  async execute(context: SuggestionContext): Promise<SuggestionData[]> {
    if (!this.config.enabled || !this.client) {
      return [];
    }

    if (this.rateLimiter && !this.rateLimiter.tryConsume()) {
      return [this.buildRateLimitSuggestion()];
    }

    const userPrompt = this.buildPrompt(context);
    if (!userPrompt) {
      return [];
    }

    const request: LLMGenerationRequest = {
      systemPrompt: DEFAULT_SYSTEM_PROMPT,
      userPrompt,
      maxTokens: this.config.maxTokens,
      temperature: this.config.temperature,
    };

    try {
      const response = await this.client.generate(request);
      const suggestions = this.parseSuggestions(response);

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
      const rawSize = (bundle as Record<string, unknown>).size;
      const size = typeof rawSize === 'number' ? formatBytes(rawSize) : undefined;
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
- Prefer three to five suggestions prioritised by impact.
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
    const providerName = this.client?.providerName() ?? 'LLM provider';
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
    const providerName = this.client?.providerName() ?? 'LLM provider';
    return {
      type: 'LLM_FALLBACK',
      severity: 'info',
      title: `${providerName} suggestions unavailable`,
      description: this.appendAttribution(reason),
    };
  }
}

const DEFAULT_SYSTEM_PROMPT =
  'You are an expert front-end performance engineer. Generate concise, high impact optimisation suggestions based on the provided bundle analysis data.';

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
): SuggestionData['links'][number]['entityType'] | undefined {
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

function createLLMClient(
  config: LLMIntegrationConfig,
  fetchImpl: typeof fetch = globalThis.fetch,
): LLMClient {
  if (typeof fetchImpl !== 'function') {
    throw new Error('A fetch implementation is required for LLM integration.');
  }

  switch (config.provider) {
    case 'openai':
      return new OpenAIClient(config, fetchImpl);
    case 'anthropic':
      return new AnthropicClient(config, fetchImpl);
    default:
      throw new Error(`Unsupported LLM provider: ${config.provider}`);
  }
}

class OpenAIClient implements LLMClient {
  constructor(
    private readonly config: LLMIntegrationConfig,
    private readonly fetchImpl: typeof fetch,
  ) {}

  providerName(): string {
    return 'OpenAI';
  }

  async generate(request: LLMGenerationRequest): Promise<string> {
    const body = {
      model: this.config.model,
      messages: [
        { role: 'system', content: request.systemPrompt },
        { role: 'user', content: request.userPrompt },
      ],
      max_tokens: request.maxTokens,
      temperature: request.temperature,
    };

    const response = await this.performRequest('/chat/completions', body, {
      Authorization: `Bearer ${this.config.apiKey}`,
    });

    const content = response?.choices?.[0]?.message?.content;
    if (typeof content !== 'string' || content.trim().length === 0) {
      throw new Error('OpenAI response did not include content.');
    }

    return content;
  }

  private async performRequest(path: string, body: unknown, extraHeaders: Record<string, string>) {
    const url = `${this.config.apiBaseUrl}${path}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.requestTimeoutMs);

    try {
      const response = await this.fetchImpl(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...extraHeaders,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!response.ok) {
        const text = await safeReadText(response);
        throw new Error(`OpenAI API error (${response.status}): ${text}`);
      }

      return response.json();
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        throw new Error('OpenAI request timed out.');
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }
}

class AnthropicClient implements LLMClient {
  constructor(
    private readonly config: LLMIntegrationConfig,
    private readonly fetchImpl: typeof fetch,
  ) {}

  providerName(): string {
    return 'Anthropic Claude';
  }

  async generate(request: LLMGenerationRequest): Promise<string> {
    const body = {
      model: this.config.model,
      max_tokens: request.maxTokens,
      temperature: request.temperature,
      system: request.systemPrompt,
      messages: [
        {
          role: 'user',
          content: request.userPrompt,
        },
      ],
    };

    const response = await this.performRequest('/messages', body, {
      'x-api-key': this.config.apiKey,
      'anthropic-version': '2023-06-01',
    });

    const contentSegments = Array.isArray(response?.content) ? response.content : [];
    const combined = contentSegments
      .map((segment: { text?: string }) => segment?.text)
      .filter((text): text is string => typeof text === 'string')
      .join('\n');

    if (combined.trim().length === 0) {
      throw new Error('Anthropic response did not include content.');
    }

    return combined;
  }

  private async performRequest(path: string, body: unknown, extraHeaders: Record<string, string>) {
    const url = `${this.config.apiBaseUrl}${path}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.requestTimeoutMs);

    try {
      const response = await this.fetchImpl(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...extraHeaders,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!response.ok) {
        const text = await safeReadText(response);
        throw new Error(`Anthropic API error (${response.status}): ${text}`);
      }

      return response.json();
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        throw new Error('Anthropic request timed out.');
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }
}

async function safeReadText(response: Response): Promise<string> {
  try {
    return await response.text();
  } catch {
    return '<failed to read response body>';
  }
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
