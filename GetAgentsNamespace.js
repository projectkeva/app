import BlueApp from './BlueApp';
import BlueElectrum from './BlueElectrum';
import { HDSegwitP2SHWallet } from './class';
import { createKevaNamespace } from './class/keva-ops';
import { FALLBACK_DATA_PER_BYTE_FEE } from './models/networkTransactionFees';

async function ensureAppReady() {
  await BlueApp.startAndDecrypt();
  await BlueApp.waitForStart();
  await BlueElectrum.ping();
  await BlueElectrum.waitTillConnected();
}

function resolveNamespaceName(rawName) {
  if (typeof rawName === 'string') {
    const trimmed = rawName.trim();
    if (trimmed.length > 0) {
      return trimmed;
    }
  }
  return 'Agent';
}

export async function handleGetAgentsNamespaceRequest(request, sendMessage) {
  const payload = (request && request.payload) || {};
  const namespaceName = resolveNamespaceName(payload.name);
  const requestId = payload.requestId || null;
  const respond = result => {
    if (typeof sendMessage === 'function') {
      sendMessage({
        type: 'getagents_create_namespace_result',
        payload: {
          requestId,
          ...result,
        },
      });
    }
  };

  try {
    await ensureAppReady();
    const wallets = BlueApp.getWallets();
    if (!Array.isArray(wallets) || wallets.length === 0) {
      throw new Error('No wallet available');
    }
    const namespaceWallet = wallets.find(w => w && w.type === HDSegwitP2SHWallet.type);
    if (!namespaceWallet) {
      throw new Error('No compatible wallet found');
    }

    const { tx, namespaceId } = await createKevaNamespace(
      namespaceWallet,
      FALLBACK_DATA_PER_BYTE_FEE,
      namespaceName,
    );
    const broadcastResult = await BlueElectrum.broadcast(tx);
    if (broadcastResult && broadcastResult.code) {
      throw new Error(broadcastResult.message || 'Broadcast failed');
    }

    respond({
      success: true,
      namespaceId,
      txid: typeof broadcastResult === 'string' ? broadcastResult : null,
    });
    try {
      await BlueApp.saveToDisk();
    } catch (saveError) {
      console.warn('GetAgentsNamespace: failed to persist after creation', saveError);
    }
  } catch (error) {
    console.warn('GetAgentsNamespace: namespace creation failed', error);
    respond({
      success: false,
      error: (error && error.message) || String(error),
    });
  }
}
