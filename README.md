# ⚡ Video Speed Master

> **Universal HTML5 Video Speed Controller** for Chrome, Edge, Brave, and Chromium-based browsers.

![Manifest V3](https://img.shields.io/badge/Manifest-V3-indigo.svg)
![Version](https://img.shields.io/badge/version-1.3.1-emerald.svg)
![License](https://img.shields.io/badge/license-MIT-blue.svg)

**Video Speed Master** automatically detects HTML5 videos on any website (YouTube, Coursera, Vimeo, Netflix, Twitter/X, local files, etc.) and provides a floating draggable overlay controller, keyboard hotkeys, speed persistence modes, customizable increments, and a complete popup tray panel.

---

## ✨ Features

- 🌐 **Universal Video Detection**: Detects `<video>` elements dynamically on any webpage (including Single Page Applications and custom video players).
- 🎨 **Draggable Glassmorphic Overlay**: Floating speed controller on top of active videos. Click and drag the handle (`⋮⋮`) to place it anywhere; position is remembered across pages.
- ⚡ **Preset Speed Toggle**: Switch instantly between your custom preset speed (e.g. `2.00x`) and your previous speed with a single click or hotkey.
- 🔄 **Speed Persistence Modes**:
  - **🌐 Global Speed Mode**: Speed setting carries over automatically to all newly loaded videos, pages, and tabs.
  - **🎬 Single Video Mode**: Every new video starts fresh at standard `1.00x` speed.
- 🎮 **Intuitive Keyboard Hotkeys**: Control playback speed instantly without moving your mouse.
- 🎛️ **Feature-Rich Extension Popup**: Tray panel with giant speed readout, continuous slider, quick preset chips (`0.5x` to `4.0x`), step settings, and mode toggles.

---

## ⌨️ Keyboard Shortcuts Reference

| Key | Action | Description |
| :---: | :--- | :--- |
| <kbd>D</kbd> | **Increase Speed** | Speed up playback by configured step (e.g. `+0.25x`) |
| <kbd>S</kbd> | **Decrease Speed** | Slow down playback by configured step (e.g. `-0.25x`) |
| <kbd>R</kbd> | **Reset Speed** | Reset playback speed back to `1.00x` |
| <kbd>G</kbd> | **Toggle Preset** | Toggle between Preset speed (e.g. `2.00x`) and previous speed |
| <kbd>V</kbd> | **Toggle Overlay** | Hide or show the on-video floating controller overlay |

> **Browser-Wide Shortcuts**: Extension commands are also registered for background execution (<kbd>Alt+D</kbd>, <kbd>Alt+S</kbd>, <kbd>Alt+G</kbd>, <kbd>Alt+R</kbd>). Customize them anytime at `chrome://extensions/shortcuts`.

---

## 🚀 Installation Guide

### Method 1: Load Unpacked Extension (Developer Mode)

1. **Clone or Download** this repository:
   ```bash
   git clone https://github.com/Suraj5260/videoSpeedExtension.git
   ```
2. Open your browser extension management page:
   - **Chrome**: `chrome://extensions`
   - **Edge**: `edge://extensions`
   - **Brave**: `brave://extensions`
3. Enable **Developer mode** (toggle in top-right corner).
4. Click **Load unpacked** and select the extension directory (`videoSpeedExtension`).
5. Pin **Video Speed Master** to your browser toolbar for easy access!

---

## 🎮 How to Use

### 1. On-Video Floating Overlay
- Hover over any video playing on a website to reveal the glassmorphic speed controller.
- Click **`-`** or **`+`** to adjust speed.
- Click the **Speed Badge** (e.g. `1.50x`) to reset to `1.00x`.
- Click **`⚡`** to toggle your preset speed.
- Drag the **`⋮⋮` handle** to move the widget anywhere over the video or window.

### 2. Extension Popup Tray
- Click the **Video Speed Master icon** in your browser extension toolbar.
- Use the **Speed Slider** or **Quick Preset Chips** (`0.5x`, `0.75x`, `1.0x`, `1.25x`, `1.5x`, `1.75x`, `2.0x`, `2.5x`, `3.0x`).
- Switch between **🌐 Global Speed** mode and **🎬 Single Video** mode.
- In **Settings**, customize your preferred **Speed Step** (`0.05x`, `0.10x`, `0.25x`, `0.50x`, `1.00x`), **Preset Speed Target**, and **Overlay Visibility**.

### 3. Local Test Player
- Open [`test_player.html`](test_player.html) directly in your browser (`file:///.../test_player.html`) to test the extension features locally.

---

## 📁 File Structure

```
videoSpeedExtension/
├── manifest.json       # Manifest V3 extension configuration & permissions
├── content.js          # Video scanner, draggable overlay, hotkeys, storage sync
├── content.css         # Glassmorphism styling & animations for video overlay
├── background.js       # Service worker for background shortcuts & badge updates
├── popup.html          # Extension popup tray interface layout
├── popup.css           # Modern dark-mode styling for popup tray
├── popup.js            # Tray logic, sliders, preset chips & settings handlers
├── test_player.html    # Standalone HTML page with embedded test video player
├── generate_icons.js   # Icon generator script
└── icons/              # Extension icons (16x16, 48x48, 128x128)
```

---

## 📝 License

This project is licensed under the [MIT License](LICENSE).
