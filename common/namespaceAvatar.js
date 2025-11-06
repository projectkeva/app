import { Platform } from 'react-native';
const createHash = require('create-hash');

const HEAD_IMAGE_COUNT = 1000;
const ANDROID_ASSET_BASE_PATH = 'os/asset';

const getEpochFromBlock = block => {
  if (typeof block !== 'number' || Number.isNaN(block)) {
    return null;
  }
  if (block < 2000000) {
    return 1;
  }
  if (block < 3000000) {
    return 2;
  }
  return 3;
};

const parseBlockFromShortcode = shortCode => {
  if (shortCode === undefined || shortCode === null) {
    return null;
  }
  const normalized = String(shortCode).trim();
  if (!/^[0-9]+$/.test(normalized) || normalized.length < 2) {
    return null;
  }
  const blockLength = parseInt(normalized[0], 10);
  if (!Number.isFinite(blockLength) || blockLength <= 0 || normalized.length < 1 + blockLength) {
    return null;
  }
  const blockStr = normalized.slice(1, 1 + blockLength);
  const block = parseInt(blockStr, 10);
  if (Number.isNaN(block)) {
    return null;
  }
  return block;
};

const calculateHeadIndex = bytes => {
  let remainder = 0;
  for (let i = 0; i < bytes.length; i++) {
    remainder = (remainder * 256 + bytes[i]) % HEAD_IMAGE_COUNT;
  }
  return remainder + 1;
};

const buildHeadAssetRelativePath = shortCode => {
  const block = parseBlockFromShortcode(shortCode);
  if (block === null) {
    return null;
  }
  const epoch = getEpochFromBlock(block);
  if (epoch === null) {
    return null;
  }
  const seed = createHash('sha256').update(`${shortCode}projectkeva`).digest();
  const headIdx = calculateHeadIndex(seed.slice(0, 8));
  return `${ANDROID_ASSET_BASE_PATH}/ep${epoch}/head/${headIdx}.png`;
};

export const buildHeadAssetUriCandidates = shortCode => {
  if (Platform.OS !== 'android') {
    return [];
  }
  const relativePath = buildHeadAssetRelativePath(shortCode);
  if (!relativePath) {
    return [];
  }
  return [
    `asset:/${relativePath}`,
    `file:///android_asset/${relativePath}`,
  ];
};

export const buildHeadAssetUri = shortCode => {
  const [primary] = buildHeadAssetUriCandidates(shortCode);
  return primary || null;
};

export const __namespaceAvatarInternals = {
  HEAD_IMAGE_COUNT,
  getEpochFromBlock,
  parseBlockFromShortcode,
  calculateHeadIndex,
  buildHeadAssetRelativePath,
};
