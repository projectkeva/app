console.log('[DEBUG] index.js reloaded at', new Date().toLocaleString());

console.log('[desktop] window.hub =', window.hub);

// ====================
// 时钟
const clockEl = document.getElementById('clock');
setInterval(() => {
  const d = new Date();
  clockEl.textContent = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}, 1000);

// ====================
// 桌面图标渲染
const desktop = document.getElementById('desktop');
const systemApps = [
  { key: 'wallet', name: 'Wallet' },
  { key: 'mailbox', name: 'Mailbox' },
  { key: 'id', name: 'ID' },
  { key: 'notebook', name: 'Notebook' },
  { key: 'keva', name: 'Keva' },
  { key: 'secondlife', name: 'SecondLife' }
];

async function renderIcons() {
  let coins = ['kevacoin', 'ravencoin', 'bitcoin', 'dogecoin'];
  try {
    if (window.hub && window.hub.list) {
      coins = await window.hub.list();
    }
  } catch (e) {
    console.warn('[desktop] hub.list failed:', e);
  }

  const all = [
    ...systemApps.map(a => ({ type: 'app', key: a.key, label: a.name })),
    ...coins.map(c => ({ type: 'coin', key: c, label: c }))
  ];

  desktop.innerHTML = '';

  for (const item of all) {
    const el = document.createElement('div');
    el.className = 'icon';
    const iconUrl = `./theme/retro/icons/${item.key}.png`;
    el.innerHTML = `<img draggable="false" src="${iconUrl}"><div>${item.label}</div>`;
    el.addEventListener('click', async () => await onIconClick(item));
    desktop.appendChild(el);
  }
}

// ====================
// 图标点击事件（修改为使用 startWallet）
async function onIconClick(item) {
  if (item.type === 'coin') {
    try {
      if (window.hub && window.hub.startWallet) {
        const res = await window.hub.startWallet(item.key);
        if (res && res.ok === false) throw new Error(res.error || 'start failed');
      } else {
        if (window.hub && window.hub.start) await window.hub.start(item.key);
        if (window.hub && window.hub.openWallet) await window.hub.openWallet(item.key);
      }
    } catch (e) {
      console.error('[desktop] coin start failed:', e);
      alert(item.key + ' start failed: ' + (e.message || e));
    }
    return;
  }

  if (item.type === 'app') {
    switch (item.key) {
      case 'id': // Agents
        if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
          window.ReactNativeWebView.postMessage('open_agents');
        } else {
          window.open('./agents/index.html', '_self');
        }
        return;
      case 'notebook': // Readme
        if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
          window.ReactNativeWebView.postMessage('open_readme');
        } else {
          window.open('./readme.html', '_self');
        }
        return;
      case 'wallet':
        if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
          window.ReactNativeWebView.postMessage('open_wallet');
        }
        return;
      default:
        alert(item.name || item.key);
        return;
    }
  }
}
else {
        console.warn('[desktop] hub.startWallet not found, fallback to start + openWallet');
        if (window.hub.start) await window.hub.start(item.key);
        if (window.hub.openWallet) await window.hub.openWallet(item.key);
      }
    } catch (e) {
      console.error('[desktop] coin start failed:', e);
      alert(`${item.key} start failed: ${(e.message || e)}`);
    }
  } else {
    alert(item.label + ' (coming soon)');
  }
}

// 初始化桌面
renderIcons();

// ====================
// 开始菜单按钮
const startBtn = document.getElementById('startBtn');
const menu = document.getElementById('menu');

startBtn.onclick = () => {
  menu.style.display = (menu.style.display === 'flex' ? 'none' : 'flex');
};

document.addEventListener('click', (e) => {
  if (!menu.contains(e.target) && e.target !== startBtn) {
    menu.style.display = 'none';
  }
});
