let loc = require('../../loc');

export const STORY_SUPPORTED_LANGS = [
  { code: 'en', label: 'English' },
  { code: 'zh-cn', label: '中文（简体）' },
  { code: 'zh-tw', label: '中文（繁體）' },
  { code: 'ja', label: '日本語' },
  { code: 'ko', label: '한국어' },
  { code: 'es', label: 'Español' },
  { code: 'fr', label: 'Français' },
  { code: 'de', label: 'Deutsch' },
  { code: 'it', label: 'Italiano' },
  { code: 'pt-br', label: 'Português (Brasil)' },
  { code: 'ru', label: 'Русский' },
  { code: 'tr', label: 'Türkçe' },
  { code: 'vi', label: 'Tiếng Việt' },
  { code: 'th', label: 'ไทย' },
  { code: 'id', label: 'Bahasa Indonesia' },
  { code: 'ar', label: 'العربية' },
  { code: 'hi', label: 'हिन्दी' },
];

export const STORY_UI_MESSAGES = {
  en: {
    rawTitle: 'Original',
    rawMissing: 'Original text not found',
    rawReadFail: 'Failed to read original text',
    regenDigest: 'Regenerate digest',
    regenFail: 'Regenerate failed',
  },
  'zh-cn': {
    rawTitle: '原文',
    rawMissing: '未找到原文',
    rawReadFail: '读取原文失败',
    regenDigest: '重生成摘要',
    regenFail: '重生成失败',
  },
  'zh-tw': {
    rawTitle: '原文',
    rawMissing: '未找到原文',
    rawReadFail: '讀取原文失敗',
    regenDigest: '重新生成摘要',
    regenFail: '重新生成失敗',
  },
};

export const STORY_OPTION_FALLBACK_TEXTS = {
  en: 'Signal unstable, choose your own next action',
  'zh-cn': '连接不稳定，你自己决定行动',
  'zh-tw': '連線不穩定，你自己決定行動',
  ja: '接続が不安定です。次の行動は自分で決めてください',
  ko: '연결이 불안정합니다. 다음 행동은 직접 결정하세요',
  es: 'La conexión es inestable; elige tu próxima acción',
  fr: 'Connexion instable, choisis toi-même la prochaine action',
};

export const STORY_OPTION_FALLBACK_PROMPTS = {
  en: 'No usable options were recognized in this turn. Choose one reasonable next action based on the current story and continue the scene directly. Do not say which option you chose, and do not write statements like "I choose," "I decide," or "I pick option X." Instead, output the natural story continuation as if the character has already acted. Do not mention unstable signal, connection issues, temporary autonomy, or any system abnormality. After that, you must provide the next set of options again, strictly using separate lines in this format: 1. ... 2. ... 3. ... Do not omit the options.',
  'zh-cn': '本轮对话无法识别可用选项。请你根据当前剧情自行选择一个合理行动继续推进；不要说明你选择了哪一项，不要写“我选择/我决定/选择第X项”等选择声明，而是直接输出该行动已经发生后的自然剧情推进，像角色自主行动一样继续场景；不要提及信号不稳定、连接中断、临时自行行动或任何系统异常。随后必须重新给出下一组可选项，选项格式必须严格使用独立行：1. ...、2. ...、3. ...，不要省略选项。',
  'zh-tw': '本輪對話無法識別可用選項。請你根據當前劇情自行選擇一個合理行動繼續推進；不要說明你選擇了哪一項，不要寫「我選擇／我決定／選第X項」等選擇聲明，而是直接輸出該行動已經發生後的自然劇情推進，像角色自主行動一樣繼續場景；不要提及訊號不穩定、連線中斷、臨時自行行動或任何系統異常。隨後必須重新給出下一組可選項，選項格式必須嚴格使用獨立行：1. ...、2. ...、3. ...，不要省略選項。',
  ja: 'このターンでは有効な選択肢を認識できませんでした。現在の物語に基づいて妥当な次の行動を一つ自分で選び、その結果として場面が自然に進んだ文章を直接出力してください。どの選択肢を選んだかは説明せず、「私は〜を選ぶ」「第X項を選ぶ」などの宣言も書かないでください。あたかもキャラクターがすでに行動したかのように、自然な物語の続きだけを書いてください。接続不良、通信中断、一時的な自律行動、システム異常には触れないでください。その後、必ず次の選択肢を再提示し、形式は独立した行で厳密に 1. ... 2. ... 3. ... としてください。選択肢を省略しないでください。',
  ko: '이번 턴에서는 사용할 수 있는 선택지를 인식하지 못했습니다. 현재 스토리를 바탕으로 합리적인 다음 행동 하나를 스스로 선택해 장면을 직접 이어가세요. 어떤 선택을 골랐는지 설명하지 말고, "내가 선택한다", "내가 결정한다", "X번을 고른다" 같은 선언도 쓰지 마세요. 대신 캐릭터가 이미 행동한 것처럼 자연스럽게 이어지는 이야기만 출력하세요. 신호 불안정, 연결 문제, 임시 자율 행동, 시스템 이상은 언급하지 마세요. 그다음에는 반드시 다음 선택지를 다시 제시해야 하며, 형식은 각각 독립된 줄의 1. ... 2. ... 3. ... 이어야 합니다. 선택지를 생략하지 마세요.',
  es: 'En este turno no se reconocieron opciones utilizables. Elige por tu cuenta una acción siguiente razonable según la historia actual y continúa la escena directamente. No digas qué opción elegiste ni escribas frases como "yo elijo", "yo decido" o "elijo la opción X". En su lugar, muestra la continuación natural de la historia como si el personaje ya hubiera actuado. No menciones señal inestable, problemas de conexión, autonomía temporal ni ninguna anomalía del sistema. Después, debes volver a dar el siguiente grupo de opciones, usando estrictamente líneas separadas con este formato: 1. ... 2. ... 3. ... No omitas las opciones.',
  fr: 'Aucune option exploitable n’a été reconnue dans ce tour. Choisis toi-même une action suivante raisonnable à partir de l’histoire en cours et poursuis directement la scène. N’indique pas quelle option tu as choisie et n’écris pas de formulations comme « je choisis », « je décide » ou « je prends l’option X ». À la place, produis la continuation naturelle de l’histoire comme si le personnage avait déjà agi. Ne mentionne pas de signal instable, de problème de connexion, d’autonomie temporaire ni d’anomalie système. Ensuite, tu dois redonner la série suivante d’options, strictement sur des lignes séparées au format : 1. ... 2. ... 3. ... N’omets pas les options.',
};

export const STORY_BOOTSTRAP_FALLBACK_LABELS = {
  en: {
    choice1: '1. Carefully scout the surrounding area and confirm immediate threats and clues first',
    choice2: '2. Search nearby for useful supplies or key items',
    choice3: '3. Keep moving toward the most suspicious lead',
  },
  'zh-cn': {
    choice1: '1. 谨慎侦察周围环境，先确认当前威胁与线索',
    choice2: '2. 搜索附近可用物资或关键道具',
    choice3: '3. 朝当前最可疑的方向继续推进',
  },
  'zh-tw': {
    choice1: '1. 謹慎偵察周圍環境，先確認當前威脅與線索',
    choice2: '2. 搜索附近可用物資或關鍵道具',
    choice3: '3. 朝目前最可疑的方向繼續推進',
  },
  ja: {
    choice1: '1. 周囲を慎重に偵察し、まず目前の脅威と手がかりを確認する',
    choice2: '2. 近くに使えそうな物資や重要アイテムがないか探す',
    choice3: '3. いま最も怪しい手がかりの方向へ進み続ける',
  },
  ko: {
    choice1: '1. 주변을 신중히 정찰하며 현재 위협과 단서를 먼저 확인한다',
    choice2: '2. 근처에서 쓸 만한 물자나 핵심 아이템을 찾는다',
    choice3: '3. 지금 가장 수상한 단서가 가리키는 방향으로 계속 나아간다',
  },
  es: {
    choice1: '1. Explora con cautela los alrededores y confirma primero las amenazas y pistas inmediatas',
    choice2: '2. Busca cerca suministros útiles o algún objeto clave',
    choice3: '3. Sigue avanzando hacia la pista más sospechosa',
  },
  fr: {
    choice1: '1. Observe prudemment les alentours et confirme d’abord les menaces et indices immédiats',
    choice2: '2. Cherche à proximité des ressources utiles ou un objet clé',
    choice3: '3. Continue d’avancer vers la piste la plus suspecte',
  },
};

export const STORY_MENU_MESSAGES = {
  en: {
    destinyTitle: 'What would you like to do?',
    continueStory: 'Continue story',
    startNew: 'Start new',
    settings: 'Settings',
    viewRecord: 'View record',
    clearRecord: 'Clear record',
    back: 'Back',
    noCurrentStory: 'There is no active story record.',
    currentStoryTitle: 'Current story record',
    changeLanguage: 'Change language',
    changeModel: 'Change model',
    currentLanguageNotSet: 'Current language: Not set',
    currentLanguage: 'Current language: {label} ({code})',
    langMenuTitle: 'Current language: {current}',
    supportedLangs: 'Supported languages:',
    langOnlyStory: '"/lang" is only available in Story mode',
    unsupportedLang: 'Unsupported language code: {code}',
    shortOnlyStory: '"/short" is only available in Story mode',
    shortUsage: 'Usage: /short on | /short off',
    shortOn: 'Story history: short ON',
    shortOff: 'Story history: short OFF',
    restartConnection: 'Restart connection',
    roleReadyTransfer: '{role} is ready',
    hyperconstructTransfer: 'Starting generated hyperconstruct transfer…',
    blockTime: 'Block time {height}',
    linkingAgu: 'Connecting to the All Generative Universe System network…',
    roleRequiredDetail: 'Role does not exist. Connection aborted.',
    establishLink: 'Link Start',
    awaitingSignal: 'Awaiting signal',
    commTerminalPreparing: 'Comm terminal ready. Waiting for Link Start.',
    openOlderStoryInRole: 'View earlier story records',
    roleRequired: 'ROLE NOT FOUND',
    linkIdle: 'LINK IDLE',
    linkActive: 'LINK ACTIVE',
    linkWaiting: 'LINK WAITING',
    uplinkSent: 'UPLINK SENT',
    linking: 'LINKING…',
    reconnectRequired: 'RECONNECT REQUIRED',
    modelReady: 'MODEL READY',
    languageRequired: 'LANGUAGE REQUIRED',
    languageLocked: 'LANGUAGE LOCKED',
    modelRequired: 'MODEL REQUIRED',
    resettingStory: 'RESETTING STORY',
    linkTapDetected: 'LINK TAP DETECTED',
    linkStarted: 'LINK STARTED',
    linkFailed: 'LINK FAILED',
    selectOutputLanguage: 'Select output language',
    waitingFieldResponse: 'Waiting for field response',
    waitingFieldResponseLower: 'waiting for field response',
    autoTriggerBlocked: 'Auto trigger blocked, waiting for manual action',
    chooseExplicitAction: 'Choose an explicit story action',
    autoStartDisabled: 'Auto start disabled, choose manually',
    clearingCurrentSession: 'Clearing current session',
    resumingCurrentStory: 'Resuming current story',
    preparingContinueContext: 'Preparing story continue context',
    passingContinueTurn: 'Passing continue turn to LLM',
    loadLlmBeforeLinkStart: 'Load an LLM before Link Start',
    linkTapHandoff: 'Handing off to story runtime',
    linkStartedRoute: 'Routing through /d new',
    unableOpenCommChannel: 'Unable to open comm channel',
    continuingNextLoop: 'Continuing to next loop',
    restartingConnectionProgress: 'Restarting connection',
    copiedToClipboard: 'Copied to clipboard',
    archiveFallbackSummary: 'This round of exploration has been archived.',
    aguComm: 'A.G.U Comm',
    linkStartDetected: 'Link Start detected…',
    thisRole: 'This role',
    unknownCommand: 'Unknown command.',
    llmBuiltinCorrupted: 'LLM builtin registry is corrupted. Backup created. Please fix/delete: {path}',
    llmCustomCorrupted: 'LLM custom registry is corrupted. Backup created. Please fix/delete: {path}',
    llmActiveCorrupted: 'LLM active state is corrupted. Backup created. Please fix/delete: {path}',
    currentBlock: 'Current block: {height}',
    currentBlockFailed: 'Failed to fetch current block: {error}',
    continueFailed: 'Continue failed',
    startFailed: 'Start failed',
    storyContinueFailed: 'Story continue failed: {error}',
    storyLoadedModelRequired: 'Story now runs only through a loaded model. Use /a to load an LLM, then Link Start again.',
  },
  'zh-cn': {
    destinyTitle: '你想做什么？',
    continueStory: '继续故事',
    startNew: '新的故事',
    settings: '设置',
    viewRecord: '查看记录',
    clearRecord: '清除记录',
    back: '返回',
    noCurrentStory: '当前没有进行中的故事记录。',
    currentStoryTitle: '当前故事记录',
    changeLanguage: '更换语言',
    changeModel: '更换模型',
    currentLanguageNotSet: '当前语言：未设置',
    currentLanguage: '当前语言：{label}（{code}）',
    langMenuTitle: '当前语言：{current}',
    supportedLangs: '支持的语言：',
    langOnlyStory: '"/lang" 仅在 Story 模式可用',
    unsupportedLang: '不支持的语言代码：{code}',
    shortOnlyStory: '"/short" 仅在 Story 模式可用',
    shortUsage: '用法：/short on | /short off',
    shortOn: '故事记录：摘要已开启',
    shortOff: '故事记录：摘要已关闭',
    restartConnection: '重新连接',
    roleReadyTransfer: '{role} 已就绪',
    hyperconstructTransfer: '开始生成超构造体传送……',
    blockTime: '区块时间 {height}',
    linkingAgu: '正在连接全生成宇宙系统网络……',
    roleRequiredDetail: '角色不存在，连接中止。',
    establishLink: '建立连接',
    awaitingSignal: '等待信号',
    commTerminalPreparing: '通讯终端已准备完成，等待建立连接。',
    openOlderStoryInRole: '查看更早故事记录',
    roleRequired: '角色不存在',
    linkIdle: '连接待命',
    linkActive: '连接已激活',
    linkWaiting: '连接等待中',
    uplinkSent: '上行已发送',
    linking: '连接中……',
    reconnectRequired: '需要重连',
    modelReady: '模型已就绪',
    languageRequired: '需要语言',
    languageLocked: '语言已锁定',
    modelRequired: '需要模型',
    resettingStory: '重置故事中',
    linkTapDetected: '检测到连接触发',
    linkStarted: '连接已启动',
    linkFailed: '连接失败',
    selectOutputLanguage: '请选择输出语言',
    waitingFieldResponse: '等待场域响应',
    waitingFieldResponseLower: '等待场域响应',
    autoTriggerBlocked: '自动触发已拦截，等待手动操作',
    chooseExplicitAction: '请选择明确的故事操作',
    autoStartDisabled: '自动开始已关闭，请手动选择',
    clearingCurrentSession: '正在清空当前会话',
    resumingCurrentStory: '正在继续当前故事',
    preparingContinueContext: '正在准备故事续跑上下文',
    passingContinueTurn: '正在把续跑回合交给模型',
    loadLlmBeforeLinkStart: '请先加载模型再建立连接',
    linkTapHandoff: '正在切换到故事运行时',
    linkStartedRoute: '正在通过 /d new 路由',
    unableOpenCommChannel: '无法打开通讯通道',
    continuingNextLoop: '正在继续下一轮',
    restartingConnectionProgress: '正在重新连接',
    copiedToClipboard: '已复制到剪贴板',
    archiveFallbackSummary: '本轮探索已完成归档。',
    aguComm: 'A.G.U 通讯',
    linkStartDetected: '已检测到 Link Start……',
    thisRole: '该角色',
    unknownCommand: '未知命令。',
    llmBuiltinCorrupted: 'LLM 内置注册表损坏，已创建备份。请修复或删除：{path}',
    llmCustomCorrupted: 'LLM 自定义注册表损坏，已创建备份。请修复或删除：{path}',
    llmActiveCorrupted: 'LLM 当前激活状态损坏，已创建备份。请修复或删除：{path}',
    currentBlock: '当前区块：{height}',
    currentBlockFailed: '获取当前区块失败：{error}',
    continueFailed: '继续失败',
    startFailed: '开始失败',
    storyContinueFailed: '故事续跑失败：{error}',
    storyLoadedModelRequired: 'Story 现在只能通过已加载的模型运行。请先用 /a 加载 LLM，然后再建立连接。',
  },
  'zh-tw': {
    destinyTitle: '你想做什麼？',
    continueStory: '繼續故事',
    startNew: '新的故事',
    settings: '設定',
    viewRecord: '查看記錄',
    clearRecord: '清除記錄',
    back: '返回',
    noCurrentStory: '目前沒有進行中的故事記錄。',
    currentStoryTitle: '目前故事記錄',
    changeLanguage: '更換語言',
    changeModel: '更換模型',
    currentLanguageNotSet: '目前語言：未設定',
    currentLanguage: '目前語言：{label}（{code}）',
    langMenuTitle: '目前語言：{current}',
    supportedLangs: '支援的語言：',
    langOnlyStory: '"/lang" 僅在 Story 模式可用',
    unsupportedLang: '不支援的語言代碼：{code}',
    shortOnlyStory: '"/short" 僅在 Story 模式可用',
    shortUsage: '用法：/short on | /short off',
    shortOn: '故事記錄：摘要已開啟',
    shortOff: '故事記錄：摘要已關閉',
    restartConnection: '重新連線',
    roleReadyTransfer: '{role} 已就緒',
    hyperconstructTransfer: '開始生成超構造體傳送……',
    blockTime: '區塊時間 {height}',
    linkingAgu: '正在連接全生成宇宙系統網路……',
    roleRequiredDetail: '角色不存在，連線中止。',
    establishLink: '建立連線',
    awaitingSignal: '等待訊號',
    commTerminalPreparing: '通訊終端已準備完成，等待建立連線。',
    openOlderStoryInRole: '查看更早故事記錄',
    roleRequired: '角色不存在',
    linkIdle: '連線待命',
    linkActive: '連線已啟用',
    linkWaiting: '連線等待中',
    uplinkSent: '上行已送出',
    linking: '連線中……',
    reconnectRequired: '需要重連',
    modelReady: '模型已就緒',
    languageRequired: '需要語言',
    languageLocked: '語言已鎖定',
    modelRequired: '需要模型',
    resettingStory: '重設故事中',
    linkTapDetected: '偵測到連線觸發',
    linkStarted: '連線已啟動',
    linkFailed: '連線失敗',
    selectOutputLanguage: '請選擇輸出語言',
    waitingFieldResponse: '等待場域回應',
    waitingFieldResponseLower: '等待場域回應',
    autoTriggerBlocked: '自動觸發已攔截，等待手動操作',
    chooseExplicitAction: '請選擇明確的故事操作',
    autoStartDisabled: '自動開始已關閉，請手動選擇',
    clearingCurrentSession: '正在清空目前會話',
    resumingCurrentStory: '正在繼續目前故事',
    preparingContinueContext: '正在準備故事續跑上下文',
    passingContinueTurn: '正在把續跑回合交給模型',
    loadLlmBeforeLinkStart: '請先載入模型再建立連線',
    linkTapHandoff: '正在切換到故事執行階段',
    linkStartedRoute: '正在透過 /d new 路由',
    unableOpenCommChannel: '無法打開通訊通道',
    continuingNextLoop: '正在繼續下一輪',
    restartingConnectionProgress: '正在重新連線',
    copiedToClipboard: '已複製到剪貼簿',
    archiveFallbackSummary: '本輪探索已完成歸檔。',
    aguComm: 'A.G.U 通訊',
    linkStartDetected: '已偵測到 Link Start……',
    thisRole: '該角色',
    unknownCommand: '未知命令。',
    llmBuiltinCorrupted: 'LLM 內建註冊表損壞，已建立備份。請修復或刪除：{path}',
    llmCustomCorrupted: 'LLM 自訂註冊表損壞，已建立備份。請修復或刪除：{path}',
    llmActiveCorrupted: 'LLM 目前啟用狀態損壞，已建立備份。請修復或刪除：{path}',
    currentBlock: '目前區塊：{height}',
    currentBlockFailed: '取得目前區塊失敗：{error}',
    continueFailed: '繼續失敗',
    startFailed: '開始失敗',
    storyContinueFailed: '故事續跑失敗：{error}',
    storyLoadedModelRequired: 'Story 現在只能透過已載入的模型運行。請先用 /a 載入 LLM，然後再建立連線。',
  },
  ja: {
    roleReadyTransfer: '{role} の準備が完了',
    hyperconstructTransfer: '生成超構造体転送を開始……',
    blockTime: 'ブロック時間 {height}',
    linkingAgu: '全生成宇宙システムネットワークに接続中……',
  },
  ko: {
    roleReadyTransfer: '{role} 준비 완료',
    hyperconstructTransfer: '생성 초구조체 전송 시작……',
    blockTime: '블록 시간 {height}',
    linkingAgu: '전생성 우주 시스템 네트워크에 연결 중……',
  },
  es: {
    roleReadyTransfer: '{role} está listo',
    hyperconstructTransfer: 'Iniciando transferencia de hiperconstructo generado…',
    blockTime: 'Tiempo de bloque {height}',
    linkingAgu: 'Conectando a la red del Sistema de Universo Generativo Total…',
  },
  fr: {
    roleReadyTransfer: '{role} est prêt',
    hyperconstructTransfer: 'Début du transfert d’hyperstructure générée…',
    blockTime: 'Temps de bloc {height}',
    linkingAgu: 'Connexion au réseau du Système d’Univers Génératif Total…',
  },
  de: {
    roleReadyTransfer: '{role} ist bereit',
    hyperconstructTransfer: 'Transfer des generierten Hyperkonstrukts startet…',
    blockTime: 'Blockzeit {height}',
    linkingAgu: 'Verbindung zum Netzwerk des Allgenerativen Universumssystems…',
  },
  it: {
    roleReadyTransfer: '{role} è pronto',
    hyperconstructTransfer: 'Avvio del trasferimento dell’ipercostrutto generato…',
    blockTime: 'Tempo blocco {height}',
    linkingAgu: 'Connessione alla rete del Sistema Universo Generativo Totale…',
  },
  'pt-br': {
    roleReadyTransfer: '{role} está pronto',
    hyperconstructTransfer: 'Iniciando transferência do hiperconstructo gerado…',
    blockTime: 'Tempo do bloco {height}',
    linkingAgu: 'Conectando à rede do Sistema de Universo Gerativo Total…',
  },
  ru: {
    roleReadyTransfer: '{role} готов',
    hyperconstructTransfer: 'Начинается передача сгенерированного гиперконструкта…',
    blockTime: 'Время блока {height}',
    linkingAgu: 'Подключение к сети Системы Всегенеративной Вселенной…',
  },
  tr: {
    roleReadyTransfer: '{role} hazır',
    hyperconstructTransfer: 'Üretilmiş hiper-yapı aktarımı başlıyor…',
    blockTime: 'Blok zamanı {height}',
    linkingAgu: 'Tam Üretken Evren Sistemi ağına bağlanıyor…',
  },
  vi: {
    roleReadyTransfer: '{role} đã sẵn sàng',
    hyperconstructTransfer: 'Bắt đầu truyền siêu cấu trúc được tạo…',
    blockTime: 'Thời gian khối {height}',
    linkingAgu: 'Đang kết nối mạng Hệ thống Vũ trụ Toàn Sinh…',
  },
  th: {
    roleReadyTransfer: '{role} พร้อมแล้ว',
    hyperconstructTransfer: 'เริ่มส่งไฮเปอร์คอนสตรักต์ที่สร้างขึ้น…',
    blockTime: 'เวลาไม้บล็อก {height}',
    linkingAgu: 'กำลังเชื่อมต่อเครือข่ายระบบจักรวาลกำเนิดทั้งหมด…',
  },
  id: {
    roleReadyTransfer: '{role} siap',
    hyperconstructTransfer: 'Memulai transfer hiperkonstruksi yang dihasilkan…',
    blockTime: 'Waktu blok {height}',
    linkingAgu: 'Menghubungkan ke jaringan Sistem Semesta Generatif Total…',
  },
  ar: {
    roleReadyTransfer: '{role} جاهز',
    hyperconstructTransfer: 'بدء نقل البنية الفائقة المُولَّدة…',
    blockTime: 'وقت الكتلة {height}',
    linkingAgu: 'جارٍ الاتصال بشبكة نظام الكون التوليدي الكامل…',
  },
  hi: {
    roleReadyTransfer: '{role} तैयार है',
    hyperconstructTransfer: 'जनित हाइपर-कंस्ट्रक्ट स्थानांतरण शुरू…',
    blockTime: 'ब्लॉक समय {height}',
    linkingAgu: 'पूर्ण जनरेटिव यूनिवर्स सिस्टम नेटवर्क से कनेक्ट हो रहा है…',
  },
};

const STORY_LOCALE_ALIASES = {
  'zh-hans': 'zh-cn',
  'zh-hant': 'zh-tw',
  'zh-sg': 'zh-cn',
  'zh-hk': 'zh-tw',
  'zh-mo': 'zh-tw',
  'zh-cn': 'zh-cn',
  'zh-tw': 'zh-tw',
  'ja-jp': 'ja',
  'jp-jp': 'ja',
  'ko-kr': 'ko',
  'pt-br': 'pt-br',
  en: 'en',
  zh: 'zh-cn',
  ja: 'ja',
  ko: 'ko',
  es: 'es',
  fr: 'fr',
  de: 'de',
  it: 'it',
  pt: 'pt-br',
  ru: 'ru',
  tr: 'tr',
  vi: 'vi',
  th: 'th',
  id: 'id',
  ar: 'ar',
  hi: 'hi',
};

export const normalizeLocale = locale => (locale || '').toString().trim().toLowerCase().replace(/_/g, '-');

export const normalizeStoryLangCode = code => {
  const normalized = normalizeLocale(code);
  if (!normalized) return 'en';
  if (normalized === 'zh' || normalized === 'zh-hans' || normalized === 'zh-sg' || normalized === 'zh-cn') return 'zh-cn';
  if (normalized === 'zh-hant' || normalized === 'zh-hk' || normalized === 'zh-mo' || normalized === 'zh-tw') return 'zh-tw';
  return normalized;
};

export const getCurrentInterfaceLanguage = () =>
  (loc && typeof loc.getInterfaceLanguage === 'function' && loc.getInterfaceLanguage()) ||
  (loc && typeof loc.getLanguage === 'function' && loc.getLanguage()) ||
  'en';

export const getDefaultStoryLangCode = () => normalizeStoryLangCode(getCurrentInterfaceLanguage() || 'en');

export const getStoryLangLabel = code => {
  const normalized = normalizeStoryLangCode(code);
  const hit = STORY_SUPPORTED_LANGS.find(item => item.code === normalized);
  return hit?.label || normalized || 'English';
};

const resolveLocalizedEntry = (messagesByLocale, locale, key) => {
  const entry = messagesByLocale[locale];
  if (!entry) return null;
  return key ? entry[key] : entry;
};

const interpolate = (text, vars = {}) => {
  let result = String(text || '');
  Object.keys(vars || {}).forEach(key => {
    result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), String(vars[key]));
  });
  return result;
};

export const getStoryLocalizedMessage = (messagesByLocale, key, locale = null, vars = {}) => {
  const normalized = normalizeLocale(locale || getCurrentInterfaceLanguage());
  const alias = STORY_LOCALE_ALIASES[normalized] || normalized;
  const base = normalized.split('-')[0];
  const baseAlias = STORY_LOCALE_ALIASES[base] || base;
  const text =
    resolveLocalizedEntry(messagesByLocale, normalized, key) ||
    resolveLocalizedEntry(messagesByLocale, alias, key) ||
    resolveLocalizedEntry(messagesByLocale, baseAlias, key) ||
    resolveLocalizedEntry(messagesByLocale, base, key) ||
    resolveLocalizedEntry(messagesByLocale, 'en', key) ||
    '';
  return interpolate(text, vars);
};

export const getStoryUiText = (key, vars = {}, locale = null) => getStoryLocalizedMessage(STORY_UI_MESSAGES, key, locale, vars);
export const getStoryMenuText = (key, vars = {}, locale = null) => getStoryLocalizedMessage(STORY_MENU_MESSAGES, key, locale, vars);
export const getStoryOptionFallbackText = (locale = null) => getStoryLocalizedMessage(STORY_OPTION_FALLBACK_TEXTS, null, locale, {});
export const getStoryOptionFallbackPrompt = (locale = null) => getStoryLocalizedMessage(STORY_OPTION_FALLBACK_PROMPTS, null, locale, {});
export const getStoryBootstrapFallbackLabels = (locale = null) => {
  const normalized = normalizeLocale(locale || getCurrentInterfaceLanguage());
  const alias = STORY_LOCALE_ALIASES[normalized] || normalized;
  const base = normalized.split('-')[0];
  const baseAlias = STORY_LOCALE_ALIASES[base] || base;
  return (
    resolveLocalizedEntry(STORY_BOOTSTRAP_FALLBACK_LABELS, normalized) ||
    resolveLocalizedEntry(STORY_BOOTSTRAP_FALLBACK_LABELS, alias) ||
    resolveLocalizedEntry(STORY_BOOTSTRAP_FALLBACK_LABELS, baseAlias) ||
    resolveLocalizedEntry(STORY_BOOTSTRAP_FALLBACK_LABELS, base) ||
    STORY_BOOTSTRAP_FALLBACK_LABELS.en
  );
};
