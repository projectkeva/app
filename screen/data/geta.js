import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import BlueElectrum from '../../BlueElectrum';
import { handleGetAgentsNamespaceRequest } from '../../GetAgentsNamespace';
import KevaColors from '../../common/KevaColors';
import { THIN_BORDER } from '../../util';

const ENTRY_COUNT = 12;
const BLOCK_INTERVAL_MS = 2 * 60 * 1000;
const BUTTON_THROTTLE_MS = 1000;
const DEFAULT_NAMESPACE_NAME = 'Agent';

function formatBlock(height) {
  return String(height).padStart(7, '0');
}

function formatDateTime(date) {
  if (!(date instanceof Date)) {
    return '';
  }
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  const ss = String(date.getSeconds()).padStart(2, '0');
  return `${y}-${m}-${d} ${hh}:${mm}:${ss}`;
}

function formatDuration(ms) {
  if (!Number.isFinite(ms)) {
    return '';
  }
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function describeTimer(targetDate, nowMs) {
  if (!(targetDate instanceof Date)) {
    return '';
  }
  const targetMs = targetDate.getTime();
  const delta = targetMs - nowMs;
  const label = formatDuration(Math.abs(delta));
  if (!label) {
    return '';
  }
  if (delta > 0) {
    return `Starts in ${label}`;
  }
  if (Math.abs(delta) < 10000) {
    return 'Live now';
  }
  return `${label} ago`;
}

function buildEntries(baseHeight, baseTimestampMs) {
  if (!Number.isFinite(baseHeight) || !Number.isFinite(baseTimestampMs)) {
    return [];
  }
  const entries = [];
  for (let i = 0; i < ENTRY_COUNT; i += 1) {
    const block = baseHeight + i;
    const date = new Date(baseTimestampMs + i * BLOCK_INTERVAL_MS);
    const isRefresh = i === 0;
    const enableAction = i <= 1;
    entries.push({
      id: `${block}`,
      block,
      date,
      isRefresh,
      enableAction,
    });
  }
  return entries;
}

function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

export default function GetAgentsScreen() {
  const [baseBlock, setBaseBlock] = useState(null);
  const [status, setStatus] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [creationState, setCreationState] = useState({ busy: false, message: null, error: null });
  const lastActionRef = useRef(0);
  const nowMs = useNow();

  const entries = useMemo(() => {
    if (!baseBlock) {
      return [];
    }
    return buildEntries(baseBlock.height, baseBlock.timestampMs);
  }, [baseBlock]);

  const loadTimeline = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const latestHeader = await BlueElectrum.getLatestHeaderSimple();
      const timestampSeconds = Number(latestHeader.timestamp);
      if (!Number.isFinite(timestampSeconds)) {
        throw new Error('Electrum timestamp unavailable');
      }
      const timestampMs = timestampSeconds > 1e12
        ? timestampSeconds
        : timestampSeconds * 1000;
      setBaseBlock({
        height: latestHeader.height,
        timestampMs,
      });
      if (latestHeader.host) {
        const port = latestHeader.ssl ? `:${latestHeader.ssl}` : '';
        setStatus(`Live via ${latestHeader.host}${port}`);
      } else {
        setStatus('Live via Kevacoin Electrum');
      }
    } catch (err) {
      console.warn('GetAgentsScreen: failed to load timeline', err);
      setError(err?.message || String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTimeline();
  }, [loadTimeline]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadTimeline();
    setRefreshing(false);
  }, [loadTimeline]);

  const handleNamespaceResult = useCallback((payload) => {
    if (payload?.success) {
      setCreationState({
        busy: false,
        error: null,
        message: `Namespace created! ID: ${payload.namespaceId || 'unknown'}`,
      });
    } else {
      setCreationState({
        busy: false,
        message: null,
        error: payload?.error || 'Namespace creation failed',
      });
    }
  }, []);

  const requestNamespaceCreation = useCallback(async (blockLabel) => {
    const now = Date.now();
    if (now - lastActionRef.current < BUTTON_THROTTLE_MS) {
      return;
    }
    lastActionRef.current = now;
    if (creationState.busy) {
      return;
    }
    setCreationState({ busy: true, message: null, error: null });
    try {
      await handleGetAgentsNamespaceRequest(
        { payload: { name: DEFAULT_NAMESPACE_NAME, requestId: `${now}` } },
        (message) => handleNamespaceResult(message?.payload),
      );
    } catch (err) {
      console.warn('GetAgentsScreen: namespace creation failed', err);
      setCreationState({ busy: false, message: null, error: err?.message || String(err) });
    }
  }, [creationState.busy, handleNamespaceResult]);

  const handleEntryAction = useCallback((entry) => {
    if (!entry || !entry.enableAction) {
      return;
    }
    if (entry.isRefresh) {
      loadTimeline();
      return;
    }
    const blockLabel = `BLOCK ${formatBlock(entry.block)}`;
    requestNamespaceCreation(blockLabel);
  }, [loadTimeline, requestNamespaceCreation]);

  const renderEntry = useCallback(({ item }) => {
    const timer = describeTimer(item.date, nowMs);
    const blockLabel = `BLOCK ${formatBlock(item.block)}`;
    const actionLabel = item.isRefresh ? 'Reload ID' : 'Get Agents';
    const showAction = item.enableAction;
    const disableAction = creationState.busy && !item.isRefresh;
    return (
      <View style={styles.entry}>
        <View style={styles.entryHeader}>
          <View>
            <Text style={styles.entryDate}>{formatDateTime(item.date)}</Text>
            <Text style={styles.entryBlock}>{blockLabel}</Text>
          </View>
          {showAction ? (
            <TouchableOpacity
              onPress={() => handleEntryAction(item)}
              disabled={disableAction || (item.isRefresh ? loading : false)}
              style={[styles.entryButton, (disableAction || (item.isRefresh && loading)) && styles.entryButtonDisabled]}
            >
              <Text style={styles.entryButtonText}>{item.isRefresh ? (loading ? 'Refreshing…' : actionLabel) : (creationState.busy ? 'Please wait…' : actionLabel)}</Text>
            </TouchableOpacity>
          ) : null}
        </View>
        <Text style={styles.timerText}>{timer}</Text>
      </View>
    );
  }, [creationState.busy, handleEntryAction, loading, nowMs]);

  const listHeader = useMemo(() => (
    <View style={styles.header}>
      <Text style={styles.title}>Get Agents</Text>
      <Text style={styles.subtitle}>Live namespace timeline backed by the Kevacoin Electrum service.</Text>
      {status ? <Text style={styles.status}>{status}</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {creationState.message ? <Text style={styles.success}>{creationState.message}</Text> : null}
      {creationState.error ? <Text style={styles.error}>{creationState.error}</Text> : null}
    </View>
  ), [status, error, creationState]);

  if (!baseBlock && loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={KevaColors.actionText} />
        <Text style={styles.loadingText}>Loading latest block…</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={entries}
        keyExtractor={(item) => item.id}
        renderItem={renderEntry}
        ListHeaderComponent={listHeader}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={KevaColors.actionText} />}
        ListEmptyComponent={!loading ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>Unable to load timeline.</Text>
          </View>
        ) : null}
        contentContainerStyle={styles.listContent}
      />
    </SafeAreaView>
  );
}

GetAgentsScreen.navigationOptions = () => ({
  title: 'Get Agents',
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#040608',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#040608',
  },
  loadingText: {
    marginTop: 12,
    color: KevaColors.lightText,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 12,
  },
  title: {
    color: '#f3f8ff',
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 6,
  },
  subtitle: {
    color: KevaColors.inactiveText,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  status: {
    color: '#59fbea',
    fontSize: 13,
    marginBottom: 6,
  },
  error: {
    color: '#ff6b6b',
    fontSize: 13,
    marginBottom: 6,
  },
  success: {
    color: '#6bff95',
    fontSize: 13,
    marginBottom: 6,
  },
  listContent: {
    paddingBottom: 32,
  },
  entry: {
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 16,
    borderRadius: 14,
    backgroundColor: '#0f2224',
    borderWidth: THIN_BORDER,
    borderColor: 'rgba(65,120,125,0.4)',
  },
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  entryDate: {
    color: '#f3f8ff',
    fontSize: 16,
    fontWeight: '600',
  },
  entryBlock: {
    color: '#8fa3ad',
    fontSize: 12,
    marginTop: 4,
  },
  entryButton: {
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#1a5d57',
    borderWidth: 1,
    borderColor: '#2aa197',
  },
  entryButtonDisabled: {
    opacity: 0.5,
  },
  entryButtonText: {
    color: '#e7fff9',
    fontSize: 13,
    fontWeight: '600',
  },
  timerText: {
    color: '#59fbea',
    fontSize: 12,
    marginTop: 12,
  },
  empty: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    color: KevaColors.inactiveText,
  },
});
