/**
 * Video Speed Master - Background Service Worker (Manifest V3)
 * Relays background command hotkeys, manages badge state, and initializes defaults.
 */

// Default settings initialization
chrome.runtime.onInstalled.addListener(() => {
  const defaultSettings = {
    step: 0.25,
    presetSpeed: 2.0,
    showOverlay: true,
    overlayPos: { top: 16, left: 16, corner: 'top-left' },
    hotkeysEnabled: true,
    rememberSpeed: true,
    preferredSpeed: 1.0
  };

  chrome.storage.sync.get(defaultSettings, (items) => {
    chrome.storage.sync.set(items);
  });

  console.log('Video Speed Master extension installed successfully.');
});

// Handle Background Keyboard Commands (Alt+D, Alt+S, Alt+G, Alt+R)
chrome.commands.onCommand.addListener(async (command) => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !tab.id) return;

  switch (command) {
    case 'increase_speed':
      chrome.storage.sync.get({ step: 0.25 }, (data) => {
        sendMessageToTab(tab.id, { action: 'ADJUST_SPEED', delta: data.step });
      });
      break;
    case 'decrease_speed':
      chrome.storage.sync.get({ step: 0.25 }, (data) => {
        sendMessageToTab(tab.id, { action: 'ADJUST_SPEED', delta: -data.step });
      });
      break;
    case 'toggle_preset':
      sendMessageToTab(tab.id, { action: 'TOGGLE_PRESET' });
      break;
    case 'reset_speed':
      sendMessageToTab(tab.id, { action: 'RESET_SPEED' });
      break;
  }
});

// Helper: Safely Send Message to Active Tab
function sendMessageToTab(tabId, message) {
  chrome.tabs.sendMessage(tabId, message, (response) => {
    if (chrome.runtime.lastError) {
      // Content script might not be loaded on special chrome:// pages or early tabs
      return;
    }
    if (response && response.currentSpeed) {
      updateBadge(tabId, response.currentSpeed);
    }
  });
}

// Update Extension Action Badge
function updateBadge(tabId, speed) {
  if (!speed) {
    chrome.action.setBadgeText({ tabId, text: '' });
    return;
  }
  const badgeText = `${Number(speed).toFixed(1)}x`;
  chrome.action.setBadgeText({ tabId, text: badgeText });
  chrome.action.setBadgeBackgroundColor({ tabId, color: '#6366F1' });
}
