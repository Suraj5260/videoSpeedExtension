/**
 * Video Speed Master - Popup UI Script
 */

document.addEventListener('DOMContentLoaded', async () => {
  // UI Elements
  const statusPill = document.getElementById('statusPill');
  const statusText = document.getElementById('statusText');

  const currentSpeedText = document.getElementById('currentSpeedText');
  const speedSlider = document.getElementById('speedSlider');
  const presetValueText = document.getElementById('presetValueText');

  const btnStepMinusBig = document.getElementById('btnStepMinusBig');
  const btnStepMinusSmall = document.getElementById('btnStepMinusSmall');
  const btnReset = document.getElementById('btnReset');
  const btnStepPlusSmall = document.getElementById('btnStepPlusSmall');
  const btnStepPlusBig = document.getElementById('btnStepPlusBig');

  const stepLabelMinus = document.getElementById('stepLabelMinus');
  const stepLabelPlus = document.getElementById('stepLabelPlus');

  const btnTogglePreset = document.getElementById('btnTogglePreset');
  const chips = document.querySelectorAll('.chip');

  // Settings Elements
  const stepInput = document.getElementById('stepInput');
  const presetInput = document.getElementById('presetInput');
  const toggleOverlay = document.getElementById('toggleOverlay');
  const toggleRememberSpeed = document.getElementById('toggleRememberSpeed');
  const btnToggleMode = document.getElementById('btnToggleMode');
  const btnResetOverlayPos = document.getElementById('btnResetOverlayPos');
  const btnOpenChromeShortcuts = document.getElementById('btnOpenChromeShortcuts');

  // Tab Navigation
  const navTabs = document.querySelectorAll('.nav-tab');
  const tabContents = document.querySelectorAll('.tab-content');

  let activeTabId = null;
  let currentSettings = {
    step: 0.25,
    presetSpeed: 2.0,
    showOverlay: true,
    overlayPos: { top: 16, left: 16, corner: 'top-left' },
    rememberSpeed: true,
    preferredSpeed: 1.0
  };

  // Get active browser tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab) activeTabId = tab.id;

  // Load Settings from Storage
  chrome.storage.sync.get(currentSettings, (items) => {
    if (items) currentSettings = { ...currentSettings, ...items };
    applySettingsToUI();
  });

  // Query Active Tab Status
  queryTabStatus();

  // Tab Switcher
  navTabs.forEach((tabBtn) => {
    tabBtn.addEventListener('click', () => {
      navTabs.forEach((t) => t.classList.remove('active'));
      tabContents.forEach((c) => c.classList.remove('active'));

      tabBtn.classList.add('active');
      const targetId = `tab-${tabBtn.dataset.tab}`;
      const targetContent = document.getElementById(targetId);
      if (targetContent) targetContent.classList.add('active');
    });
  });

  /**
   * Query status from content.js on active tab
   */
  function queryTabStatus() {
    if (!activeTabId) {
      updateStatusUI(false, 0);
      return;
    }

    chrome.tabs.sendMessage(activeTabId, { action: 'GET_STATUS' }, (response) => {
      if (chrome.runtime.lastError || !response) {
        updateStatusUI(false, 0);
        return;
      }

      if (response.hasVideo) {
        updateStatusUI(true, response.currentSpeed, response.videoCount);
        updateSpeedUI(response.currentSpeed);
      } else {
        updateStatusUI(false, 0);
      }

      if (response.settings) {
        currentSettings = { ...currentSettings, ...response.settings };
        applySettingsToUI();
      }
    });
  }

  /**
   * Update Status Pill UI
   */
  function updateStatusUI(hasVideo, speed, count = 1) {
    if (hasVideo) {
      statusPill.classList.add('active');
      statusText.textContent = `${count} Video${count > 1 ? 's' : ''} (${Number(speed).toFixed(2)}x)`;
    } else {
      statusPill.classList.remove('active');
      statusText.textContent = 'No Video Detected';
    }
  }

  /**
   * Apply stored settings to UI controls
   */
  function applySettingsToUI() {
    stepInput.value = currentSettings.step;
    presetInput.value = currentSettings.presetSpeed;
    toggleOverlay.checked = currentSettings.showOverlay;
    if (toggleRememberSpeed) toggleRememberSpeed.checked = currentSettings.rememberSpeed;

    if (btnToggleMode) {
      if (currentSettings.rememberSpeed) {
        btnToggleMode.textContent = '🌐 Global Speed';
        btnToggleMode.classList.add('active');
        btnToggleMode.title = 'Global Speed mode active: Speed setting continues across all videos';
      } else {
        btnToggleMode.textContent = '🎬 Single Video';
        btnToggleMode.classList.remove('active');
        btnToggleMode.title = 'Single Video mode active: Starts each video at 1.0x';
      }
    }

    stepLabelMinus.textContent = Number(currentSettings.step).toFixed(2);
    stepLabelPlus.textContent = Number(currentSettings.step).toFixed(2);
    presetValueText.textContent = Number(currentSettings.presetSpeed).toFixed(1);
  }

  /**
   * Send speed update to content script
   */
  function sendSetSpeed(speed) {
    const formattedSpeed = Math.min(16.0, Math.max(0.1, Math.round(speed * 100) / 100));
    updateSpeedUI(formattedSpeed);

    if (activeTabId) {
      chrome.tabs.sendMessage(activeTabId, { action: 'SET_SPEED', speed: formattedSpeed }, (res) => {
        if (res && res.currentSpeed) {
          updateSpeedUI(res.currentSpeed);
          updateStatusUI(true, res.currentSpeed);
        }
      });
    }
  }

  /**
   * Send delta adjustment
   */
  function sendAdjustSpeed(delta) {
    if (activeTabId) {
      chrome.tabs.sendMessage(activeTabId, { action: 'ADJUST_SPEED', delta }, (res) => {
        if (res && res.currentSpeed) {
          updateSpeedUI(res.currentSpeed);
          updateStatusUI(true, res.currentSpeed);
        }
      });
    }
  }

  /**
   * Update Speed Display & Slider UI
   */
  function updateSpeedUI(speed) {
    const num = Number(speed);
    currentSpeedText.textContent = num.toFixed(2);
    speedSlider.value = num;

    // Highlight active chip
    chips.forEach((chip) => {
      const chipSpeed = parseFloat(chip.dataset.speed);
      if (Math.abs(chipSpeed - num) < 0.05) {
        chip.classList.add('active');
      } else {
        chip.classList.remove('active');
      }
    });
  }

  // --- Button & Input Event Handlers ---

  // Slider change
  speedSlider.addEventListener('input', (e) => {
    sendSetSpeed(parseFloat(e.target.value));
  });

  // Chip clicks
  chips.forEach((chip) => {
    chip.addEventListener('click', () => {
      const speed = parseFloat(chip.dataset.speed);
      sendSetSpeed(speed);
    });
  });

  // Step minus / plus
  btnStepMinusBig.addEventListener('click', () => sendAdjustSpeed(-currentSettings.step));
  btnStepPlusBig.addEventListener('click', () => sendAdjustSpeed(currentSettings.step));
  btnStepMinusSmall.addEventListener('click', () => sendAdjustSpeed(-0.1));
  btnStepPlusSmall.addEventListener('click', () => sendAdjustSpeed(0.1));

  // Reset 1.0x
  btnReset.addEventListener('click', () => {
    if (activeTabId) {
      chrome.tabs.sendMessage(activeTabId, { action: 'RESET_SPEED' }, (res) => {
        if (res && res.currentSpeed) {
          updateSpeedUI(res.currentSpeed);
          updateStatusUI(true, res.currentSpeed);
        }
      });
    } else {
      sendSetSpeed(1.0);
    }
  });

  // Toggle Preset
  btnTogglePreset.addEventListener('click', () => {
    if (activeTabId) {
      chrome.tabs.sendMessage(activeTabId, { action: 'TOGGLE_PRESET' }, (res) => {
        if (res && res.currentSpeed) {
          updateSpeedUI(res.currentSpeed);
          updateStatusUI(true, res.currentSpeed);
        }
      });
    }
  });

  // --- Settings Inputs ---

  stepInput.addEventListener('change', (e) => {
    const newStep = parseFloat(e.target.value);
    currentSettings.step = newStep;
    chrome.storage.sync.set({ step: newStep });
    applySettingsToUI();
    notifySettingsChanged();
  });

  presetInput.addEventListener('change', (e) => {
    const newPreset = parseFloat(e.target.value) || 2.0;
    currentSettings.presetSpeed = newPreset;
    chrome.storage.sync.set({ presetSpeed: newPreset });
    applySettingsToUI();
    notifySettingsChanged();
  });

  toggleOverlay.addEventListener('change', (e) => {
    const show = e.target.checked;
    currentSettings.showOverlay = show;
    chrome.storage.sync.set({ showOverlay: show });
    notifySettingsChanged();
  });

  if (toggleRememberSpeed) {
    toggleRememberSpeed.addEventListener('change', (e) => {
      const remember = e.target.checked;
      currentSettings.rememberSpeed = remember;
      chrome.storage.sync.set({ rememberSpeed: remember });
      applySettingsToUI();
      notifySettingsChanged();
    });
  }

  if (btnToggleMode) {
    btnToggleMode.addEventListener('click', () => {
      const newRemember = !currentSettings.rememberSpeed;
      currentSettings.rememberSpeed = newRemember;
      chrome.storage.sync.set({ rememberSpeed: newRemember });
      applySettingsToUI();
      notifySettingsChanged();
    });
  }

  btnResetOverlayPos.addEventListener('click', () => {
    const defaultPos = { top: 16, left: 16, corner: 'top-left' };
    currentSettings.overlayPos = defaultPos;
    chrome.storage.sync.set({ overlayPos: defaultPos });
    notifySettingsChanged();
  });

  btnOpenChromeShortcuts.addEventListener('click', () => {
    chrome.tabs.create({ url: 'chrome://extensions/shortcuts' });
  });

  function notifySettingsChanged() {
    if (activeTabId) {
      chrome.tabs.sendMessage(activeTabId, { action: 'UPDATE_SETTINGS', settings: currentSettings });
    }
  }
});
