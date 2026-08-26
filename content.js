/**
 * Video Speed Master - Content Script
 * Handles automatic video detection, draggable floating overlay, speed adjustments, and hotkeys.
 */

(function () {
  if (window.vsmInjected) return;
  window.vsmInjected = true;

  // Default settings
  let settings = {
    step: 0.25,
    presetSpeed: 2.0,
    showOverlay: true,
    overlayPos: { top: 16, left: 16, corner: 'top-left' },
    hotkeysEnabled: true,
    rememberSpeed: true,
    preferredSpeed: 1.0
  };

  // State management
  let trackedVideos = new Map(); // video -> { wrapper, overlay, toast, prevSpeed }
  let activeVideo = null;
  let toastTimer = null;
  let idleTimer = null;

  // Load stored settings
  chrome.storage.sync.get(settings, (items) => {
    if (items) {
      settings = { ...settings, ...items };
    }
    init();
  });

  // Listen for storage changes
  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'sync' || namespace === 'local') {
      for (let key in changes) {
        settings[key] = changes[key].newValue;
      }
      updateAllOverlays();
    }
  });

  function init() {
    scanVideos();
    setupMutationObserver();
    setupKeyboardListeners();
    setupMessageListeners();

    // Periodic scanner for dynamically rendered videos (e.g. shadow DOM or iframe wrappers)
    setInterval(scanVideos, 1500);
  }

  /**
   * Scan DOM for HTML5 Video elements
   */
  function scanVideos() {
    const videos = Array.from(document.querySelectorAll('video'));
    videos.forEach((video) => {
      if (!trackedVideos.has(video)) {
        attachToVideo(video);
      }
    });

    // Check for active playing video
    if (!activeVideo && videos.length > 0) {
      const playing = videos.find((v) => !v.paused);
      activeVideo = playing || videos[0];
    }
  }

  /**
   * Observe DOM mutations for newly added videos
   */
  function setupMutationObserver() {
    const observer = new MutationObserver((mutations) => {
      let shouldScan = false;
      for (const mutation of mutations) {
        if (mutation.addedNodes.length) {
          shouldScan = true;
          break;
        }
      }
      if (shouldScan) {
        scanVideos();
      }
    });

    observer.observe(document.documentElement || document.body, {
      childList: true,
      subtree: true
    });
  }

  /**
   * Attach Controller & Overlay to a Video element
   */
  function attachToVideo(video) {
    if (trackedVideos.has(video)) return;

    const data = {
      video: video,
      prevSpeed: 1.0,
      overlay: null,
      wrapper: null
    };

    trackedVideos.set(video, data);

    // Apply speed persistence preference
    if (settings.rememberSpeed && settings.preferredSpeed) {
      video.playbackRate = settings.preferredSpeed;
    } else {
      video.playbackRate = 1.0;
    }

    // Set initial active video
    if (!activeVideo) activeVideo = video;

    const syncVideoSpeedAndUI = () => {
      if (settings.rememberSpeed && settings.preferredSpeed) {
        if (Math.abs(video.playbackRate - settings.preferredSpeed) > 0.01) {
          video.playbackRate = settings.preferredSpeed;
        }
      } else {
        video.playbackRate = 1.0;
      }
      updateOverlayText(data);
    };

    // Video Event Listeners
    video.addEventListener('play', () => {
      activeVideo = video;
      syncVideoSpeedAndUI();
    });

    video.addEventListener('loadedmetadata', () => {
      syncVideoSpeedAndUI();
    });

    video.addEventListener('loadstart', () => {
      syncVideoSpeedAndUI();
    });

    video.addEventListener('emptied', () => {
      syncVideoSpeedAndUI();
    });

    video.addEventListener('focus', () => {
      activeVideo = video;
    });

    video.addEventListener('mouseenter', () => {
      activeVideo = video;
      resetOverlayFade(data);
    });

    video.addEventListener('mouseleave', () => {
      startOverlayFade(data);
    });

    video.addEventListener('ratechange', () => {
      updateOverlayText(data);
    });

    // Create floating overlay container
    createOverlay(data);
    updateOverlayText(data);
  }

  /**
   * Create Draggable Overlay Widget on Video
   */
  function createOverlay(data) {
    const video = data.video;
    const parent = video.parentElement || video.parentNode;

    if (!parent) return;

    // Check parent positioning
    const parentStyle = window.getComputedStyle(parent);
    if (parentStyle.position === 'static') {
      parent.style.position = 'relative';
    }

    // Wrapper container
    const wrapper = document.createElement('div');
    wrapper.className = 'vsm-overlay-wrapper';
    wrapper.style.display = settings.showOverlay ? 'block' : 'none';

    // Apply stored overlay position
    applyOverlayPosition(wrapper);

    // Overlay structure
    const overlay = document.createElement('div');
    overlay.className = 'vsm-overlay-container';
    overlay.style.display = settings.showOverlay ? 'inline-flex' : 'none';

    overlay.innerHTML = `
      <div class="vsm-drag-handle" title="Drag to move overlay">
        <svg viewBox="0 0 24 24"><path d="M10 9h4V7h-4v2zm0 4h4v-2h-4v2zm0 4h4v-2h-4v2zM7 9h2V7H7v2zm0 4h2v-2H7v2zm0 4h2v-2H7v2zm8-8h2V7h-2v2zm0 4h2v-2h-2v2zm0 4h2v-2h-2v2z"/></svg>
      </div>
      <button class="vsm-btn vsm-btn-minus" title="Decrease speed (S)">-</button>
      <div class="vsm-speed-badge" title="Click to reset (R) or set speed">
        <span class="vsm-speed-text">${formatSpeed(video.playbackRate)}</span>
      </div>
      <button class="vsm-btn vsm-btn-plus" title="Increase speed (D)">+</button>
      <button class="vsm-btn vsm-btn-preset ${video.playbackRate === settings.presetSpeed ? 'active' : ''}" title="Toggle Preset Speed (G)">⚡</button>
      <button class="vsm-btn vsm-btn-close" title="Hide Overlay (V to toggle)">&times;</button>
    `;

    wrapper.appendChild(overlay);
    parent.appendChild(wrapper);

    data.wrapper = wrapper;
    data.overlay = overlay;

    // Attach Overlay Control Button Listeners
    const btnMinus = overlay.querySelector('.vsm-btn-minus');
    const btnPlus = overlay.querySelector('.vsm-btn-plus');
    const badge = overlay.querySelector('.vsm-speed-badge');
    const btnPreset = overlay.querySelector('.vsm-btn-preset');
    const btnClose = overlay.querySelector('.vsm-btn-close');
    const dragHandle = overlay.querySelector('.vsm-drag-handle');

    btnMinus.addEventListener('click', (e) => {
      e.stopPropagation();
      adjustSpeed(video, -settings.step);
    });

    btnPlus.addEventListener('click', (e) => {
      e.stopPropagation();
      adjustSpeed(video, settings.step);
    });

    badge.addEventListener('click', (e) => {
      e.stopPropagation();
      resetSpeed(video);
    });

    btnPreset.addEventListener('click', (e) => {
      e.stopPropagation();
      togglePresetSpeed(video);
    });

    btnClose.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleOverlayVisibility(false);
    });

    // Make Overlay Draggable
    setupDraggable(dragHandle, wrapper, parent);
  }

  /**
   * Apply Position to Overlay Wrapper
   */
  function applyOverlayPosition(wrapper) {
    const pos = settings.overlayPos || { top: 16, left: 16 };
    if (pos.top !== undefined) wrapper.style.top = `${pos.top}px`;
    if (pos.left !== undefined) wrapper.style.left = `${pos.left}px`;
    if (pos.right !== undefined) wrapper.style.right = `${pos.right}px`;
    if (pos.bottom !== undefined) wrapper.style.bottom = `${pos.bottom}px`;
  }

  /**
   * Setup Drag and Drop Functionality
   */
  function setupDraggable(dragHandle, wrapper, container) {
    let isDragging = false;
    let startX = 0, startY = 0;
    let initialLeft = 0, initialTop = 0;

    dragHandle.addEventListener('mousedown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      isDragging = true;
      wrapper.querySelector('.vsm-overlay-container').classList.add('vsm-dragging');

      startX = e.clientX;
      startY = e.clientY;

      const rect = wrapper.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();

      initialLeft = rect.left - containerRect.left;
      initialTop = rect.top - containerRect.top;

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    });

    function onMouseMove(e) {
      if (!isDragging) return;
      e.preventDefault();

      const dx = e.clientX - startX;
      const dy = e.clientY - startY;

      let newLeft = Math.max(0, initialLeft + dx);
      let newTop = Math.max(0, initialTop + dy);

      // Keep within bounds if possible
      const containerRect = container.getBoundingClientRect();
      const wrapperRect = wrapper.getBoundingClientRect();
      if (containerRect.width > 0) {
        newLeft = Math.min(newLeft, containerRect.width - wrapperRect.width);
      }
      if (containerRect.height > 0) {
        newTop = Math.min(newTop, containerRect.height - wrapperRect.height);
      }

      wrapper.style.left = `${newLeft}px`;
      wrapper.style.top = `${newTop}px`;
      wrapper.style.right = 'auto';
      wrapper.style.bottom = 'auto';
    }

    function onMouseUp(e) {
      if (!isDragging) return;
      isDragging = false;
      wrapper.querySelector('.vsm-overlay-container').classList.remove('vsm-dragging');

      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);

      // Save position to chrome.storage
      const top = parseInt(wrapper.style.top, 10);
      const left = parseInt(wrapper.style.left, 10);

      settings.overlayPos = { top, left, corner: 'custom' };
      chrome.storage.sync.set({ overlayPos: settings.overlayPos });
    }
  }

  /**
   * Helper: Format Speed Display (e.g. 1.25x)
   */
  function formatSpeed(rate) {
    return `${Number(rate).toFixed(2)}x`;
  }

  /**
   * Adjust Video Playback Speed by Delta
   */
  function adjustSpeed(video, delta) {
    if (!video) return;
    const newSpeed = Math.min(16.0, Math.max(0.1, Math.round((video.playbackRate + delta) * 100) / 100));
    setSpeed(video, newSpeed);
  }

  /**
   * Set Video Speed directly
   */
  function setSpeed(video, targetSpeed) {
    if (!video) return;
    const data = trackedVideos.get(video);
    if (data && video.playbackRate !== settings.presetSpeed && targetSpeed === settings.presetSpeed) {
      data.prevSpeed = video.playbackRate;
    }

    video.playbackRate = targetSpeed;

    if (settings.rememberSpeed) {
      settings.preferredSpeed = targetSpeed;
      chrome.storage.sync.set({ preferredSpeed: targetSpeed });

      // Apply to all other tracked videos on current page
      trackedVideos.forEach((d) => {
        if (d.video && d.video !== video) {
          d.video.playbackRate = targetSpeed;
        }
      });
    }

    updateOverlayText(data);
  }

  /**
   * Reset Speed to 1.0x
   */
  function resetSpeed(video) {
    if (!video) return;
    setSpeed(video, 1.0);
  }

  /**
   * Toggle Preset Speed (G)
   */
  function togglePresetSpeed(video) {
    if (!video) return;
    const data = trackedVideos.get(video);
    const current = video.playbackRate;
    const preset = settings.presetSpeed || 2.0;

    if (Math.abs(current - preset) < 0.05) {
      // Return to previous speed or 1.0x
      const returnSpeed = data && data.prevSpeed ? data.prevSpeed : 1.0;
      setSpeed(video, returnSpeed);
    } else {
      // Store current as prevSpeed & set to preset
      if (data) data.prevSpeed = current;
      setSpeed(video, preset);
    }
  }

  /**
   * Update Overlay Text Badge
   */
  function updateOverlayText(data) {
    if (!data || !data.overlay) return;
    const video = data.video;
    const speedText = data.overlay.querySelector('.vsm-speed-text');
    const badge = data.overlay.querySelector('.vsm-speed-badge');
    const btnPreset = data.overlay.querySelector('.vsm-btn-preset');

    if (speedText) speedText.textContent = formatSpeed(video.playbackRate);

    const isPresetActive = Math.abs(video.playbackRate - settings.presetSpeed) < 0.05;
    if (btnPreset) {
      if (isPresetActive) {
        btnPreset.classList.add('active');
      } else {
        btnPreset.classList.remove('active');
      }
    }

    if (badge) {
      if (isPresetActive) {
        badge.classList.add('vsm-is-preset');
      } else {
        badge.classList.remove('vsm-is-preset');
      }
    }
  }

  /**
   * Auto-fade overlay on mouse idle
   */
  function startOverlayFade(data) {
    if (!data || !data.overlay) return;
    data.overlay.classList.add('vsm-autohide');
  }

  function resetOverlayFade(data) {
    if (!data || !data.overlay) return;
    data.overlay.classList.remove('vsm-autohide');
  }

  /**
   * Toggle Overlay Visibility (V key / popup toggle)
   */
  function toggleOverlayVisibility(forceState) {
    const newState = forceState !== undefined ? forceState : !settings.showOverlay;
    settings.showOverlay = newState;
    chrome.storage.sync.set({ showOverlay: newState });
    updateAllOverlays();
  }

  function updateAllOverlays() {
    trackedVideos.forEach((data) => {
      if (settings.rememberSpeed && settings.preferredSpeed && data.video) {
        if (Math.abs(data.video.playbackRate - settings.preferredSpeed) > 0.01) {
          data.video.playbackRate = settings.preferredSpeed;
        }
      }

      if (data.wrapper) {
        if (settings.showOverlay) {
          data.wrapper.classList.remove('vsm-hidden');
          data.wrapper.style.display = 'block';
        } else {
          data.wrapper.classList.add('vsm-hidden');
          data.wrapper.style.display = 'none';
        }
        applyOverlayPosition(data.wrapper);
      }
      if (data.overlay) {
        if (settings.showOverlay) {
          data.overlay.classList.remove('vsm-hidden');
          data.overlay.style.display = 'inline-flex';
        } else {
          data.overlay.classList.add('vsm-hidden');
          data.overlay.style.display = 'none';
        }
        updateOverlayText(data);
      }
    });
  }

  /**
   * Keyboard Shortcuts Listener
   */
  function setupKeyboardListeners() {
    document.addEventListener('keydown', (e) => {
      if (!settings.hotkeysEnabled) return;

      // Ignore inputs, textareas, contenteditable elements
      const target = e.target;
      const tag = target.tagName ? target.tagName.toLowerCase() : '';
      if (tag === 'input' || tag === 'textarea' || tag === 'select' || target.isContentEditable) {
        return;
      }

      // Ignore modified keys (Ctrl, Alt, Meta) to allow system/browser shortcuts
      if (e.ctrlKey || e.altKey || e.metaKey) return;

      const key = e.key.toLowerCase();

      // Handle 'V' toggle globally without requiring active video focus
      if (key === 'v') {
        e.preventDefault();
        toggleOverlayVisibility();
        return;
      }

      const targetVideo = getActiveVideo();

      if (!targetVideo) return;

      switch (key) {
        case 'd': // Speed Up
          e.preventDefault();
          adjustSpeed(targetVideo, settings.step);
          break;
        case 's': // Slow Down
          e.preventDefault();
          adjustSpeed(targetVideo, -settings.step);
          break;
        case 'r': // Reset Speed
          e.preventDefault();
          resetSpeed(targetVideo);
          break;
        case 'g': // Toggle Preset
          e.preventDefault();
          togglePresetSpeed(targetVideo);
          break;
      }
    }, true);
  }

  /**
   * Get Active Video Element
   */
  function getActiveVideo() {
    if (activeVideo && document.contains(activeVideo)) {
      return activeVideo;
    }
    const videos = Array.from(document.querySelectorAll('video'));
    if (videos.length > 0) {
      activeVideo = videos.find((v) => !v.paused) || videos[0];
      return activeVideo;
    }
    return null;
  }

  /**
   * Message Handler for Popup / Background Worker
   */
  function setupMessageListeners() {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      const targetVideo = getActiveVideo();

      if (request.action === 'GET_STATUS') {
        sendResponse({
          hasVideo: !!targetVideo,
          videoCount: trackedVideos.size,
          currentSpeed: targetVideo ? targetVideo.playbackRate : 1.0,
          isPaused: targetVideo ? targetVideo.paused : true,
          settings: settings
        });
        return true;
      }

      if (!targetVideo) {
        sendResponse({ success: false, reason: 'No video found' });
        return true;
      }

      switch (request.action) {
        case 'SET_SPEED':
          setSpeed(targetVideo, request.speed);
          sendResponse({ success: true, currentSpeed: targetVideo.playbackRate });
          break;
        case 'ADJUST_SPEED':
          adjustSpeed(targetVideo, request.delta);
          sendResponse({ success: true, currentSpeed: targetVideo.playbackRate });
          break;
        case 'TOGGLE_PRESET':
          togglePresetSpeed(targetVideo);
          sendResponse({ success: true, currentSpeed: targetVideo.playbackRate });
          break;
        case 'RESET_SPEED':
          resetSpeed(targetVideo);
          sendResponse({ success: true, currentSpeed: targetVideo.playbackRate });
          break;
        case 'UPDATE_SETTINGS':
          settings = { ...settings, ...request.settings };
          updateAllOverlays();
          sendResponse({ success: true });
          break;
      }

      return true;
    });
  }

})();
