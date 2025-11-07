/**
 * LLM configuration utilities
 * Provides strongly typed configuration for LLM integrations
 */

export type LLMProviderId = 'openai' | 'anthropic';

/**
 * Resolved configuration for LLM integration
 */
export interface LLMIntegrationConfig {
  /** Whether LLM-powered suggestions are enabled */
  enabled: boolean;
  /** Selected provider identifier */
  provider: LLMProviderId;
  /** Provider API key */
  apiKey: string;
  /** Base URL for the provider API */
  apiBaseUrl: string;
  /** Model identifier */
  model: string;
  /** Maximum tokens to request */
  maxTokens: number;
  /** Sampling temperature */
  temperature: number;
  /** Rate limit in requests per minute */
  rateLimitPerMinute: number;
  /** Request timeout in milliseconds */
  requestTimeoutMs: number;
  /** Attribution text appended to generated suggestions */
  attribution: string;
}

/**
 * Partial configuration overrides
 */
export type PartialLLMIntegrationConfig = Partial<
  Omit<LLMIntegrationConfig, 'provider' | 'apiKey'>
> &
  Partial<Pick<LLMIntegrationConfig, 'provider' | 'apiKey'>>;

const PROVIDER_DEFAULTS: Record<LLMProviderId, Omit<LLMIntegrationConfig, 'enabled' | 'apiKey'>> = {
  openai: {
    provider: 'openai',
    apiBaseUrl: 'https://api.openai.com/v1',
    model: 'gpt-4o-mini',
    maxTokens: 512,
    temperature: 0.25,
    rateLimitPerMinute: 60,
    requestTimeoutMs: 15000,
    attribution: 'Generated with OpenAI',
  },
  anthropic: {
    provider: 'anthropic',
    apiBaseUrl: 'https://api.anthropic.com/v1',
    model: 'claude-3-5-sonnet-20241022',
    maxTokens: 512,
    temperature: 0.2,
    rateLimitPerMinute: 45,
    requestTimeoutMs: 20000,
    attribution: 'Generated with Anthropic Claude',
  },
};

/**
 * Load LLM configuration from environment variables with optional overrides.
 *
 * Environment variables:
 * - `SMAPPY_LLM_ENABLED`: boolean (default: false)
 * - `SMAPPY_LLM_PROVIDER`: `openai` | `anthropic`
 * - `SMAPPY_LLM_MODEL`: model identifier override
 * - `SMAPPY_LLM_MAX_TOKENS`: integer
 * - `SMAPPY_LLM_TEMPERATURE`: float
 * - `SMAPPY_LLM_RATE_LIMIT`: integer (requests per minute)
 * - `SMAPPY_LLM_TIMEOUT_MS`: integer (milliseconds)
 * - `SMAPPY_LLM_ATTRIBUTION`: attribution string
 * - `SMAPPY_OPENAI_API_KEY` / `SMAPPY_ANTHROPIC_API_KEY`: provider specific keys
 * - `SMAPPY_LLM_API_BASE_URL`: override API base URL
 */
export function loadLLMConfig(
  overrides: PartialLLMIntegrationConfig = {},
  env: NodeJS.ProcessEnv = process.env,
): LLMIntegrationConfig {
  const enabled = parseBoolean(overrides.enabled, env.SMAPPY_LLM_ENABLED) ?? false;

  const provider = resolveProvider(overrides.provider, env.SMAPPY_LLM_PROVIDER);

  const defaults = PROVIDER_DEFAULTS[provider];

  const apiKey = overrides.apiKey ?? resolveApiKey(provider, env);

  if (!enabled) {
    // Return defaults but keep enabled flag false and blank API key for clarity
    return {
      ...defaults,
      enabled: false,
      apiKey: apiKey ?? '',
    };
  }

  if (!apiKey) {
    throw new Error(`LLM integration enabled but API key for provider "${provider}" is missing.`);
  }

  const model = overrides.model ?? env.SMAPPY_LLM_MODEL ?? defaults.model;
  const maxTokens = numberFrom(overrides.maxTokens, env.SMAPPY_LLM_MAX_TOKENS, defaults.maxTokens);
  const temperature = numberFrom(
    overrides.temperature,
    env.SMAPPY_LLM_TEMPERATURE,
    defaults.temperature,
  );
  const rateLimitPerMinute = numberFrom(
    overrides.rateLimitPerMinute,
    env.SMAPPY_LLM_RATE_LIMIT,
    defaults.rateLimitPerMinute,
  );
  const requestTimeoutMs = numberFrom(
    overrides.requestTimeoutMs,
    env.SMAPPY_LLM_TIMEOUT_MS,
    defaults.requestTimeoutMs,
  );
  const apiBaseUrlRaw = overrides.apiBaseUrl ?? env.SMAPPY_LLM_API_BASE_URL ?? defaults.apiBaseUrl;
  const apiBaseUrl = apiBaseUrlRaw.trim();
  const attribution = overrides.attribution ?? env.SMAPPY_LLM_ATTRIBUTION ?? defaults.attribution;

  return {
    enabled: true,
    provider,
    apiKey,
    apiBaseUrl: trimTrailingSlash(apiBaseUrl),
    model,
    maxTokens,
    temperature,
    rateLimitPerMinute,
    requestTimeoutMs,
    attribution,
  };
}

/**
 * Resolve provider, defaulting to OpenAI for backwards compatibility
 */
function resolveProvider(
  override: LLMProviderId | undefined,
  envValue: string | undefined,
): LLMProviderId {
  if (override && isSupportedProvider(override)) {
    return override;
  }

  if (envValue && isSupportedProvider(envValue as LLMProviderId)) {
    return envValue as LLMProviderId;
  }

  return 'openai';
}

function isSupportedProvider(provider: string): provider is LLMProviderId {
  return provider === 'openai' || provider === 'anthropic';
}

function parseBoolean(
  override: boolean | undefined,
  envValue: string | undefined,
): boolean | undefined {
  if (typeof override === 'boolean') {
    return override;
  }
  if (envValue === undefined) {
    return undefined;
  }
  return ['1', 'true', 'yes', 'on'].includes(envValue.toLowerCase());
}

function numberFrom(
  override: number | undefined,
  envValue: string | undefined,
  fallback: number,
): number {
  if (typeof override === 'number' && Number.isFinite(override)) {
    return override;
  }
  if (envValue !== undefined) {
    const parsed = Number(envValue);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return fallback;
}

function resolveApiKey(provider: LLMProviderId, env: NodeJS.ProcessEnv): string | undefined {
  if (provider === 'openai') {
    return env.SMAPPY_OPENAI_API_KEY;
  }
  if (provider === 'anthropic') {
    return env.SMAPPY_ANTHROPIC_API_KEY;
  }
  return undefined;
}

function trimTrailingSlash(url: string): string {
  return url.endsWith('/') ? url.slice(0, -1) : url;
}
