/**
 * @exports {AppStorage}
 */
import { AppStorage } from './class';
import DeviceQuickActions from './class/quickActions';
let prompt = require('./prompt');
let EV = require('./events');
let loc = require('./loc');

let startPromise = null;
let hasAttemptedStart = false;

/** @type {AppStorage} */
const BlueApp = new AppStorage();

async function performStart(retry) {
  console.log('startAndDecrypt');
  let password = false;
  if (await BlueApp.storageIsEncrypted()) {
    DeviceQuickActions.clearShortcutItems();
    do {
      password = await prompt((retry && loc._.bad_password) || loc._.enter_password, loc._.storage_is_encrypted, false);
    } while (!password);
  }
  let success = await BlueApp.loadFromDisk(password);
  if (success) {
    console.log('loaded from disk');
    EV(EV.enum.WALLETS_COUNT_CHANGED);
    EV(EV.enum.TRANSACTIONS_COUNT_CHANGED);
  }

  if (!success && password) {
    // we had password and yet could not load/decrypt
    return performStart(true);
  }
}

async function startAndDecrypt(retry) {
  if (BlueApp.getWallets().length > 0) {
    console.log('App already has some wallets, so we are in already started state, exiting startAndDecrypt');
    hasAttemptedStart = true;
    return;
  }

  if (hasAttemptedStart && !retry) {
    return;
  }

  if (!startPromise) {
    startPromise = performStart(retry)
      .catch(err => {
        // surface the error to callers but keep our internal state consistent
        throw err;
      })
      .finally(() => {
        hasAttemptedStart = true;
        startPromise = null;
      });
  }

  return startPromise;
}

function waitForStart() {
  if (startPromise) {
    return startPromise;
  }
  return Promise.resolve();
}

BlueApp.startAndDecrypt = startAndDecrypt;
BlueApp.waitForStart = waitForStart;

module.exports = BlueApp;
