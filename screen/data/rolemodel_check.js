export const ROLEMODEL_CHECK_REASONS = {
  MISSING_PROVIDER: 'missing_provider',
  MISSING_MODEL: 'missing_model',
  PROVIDER_NOT_FOUND: 'provider_not_found',
  MISSING_BASE_URL: 'missing_base_url',
  INVALID_ACTIVE_PROVIDER: 'invalid_active_provider',
  EMPTY_REGISTRY_OR_RESET_STATE: 'empty_registry_or_reset_state',
};

const normalizeName = value => String(value || '').trim().toLowerCase();
const trimValue = value => String(value || '').trim();

export async function evaluateRoleModelConfig(agent) {
  const builtin = (await agent.readBuiltinRegistry?.()) || {};
  const custom = (await agent.readCustomRegistry?.()) || {};
  const activeState = (await agent.readActiveProvider?.()) || {};
  const loadedConfig = agent.state?.llmConfig || agent.currentLLMConfig || (await agent.loadLLMConfig?.()) || null;

  const activeProvider = normalizeName(activeState?.name || loadedConfig?.provider || '');
  const builtinNames = Object.keys(builtin || {});
  const customNames = Object.keys(custom || {});
  const registryNames = Array.from(new Set([...builtinNames, ...customNames]));
  const hasRegistryEntries = registryNames.length > 0;

  if (!activeProvider) {
    return {
      ok: false,
      reason: hasRegistryEntries ? ROLEMODEL_CHECK_REASONS.MISSING_PROVIDER : ROLEMODEL_CHECK_REASONS.EMPTY_REGISTRY_OR_RESET_STATE,
      activeProvider: '',
      activeState,
      loadedConfig,
      builtin,
      custom,
    };
  }

  const resolved = (await agent.resolveProviderDef?.(activeProvider)) || null;
  if (!resolved?.def) {
    return {
      ok: false,
      reason: hasRegistryEntries ? ROLEMODEL_CHECK_REASONS.PROVIDER_NOT_FOUND : ROLEMODEL_CHECK_REASONS.INVALID_ACTIVE_PROVIDER,
      activeProvider,
      activeState,
      loadedConfig,
      builtin,
      custom,
    };
  }

  const sourceEntry = resolved.source === 'custom' ? custom?.[activeProvider] || null : builtin?.[activeProvider] || null;
  const baseUrl = activeProvider === 'xkeva'
    ? trimValue(resolved?.def?.baseUrl || loadedConfig?.baseUrl || sourceEntry?.baseUrl || '')
    : trimValue(sourceEntry?.baseUrl || loadedConfig?.baseUrl || resolved?.def?.baseUrl || '');
  const model = trimValue(sourceEntry?.model || loadedConfig?.model || resolved?.def?.defaultModel || '');

  if (!activeState?.name && !loadedConfig?.provider) {
    return {
      ok: false,
      reason: ROLEMODEL_CHECK_REASONS.INVALID_ACTIVE_PROVIDER,
      activeProvider,
      activeState,
      loadedConfig,
      builtin,
      custom,
    };
  }

  if (!baseUrl) {
    return {
      ok: false,
      reason: ROLEMODEL_CHECK_REASONS.MISSING_BASE_URL,
      activeProvider,
      activeState,
      loadedConfig,
      builtin,
      custom,
      resolved,
    };
  }

  if (!model) {
    return {
      ok: false,
      reason: ROLEMODEL_CHECK_REASONS.MISSING_MODEL,
      activeProvider,
      activeState,
      loadedConfig,
      builtin,
      custom,
      resolved,
    };
  }

  return {
    ok: true,
    reason: null,
    activeProvider,
    activeState,
    loadedConfig: {
      provider: activeProvider,
      baseUrl,
      model,
      apiKey: trimValue(sourceEntry?.apiKey || loadedConfig?.apiKey || ''),
    },
    builtin,
    custom,
    resolved,
  };
}
