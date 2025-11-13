import React from 'react';
import {
  Text,
  View,
  TouchableOpacity,
  FlatList,
  InteractionManager,
  SafeAreaView,
  TextInput,
  LayoutAnimation,
  Keyboard,
  Image as RNImage,
  ActivityIndicator,
} from 'react-native';
const StyleSheet = require('../../PlatformStyleSheet');
const KevaColors = require('../../common/KevaColors');
import { THIN_BORDER, toastError } from '../../util';
import {
  BlueNavigationStyle,
  BlueLoading,
} from '../../BlueComponents';
const loc = require('../../loc');
let BlueApp = require('../../BlueApp');
let BlueElectrum = require('../../BlueElectrum');

import MIcon from 'react-native-vector-icons/MaterialIcons';
import Icon from 'react-native-vector-icons/Ionicons';
import { connect } from 'react-redux'
import { createThumbnail } from "react-native-create-thumbnail";
import { Image } from 'react-native-elements';
import { setMediaInfo, } from '../../actions'
import {
  getHashtagScriptHash, parseSpecialKey, getSpecialKeyText, decodeBase64,
  findTxIndex, getNamespaceInfo,
} from '../../class/keva-ops';
import Toast from 'react-native-root-toast';
import { stringToColor, getInitials, SCREEN_WIDTH, } from "../../util";
import Biometric from '../../class/biometrics';
import { extractMedia, getImageGatewayURL } from './mediaManager';
import { buildHeadAssetUriCandidates } from '../../common/namespaceAvatar';

const PLAY_ICON  = <MIcon name="play-arrow" size={50} color="#fff"/>;
const IMAGE_ICON = <Icon name="ios-image" size={50} color="#fff"/>;
const SELL_HASHTAG = '#NFTs';
const SELL_HASHTAG_BLOCK_WINDOW = 20000;
const SELL_HASHTAG_LOWER = SELL_HASHTAG.toLowerCase();

const formatSalePrice = rawPrice => {
  if (rawPrice === null || typeof rawPrice === 'undefined') {
    return '';
  }
  if (typeof rawPrice === 'string') {
    return rawPrice.trim();
  }
  if (typeof rawPrice === 'number') {
    if (!Number.isFinite(rawPrice)) {
      return '';
    }
    const withPrecision = rawPrice % 1 === 0 ? rawPrice.toString() : rawPrice.toFixed(8);
    return withPrecision.replace(/\.?0+$/, '');
  }
  return String(rawPrice);
};

const selectAvatarCandidateUri = (candidateUris = [], failedUris = [], generatedUri = null) => {
  if (generatedUri) return null;
  for (const candidate of candidateUris) {
    if (!candidate) continue;
    if (failedUris && failedUris.includes(candidate)) continue;
    return candidate;
  }
  return null;
};

class Item extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      loading: false,
      selectedImage: null,
      isRefreshing: false,
      thumbnail: null,
      avatarCandidateUris: [],
      avatarCandidateRequestId: 0,
      avatarFailedUris: [],
      generatedAvatarUri: null,
    };
    this._avatarRequestId = 0;
    this._avatarHandle = null;
    this._isMounted = false;
  }

  onEdit = () => {
    const {navigation, item} = this.props;
    const {walletId, namespaceId} = navigation.state.params;
    navigation.navigate('AddKeyValue', {
      walletId,
      namespaceId,
      key: item.key,
      value: item.value,
    })
  }

  onClose(close) {
    close && close();
    if (this.state.selectedImage) {
      setTimeout(() => this.setState({selectedImage: null}), 50);
    }
  }

  stripHtml = str => {
    return str.replace(/(<([^>]+)>)/gi, "").replace(/(\r\n|\n|\r)/gm, "");
  }

  async componentDidMount() {
    this._isMounted = true;
    this.prepareGeneratedAvatar(this.getShortCode());
    InteractionManager.runAfterInteractions(async () => {
      await this._componentDidMount();
    });
  }

  componentDidUpdate(prevProps) {
    const prevShortCode = this.getShortCode(prevProps);
    const currentShortCode = this.getShortCode();
    if (prevShortCode !== currentShortCode) {
      this.prepareGeneratedAvatar(currentShortCode);
    }
  }

  componentWillUnmount() {
    this._isMounted = false;
    if (this._avatarHandle && typeof this._avatarHandle.cancel === 'function') {
      this._avatarHandle.cancel();
    }
    this._avatarHandle = null;
  }

  getShortCode = (props = this.props) => {
    const { item } = props;
    if (item && item.shortCode) {
      return item.shortCode;
    }
    return null;
  }

  prepareGeneratedAvatar = shortCode => {
    if (this._avatarHandle && typeof this._avatarHandle.cancel === 'function') {
      this._avatarHandle.cancel();
    }

    if (!shortCode) {
      if (this._isMounted) {
        this.setState({
          avatarCandidateUris: [],
          avatarCandidateRequestId: 0,
          avatarFailedUris: [],
          generatedAvatarUri: null,
        });
      }
      this._avatarHandle = null;
      return;
    }

    const requestId = ++this._avatarRequestId;

    const scheduleTask = () => {
      this._avatarHandle = null;
      const candidateUris = buildHeadAssetUriCandidates(shortCode);
      if (!this._isMounted || requestId !== this._avatarRequestId) {
        return;
      }
      if (!candidateUris || candidateUris.length === 0) {
        this.setState({
          avatarCandidateUris: [],
          avatarCandidateRequestId: 0,
          avatarFailedUris: [],
          generatedAvatarUri: null,
        });
        return;
      }
      this.setState(prevState => {
        const prevCandidateUris = prevState.avatarCandidateUris || [];
        const sameCandidates =
          prevCandidateUris.length === candidateUris.length &&
          prevCandidateUris.every((uri, idx) => uri === candidateUris[idx]);
        return {
          avatarCandidateUris: candidateUris,
          avatarCandidateRequestId: requestId,
          avatarFailedUris: sameCandidates ? prevState.avatarFailedUris || [] : [],
          generatedAvatarUri: sameCandidates ? prevState.generatedAvatarUri : null,
        };
      });
    };

    const handle = InteractionManager.runAfterInteractions(() => {
      scheduleTask();
    });

    if (handle && typeof handle.cancel === 'function') {
      this._avatarHandle = handle;
    } else {
      scheduleTask();
    }
  }

  onAvatarLoadSuccess = (uri, requestId) => {
    if (!this._isMounted || requestId !== this._avatarRequestId) {
      return;
    }
    this.setState({
      generatedAvatarUri: uri,
      avatarFailedUris: [],
    });
  }

  onAvatarLoadError = (uri, requestId) => {
    if (!this._isMounted || requestId !== this._avatarRequestId) {
      return;
    }
    this.setState(prevState => {
      const prevFailed = prevState.avatarFailedUris || [];
      if (prevFailed.includes(uri) && prevState.generatedAvatarUri === null) {
        return null;
      }
      return {
        generatedAvatarUri: null,
        avatarFailedUris: prevFailed.concat(uri),
      };
    });
  }

  async _componentDidMount() {
    let {item, mediaInfoList, dispatch} = this.props;
    const {mediaCID, mimeType} = extractMedia(item.value);
    if (!mediaCID || !mimeType.startsWith('video')) {
      return;
    }

    const mediaInfo = mediaInfoList[mediaCID];
    if (mediaInfo) {
      this.setState({thumbnail: mediaInfo.thumbnail, width: mediaInfo.width, height: mediaInfo.height});
      return;
    }

    try {
      let response = await createThumbnail({
        url: getImageGatewayURL(mediaCID),
        timeStamp: 2000,
      });
      dispatch(setMediaInfo(mediaCID, {thumbnail: response.path, width: response.width, height: response.height}));
      this.setState({thumbnail: response.path});
    } catch (err) {
      console.warn(err);
    }
  }

  render() {
    let {item, onShow, currentHashtag} = this.props;
    let {avatarCandidateUris, avatarCandidateRequestId, avatarFailedUris, generatedAvatarUri} = this.state;
    let displayKey = item.key;
    const {keyType} = parseSpecialKey(item.key);
    if (keyType) {
      displayKey = getSpecialKeyText(keyType);
    }

    const avatarCandidateUri = selectAvatarCandidateUri(avatarCandidateUris, avatarFailedUris, generatedAvatarUri);
    const shouldProbeAvatar = !!(avatarCandidateUri && avatarCandidateRequestId === this._avatarRequestId);
    const fallbackInitials = getInitials(item.displayName);
    const fallbackColor = stringToColor(item.displayName);
    const avatarSource = generatedAvatarUri ? { uri: generatedAvatarUri } : undefined;
    const hashtagLower = (currentHashtag || '').trim().toLowerCase();
    const isSellHashtag = hashtagLower === SELL_HASHTAG_LOWER;
    let titleText = displayKey;
    let priceLabel = null;
    if (isSellHashtag) {
      titleText = item.shortCode || displayKey;
      const salePriceText = (item.salePriceText || '').toString().trim();
      if (salePriceText.length > 0) {
        priceLabel = (
          <Text style={styles.priceLabel}>{`${salePriceText} KVA`}</Text>
        );
      }
    }
    const avatarContent = avatarSource ? (
      <View style={styles.generatedAvatarContainer}>
        <Image source={avatarSource} style={styles.generatedAvatarImage} />
      </View>
    ) : (
      <View style={[styles.fallbackAvatar, { backgroundColor: fallbackColor }]}>
        <Text style={styles.fallbackAvatarLabel}>{fallbackInitials}</Text>
      </View>
    );

    return (
      <View style={styles.card}>
        <TouchableOpacity onPress={() => onShow(item)}>
          <View style={{flex:1,paddingHorizontal:10,paddingTop:2}}>
            <View style={styles.headerRow}>
              <View style={styles.avatarWrapper}>
                {shouldProbeAvatar && (
                  <Image
                    source={{ uri: avatarCandidateUri }}
                    style={styles.avatarProbe}
                    onLoad={() => this.onAvatarLoadSuccess(avatarCandidateUri, avatarCandidateRequestId)}
                    onError={() => this.onAvatarLoadError(avatarCandidateUri, avatarCandidateRequestId)}
                  />
                )}
                {avatarContent}
              </View>
              <View style={styles.headerTextContainer}>
                <Text style={styles.keyDesc} numberOfLines={1} ellipsizeMode="tail">{titleText}</Text>
                {priceLabel}
              </View>
            </View>
          </View>
        </TouchableOpacity>
      </View>
    )
  }
}

class HashtagExplore extends React.Component {

  constructor() {
    super();
    this.state = {
      loaded: false,
      isModalVisible: false,
      currentPage: 0,
      showDeleteModal: false,
      isRefreshing: false,
      loading: false,
      isLoadingMore: false,
      min_tx_num: -1,
      totalToFetch: 0,
      fetched: 0,
      inputMode: false,
      hashtag: SELL_HASHTAG,
      searched: false,
      hashtags: [],
      saleStatusCache: {},
      latestBlockHeight: undefined,
      hasMoreWithinWindow: true,
    };
    this.onEndReachedCalledDuringMomentum = true;
  }

  static navigationOptions = ({ navigation }) => ({
    ...BlueNavigationStyle(),
    headerShown: false,
  });

  progressCallback = (totalToFetch, fetched) => {
    this.setState({totalToFetch, fetched});
  }

  onSearchHashtag = async () => {
    Keyboard.dismiss();
    this.setState({min_tx_num: -1, loading: true, hashtags: [], latestBlockHeight: undefined, hasMoreWithinWindow: true});
    await this.fetchHashtag(-1);
    this.setState({loading: false});
  }

  fetchHashtag = async (min_tx_num) => {
    const {reactions} = this.props;
    /*
      Data returned by ElectrumX API
      {
        hashtags: [{
          'tx_hash': hash_to_hex_str(tx_hash),
          'displayName': display_name,
          'height': height, 'shortCode': shortCode,
          'time': timestamp,
          'replies': replies, 'shares': shares, 'likes': likes,
          'namespace': namespaceId,
          'key': key,
          'value': value,
          'type': REG|PUT|DEL|UNK
        }],
        min_tx_num: 123
      }
    */
    const {hashtags} = this.state;
    const hashtag = this.state.hashtag.trim();
    const hashtagLower = hashtag.toLowerCase();

    let latestBlockHeight = this.state.latestBlockHeight;
    let minAllowedHeight = null;
    const shouldRestrictByHeight = hashtagLower === SELL_HASHTAG_LOWER;
    if (shouldRestrictByHeight && !Number.isFinite(latestBlockHeight)) {
      try {
        latestBlockHeight = await BlueElectrum.blockchainBlock_count();
      } catch (err) {
        console.warn(err);
        latestBlockHeight = undefined;
      }
    }
    if (shouldRestrictByHeight && Number.isFinite(latestBlockHeight)) {
      minAllowedHeight = Math.max(0, latestBlockHeight - SELL_HASHTAG_BLOCK_WINDOW);
    }

    let history = await BlueElectrum.blockchainKeva_getHashtag(getHashtagScriptHash(hashtag), min_tx_num);
    if (history.hashtags.length == 0) {
      this.setState({searched: true, latestBlockHeight});
      return;
    }

    const filteredByHeight = history.hashtags.filter(h => {
      if (!shouldRestrictByHeight || minAllowedHeight === null) {
        return true;
      }
      if (typeof h.height !== 'number' || h.height <= 0) {
        return true;
      }
      return h.height >= minAllowedHeight;
    });

    const keyValues = filteredByHeight.map(h => {
      const reaction = reactions[h.tx_hash];
      const favorite = reaction && !!reaction['like'];
      return {
        displayName: h.displayName,
        shortCode: h.shortCode,
        tx: h.tx_hash,
        replies: h.replies,
        shares: h.shares,
        likes: h.likes,
        height: h.height,
        time: h.time,
        namespaceId: h.namespace,
        key: decodeBase64(h.key),
        value: h.value ? Buffer.from(h.value, 'base64').toString() : '',
        favorite,
      }
    });

    let saleStatusCache = this.state.saleStatusCache;
    let filteredKeyValues = keyValues;
    if (shouldRestrictByHeight) {
      const filterResult = await this.filterActiveSales(keyValues);
      filteredKeyValues = filterResult.filteredKeyValues;
      saleStatusCache = filterResult.saleStatusCache;
    }

    const nextStateBase = {
      searched: true,
      saleStatusCache,
      latestBlockHeight,
      hasMoreWithinWindow: shouldRestrictByHeight ? filteredByHeight.length > 0 : this.state.hasMoreWithinWindow,
    };

    if (history.min_tx_num < this.state.min_tx_num) {
      // TODO: optimize this, add appendHashtags to avoid
      // duplicating twice.
      this.setState({
        ...nextStateBase,
        hashtags: [...hashtags, ...filteredKeyValues],
        min_tx_num: history.min_tx_num,
      });
    } else {
      this.setState({
        ...nextStateBase,
        hashtags: [...filteredKeyValues],
        min_tx_num: history.min_tx_num,
      });
    }
  }

  filterActiveSales = async (keyValues) => {
    const saleStatusCache = {...this.state.saleStatusCache};
    const filteredKeyValues = [];

    for (const keyValue of keyValues) {
      const namespaceId = keyValue.namespaceId;
      const cachedEntry = saleStatusCache[namespaceId];
      let isForSale;
      let priceText = '';
      let namespaceInfo;
      if (cachedEntry && typeof cachedEntry === 'object') {
        isForSale = cachedEntry.isForSale;
        priceText = cachedEntry.priceText || '';
        namespaceInfo = cachedEntry.namespaceInfo;
      } else if (typeof cachedEntry !== 'undefined') {
        isForSale = cachedEntry;
      }

      const needsNamespaceInfo = !namespaceInfo;
      if (typeof isForSale === 'undefined' || needsNamespaceInfo) {
        try {
          const fetchedNamespaceInfo = await getNamespaceInfo(BlueElectrum, namespaceId, false);
          namespaceInfo = fetchedNamespaceInfo || null;
          const rawPrice = namespaceInfo && namespaceInfo.price;
          const formattedPrice = formatSalePrice(rawPrice);
          if (formattedPrice) {
            priceText = formattedPrice;
          }
          if (typeof isForSale === 'undefined') {
            if (typeof rawPrice === 'number') {
              isForSale = rawPrice > 0;
            } else if (typeof rawPrice === 'string') {
              const parsedPrice = parseFloat(rawPrice);
              isForSale = !Number.isNaN(parsedPrice) ? parsedPrice > 0 : rawPrice.trim().length > 0;
            } else {
              isForSale = !!rawPrice;
            }
          }
        } catch (err) {
          console.warn(err);
          if (typeof isForSale === 'undefined') {
            isForSale = false;
          }
        }

      }

      const ownership = this.resolveNamespaceOwnership(namespaceId, namespaceInfo, cachedEntry, keyValue.shortCode);
      const namespaceInfoToStore =
        namespaceInfo ||
        (cachedEntry && typeof cachedEntry === 'object' && cachedEntry.namespaceInfo) ||
        null;
      const updatedCacheEntry = {
        isForSale,
        priceText,
        namespaceInfo: namespaceInfoToStore,
      };
      if (ownership && ownership.walletId) {
        updatedCacheEntry.ownerWalletId = ownership.walletId;
      } else if (cachedEntry && typeof cachedEntry === 'object' && cachedEntry.ownerWalletId) {
        updatedCacheEntry.ownerWalletId = cachedEntry.ownerWalletId;
      }
      saleStatusCache[namespaceId] = updatedCacheEntry;

      if (isForSale) {
        const salePriceText = priceText || (cachedEntry && cachedEntry.priceText) || '';
        filteredKeyValues.push({...keyValue, salePriceText, namespaceInfo});
      }
    }

    return {filteredKeyValues, saleStatusCache};
  }

  refreshKeyValues = async () => {
    try {
      this.setState({isRefreshing: true, latestBlockHeight: undefined, hasMoreWithinWindow: true});
      await BlueElectrum.ping();
      await this.fetchHashtag(-1);
      this.setState({isRefreshing: false});
    } catch (err) {
      this.setState({isRefreshing: false});
      console.warn(err);
      Toast.show('Failed to fetch key values');
    }
  }

  loadMoreKeyValues = async () => {
    const hashtagLower = this.state.hashtag.trim().toLowerCase();
    if (hashtagLower === SELL_HASHTAG_LOWER && !this.state.hasMoreWithinWindow) {
      return;
    }
    if(this.onEndReachedCalledDuringMomentum) {
      return;
    }
    try {
      this.setState({isLoadingMore: true});
      await BlueElectrum.ping();
      await this.fetchHashtag(this.state.min_tx_num);
      this.setState({isLoadingMore: false});
      this.onEndReachedCalledDuringMomentum = true;
    } catch (err) {
      this.onEndReachedCalledDuringMomentum = true;
      this.setState({isLoadingMore: false});
      console.warn(err);
      Toast.show('Failed to fetch key values');
    }
  }

  getCurrentWallet = () => {
    const walletId = this.props.navigation.getParam('walletId');
    const wallets = BlueApp.getWallets();
    const wallet = wallets.find(w => w.getID() == walletId);
    return wallet;
  }

  async componentDidMount() {
    this.isBiometricUseCapableAndEnabled = await Biometric.isBiometricUseCapableAndEnabled();
    if (this.state.hashtag) {
      try {
        this.setState({loading: true, min_tx_num: -1, hashtags: []});
        await this.fetchHashtag(-1);
      } catch (err) {
        console.warn(err);
        Toast.show('Failed to fetch key values');
      } finally {
        this.setState({loading: false});
      }
    }
  }

  handleSaleStateChange = () => {
    this.refreshKeyValues();
  }

  resolveNamespaceOwnership = (namespaceId, namespaceInfo = null, cachedEntry = null, fallbackShortCode = null) => {
    const { namespaceList } = this.props;
    const namespaces = (namespaceList && namespaceList.namespaces) || {};
    let namespaceEntry = namespaces ? namespaces[namespaceId] : null;
    if (!namespaceEntry && fallbackShortCode) {
      const targetShortCode = fallbackShortCode.toString().toLowerCase();
      namespaceEntry = Object.values(namespaces).find(entry => {
        if (!entry) {
          return false;
        }
        const entryShortCode = (entry.shortCode || '').toString().toLowerCase();
        return entryShortCode === targetShortCode;
      }) || null;
    }
    let walletId = namespaceEntry && namespaceEntry.walletId ? namespaceEntry.walletId : null;

    const fallbackCache = cachedEntry || (this.state && this.state.saleStatusCache && this.state.saleStatusCache[namespaceId]);
    let resolvedNamespaceInfo = namespaceInfo || null;
    if (!walletId && fallbackCache && typeof fallbackCache === 'object' && fallbackCache.ownerWalletId) {
      walletId = fallbackCache.ownerWalletId;
    }
    if (!resolvedNamespaceInfo && fallbackCache && typeof fallbackCache === 'object' && fallbackCache.namespaceInfo) {
      resolvedNamespaceInfo = fallbackCache.namespaceInfo;
    }

    if (!walletId) {
      const addrCandidates = [];
      if (namespaceEntry && namespaceEntry.addr) {
        addrCandidates.push(namespaceEntry.addr);
      }
      if (resolvedNamespaceInfo && resolvedNamespaceInfo.addr) {
        addrCandidates.push(resolvedNamespaceInfo.addr);
      }
      if (addrCandidates.length > 0) {
        const wallets = typeof BlueApp.getWallets === 'function' ? BlueApp.getWallets() : [];
        for (const wallet of wallets) {
          if (!wallet || typeof wallet.weOwnAddress !== 'function') {
            continue;
          }
          let matched = false;
          for (const candidate of addrCandidates) {
            if (!candidate) {
              continue;
            }
            try {
              if (wallet.weOwnAddress(candidate)) {
                walletId = wallet.getID();
                matched = true;
                break;
              }
            } catch (err) {
              console.warn(err);
            }
          }
          if (matched) {
            break;
          }
        }
      }
    }

    return {
      walletId: walletId || null,
      namespaceEntry: namespaceEntry || null,
      namespaceInfo: resolvedNamespaceInfo || null,
    };
  }

  onShow = async (keyValue) => {
    const {navigation, namespaceList} = this.props;
    const {hashtags, saleStatusCache} = this.state;
    if (!keyValue) {
      return;
    }
    const index = findTxIndex(hashtags, keyValue.tx);
    if (index < 0) {
      return;
    }

    const currentHashtagLower = (this.state.hashtag || '').trim().toLowerCase();
    if (currentHashtagLower === SELL_HASHTAG_LOWER) {
      const namespaceId = keyValue.namespaceId;
      if (!namespaceId) {
        return;
      }
      const namespaces = (namespaceList && namespaceList.namespaces) || {};
      const namespaceEntry = namespaces[namespaceId];
      const fallbackWalletId = (namespaceEntry && namespaceEntry.walletId) || null;
      let namespaceInfo = keyValue.namespaceInfo;
      if (!namespaceInfo) {
        const cachedEntry = saleStatusCache[namespaceId];
        if (cachedEntry && typeof cachedEntry === 'object' && cachedEntry.namespaceInfo) {
          namespaceInfo = cachedEntry.namespaceInfo;
        }
      }
      if (!namespaceInfo) {
        try {
          const fetchedInfo = await getNamespaceInfo(BlueElectrum, namespaceId, false);
          namespaceInfo = fetchedInfo || null;
          if (namespaceInfo) {
            this.setState(prevState => {
              const prevEntry = prevState.saleStatusCache[namespaceId];
              if (prevEntry && typeof prevEntry === 'object' && prevEntry.namespaceInfo === namespaceInfo) {
                return null;
              }
              const baseEntry = prevEntry && typeof prevEntry === 'object'
                ? prevEntry
                : { isForSale: true, priceText: keyValue.salePriceText || '' };
              return {
                saleStatusCache: {
                  ...prevState.saleStatusCache,
                  [namespaceId]: {...baseEntry, namespaceInfo},
                }
              };
            });
          }
        } catch (err) {
          console.warn(err);
        }
      }

      const ownership = this.resolveNamespaceOwnership(namespaceId, namespaceInfo, saleStatusCache[namespaceId], keyValue.shortCode);
      const ownerWalletId = ownership.walletId;
      const mergedNamespaceInfo = {
        ...(ownership.namespaceEntry || namespaceEntry || {}),
        ...(namespaceInfo || {}),
      };
      if (!mergedNamespaceInfo.shortCode && keyValue.shortCode) {
        mergedNamespaceInfo.shortCode = keyValue.shortCode;
      }
      const displayName = mergedNamespaceInfo.displayName || keyValue.displayName;
      const targetWalletId = ownerWalletId || fallbackWalletId || null;

      navigation.push('BuyNFT', {
        walletId: targetWalletId,
        namespaceId,
        index,
        type: 'hashtag',
        displayName,
        shortCode: keyValue.shortCode,
        replyTxid: keyValue.tx,
        isOther: true,
        price: namespaceInfo && namespaceInfo.price,
        desc: namespaceInfo && namespaceInfo.desc,
        addr: namespaceInfo && namespaceInfo.addr,
        profile: namespaceInfo && namespaceInfo.profile,
        hashtags,
        updateHashtag: this.updateHashtag,
        onCancelSale: this.handleSaleStateChange,
        onSoldorOffer: this.handleSaleStateChange,
      });
      return;
    }

    navigation.push('ShowKeyValue', {
      index,
      type: 'hashtag',
      shortCode: keyValue.shortCode,
      displayName: keyValue.displayName,
      replyTxid: keyValue.tx,
      shareTxid: keyValue.tx,
      rewardTxid: keyValue.tx,
      height: keyValue.height,
      hashtags,
      updateHashtag: this.updateHashtag,
    });
  }

  updateHashtag = (index, keyValue) => {
    const {hashtags} = this.state;
    const newHashtags = [...hashtags];
    const existingValue = newHashtags[index];
    const preservedFields = {};
    if (existingValue && existingValue.salePriceText && !keyValue.salePriceText) {
      preservedFields.salePriceText = existingValue.salePriceText;
    }
    if (existingValue && existingValue.namespaceInfo && !keyValue.namespaceInfo) {
      preservedFields.namespaceInfo = existingValue.namespaceInfo;
    }
    if (Object.keys(preservedFields).length > 0) {
      keyValue = {...keyValue, ...preservedFields};
    }
    newHashtags[index] = keyValue;
    this.setState({
      hashtags: newHashtags
    })
  }

  onReply = (replyTxid) => {
    const {navigation, namespaceList} = this.props;
    const {hashtags} = this.state;
    // Must have a namespace.
    if (Object.keys(namespaceList).length == 0) {
      toastError(loc.namespaces.create_namespace_first);
      return;
    }

    const index = findTxIndex(hashtags, replyTxid);
    if (index < 0) {
      return;
    }

    navigation.navigate('ReplyKeyValue', {
      index,
      type: 'hashtag',
      replyTxid,
      hashtags,
      updateHashtag: this.updateHashtag,
    })
  }

  onShare = (shareTxid, key, value, blockHeight) => {
    const {navigation, namespaceList} = this.props;
    const {hashtags} = this.state;
    // Must have a namespace.
    if (Object.keys(namespaceList).length == 0) {
      toastError(loc.namespaces.create_namespace_first);
      return;
    }

    const index = findTxIndex(hashtags, shareTxid);
    if (index < 0) {
      return;
    }

    const shortCode = navigation.getParam('shortCode');
    navigation.navigate('ShareKeyValue', {
      index,
      type: 'hashtag',
      shareTxid,
      origKey: key,
      origValue: value,
      origShortCode: shortCode,
      height: blockHeight,
      hashtags,
      updateHashtag: this.updateHashtag,
    })
  }

  onReward = (rewardTxid, key, value, height) => {
    const {navigation, namespaceList} = this.props;
    const {hashtags} = this.state;
    // Must have a namespace.
    if (Object.keys(namespaceList).length == 0) {
      toastError(loc.namespaces.create_namespace_first);
      return;
    }

    const shortCode = navigation.getParam('shortCode');
    const index = findTxIndex(hashtags, rewardTxid);
    if (index < 0) {
      return;
    }
    navigation.navigate('RewardKeyValue', {
      index,
      type: 'hashtag',
      rewardTxid,
      origKey: key,
      origValue: value,
      origShortCode: shortCode,
      height,
      hashtags,
      updateHashtag: this.updateHashtag,
    })
  }

  openItemAni = () => {
    LayoutAnimation.configureNext({
      duration: 100,
      update: {type: LayoutAnimation.Types.easeInEaseOut}
    });
    this.setState({inputMode: true});
  }

  closeItemAni = () => {
    LayoutAnimation.configureNext({
      duration: 100,
      update: {type: LayoutAnimation.Types.easeInEaseOut}
    });
    this.setState({inputMode: false, hashtag: '', searched: false});
    this._inputRef && this._inputRef.blur();
    this._inputRef && this._inputRef.clear();
  }

  render() {
    let {navigation, dispatch, mediaInfoList} = this.props;
    const {inputMode, hashtag, loading, searched, hashtags} = this.state;
    const mergeList = hashtags;
    const canSearch = hashtag && hashtag.length > 0;

    if (this.state.isRefreshing && (!mergeList || mergeList.length == 0)) {
      return <BlueLoading />
    }
    const footerLoader = this.state.isLoadingMore ? <BlueLoading style={{paddingTop: 30, paddingBottom: 400}} /> : null;

    return (
      <SafeAreaView style={styles.topContainer}>
        <View style={styles.inputContainer}>
          <TouchableOpacity onPress={this.closeItemAni}>
            <Text style={[{color: KevaColors.actionText, fontSize: 16, textAlign: 'left'}, inputMode && {paddingRight: 5}]}>
              {inputMode ? loc.general.cancel : ''}
            </Text>
          </TouchableOpacity>
          <TextInput
            onFocus={this.openItemAni}
            ref={ref => this._inputRef = ref}
            onChangeText={hashtag => this.setState({ hashtag: hashtag, searched: false })}
            value={hashtag}
            placeholder={loc.namespaces.search_hashtag}
            multiline={false}
            underlineColorAndroid='rgba(0,0,0,0)'
            returnKeyType='search'
            clearButtonMode='while-editing'
            onSubmitEditing={this.onSearchHashtag}
            style={styles.textInput}
            returnKeyType={ 'done' }
            clearButtonMode='while-editing'
          />
          {loading ?
            <ActivityIndicator size="small" color={KevaColors.actionText} style={{ width: 42, height: 42 }} />
            :
            <TouchableOpacity onPress={this.onSearchHashtag} disabled={!canSearch}>
              <Icon name={'md-search'}
                    style={[styles.searchIcon, !canSearch && {color: KevaColors.inactiveText}]}
                    size={25} />
            </TouchableOpacity>
          }
        </View>
        {
          (mergeList && mergeList.length > 0 ) ?
          <FlatList
            style={styles.listStyle}
            contentContainerStyle={{paddingBottom: 400, backgroundColor: '#fff'}}
            data={mergeList}
            onRefresh={() => this.refreshKeyValues()}
            onEndReached={() => {this.loadMoreKeyValues()}}
            onEndReachedThreshold={0.1}
            onMomentumScrollBegin={() => { this.onEndReachedCalledDuringMomentum = false; }}
            refreshing={this.state.isRefreshing}
            keyExtractor={(item, index) => item.key + index}
            ListFooterComponent={footerLoader}
            renderItem={({item, index}) =>
              <Item item={item} key={index} dispatch={dispatch} onDelete={this.onDelete}
                onShow={this.onShow}
                onReply={this.onReply}
                onShare={this.onShare}
                onReward={this.onReward}
                navigation={navigation}
                mediaInfoList={mediaInfoList}
                currentHashtag={hashtag}
              />
            }
          />
          :
          <View style={{justifyContent: 'center', alignItems: 'center'}}>
            <RNImage source={require('../../img/other_no_data.png')} style={{ width: SCREEN_WIDTH*0.33, height: SCREEN_WIDTH*0.33, marginTop: 50, marginBottom: 10 }} />
            <Text style={{padding: 20, fontSize: 20, textAlign: 'center', color: KevaColors.inactiveText}}>
              {(searched && hashtag.length > 0) ? (loc.namespaces.no_hashtag + hashtag) : loc.namespaces.hashtag_help}
            </Text>
          </View>
        }
      </SafeAreaView>
    );
  }

}

function mapStateToProps(state) {
  return {
    namespaceList: state.namespaceList,
    mediaInfoList: state.mediaInfoList,
    reactions: state.reactions,
  }
}

export default HashtagExploreScreen = connect(mapStateToProps)(HashtagExplore);

var styles = StyleSheet.create({
  topContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  container: {
    flex:1,
  },
  listStyle: {
    flex: 1,
    borderBottomWidth: 1,
    borderColor: KevaColors.cellBorder,
  },
  card: {
    backgroundColor:'#fff',
    marginVertical:0,
    borderBottomWidth: THIN_BORDER,
    borderColor: KevaColors.cellBorder,
  },
  avatarWrapper: {
    paddingRight: 10,
    paddingTop: 5,
    paddingBottom: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  generatedAvatarContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  generatedAvatarImage: {
    width: 36,
    height: 36,
    borderRadius: 18,
    resizeMode: 'cover',
  },
  fallbackAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fallbackAvatarLabel: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  avatarProbe: {
    width: 1,
    height: 1,
    position: 'absolute',
    opacity: 0,
  },
  keyDesc: {
    flex: 1,
    fontSize:16,
    color: KevaColors.darkText,
    marginRight: 10,
  },
  headerRow: {
    flexDirection:'row',
    alignItems:'center',
    justifyContent:'flex-start',
  },
  headerTextContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  priceLabel: {
    fontSize: 14,
    color: KevaColors.actionText,
    fontWeight: '600',
    marginLeft: 10,
  },
  valueDesc: {
    flex: 1,
    fontSize:15,
    marginBottom: 10,
    color: KevaColors.lightText
  },
  actionIcon: {
    color: KevaColors.arrowIcon,
    paddingHorizontal: 15,
    paddingVertical: 7
  },
  talkIcon: {
    color: KevaColors.arrowIcon,
    paddingLeft: 15,
    paddingRight: 2,
    paddingVertical: 7
  },
  shareIcon: {
    color: KevaColors.arrowIcon,
    paddingLeft: 15,
    paddingRight: 2,
    paddingVertical: 7
  },
  count: {
    color: KevaColors.arrowIcon,
    paddingVertical: 7
  },
  modal: {
    borderRadius:10,
    backgroundColor: KevaColors.backgroundLight,
    zIndex:999999,
    flexDirection: 'column',
    justifyContent: 'flex-start',
    marginHorizontal: 0,
    marginBottom: 0,
    android: {
      marginTop: 20,
    },
    ios: {
      marginTop: 50,
    }
  },
  modalHeader: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalDelete: {
    height: 300,
    alignSelf: 'center',
    justifyContent: 'flex-start'
  },
  modalText: {
    fontSize: 18,
    color: KevaColors.lightText,
  },
  waitText: {
    fontSize: 16,
    color: KevaColors.lightText,
    paddingTop: 10,
  },
  modalFee: {
    fontSize: 18,
    color: KevaColors.statusColor,
  },
  modalErr: {
    fontSize: 16,
    marginTop: 20,
  },
  codeErr: {
    marginTop: 10,
    marginHorizontal: 7,
    flexDirection: 'row'
  },
  codeErrText: {
    color: KevaColors.errColor
  },
  action: {
    fontSize: 17,
    paddingVertical: 10
  },
  inAction: {
    fontSize: 17,
    paddingVertical: 10,
    paddingHorizontal: 7,
    color: KevaColors.inactiveText
  },
  timestamp: {
    color: KevaColors.extraLightText,
    fontSize: 13,
    position: 'relative',
    top: -5,
  },
  previewImage: {
    width: 90,
    height:90,
    alignSelf: 'flex-start',
    borderRadius: 6,
  },
  previewVideo: {
    width: 160,
    height: 120,
    alignSelf: 'flex-start',
    borderRadius: 0,
  },
  playIcon: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center'
  },
  inputContainer: {
    paddingVertical: 5,
    paddingLeft: 8,
    backgroundColor: '#fff',
    borderBottomWidth: THIN_BORDER,
    borderColor: KevaColors.cellBorder,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  textInput:
  {
    flex: 1,
    borderRadius: 10,
    backgroundColor: '#f1f3f4',
    android: {
      paddingTop: 3,
      paddingBottom: 3,
    },
    ios: {
      paddingTop: 8,
      paddingBottom: 8,
    },
    paddingLeft: 7,
    paddingRight: 36,
    fontSize: 15,
  },
  searchIcon: {
    width: 42,
    height: 42,
    color: KevaColors.actionText,
    paddingVertical: 5,
    paddingHorizontal: 9,
    android: {
      top: 4,
    },
    ios: {
      top: 3,
    }
  },
});
