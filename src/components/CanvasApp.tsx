'use client';

import { useEffect, useRef } from 'react';
import { initCanvasEngine } from '../lib/canvasEngine';

export default function CanvasApp() {
  const initialized = useRef(false);

  useEffect(() => {
    // Guard against React StrictMode double-invoke in development
    if (initialized.current) return;
    initialized.current = true;

    const cleanup = initCanvasEngine();
    return cleanup;
  }, []);

  return (
    <>
      {/* Tauri v2 drag region — data-tauri-drag-region enables window dragging cross-platform */}
      <div id="window-drag-bar" data-tauri-drag-region></div>

      <div id="viewport">
        <div id="world"></div>
      </div>

      <div id="brand">
        <span className="brand-name">Nozey</span>
        <span className="brand-tagline">the cozy virtual scrapbook</span>
        <div className="brand-version">V 0.1</div>
      </div>

      <div id="minimap"></div>
      <div id="sky-overlay"></div>
      <div id="cloud-intro"></div>

      <div id="quick-add-menu">
        <div className="menu-item selected" data-action="new-card">
          <span className="menu-label">New Card</span>
          <span className="menu-shortcut">+</span>
        </div>
        <div className="menu-item" data-action="scan-in">
          <span className="menu-label">Scan in</span>
          <span className="menu-shortcut">\</span>
        </div>
      </div>
      <input type="file" id="image-file-input" accept="image/*" multiple style={{ display: 'none' }} />

      <div id="devbar" className="minimized">
        <div className="dev-row">
          <span className="dev-shadow-label">Shadow</span>
          <input type="range" id="dev-shadow-slider" min="0" max="100" step="1" defaultValue="19" />
          <span className="dev-slider-label">Grid</span>
          <input type="range" id="dev-grid-slider" min="0" max="100" step="1" defaultValue="100" title="Grid opacity" />
        </div>
        <div className="dev-row">
          <span className="dev-shadow-label">Leaves</span>
          <span className="dev-slider-label">Opacity</span>
          <input type="range" id="dev-leaf-opacity" min="0" max="100" step="1" defaultValue="40" title="Leaf opacity" />
          <span className="dev-slider-label">Amount</span>
          <input type="range" id="dev-leaf-amount" min="0" max="100" step="1" defaultValue="60" title="Leaf amount" />
          <span className="dev-slider-label">Size</span>
          <input type="range" id="dev-leaf-size" min="10" max="100" step="1" defaultValue="80" title="Leaf size" />
        </div>
        <div className="dev-row">
          <span className="dev-shadow-label">Wind</span>
          <label style={{ color: '#fff', fontSize: '10px', display: 'flex', alignItems: 'center', gap: '3px', cursor: 'pointer' }}>
            <input type="checkbox" id="dev-wind-toggle" style={{ margin: 0, cursor: 'pointer' }} />
            <span id="dev-wind-status" style={{ opacity: 0.6 }}>OFF</span>
          </label>
          <span className="dev-slider-label">Speed</span>
          <input type="range" id="dev-wind-speed" min="0" max="100" step="1" defaultValue="30" title="Wind speed" disabled />
        </div>
        <div className="dev-row">
          <span className="dev-label">Dev</span>
          <span id="dev-time">--:--</span>
          <span id="dev-phase">--</span>
          <input type="range" id="dev-slider" min="0" max="1439" step="1" defaultValue="0" />
          <button id="dev-live"><span className="dot"></span>LIVE</button>
          <button id="devbar-minimize" title="Minimize">&times;</button>
        </div>
      </div>
      <button id="devbar-restore" style={{ display: 'block' }}>DEV</button>

      <div id="hint" className="minimized">
        Drag to move cards
        <span className="sep">·</span>
        <kbd>[</kbd> <kbd>]</kbd> change layer
        <span className="sep">·</span>
        <kbd>Del</kbd> delete card
        <span className="sep">·</span>
        <kbd>⌘Z</kbd> undo
        <span className="sep">·</span>
        <kbd>⌘⇧Z</kbd> redo
        <span className="sep">·</span>
        <kbd>0</kbd> re-home to card
        <span className="sep">·</span>
        Two-finger scroll to pan &amp; zoom
        <button id="hint-minimize" title="Minimize">&times;</button>
      </div>
      <button id="hint-restore" style={{ display: 'block' }}>Shortcuts</button>
    </>
  );
}
