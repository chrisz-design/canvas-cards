/* eslint-disable */
// @ts-nocheck

export function initCanvasEngine() {

  // ── Devbar minimize / restore ──
  document.getElementById('devbar-minimize').addEventListener('click', () => {
    document.getElementById('devbar').classList.add('minimized');
    document.getElementById('devbar-restore').style.display = 'block';
  });
  document.getElementById('devbar-restore').addEventListener('click', () => {
    document.getElementById('devbar').classList.remove('minimized');
    document.getElementById('devbar-restore').style.display = 'none';
  });

  // ── Hint bar minimize / restore ──
  document.getElementById('hint-minimize').addEventListener('click', () => {
    document.getElementById('hint').classList.add('minimized');
    document.getElementById('hint-restore').style.display = 'block';
  });
  document.getElementById('hint-restore').addEventListener('click', () => {
    document.getElementById('hint').classList.remove('minimized');
    document.getElementById('hint-restore').style.display = 'none';
  });

  const viewport = document.getElementById('viewport');
  const world    = document.getElementById('world');

  // ── Card definitions ──────────────────────────────────────────────
  const CARDS = [
    {
      x: 860, y: 560, z: 1,
      items: [
        'Review creative brief and client feedback',
        'Tweak homepage layout based on UX notes',
        'Finalize social media graphics for launch',
        'Sync with dev team on asset handoff',
        'Test design in mobile and desktop view',
        'Organize files and update naming conventions',
      ]
    },
    {
      x: 1200, y: 460, z: 2,
      items: [
        'Review creative brief and client feedback',
        'Tweak homepage layout based on UX notes',
        'Finalize social media graphics for launch',
        'Sync with dev team on asset handoff',
        'Test design in mobile and desktop view',
        'Organize files and update naming conventions',
      ]
    },
  ];

  // ── Undo / Redo ──────────────────────────────────────────────────
  const undoStack = [];
  const redoStack = [];
  const MAX_UNDO = 50;

  function pushUndo(action) {
    undoStack.push(action);
    if (undoStack.length > MAX_UNDO) undoStack.shift();
    redoStack.length = 0; // clear redo on new action
  }

  function undo() {
    if (!undoStack.length) return;
    const action = undoStack.pop();
    redoStack.push(action);
    applyAction(action, true);
  }

  function redo() {
    if (!redoStack.length) return;
    const action = redoStack.pop();
    undoStack.push(action);
    applyAction(action, false);
  }

  function applyAction(action, isUndo) {
    if (action.type === 'delete') {
      if (isUndo) {
        const ref = world.querySelectorAll('.card')[action.index] || null;
        world.insertBefore(action.cardEl, ref);
        if (action.stuckImgs) action.stuckImgs.forEach(img => world.appendChild(img));
        selectCard(action.cardEl);
      } else {
        if (action.stuckImgs) action.stuckImgs.forEach(img => img.remove());
        if (selectedCard === action.cardEl) selectedCard = null;
        action.cardEl.remove();
      }
      reindexStuckReferences();
      rebuildMinimapCards();
      saveCardPositions();
      saveCanvasImages();
    } else if (action.type === 'move') {
      if (isUndo) {
        action.card.style.left = action.oldX + 'px';
        action.card.style.top  = action.oldY + 'px';
      } else {
        action.card.style.left = action.newX + 'px';
        action.card.style.top  = action.newY + 'px';
      }
      moveStuckImages(action.card);
      updateMinimap();
      saveCardPositions();
    } else if (action.type === 'layer') {
      if (isUndo) {
        action.card.style.zIndex = action.oldZ;
      } else {
        action.card.style.zIndex = action.newZ;
      }
      updateBadge(action.card);
      saveCardPositions();
    } else if (action.type === 'img-move') {
      if (isUndo) {
        action.img.style.left = action.oldX + 'px';
        action.img.style.top  = action.oldY + 'px';
      } else {
        action.img.style.left = action.newX + 'px';
        action.img.style.top  = action.newY + 'px';
      }
      saveCanvasImages();
    } else if (action.type === 'img-delete') {
      if (isUndo) {
        world.appendChild(action.imgEl);
        rebuildMinimapCards();
      } else {
        action.imgEl.remove();
        rebuildMinimapCards();
      }
      saveCanvasImages();
    } else if (action.type === 'img-layer') {
      if (isUndo) {
        action.img.style.zIndex = action.oldZ;
      } else {
        action.img.style.zIndex = action.newZ;
      }
      const badge = action.img.querySelector('.layer-badge');
      if (badge) badge.textContent = 'layer ' + action.img.style.zIndex;
      saveCanvasImages();
    } else if (action.type === 'img-resize') {
      if (isUndo) {
        action.img.style.width = action.oldW + 'px';
        action.img.style.height = action.oldH + 'px';
      } else {
        action.img.style.width = action.newW + 'px';
        action.img.style.height = action.newH + 'px';
      }
      saveCanvasImages();
    } else if (action.type === 'img-stick') {
      if (isUndo) {
        // Undo stick = unstick + reparent to world
        if (action.img.parentElement?.classList.contains('card')) {
          reparentStickerToWorld(action.img);
        }
        delete action.img.dataset.stuckTo;
        delete action.img.dataset.offsetX;
        delete action.img.dataset.offsetY;
        action.img.classList.remove('stuck');
      } else {
        // Redo stick = re-stick + reparent into card
        action.img.dataset.stuckTo = action.stuckTo;
        action.img.dataset.offsetX = action.offsetX;
        action.img.dataset.offsetY = action.offsetY;
        action.img.classList.add('stuck');
        const card = getCardByIndex(parseInt(action.stuckTo));
        if (card) reparentStickerToCard(action.img, card);
      }
      saveCanvasImages();
    } else if (action.type === 'img-unstick') {
      if (isUndo) {
        // Undo unstick = re-stick + reparent into card
        action.img.dataset.stuckTo = action.stuckTo;
        action.img.dataset.offsetX = action.offsetX;
        action.img.dataset.offsetY = action.offsetY;
        action.img.classList.add('stuck');
        const card = getCardByIndex(parseInt(action.stuckTo));
        if (card) reparentStickerToCard(action.img, card);
      } else {
        if (action.img.parentElement?.classList.contains('card')) {
          reparentStickerToWorld(action.img);
        }
        delete action.img.dataset.stuckTo;
        delete action.img.dataset.offsetX;
        delete action.img.dataset.offsetY;
        action.img.classList.remove('stuck');
      }
      saveCanvasImages();
    } else if (action.type === 'img-stick-img') {
      if (isUndo) {
        // Undo stick-to-image = unstick
        delete action.img.dataset.stuckToImg;
        delete action.img.dataset.offsetX;
        delete action.img.dataset.offsetY;
        action.img.classList.remove('stuck');
      } else {
        // Redo stick-to-image = re-stick
        action.img.dataset.stuckToImg = action.stuckToImg;
        action.img.dataset.offsetX = action.offsetX;
        action.img.dataset.offsetY = action.offsetY;
        action.img.classList.add('stuck');
      }
      saveCanvasImages();
    } else if (action.type === 'img-unstick-img') {
      if (isUndo) {
        // Undo unstick-from-image = re-stick
        action.img.dataset.stuckToImg = action.stuckToImg;
        action.img.dataset.offsetX = action.offsetX;
        action.img.dataset.offsetY = action.offsetY;
        action.img.classList.add('stuck');
      } else {
        // Redo unstick-from-image = unstick
        const pos = getImgWorldPos(action.img);
        action.img.style.left = pos.x + 'px';
        action.img.style.top = pos.y + 'px';
        delete action.img.dataset.stuckToImg;
        delete action.img.dataset.offsetX;
        delete action.img.dataset.offsetY;
        action.img.classList.remove('stuck');
      }
      saveCanvasImages();
    } else if (action.type === 'img-create') {
      if (isUndo) {
        action.imgEl.remove();
        rebuildMinimapCards();
      } else {
        // If it was stuck, reparent into its card; otherwise into world
        if (action.imgEl.dataset.stuckTo !== undefined) {
          const card = getCardByIndex(parseInt(action.imgEl.dataset.stuckTo));
          if (card) {
            reparentStickerToCard(action.imgEl, card);
          } else {
            world.appendChild(action.imgEl);
          }
        } else {
          world.appendChild(action.imgEl);
        }
        rebuildMinimapCards();
      }
      saveCanvasImages();
    } else if (action.type === 'multi-move') {
      action.moves.forEach(m => {
        if (isUndo) {
          m.el.style.left = m.oldX + 'px';
          m.el.style.top  = m.oldY + 'px';
        } else {
          m.el.style.left = m.newX + 'px';
          m.el.style.top  = m.newY + 'px';
        }
        if (m.el.classList.contains('card')) moveStuckImages(m.el);
      });
      updateMinimap();
      saveCardPositions();
      saveCanvasImages();
    } else if (action.type === 'multi-delete') {
      if (isUndo) {
        action.items.forEach(item => {
          world.appendChild(item.el);
          if (item.stuckImgs) item.stuckImgs.forEach(img => world.appendChild(img));
        });
      } else {
        action.items.forEach(item => {
          if (item.stuckImgs) item.stuckImgs.forEach(img => img.remove());
          item.el.remove();
        });
      }
      reindexStuckReferences();
      rebuildMinimapCards();
      saveCardPositions();
      saveCanvasImages();
    } else if (action.type === 'card-create') {
      if (isUndo) {
        if (selectedCard === action.card) selectedCard = null;
        action.card.remove();
      } else {
        world.appendChild(action.card);
      }
      reindexStuckReferences();
      rebuildMinimapCards();
      saveCardPositions();
      saveCanvasImages();
    } else if (action.type === 'batch') {
      // Undo/redo a group of actions as one unit
      const actions = isUndo ? [...action.actions].reverse() : action.actions;
      actions.forEach(a => applyAction(a, isUndo));
    } else if (action.type === 'card-unstick') {
      if (isUndo) {
        if (action.stuckToCard) action.card.dataset.stuckToCard = action.stuckToCard;
        if (action.stuckToImg) action.card.dataset.stuckToImg = action.stuckToImg;
        action.card.dataset.offsetX = action.offsetX;
        action.card.dataset.offsetY = action.offsetY;
        action.card.classList.add('stuck');
      } else {
        delete action.card.dataset.stuckToCard;
        delete action.card.dataset.stuckToImg;
        delete action.card.dataset.offsetX;
        delete action.card.dataset.offsetY;
        action.card.classList.remove('stuck');
      }
      saveCardPositions();
    } else if (action.type === 'group-assign') {
      if (isUndo) {
        removeFromGroup(action.el);
        if (action.oldGroupId) addToGroup(action.el, action.oldGroupId);
      } else {
        if (action.oldGroupId) removeFromGroup(action.el);
        addToGroup(action.el, action.newGroupId);
      }
      saveCardPositions();
      saveCanvasImages();
    } else if (action.type === 'group-remove') {
      if (isUndo) {
        addToGroup(action.el, action.groupId);
      } else {
        removeFromGroup(action.el);
      }
      saveCardPositions();
      saveCanvasImages();
    }
  }

  // ── State ─────────────────────────────────────────────────────────
  let selectedCard  = null;
  let isDragging    = false;
  let dragCard      = null;
  let dragOffsetX   = 0;
  let dragOffsetY   = 0;

  // Multi-select support
  const multiSelected = new Set(); // holds cards and images
  let dragStartX    = 0;
  let dragStartY    = 0;

  let panX          = 0;
  let panY          = 0;
  let isPanning     = false;
  let panStartX     = 0;
  let panStartY     = 0;
  let spaceHeld     = false;

  const MAX_ZOOM    = 1.0;
  // Dynamic MIN_ZOOM: viewport must never show beyond the shadow container (8000x8000)
  function getMinZoom() {
    return Math.max(window.innerWidth / 8800, window.innerHeight / 5500);
  }
  let zoom          = MAX_ZOOM;

  // ── Canvas boundary (world coordinates) ────────────────────────
  const CANVAS_SIZE = 2400;                       // 2400×2400 workable area
  const CANVAS_MIN  = -CANVAS_SIZE / 2;           // -1200
  const CANVAS_MAX  =  CANVAS_SIZE / 2;           //  1200

  // Shadow container bounds (world coords) — viewport must stay within these
  const SHADOW_MIN_X = -8000, SHADOW_MAX_X = 8000;
  const SHADOW_MIN_Y = -5000, SHADOW_MAX_Y = 5000;

  function clampPan() {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const worldViewW = vw / zoom;
    const worldViewH = vh / zoom;
    const leftEdge  = -panX / zoom;
    const topEdge   = -panY / zoom;
    const shadowW = SHADOW_MAX_X - SHADOW_MIN_X;
    const shadowH = SHADOW_MAX_Y - SHADOW_MIN_Y;

    const clampedLeft = Math.min(
      Math.max(SHADOW_MIN_X, leftEdge),
      Math.max(SHADOW_MIN_X, SHADOW_MAX_X - worldViewW)
    );
    const clampedTop = Math.min(
      Math.max(SHADOW_MIN_Y, topEdge),
      Math.max(SHADOW_MIN_Y, SHADOW_MAX_Y - worldViewH)
    );

    if (worldViewW >= shadowW) {
      panX = (vw - shadowW * zoom) / 2 - SHADOW_MIN_X * zoom;
    } else {
      panX = -clampedLeft * zoom;
    }
    if (worldViewH >= shadowH) {
      panY = (vh - shadowH * zoom) / 2 - SHADOW_MIN_Y * zoom;
    } else {
      panY = -clampedTop * zoom;
    }
  }

  // ── Group system (peer-based, no base/child hierarchy) ──────────
  function generateGroupId() { return crypto.randomUUID(); }
  const groups = new Map(); // groupId -> Set<Element>
  let soloSelectedEl = null; // tracks 2nd-click solo-selected item in a group
  let lastGroupDragged = false; // true if last group interaction involved dragging (prevents state advance)

  function rebuildGroupRegistry() {
    groups.clear();
    world.querySelectorAll('[data-group-id]').forEach(el => {
      const gid = el.dataset.groupId;
      if (!groups.has(gid)) groups.set(gid, new Set());
      groups.get(gid).add(el);
    });
    // Dissolve solo groups
    for (const [gid, members] of groups) {
      if (members.size <= 1) {
        members.forEach(el => delete el.dataset.groupId);
        groups.delete(gid);
      }
    }
  }

  function getGroupMembers(el) {
    const gid = el.dataset.groupId;
    if (!gid || !groups.has(gid)) return [];
    return [...groups.get(gid)];
  }

  function getElWorldPos(el) {
    if (el.classList.contains('canvas-image')) return getImgWorldPos(el);
    return { x: parseFloat(el.style.left), y: parseFloat(el.style.top) };
  }

  function addToGroup(el, gid) {
    el.dataset.groupId = gid;
    if (!groups.has(gid)) groups.set(gid, new Set());
    groups.get(gid).add(el);
  }

  function removeFromGroup(el) {
    const gid = el.dataset.groupId;
    if (!gid) return;
    delete el.dataset.groupId;
    const s = groups.get(gid);
    if (s) {
      s.delete(el);
      if (s.size <= 1) {
        s.forEach(m => delete m.dataset.groupId);
        groups.delete(gid);
      }
    }
  }

  function highlightGroup(el) {
    const members = getGroupMembers(el);
    members.forEach(m => m.classList.add('group-highlight'));
  }

  function clearGroupHighlight() {
    world.querySelectorAll('.group-highlight').forEach(m => m.classList.remove('group-highlight'));
    world.querySelectorAll('.solo-selected').forEach(m => m.classList.remove('solo-selected'));
    soloSelectedEl = null;
    lastGroupDragged = false;
  }

  // Capture member offsets relative to a dragged element for group drag
  function captureGroupOffsets(dragEl) {
    const members = getGroupMembers(dragEl);
    const offsets = new Map();
    const dragPos = getElWorldPos(dragEl);
    for (const m of members) {
      if (m === dragEl) continue;
      const pos = getElWorldPos(m);
      offsets.set(m, { dx: pos.x - dragPos.x, dy: pos.y - dragPos.y });
    }
    return offsets;
  }

  // Move all group members based on drag element's new position
  function moveGroupMembers(dragEl, groupOffsets) {
    const dragPos = getElWorldPos(dragEl);
    for (const [m, off] of groupOffsets) {
      const nx = dragPos.x + off.dx;
      const ny = dragPos.y + off.dy;
      m.style.left = nx + 'px';
      m.style.top = ny + 'px';
      // Also move any stickers stuck to this element
      if (m.classList.contains('card')) moveStuckImages(m);
    }
    // Move stickers stuck to the drag element too
    if (dragEl.classList.contains('card')) moveStuckImages(dragEl);
  }

  let currentGridColor = [168, 182, 215, 0.45]; // updated by applyDayNight
  let currentDayColors = null;
  let gridOpacityMult = 1; // controlled by dev slider

  // ── Build cards ───────────────────────────────────────────────────
  // ── Persist card positions & content ──
  function saveCardPositions() {
    const cards = world.querySelectorAll('.card');
    const positions = [];
    cards.forEach(card => {
      const entry = {
        x: parseFloat(card.style.left),
        y: parseFloat(card.style.top),
        z: parseInt(card.style.zIndex),
        text: card.dataset.rawText || ''
      };
      if (card.dataset.stuckToCard !== undefined) {
        entry.stuckToCard = card.dataset.stuckToCard;
        entry.offsetX = card.dataset.offsetX;
        entry.offsetY = card.dataset.offsetY;
      }
      if (card.dataset.groupId) entry.groupId = card.dataset.groupId;
      positions.push(entry);
    });
    localStorage.setItem('cardPositions', JSON.stringify(positions));
  }

  function loadCardPositions() {
    try {
      return JSON.parse(localStorage.getItem('cardPositions'));
    } catch { return null; }
  }

  // Convert raw text to display HTML — renders as a single pre-wrap block
  // to exactly match textarea formatting
  function renderCardContent(rawText) {
    if (!rawText) return '';
    const lines = rawText.split('\n');
    return lines.map(line => {
      const isList = /^\s*([-*•]|\d+[.)]) /.test(line);
      const cls = isList ? ' class="editor-line-list"' : '';
      const escaped = escapeHTML(line) || '<br>';
      return '<div' + cls + '>' + escaped + '</div>';
    }).join('');
  }

  function escapeHTML(s) {
    return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  // Convert CARDS items array to raw text (bullet format)
  function itemsToRawText(items) {
    return items.map(t => '   - ' + t).join('\n');
  }

  const savedPositions = loadCardPositions();

  // Build card list: if saved state exists, use ONLY saved state (no defaults)
  const cardCount = savedPositions ? savedPositions.length : CARDS.length;

  for (let idx = 0; idx < cardCount; idx++) {
    const data = savedPositions ? null : CARDS[idx]; // only use defaults if no save exists
    const saved = savedPositions && savedPositions[idx];

    // Skip if no saved data and no default data
    if (!saved && !data) continue;

    const card = document.createElement('div');
    card.className = 'card';
    card.dataset.index = idx;
    card.style.left    = (saved ? saved.x : data.x) + 'px';
    card.style.top     = (saved ? saved.y : data.y) + 'px';
    card.style.zIndex  = saved ? saved.z : data.z;

    // Raw text: use saved text if available, otherwise convert items
    const rawText = (saved && saved.text !== undefined) ? saved.text : (data ? itemsToRawText(data.items) : '');
    card.dataset.rawText = rawText;

    // Layer badge
    const badge = document.createElement('span');
    badge.className = 'layer-badge';
    badge.textContent = 'layer ' + (saved ? saved.z : data.z);
    card.appendChild(badge);

    // Inner wrapper (clips overflow while badge stays visible)
    const inner = document.createElement('div');
    inner.className = 'card-inner';

    // Content display
    const content = document.createElement('div');
    content.className = 'card-content';
    content.innerHTML = renderCardContent(rawText);
    inner.appendChild(content);

    // Editor (contenteditable div, hidden until edit mode)
    const editor = document.createElement('div');
    editor.className = 'card-editor';
    editor.contentEditable = 'true';
    editor.spellcheck = false;
    inner.appendChild(editor);

    card.appendChild(inner);

    // Restore card-on-card sticking
    if (saved && saved.stuckToCard !== undefined) {
      card.dataset.stuckToCard = saved.stuckToCard;
      card.dataset.offsetX = saved.offsetX;
      card.dataset.offsetY = saved.offsetY;
      card.classList.add('stuck');
    }
    if (saved && saved.groupId) card.dataset.groupId = saved.groupId;

    world.appendChild(card);
  }
  rebuildGroupRegistry(); // Build group registry after all cards are created

  // ── Card editing ────────────────────────────────────────────────
  let editingCard = null;

  // ── Contenteditable editor helpers ──────────────────────────────

  // Convert raw text → contenteditable HTML (one <div> per line)
  function rawTextToEditorHTML(raw) {
    if (!raw) return '<div><br></div>';
    const lines = raw.split('\n');
    return lines.map(line => {
      const isList = /^\s*([-*•]|\d+[.)]) /.test(line);
      const cls = isList ? ' class="editor-line-list"' : '';
      const escaped = line.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;') || '<br>';
      return '<div' + cls + '>' + escaped + '</div>';
    }).join('');
  }

  // Convert contenteditable HTML → raw text
  function editorHTMLToRawText(editor) {
    const lines = [];
    const children = editor.childNodes;
    if (children.length === 0) return '';
    for (const child of children) {
      if (child.nodeType === 3) {
        // text node
        lines.push(child.textContent);
      } else if (child.nodeName === 'DIV' || child.nodeName === 'P') {
        lines.push(child.textContent || '');
      } else if (child.nodeName === 'BR') {
        lines.push('');
      } else {
        lines.push(child.textContent || '');
      }
    }
    return lines.join('\n');
  }

  // Apply list-line class to all lines in editor that match list patterns
  function updateEditorLineClasses(editor) {
    for (const child of editor.children) {
      const text = child.textContent || '';
      const isList = /^\s*([-*•]|\d+[.)])[\s\u00A0]/.test(text);
      if (isList) {
        child.classList.add('editor-line-list');
      } else {
        child.classList.remove('editor-line-list');
      }
    }
  }

  // Check if editor content overflows the visible card area
  function editorOverflows(el) {
    return el.scrollHeight > el.clientHeight + 2;
  }

  // Get cursor position info in contenteditable
  function getEditorCursorInfo(editor) {
    const sel = window.getSelection();
    if (!sel.rangeCount) return null;
    const range = sel.getRangeAt(0);
    // Find which line div the cursor is in
    let node = range.startContainer;
    while (node && node !== editor && node.parentNode !== editor) {
      node = node.parentNode;
    }
    if (!node || node === editor) node = editor.lastElementChild;
    return { range, lineNode: node, sel };
  }

  // Get text of the current line
  function getCurrentLineText(editor) {
    const info = getEditorCursorInfo(editor);
    if (!info) return '';
    return info.lineNode.textContent || '';
  }

  // Place cursor at end of editor
  function placeCursorAtEnd(editor) {
    const sel = window.getSelection();
    const range = document.createRange();
    if (editor.lastChild) {
      range.selectNodeContents(editor.lastChild);
      range.collapse(false);
    } else {
      range.selectNodeContents(editor);
      range.collapse(false);
    }
    sel.removeAllRanges();
    sel.addRange(range);
  }

  // Place cursor at specific position within a line div
  function placeCursorInLine(lineDiv, offset) {
    const sel = window.getSelection();
    const range = document.createRange();
    const textNode = lineDiv.firstChild;
    if (textNode && textNode.nodeType === 3) {
      range.setStart(textNode, Math.min(offset, textNode.length));
      range.collapse(true);
    } else {
      range.selectNodeContents(lineDiv);
      range.collapse(offset > 0 ? false : true);
    }
    sel.removeAllRanges();
    sel.addRange(range);
  }

  function startEditing(card) {
    if (editingCard === card) return;
    if (editingCard) stopEditing(editingCard);

    editingCard = card;
    card.classList.add('editing');
    const editor = card.querySelector('.card-editor');
    editor.innerHTML = rawTextToEditorHTML(card.dataset.rawText);
    editor.focus();
    placeCursorAtEnd(editor);
  }

  function stopEditing(card) {
    if (!card || !card.classList.contains('editing')) return;
    card.classList.remove('editing');
    const editor = card.querySelector('.card-editor');
    card.dataset.rawText = editorHTMLToRawText(editor);
    const content = card.querySelector('.card-content');
    content.innerHTML = renderCardContent(card.dataset.rawText);
    editingCard = null;
    saveCardPositions();
  }

  // Double-click to edit
  document.addEventListener('dblclick', (e) => {
    const card = e.target.closest('.card');
    if (!card) return;
    e.preventDefault();
    e.stopPropagation();
    selectCard(card);
    startEditing(card);
  });

  // Editor event delegation — handle auto-indent and overflow
  document.addEventListener('input', (e) => {
    const editor = e.target.closest('.card-editor');
    if (!editor) return;

    // Ensure all direct children are divs (browser might insert bare text)
    let needsNormalize = false;
    for (const child of Array.from(editor.childNodes)) {
      if (child.nodeType === 3 && child.textContent) {
        const div = document.createElement('div');
        const textLen = child.textContent.length;
        div.textContent = child.textContent;
        editor.replaceChild(div, child);
        // Restore cursor to end of the new div
        const sel = window.getSelection();
        const range = document.createRange();
        range.setStart(div.firstChild, textLen);
        range.collapse(true);
        sel.removeAllRanges();
        sel.addRange(range);
        needsNormalize = true;
      }
    }
    if (editor.childNodes.length === 0) {
      editor.innerHTML = '<div><br></div>';
    }

    // Auto-indent: when user types "- ", "* ", "• ", or "1. " at start of a line
    // Check ALL line nodes, not just the cursor line, to catch normalizer edge cases
    for (const child of editor.children) {
      const lineText = child.textContent || '';
      if (child.classList.contains('editor-line-list')) continue;
      const bulletTrigger = lineText.match(/^([-*•])[\s\u00A0]/);
      const numTrigger = lineText.match(/^(\d+[.)])[\s\u00A0]/);
      if (bulletTrigger || numTrigger) {
        child.classList.add('editor-line-list');
      }
    }

    // Update line classes for hanging indent
    updateEditorLineClasses(editor);

    // Overflow check: revert if content exceeds card
    if (editorOverflows(editor)) {
      const prev = editor._prevHTML;
      const prevRange = editor._prevRange;
      if (prev !== undefined) {
        editor.innerHTML = prev;
        // Try to restore cursor position
        if (prevRange) {
          try {
            const sel = window.getSelection();
            const range = document.createRange();
            const targetNode = editor.childNodes[prevRange.nodeIndex] || editor.lastChild;
            if (targetNode) {
              const textNode = targetNode.firstChild;
              if (textNode && textNode.nodeType === 3) {
                range.setStart(textNode, Math.min(prevRange.offset, textNode.length));
              } else {
                range.selectNodeContents(targetNode);
              }
              range.collapse(true);
              sel.removeAllRanges();
              sel.addRange(range);
            }
          } catch(ex) { /* ignore cursor restore errors */ }
        }
      }
    }
  });

  // Save state before each input so we can revert on overflow
  document.addEventListener('beforeinput', (e) => {
    const editor = e.target.closest('.card-editor');
    if (!editor) return;
    editor._prevHTML = editor.innerHTML;
    // Save cursor position info
    const sel = window.getSelection();
    if (sel.rangeCount) {
      const range = sel.getRangeAt(0);
      let node = range.startContainer;
      while (node && node.parentNode !== editor) node = node.parentNode;
      const nodeIndex = Array.from(editor.childNodes).indexOf(node);
      editor._prevRange = { nodeIndex, offset: range.startOffset };
    }
  });

  document.addEventListener('keydown', (e) => {
    const editor = e.target.closest('.card-editor');
    if (!editor) return;

    // Backspace — delete empty list prefix at once
    if (e.key === 'Backspace') {
      const info = getEditorCursorInfo(editor);
      if (info && info.lineNode && info.lineNode !== editor) {
        const lineText = info.lineNode.textContent || '';
        const bulletPrefix = lineText.match(/^\s*([-*•])[\s\u00A0]*$/);
        const numPrefix = lineText.match(/^\s*(\d+[.)])[\s\u00A0]*$/);
        if (bulletPrefix || numPrefix) {
          e.preventDefault();
          e.stopPropagation();
          // If this is the only line, clear it
          if (editor.children.length <= 1) {
            info.lineNode.textContent = '';
            info.lineNode.classList.remove('editor-line-list');
            info.lineNode.innerHTML = '<br>';
            placeCursorInLine(info.lineNode, 0);
          } else {
            // Remove the line, put cursor at end of previous line
            const prev = info.lineNode.previousElementSibling;
            info.lineNode.remove();
            if (prev) {
              placeCursorInLine(prev, (prev.textContent || '').length);
            }
          }
          return;
        }
      }
    }

    // Enter — auto-continue lists
    if (e.key === 'Enter') {
      const info = getEditorCursorInfo(editor);
      if (!info || !info.lineNode) { e.stopPropagation(); return; }

      const lineText = info.lineNode.textContent || '';

      // Check for bullet line
      const bulletMatch = lineText.match(/^(\s*)([-*•])[\s\u00A0]/);
      if (bulletMatch) {
        // If line is just the bullet with no text, remove the bullet
        if (lineText.trim() === bulletMatch[2]) {
          e.preventDefault();
          info.lineNode.textContent = '';
          info.lineNode.classList.remove('editor-line-list');
          info.lineNode.innerHTML = '<br>';
          placeCursorInLine(info.lineNode, 0);
          e.stopPropagation();
          return;
        }
        e.preventDefault();
        // Split line at cursor
        const sel = window.getSelection();
        const range = sel.getRangeAt(0);
        // Get cursor offset within line text
        const preRange = document.createRange();
        preRange.selectNodeContents(info.lineNode);
        preRange.setEnd(range.startContainer, range.startOffset);
        const cursorOffset = preRange.toString().length;
        const beforeCursor = lineText.slice(0, cursorOffset);
        const afterCursor = lineText.slice(cursorOffset);

        const newPrefix = bulletMatch[2] + '\u00A0';
        const newLineText = newPrefix + afterCursor;

        info.lineNode.textContent = beforeCursor;
        const newDiv = document.createElement('div');
        newDiv.classList.add('editor-line-list');
        newDiv.textContent = newLineText;
        info.lineNode.after(newDiv);

        if (editorOverflows(editor)) {
          // Revert
          info.lineNode.textContent = lineText;
          newDiv.remove();
          placeCursorInLine(info.lineNode, cursorOffset);
        } else {
          placeCursorInLine(newDiv, newPrefix.length);
        }
        e.stopPropagation();
        return;
      }

      // Check for numbered line
      const numMatch = lineText.match(/^(\s*)(\d+)([.)])[\s\u00A0]/);
      if (numMatch) {
        const num = parseInt(numMatch[2]);
        const afterPrefix = lineText.slice(numMatch[0].length).trim();
        // If line is just the number with no text, remove it
        if (!afterPrefix) {
          e.preventDefault();
          info.lineNode.textContent = '';
          info.lineNode.classList.remove('editor-line-list');
          info.lineNode.innerHTML = '<br>';
          placeCursorInLine(info.lineNode, 0);
          e.stopPropagation();
          return;
        }
        e.preventDefault();
        const sel = window.getSelection();
        const range = sel.getRangeAt(0);
        const preRange = document.createRange();
        preRange.selectNodeContents(info.lineNode);
        preRange.setEnd(range.startContainer, range.startOffset);
        const cursorOffset = preRange.toString().length;
        const beforeCursor = lineText.slice(0, cursorOffset);
        const afterCursor = lineText.slice(cursorOffset);

        const sep = numMatch[3];
        const prefix = (num + 1) + sep + '\u00A0';
        const newLineText = prefix + afterCursor;

        info.lineNode.textContent = beforeCursor;
        const newDiv = document.createElement('div');
        newDiv.classList.add('editor-line-list');
        newDiv.textContent = newLineText;
        info.lineNode.after(newDiv);

        if (editorOverflows(editor)) {
          info.lineNode.textContent = lineText;
          newDiv.remove();
          placeCursorInLine(info.lineNode, cursorOffset);
        } else {
          placeCursorInLine(newDiv, prefix.length);
        }
        e.stopPropagation();
        return;
      }

      // Plain Enter — let browser handle but check overflow after
      // We save state and let the default happen; the input handler will revert if overflow
    }

    // Escape to exit editing
    if (e.key === 'Escape') {
      e.preventDefault();
      stopEditing(e.target.closest('.card'));
    }

    // Stop propagation for all keys while editing so card shortcuts don't fire
    e.stopPropagation();
  }, true); // capture phase

  function updateBadge(card) {
    const badge = card.querySelector('.layer-badge');
    if (badge) badge.textContent = 'layer ' + card.style.zIndex;
  }

  // ── Selection (centralised so localStorage stays in sync) ─────────
  function clearMultiSelect() {
    multiSelected.forEach(el => el.classList.remove('selected'));
    multiSelected.clear();
    if (selectedCard) {
      selectedCard.classList.remove('selected');
      selectedCard = null;
    }
    world.querySelectorAll('.canvas-image.selected').forEach(i => {
      i.classList.remove('selected');
    });
    updateMinimap();
    applyCardColors();
  }

  function selectCard(card, shiftKey) {
    if (shiftKey) {
      // Multi-select: toggle this card
      if (multiSelected.has(card)) {
        multiSelected.delete(card);
        card.classList.remove('selected');
        if (selectedCard === card) selectedCard = null;
      } else {
        // Add current selectedCard to multi-select if not already there
        if (selectedCard && !multiSelected.has(selectedCard)) {
          multiSelected.add(selectedCard);
        }
        // Add any currently selected images too
        world.querySelectorAll('.canvas-image.selected').forEach(i => {
          if (!multiSelected.has(i)) multiSelected.add(i);
        });
        multiSelected.add(card);
        card.classList.add('selected');
        selectedCard = card;
      }
    } else {
      // Single select: clear multi-select first
      multiSelected.forEach(el => {
        if (el !== card) el.classList.remove('selected');
      });
      multiSelected.clear();
      if (selectedCard && selectedCard !== card) selectedCard.classList.remove('selected');
      world.querySelectorAll('.canvas-image.selected').forEach(i => i.classList.remove('selected'));
      selectedCard = card;
      card.classList.add('selected');
    }
    updateBadge(card);
    localStorage.setItem('lastCardIndex', card.dataset.index);
    applyCardColors(); // refresh bg to reflect new selection
  }

  function applyCardColors() {
    if (!currentDayColors) return;
    const c = currentDayColors;
    const rgb  = v => Math.round(v);
    const normalBg = `rgb(${c.cardBg.map(rgb).join(',')})`;
    const selBg    = `rgb(${c.cardBg.map((v,i) => Math.min(255, rgb(v + (255 - v) * 0.13))).join(',')})`;
    const textCol  = `rgb(${c.cardText.map(rgb).join(',')})`;
    const dotCol = `rgba(${c.cardText.map(rgb).join(',')},0.18)`;
    world.querySelectorAll('.card').forEach(card => {
      card.style.backgroundColor = (card === selectedCard || multiSelected.has(card)) ? selBg : normalBg;
      card.style.color = textCol;
      card.style.backgroundImage = `radial-gradient(circle, ${dotCol} 1px, transparent 1px)`;
    });
  }

  // ── Animated re-home to a card ────────────────────────────────────
  let animFrame = null;

  function homeToCard(card) {
    if (animFrame) cancelAnimationFrame(animFrame);

    const targetZoom = MAX_ZOOM;
    const cx = parseFloat(card.style.left) + card.offsetWidth  / 2;
    const cy = parseFloat(card.style.top)  + card.offsetHeight / 2;
    const targetPanX = window.innerWidth  / 2 - cx * targetZoom;
    const targetPanY = window.innerHeight / 2 - cy * targetZoom;

    const fromPanX = panX, fromPanY = panY, fromZoom = zoom;
    const duration = 420;
    const startTime = performance.now();

    function ease(t) { return t < 0.5 ? 2*t*t : -1 + (4 - 2*t)*t; }

    function tick(now) {
      const t = Math.min((now - startTime) / duration, 1);
      const e = ease(t);
      panX = fromPanX + (targetPanX - fromPanX) * e;
      panY = fromPanY + (targetPanY - fromPanY) * e;
      zoom = fromZoom + (targetZoom  - fromZoom)  * e;
      applyTransformNow();
      animFrame = t < 1 ? requestAnimationFrame(tick) : null;
    }

    animFrame = requestAnimationFrame(tick);
  }

  // ── Initial pan + restore last selected card ───────────────────────
  function saveViewport() {
    localStorage.setItem('viewport', JSON.stringify({ panX, panY, zoom }));
  }

  function initPan() {
    const saved = (() => { try { return JSON.parse(localStorage.getItem('viewport')); } catch { return null; } })();
    let targetPanX, targetPanY, targetZoom;
    if (saved) {
      targetPanX = saved.panX;
      targetPanY = saved.panY;
      targetZoom = Math.min(MAX_ZOOM, Math.max(getMinZoom(), saved.zoom));
    } else {
      const cardsCenterX = 1030;
      const cardsCenterY = 600;
      targetPanX = window.innerWidth  / 2 - cardsCenterX;
      targetPanY = window.innerHeight / 2 - cardsCenterY;
      targetZoom = MAX_ZOOM;
    }

    // Start zoomed out (as if high up in the sky) then animate to target
    const introZoom = targetZoom * 0.55;
    const cx = window.innerWidth / 2;
    const cy = window.innerHeight / 2;
    const introPanX = cx - (cx - targetPanX) * (introZoom / targetZoom);
    const introPanY = cy - (cy - targetPanY) * (introZoom / targetZoom);
    panX = introPanX;
    panY = introPanY;
    zoom = introZoom;
    applyTransformNow();

    // Restore last selected card (default to first card)
    const savedIdx = parseInt(localStorage.getItem('lastCardIndex') ?? '0');
    const allCards = world.querySelectorAll('.card');
    const toSelect = allCards[savedIdx] ?? allCards[0];
    if (toSelect) selectCard(toSelect);

    // Animate zoom with setInterval (more reliable than rAF across contexts)
    const cloud = document.getElementById('cloud-intro');
    const duration = 3000;
    const start = Date.now();
    let introZoomActive = true;

    const introInterval = setInterval(() => {
      if (!introZoomActive) { clearInterval(introInterval); return; }
      const t = Math.min((Date.now() - start) / duration, 1);
      const ease = 1 - Math.pow(1 - t, 4);

      // Only animate zoom — let user pan freely
      const newZoom = introZoom + (targetZoom - introZoom) * ease;

      // Adjust pan to keep the same world point at screen center as zoom changes
      const worldCenterX = (cx - panX) / zoom;
      const worldCenterY = (cy - panY) / zoom;
      zoom = newZoom;
      panX = cx - worldCenterX * zoom;
      panY = cy - worldCenterY * zoom;
      applyTransformNow();

      if (t >= 1) {
        introZoomActive = false;
        clearInterval(introInterval);
        zoom = targetZoom;
        applyTransformNow();
      }
    }, 16);

    // User pinch-zoom cancels the intro zoom
    function cancelIntroZoom(e) {
      if (e.ctrlKey) {
        introZoomActive = false;
        document.removeEventListener('wheel', cancelIntroZoom);
      }
    }
    document.addEventListener('wheel', cancelIntroZoom);

    // Fade out cloud overlay
    cloud.classList.add('fade-out');
    cloud.addEventListener('transitionend', () => cloud.remove());
  }

  // ── Minimap ───────────────────────────────────────────────────────
  const minimap    = document.getElementById('minimap');
  const MM_W = 192, MM_H = 128;
  const MM_PAD = 400;           // world-unit padding around cards
  let   worldBounds = null;
  let   mmDragging  = false;

  // Build minimap card elements (one per world card + images)
  function rebuildMinimapCards() {
    minimap.querySelectorAll('.mm-card, .mm-image').forEach(el => el.remove());
    world.querySelectorAll('.card').forEach(() => {
      const mc = document.createElement('div');
      mc.className = 'mm-card';
      minimap.insertBefore(mc, mmViewport);
    });
    world.querySelectorAll('.canvas-image').forEach(() => {
      const mi = document.createElement('div');
      mi.className = 'mm-image';
      minimap.insertBefore(mi, mmViewport);
    });
    updateMinimap();
  }

  world.querySelectorAll('.card').forEach(() => {
    const mc = document.createElement('div');
    mc.className = 'mm-card';
    minimap.appendChild(mc);
  });
  const mmViewport = document.createElement('div');
  mmViewport.className = 'mm-viewport';
  minimap.appendChild(mmViewport);

  function computeWorldBounds() {
    const cards = world.querySelectorAll('.card');
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    // Include all cards
    cards.forEach(c => {
      const x = parseFloat(c.style.left), y = parseFloat(c.style.top);
      minX = Math.min(minX, x);          minY = Math.min(minY, y);
      maxX = Math.max(maxX, x + (c.offsetWidth  || 290));
      maxY = Math.max(maxY, y + (c.offsetHeight || 435));
    });

    // Include all images
    world.querySelectorAll('.canvas-image').forEach(img => {
      const pos = getImgWorldPos(img);
      const w = parseFloat(img.style.width) || 100;
      const h = parseFloat(img.style.height) || 100;
      minX = Math.min(minX, pos.x);      minY = Math.min(minY, pos.y);
      maxX = Math.max(maxX, pos.x + w);  maxY = Math.max(maxY, pos.y + h);
    });

    // Include current viewport in world coordinates so the minimap
    // always scales to contain what the user can see
    const vL = -panX / zoom,  vT = -panY / zoom;
    const vR = vL + window.innerWidth / zoom;
    const vB = vT + window.innerHeight / zoom;
    minX = Math.min(minX, vL); minY = Math.min(minY, vT);
    maxX = Math.max(maxX, vR); maxY = Math.max(maxY, vB);

    worldBounds = {
      x: minX - MM_PAD,
      y: minY - MM_PAD,
      w: Math.max(maxX - minX + MM_PAD * 2, 2000),
      h: Math.max(maxY - minY + MM_PAD * 2, 1400),
    };
  }

  function updateMinimap() {
    computeWorldBounds(); // recompute each frame so minimap scales with zoom

    // Fade in as zoom decreases below 0.88, fully visible at 0.68
    const opacity = Math.max(0, Math.min(0.65, (0.88 - zoom) / 0.20));
    minimap.style.opacity      = opacity;
    minimap.style.pointerEvents = opacity > 0.05 ? 'auto' : 'none';

    // Uniform scale factor — preserves aspect ratios of all elements
    const mmScale = Math.min(MM_W / worldBounds.w, MM_H / worldBounds.h);
    const usedW = worldBounds.w * mmScale;
    const usedH = worldBounds.h * mmScale;
    const offX = (MM_W - usedW) / 2;
    const offY = (MM_H - usedH) / 2;

    // Card rects
    const worldCards = world.querySelectorAll('.card');
    const mmCards    = minimap.querySelectorAll('.mm-card');
    worldCards.forEach((c, i) => {
      const mc = mmCards[i];
      if (!mc) return;
      const cx = parseFloat(c.style.left), cy = parseFloat(c.style.top);
      mc.style.left   = (offX + (cx - worldBounds.x) * mmScale) + 'px';
      mc.style.top    = (offY + (cy - worldBounds.y) * mmScale) + 'px';
      mc.style.width  = ((c.offsetWidth  || 290) * mmScale) + 'px';
      mc.style.height = ((c.offsetHeight || 435) * mmScale) + 'px';
      mc.classList.toggle('mm-selected', c === selectedCard);
    });

    // Image rects
    const worldImgs = world.querySelectorAll('.canvas-image');
    const mmImgs    = minimap.querySelectorAll('.mm-image');
    worldImgs.forEach((img, i) => {
      const mi = mmImgs[i];
      if (!mi) return;
      const pos = getImgWorldPos(img);
      const ix = pos.x, iy = pos.y;
      const iw = parseFloat(img.style.width) || 100;
      const ih = parseFloat(img.style.height) || 100;
      mi.style.left   = (offX + (ix - worldBounds.x) * mmScale) + 'px';
      mi.style.top    = (offY + (iy - worldBounds.y) * mmScale) + 'px';
      mi.style.width  = (iw * mmScale) + 'px';
      mi.style.height = (ih * mmScale) + 'px';
      mi.classList.toggle('mm-selected', img.classList.contains('selected'));
    });

    // Viewport indicator
    const vL = -panX / zoom, vT = -panY / zoom;
    const vW = window.innerWidth / zoom, vH = window.innerHeight / zoom;
    mmViewport.style.left   = (offX + (vL - worldBounds.x) * mmScale) + 'px';
    mmViewport.style.top    = (offY + (vT - worldBounds.y) * mmScale) + 'px';
    mmViewport.style.width  = (vW * mmScale) + 'px';
    mmViewport.style.height = (vH * mmScale) + 'px';
  }

  function navigateFromMM(e) {
    const rect = minimap.getBoundingClientRect();
    const mmX  = Math.max(0, Math.min(MM_W, e.clientX - rect.left));
    const mmY  = Math.max(0, Math.min(MM_H, e.clientY - rect.top));
    // Reverse the uniform scale + centering offset
    const mmScale = Math.min(MM_W / worldBounds.w, MM_H / worldBounds.h);
    const usedW = worldBounds.w * mmScale;
    const usedH = worldBounds.h * mmScale;
    const offX = (MM_W - usedW) / 2;
    const offY = (MM_H - usedH) / 2;
    const wx   = (mmX - offX) / mmScale + worldBounds.x;
    const wy   = (mmY - offY) / mmScale + worldBounds.y;
    panX = window.innerWidth  / 2 - wx * zoom;
    panY = window.innerHeight / 2 - wy * zoom;
    applyTransform();
  }

  minimap.addEventListener('mousedown', (e) => {
    e.preventDefault();
    e.stopPropagation();
    mmDragging = true;
    navigateFromMM(e);
  });

  const BASE_GRID = 109; // world-unit cell size (1/4 card height: 435 / 4 ≈ 109px)

  let transformRAF = 0;
  function applyTransform() {
    if (!transformRAF) {
      transformRAF = requestAnimationFrame(_doTransform);
    }
  }
  function applyTransformNow() { _doTransform(); }
  function _doTransform() {
    transformRAF = 0;
    clampPan();
    world.style.transform = `translate(${panX}px, ${panY}px) scale(${zoom})`;
    updateMinimap();

    // Keep visual grid cell size in a readable range by scaling up the
    // grid density when zoomed far out (doubles every time it drops below 15px)
    let visualGrid = BASE_GRID * zoom;
    while (visualGrid < 15) visualGrid *= 2;

    // Align grid lines with the world origin so they don't drift while panning
    const offX = ((panX % visualGrid) + visualGrid) % visualGrid;
    const offY = ((panY % visualGrid) + visualGrid) % visualGrid;

    const [gr, gg, gb, ga] = currentGridColor;
    const gLine = `rgba(${Math.round(gr)},${Math.round(gg)},${Math.round(gb)},${(ga * gridOpacityMult).toFixed(3)})`;
    viewport.style.backgroundImage    = `linear-gradient(${gLine} 1px,transparent 1px),linear-gradient(90deg,${gLine} 1px,transparent 1px)`;
    viewport.style.backgroundSize     = `${visualGrid}px ${visualGrid}px`;
    viewport.style.backgroundPosition = `${offX}px ${offY}px`;

    updateMinimap();
    // Debounced save of viewport position
    clearTimeout(_saveVpTimer);
    _saveVpTimer = setTimeout(saveViewport, 300);
  }
  let _saveVpTimer = 0;

  initPan();

  // ── Safety: reset stale drag state on any new mousedown ──────────
  document.addEventListener('mousedown', () => {
    // If a previous drag wasn't cleaned up, reset it
    if (isDragging) {
      isDragging = false;
      if (dragCard) dragCard.style.cursor = '';
      dragCard = null;
    }
  }, true); // capture phase — runs before other handlers

  // ── Pointer events ────────────────────────────────────────────────
  viewport.addEventListener('mousedown', (e) => {
    // Middle mouse, right mouse, or Space+left = pan
    if (e.button === 1 || e.button === 2 || (e.button === 0 && spaceHeld)) {
      e.preventDefault();
      isPanning  = true;
      panStartX  = e.clientX - panX;
      panStartY  = e.clientY - panY;
      viewport.classList.add('is-panning');
      return;
    }

    if (e.button !== 0) return;

    const card = e.target.closest('.card');

    // If clicking inside the editor, let it handle naturally
    if (e.target.closest('.card-editor')) return;


    // Stop editing if clicking outside the editing card
    if (editingCard && (!card || card !== editingCard)) {
      stopEditing(editingCard);
    }

    if (!card) {
      // Click on empty canvas → deselect
      if (!e.shiftKey) {
        clearMultiSelect();
      }
      return;
    }

    e.preventDefault();

    // Don't start drag if card is in edit mode
    if (card.classList.contains('editing')) return;

    // Capture selection state BEFORE any selection changes
    const cardWasSelected = card.classList.contains('selected');
    const isInGroup = !!card.dataset.groupId;
    const isSoloSelected = soloSelectedEl === card;

    // ── SHIFT+CLICK on grouped card: add all group members to multi-select ──
    if (isInGroup && e.shiftKey) {
      clearGroupHighlight();
      // Add all group members to multi-selection
      const members = getGroupMembers(card);
      // Ensure current selectedCard is in multiSelected
      if (selectedCard && !multiSelected.has(selectedCard)) {
        multiSelected.add(selectedCard);
        selectedCard.classList.add('selected');
      }
      // Add any currently selected images too
      world.querySelectorAll('.canvas-image.selected').forEach(i => {
        if (!multiSelected.has(i)) multiSelected.add(i);
      });
      // Add all group members
      members.forEach(m => {
        if (!multiSelected.has(m)) multiSelected.add(m);
        m.classList.add('selected');
        m.classList.add('group-highlight');
      });
      // Also highlight any previously selected items
      multiSelected.forEach(el => {
        if (!members.includes(el)) el.classList.add('selected');
      });
      selectedCard = card;
      updateMinimap();
      applyCardColors();
      return;
    }

    // ── GROUP interaction ──
    // Step 1: First click/drag → highlight entire group. Drag moves group.
    // Step 2: Click any member while group is highlighted → solo-select (orange). Drag peels off.
    if (isInGroup) {
      const groupAlreadyHighlighted = card.classList.contains('group-highlight');

      if (isSoloSelected) {
        // Already solo-selected → drag peels off, click-without-drag stays
        selectCard(card, false);

        let peelMoved = false;
        const peelStartX = e.clientX, peelStartY = e.clientY;
        const peelOrigLeft = parseFloat(card.style.left);
        const peelOrigTop = parseFloat(card.style.top);
        let peeled = false;

        function peelOnMove(ev) {
          const dx = (ev.clientX - peelStartX) / zoom;
          const dy = (ev.clientY - peelStartY) / zoom;
          if (!peeled) {
            const gid = card.dataset.groupId;
            removeFromGroup(card);
            pushUndo({ type: 'group-remove', el: card, groupId: gid });
            clearGroupHighlight();
            peeled = true;
          }
          card.style.left = (peelOrigLeft + dx) + 'px';
          card.style.top = (peelOrigTop + dy) + 'px';
          moveStuckImages(card);
          peelMoved = true;
          updateMinimap();
        }
        function peelOnUp() {
          document.removeEventListener('mousemove', peelOnMove);
          document.removeEventListener('mouseup', peelOnUp);
          if (peelMoved) {
            pushUndo({ type: 'move', card, oldX: peelOrigLeft, oldY: peelOrigTop, newX: parseFloat(card.style.left), newY: parseFloat(card.style.top) });
            saveCardPositions();
            saveCanvasImages();
          }
        }
        document.addEventListener('mousemove', peelOnMove);
        document.addEventListener('mouseup', peelOnUp);
        return;
      }

      if (groupAlreadyHighlighted) {
        // Group is visible → set up group drag. Solo-select only on mouseup without drag.
        selectCard(card, false);
        highlightGroup(card); // keep group highlight
        const groupOffsets2 = captureGroupOffsets(card);
        dragStartX  = parseFloat(card.style.left);
        dragStartY  = parseFloat(card.style.top);
        dragOffsetX = (e.clientX - panX) / zoom - dragStartX;
        dragOffsetY = (e.clientY - panY) / zoom - dragStartY;
        isDragging  = true;
        dragCard    = card;
        dragCard._groupOffsets = groupOffsets2;

        let ghDidDrag = false;
        function ghTrackMove() { ghDidDrag = true; }
        function ghTrackUp() {
          document.removeEventListener('mousemove', ghTrackMove);
          document.removeEventListener('mouseup', ghTrackUp);
          if (!ghDidDrag) {
            // Pure click → solo-select this member
            world.querySelectorAll('.solo-selected').forEach(m => m.classList.remove('solo-selected'));
            soloSelectedEl = card;
            card.classList.add('solo-selected');
            highlightGroup(card);
            card.classList.add('solo-selected'); // re-add after highlightGroup
          }
        }
        document.addEventListener('mousemove', ghTrackMove);
        document.addEventListener('mouseup', ghTrackUp);
        return;
      }

      // First interaction: highlight entire group, drag moves group
      clearGroupHighlight();
      selectCard(card, false);
      highlightGroup(card);
      const groupOffsets = captureGroupOffsets(card);
      dragStartX  = parseFloat(card.style.left);
      dragStartY  = parseFloat(card.style.top);
      dragOffsetX = (e.clientX - panX) / zoom - dragStartX;
      dragOffsetY = (e.clientY - panY) / zoom - dragStartY;
      isDragging  = true;
      dragCard    = card;
      dragCard._groupOffsets = groupOffsets;
      return;
    }

    // ── Non-grouped card: normal selection ──
    if (e.shiftKey) {
      // When shift-clicking, pull any highlighted group members into multiSelected before clearing
      world.querySelectorAll('.group-highlight').forEach(m => {
        if (!multiSelected.has(m)) {
          multiSelected.add(m);
          m.classList.add('selected');
        }
      });
    }
    clearGroupHighlight();
    if (multiSelected.has(card) && !e.shiftKey) {
      selectedCard = card;
    } else {
      selectCard(card, e.shiftKey);
    }

    // Normal card drag
    const actualDragCard = card;

    // Start drag — store offset in world coordinates
    dragStartX  = parseFloat(actualDragCard.style.left);
    dragStartY  = parseFloat(actualDragCard.style.top);
    dragOffsetX = (e.clientX - panX) / zoom - dragStartX;
    dragOffsetY = (e.clientY - panY) / zoom - dragStartY;
    isDragging  = true;
    dragCard    = actualDragCard;

    // Store start positions for all multi-selected items (including the card itself)
    if (multiSelected.size > 1) {
      multiSelected.forEach(el => {
        el._dragStartX = parseFloat(el.style.left);
        el._dragStartY = parseFloat(el.style.top);
      });
    }
  });

  document.addEventListener('mousemove', (e) => {
    if (isDragging && dragCard) {
      // Convert mouse to world coordinates so dragging is zoom-independent
      const x = (e.clientX - panX) / zoom - dragOffsetX;
      const y = (e.clientY - panY) / zoom - dragOffsetY;
      const dx = x - dragStartX;
      const dy = y - dragStartY;
      dragCard.style.left = x + 'px';
      dragCard.style.top  = y + 'px';
      dragCard.style.cursor = 'grabbing';
      moveStuckImages(dragCard);

      // Move group members if this card is in a group
      if (dragCard._groupOffsets) {
        moveGroupMembers(dragCard, dragCard._groupOffsets);
        lastGroupDragged = true; // mark that this interaction involved dragging
      }

      // Move all other multi-selected items together
      // Skip items that are stuck to another multi-selected item (they move via moveStuckItems)
      if (multiSelected.size > 1 && !dragCard._groupOffsets) {
        multiSelected.forEach(el => {
          if (el === dragCard) return;
          if (isStuck(el)) {
            const base = findGroupBase(el);
            if (base && multiSelected.has(base)) return;
          }
          el.style.left = (el._dragStartX + dx) + 'px';
          el.style.top  = (el._dragStartY + dy) + 'px';
          if (el.classList.contains('card')) moveStuckImages(el);
        });
      }
      updateMinimap();
    }

    if (isPanning) {
      panX = e.clientX - panStartX;
      panY = e.clientY - panStartY;
      applyTransform();
      onPanActivity();
    }

    if (mmDragging) navigateFromMM(e);
  });

  // Disable right-click context menu (right-click is used for panning)
  viewport.addEventListener('contextmenu', (e) => e.preventDefault());

  // ── Wheel: pinch = zoom, two-finger drag = pan ───────────────────
  viewport.addEventListener('wheel', (e) => {
    e.preventDefault();

    if (e.ctrlKey) {
      // Pinch gesture — zoom toward cursor
      const factor  = Math.exp(-e.deltaY * 0.01);
      const newZoom = Math.min(MAX_ZOOM, Math.max(getMinZoom(), zoom * factor));
      panX = e.clientX - (e.clientX - panX) * (newZoom / zoom);
      panY = e.clientY - (e.clientY - panY) * (newZoom / zoom);
      zoom = newZoom;
    } else {
      // Two-finger drag — pan
      panX -= e.deltaX;
      panY -= e.deltaY;
    }

    applyTransform();
    onPanActivity();
  }, { passive: false });

  document.addEventListener('mouseup', (e) => {
    if (isDragging && dragCard) {
      dragCard.style.cursor = 'grab';
      const newX = parseFloat(dragCard.style.left);
      const newY = parseFloat(dragCard.style.top);
      if (newX !== dragStartX || newY !== dragStartY) {
        if (multiSelected.size > 1) {
          // Push undo for multi-move
          const moves = [];
          multiSelected.forEach(el => {
            moves.push({
              el,
              oldX: el._dragStartX,
              oldY: el._dragStartY,
              newX: parseFloat(el.style.left),
              newY: parseFloat(el.style.top)
            });
          });
          pushUndo({ type: 'multi-move', moves });
        } else {
          pushUndo({ type: 'move', card: dragCard, oldX: dragStartX, oldY: dragStartY, newX, newY });
        }
      }
      saveCardPositions();
      saveCanvasImages();
    }
    if (dragCard) delete dragCard._groupOffsets;
    isDragging  = false;
    dragCard    = null;
    isPanning   = false;
    mmDragging  = false;
    viewport.classList.remove('is-panning');
  });

  // Track mouse position for card spawning
  let lastMouseX = 0, lastMouseY = 0;
  document.addEventListener('mousemove', (e) => {
    lastMouseX = e.clientX;
    lastMouseY = e.clientY;
  }, true);

  // ── Quick-add menu helpers ──
  let quickAddMenuOpen = false;

  function quickAddMouseFollow(e) {
    const menu = document.getElementById('quick-add-menu');
    menu.style.left = e.clientX + 'px';
    menu.style.top = e.clientY + 'px';
  }

  function openQuickAddMenu() {
    const menu = document.getElementById('quick-add-menu');
    menu.style.left = lastMouseX + 'px';
    menu.style.top = lastMouseY + 'px';
    // Reset selection to first item
    menu.querySelectorAll('.menu-item').forEach(i => i.classList.remove('selected'));
    menu.querySelector('.menu-item[data-action="new-card"]').classList.add('selected');
    menu.classList.add('visible');
    quickAddMenuOpen = true;
    document.addEventListener('mousemove', quickAddMouseFollow, true);
  }

  function closeQuickAddMenu() {
    const menu = document.getElementById('quick-add-menu');
    menu.classList.remove('visible');
    quickAddMenuOpen = false;
    document.removeEventListener('mousemove', quickAddMouseFollow, true);
  }

  // ── Scan-in (image import) ──
  const imageFileInput = document.getElementById('image-file-input');

  function triggerScanIn() {
    closeQuickAddMenu();
    imageFileInput.click();
  }

  imageFileInput.addEventListener('change', (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.type.startsWith('image/')) continue;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const dataUrl = ev.target.result;
        // Load image to get natural dimensions
        const tempImg = new Image();
        tempImg.onload = () => {
          const targetHeight = 435; // same height as a card
          const aspect = tempImg.naturalWidth / tempImg.naturalHeight;
          const targetWidth = targetHeight * aspect;
          // Spawn at mouse position, offset so centered
          const wx = (lastMouseX - panX) / zoom - targetWidth / 2;
          const wy = (lastMouseY - panY) / zoom - targetHeight / 2;
          // Find highest z-index
          let maxZ = 0;
          world.querySelectorAll('.card, .canvas-image').forEach(c => {
            const z = parseInt(c.style.zIndex) || 0;
            if (z > maxZ) maxZ = z;
          });
          const newZ = Math.min(maxZ + 1, 5);
          const newImg = createCanvasImage(dataUrl, wx, wy, targetWidth, targetHeight, newZ, true);
          pushUndo({ type: 'img-create', imgEl: newImg });
        };
        tempImg.src = dataUrl;
      };
      reader.readAsDataURL(file);
    }
    // Reset input so same file can be re-imported
    imageFileInput.value = '';
  });

  function createCanvasImage(dataUrl, x, y, w, h, zIndex, animate, skipSave) {
    const wrapper = document.createElement('div');
    wrapper.className = 'canvas-image';
    if (animate) wrapper.classList.add('dropping-in');
    wrapper.style.left = x + 'px';
    wrapper.style.top = y + 'px';
    wrapper.style.width = w + 'px';
    wrapper.style.height = h + 'px';
    wrapper.style.zIndex = zIndex;
    wrapper.dataset.src = dataUrl;

    const badge = document.createElement('span');
    badge.className = 'layer-badge';
    badge.textContent = 'layer ' + zIndex;
    wrapper.appendChild(badge);

    const img = document.createElement('img');
    img.src = dataUrl;
    wrapper.appendChild(img);

    // Resize handle
    const resizeHandle = document.createElement('div');
    resizeHandle.className = 'resize-handle';
    resizeHandle.innerHTML = '<svg viewBox="0 0 24 24"><polygon points="4,14 4,4 14,4" fill="rgba(140,140,140,0.9)"/><polygon points="20,10 20,20 10,20" fill="rgba(140,140,140,0.9)"/></svg>';
    wrapper.appendChild(resizeHandle);

    // Resize logic (locked aspect ratio)
    resizeHandle.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      e.preventDefault();
      e.stopPropagation();
      const startX = e.clientX, startY = e.clientY;
      const origW = parseFloat(wrapper.style.width);
      const origH = parseFloat(wrapper.style.height);
      const aspect = origW / origH;

      function onMove(ev) {
        const dx = (ev.clientX - startX) / zoom;
        const dy = (ev.clientY - startY) / zoom;
        // Use the larger delta to determine scale, preserving aspect ratio
        const delta = (dx + dy) / 2;
        const newW = Math.max(50, origW + delta);
        const newH = newW / aspect;
        wrapper.style.width = newW + 'px';
        wrapper.style.height = newH + 'px';
        updateMinimap();
      }
      function onUp() {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        const finalW = parseFloat(wrapper.style.width);
        const finalH = parseFloat(wrapper.style.height);
        if (finalW !== origW || finalH !== origH) {
          pushUndo({ type: 'img-resize', img: wrapper, oldW: origW, oldH: origH, newW: finalW, newH: finalH });
        }
        saveCanvasImages();
      }
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    });

    // Remove animation class after it finishes
    if (animate) {
      wrapper.addEventListener('animationend', () => {
        wrapper.classList.remove('dropping-in');
      }, { once: true });
    }

    // Dragging support
    wrapper.addEventListener('mousedown', (e) => {
      if (e.button !== 0 || e.target.closest('.resize-handle')) return;
      e.stopPropagation();

      const isStuckImg = isStuck(wrapper);
      const wasSelected = wrapper.classList.contains('selected');
      const isInGroup = !!wrapper.dataset.groupId;
      const isSoloSelected = soloSelectedEl === wrapper;

      // ── SHIFT+CLICK on grouped image: add all group members to multi-select ──
      if (isInGroup && !isStuckImg && e.shiftKey) {
        clearGroupHighlight();
        const members = getGroupMembers(wrapper);
        if (selectedCard && !multiSelected.has(selectedCard)) {
          multiSelected.add(selectedCard);
          selectedCard.classList.add('selected');
        }
        world.querySelectorAll('.canvas-image.selected').forEach(i => {
          if (!multiSelected.has(i)) multiSelected.add(i);
        });
        members.forEach(m => {
          if (!multiSelected.has(m)) multiSelected.add(m);
          m.classList.add('selected');
          m.classList.add('group-highlight');
        });
        multiSelected.forEach(el => {
          if (!members.includes(el)) el.classList.add('selected');
        });
        updateMinimap();
        applyCardColors();
        return;
      }

      // ── GROUP interaction for images ──
      if (isInGroup && !isStuckImg) {
        const groupAlreadyHighlighted = wrapper.classList.contains('group-highlight');

        if (isSoloSelected) {
          // Already solo-selected → drag peels off
          selectImage(wrapper, false);
          let peelMoved = false;
          const peelStartX = e.clientX, peelStartY = e.clientY;
          const peelOrigLeft = parseFloat(wrapper.style.left);
          const peelOrigTop = parseFloat(wrapper.style.top);
          let peeled = false;
          function peelOnMove(ev) {
            const dx = (ev.clientX - peelStartX) / zoom;
            const dy = (ev.clientY - peelStartY) / zoom;
            if (!peeled) {
              const gid = wrapper.dataset.groupId;
              removeFromGroup(wrapper);
              pushUndo({ type: 'group-remove', el: wrapper, groupId: gid });
              clearGroupHighlight();
              peeled = true;
            }
            wrapper.style.left = (peelOrigLeft + dx) + 'px';
            wrapper.style.top = (peelOrigTop + dy) + 'px';
            moveStuckItems(wrapper);
            peelMoved = true;
            updateMinimap();
          }
          function peelOnUp() {
            document.removeEventListener('mousemove', peelOnMove);
            document.removeEventListener('mouseup', peelOnUp);
            if (peelMoved) {
              pushUndo({ type: 'img-move', img: wrapper, oldX: peelOrigLeft, oldY: peelOrigTop, newX: parseFloat(wrapper.style.left), newY: parseFloat(wrapper.style.top) });
              saveCanvasImages();
            }
          }
          document.addEventListener('mousemove', peelOnMove);
          document.addEventListener('mouseup', peelOnUp);
          return;
        }

        if (groupAlreadyHighlighted) {
          // Group is visible → set up group drag. Solo-select only on mouseup without drag.
          selectImage(wrapper, false);
          highlightGroup(wrapper);
          const groupOffsets2 = captureGroupOffsets(wrapper);
          const imgStartX2 = e.clientX, imgStartY2 = e.clientY;
          const imgOrigLeft2 = parseFloat(wrapper.style.left);
          const imgOrigTop2 = parseFloat(wrapper.style.top);
          let imgMoved2 = false;
          function grpImgMove2(ev) {
            const dx = (ev.clientX - imgStartX2) / zoom;
            const dy = (ev.clientY - imgStartY2) / zoom;
            wrapper.style.left = (imgOrigLeft2 + dx) + 'px';
            wrapper.style.top = (imgOrigTop2 + dy) + 'px';
            moveStuckItems(wrapper);
            moveGroupMembers(wrapper, groupOffsets2);
            imgMoved2 = true;
            updateMinimap();
          }
          function grpImgUp2() {
            document.removeEventListener('mousemove', grpImgMove2);
            document.removeEventListener('mouseup', grpImgUp2);
            if (imgMoved2) {
              pushUndo({ type: 'img-move', img: wrapper, oldX: imgOrigLeft2, oldY: imgOrigTop2, newX: parseFloat(wrapper.style.left), newY: parseFloat(wrapper.style.top) });
              saveCanvasImages(); saveCardPositions();
            } else {
              // Pure click → solo-select this member
              world.querySelectorAll('.solo-selected').forEach(m => m.classList.remove('solo-selected'));
              soloSelectedEl = wrapper;
              wrapper.classList.add('solo-selected');
              highlightGroup(wrapper);
              wrapper.classList.add('solo-selected');
            }
          }
          document.addEventListener('mousemove', grpImgMove2);
          document.addEventListener('mouseup', grpImgUp2);
          return;
        }

        // First interaction: highlight entire group, drag moves group
        clearGroupHighlight();
        selectImage(wrapper, false);
        highlightGroup(wrapper);
        const groupOffsets = captureGroupOffsets(wrapper);
        const imgStartX = e.clientX, imgStartY = e.clientY;
        const imgOrigLeft = parseFloat(wrapper.style.left);
        const imgOrigTop = parseFloat(wrapper.style.top);
        let imgMoved = false;
        function grpImgMove(ev) {
          const dx = (ev.clientX - imgStartX) / zoom;
          const dy = (ev.clientY - imgStartY) / zoom;
          wrapper.style.left = (imgOrigLeft + dx) + 'px';
          wrapper.style.top = (imgOrigTop + dy) + 'px';
          moveStuckItems(wrapper);
          moveGroupMembers(wrapper, groupOffsets);
          imgMoved = true;
          updateMinimap();
        }
        function grpImgUp() {
          document.removeEventListener('mousemove', grpImgMove);
          document.removeEventListener('mouseup', grpImgUp);
          if (imgMoved) {
            pushUndo({ type: 'img-move', img: wrapper, oldX: imgOrigLeft, oldY: imgOrigTop, newX: parseFloat(wrapper.style.left), newY: parseFloat(wrapper.style.top) });
            saveCanvasImages(); saveCardPositions();
          }
        }
        document.addEventListener('mousemove', grpImgMove);
        document.addEventListener('mouseup', grpImgUp);
        return;
      }

      // ── STUCK STICKER: not yet selected → pass through to base drag system ──
      if (isStuckImg && !wasSelected) {
        const base = findGroupBase(wrapper);
        const baseAlreadySelected = base && (base.classList.contains('selected'));

        if (base && base.classList.contains('card')) {
          // Base is a card — select and drag the card
          clearMultiSelect();
          selectedCard = base;
          base.classList.add('selected');
          updateBadge(base);
          updateMinimap();

          dragStartX  = parseFloat(base.style.left);
          dragStartY  = parseFloat(base.style.top);
          dragOffsetX = (e.clientX - panX) / zoom - dragStartX;
          dragOffsetY = (e.clientY - panY) / zoom - dragStartY;
          isDragging  = true;
          dragCard    = base;

          let didMove = false;
          function trackMove() { didMove = true; }
          function trackUp() {
            document.removeEventListener('mousemove', trackMove);
            document.removeEventListener('mouseup', trackUp);
            if (!didMove && baseAlreadySelected) {
              clearMultiSelect();
              selectImage(wrapper, false);
            }
          }
          document.addEventListener('mousemove', trackMove);
          document.addEventListener('mouseup', trackUp);
          return;

        } else if (base && base.classList.contains('canvas-image') && base !== wrapper) {
          // Base is another image — select and drag the base image
          const baseWasSelected = base.classList.contains('selected');
          clearMultiSelect();
          selectImage(base, false);

          const basePos = getImgWorldPos(base);
          const bStartX = e.clientX, bStartY = e.clientY;
          const bOrigLeft = basePos.x, bOrigTop = basePos.y;
          let bMoved = false;

          function bOnMove(ev) {
            const dx = (ev.clientX - bStartX) / zoom;
            const dy = (ev.clientY - bStartY) / zoom;
            base.style.left = (bOrigLeft + dx) + 'px';
            base.style.top = (bOrigTop + dy) + 'px';
            moveStuckItems(base);
            bMoved = true;
            updateMinimap();
          }
          function bOnUp() {
            document.removeEventListener('mousemove', bOnMove);
            document.removeEventListener('mouseup', bOnUp);
            if (!bMoved && baseWasSelected) {
              // Second click without drag → select the stuck sticker
              clearMultiSelect();
              selectImage(wrapper, false);
            } else if (bMoved) {
              pushUndo({ type: 'img-move', img: base, oldX: bOrigLeft, oldY: bOrigTop, newX: parseFloat(base.style.left), newY: parseFloat(base.style.top) });
              if (!isStuck(base)) tryStickImage(base);
              saveCanvasImages();
            }
          }
          document.addEventListener('mousemove', bOnMove);
          document.addEventListener('mouseup', bOnUp);
          return;
        }
        // If base couldn't be resolved (stale ref or base === wrapper), fall through to normal drag
      }

      // ── STUCK STICKER: already selected → peel on drag ──
      let pendingPeel = false;
      let peeled = false;

      if (isStuckImg && wasSelected) {
        pendingPeel = true;
      } else if (multiSelected.has(wrapper) && !e.shiftKey) {
        // Already in multi-select, don't clear
      } else {
        selectImage(wrapper, e.shiftKey);
      }

      const startX = e.clientX, startY = e.clientY;
      let origLeft = parseFloat(wrapper.style.left);
      let origTop = parseFloat(wrapper.style.top);
      // If stuck (inside card or to another image), capture world position
      if (isStuckImg) {
        const pos = getImgWorldPos(wrapper);
        origLeft = pos.x;
        origTop = pos.y;
      }
      let moved = false;

      // Store start positions for multi-selected items
      if (multiSelected.size > 1) {
        multiSelected.forEach(el => {
          el._dragStartX = parseFloat(el.style.left);
          el._dragStartY = parseFloat(el.style.top);
        });
      }

      function onMove(ev) {
        const dx = (ev.clientX - startX) / zoom;
        const dy = (ev.clientY - startY) / zoom;

        // Peel on first move if pending
        if (pendingPeel && !peeled) {
          if (wrapper.dataset.stuckTo) {
            pushUndo({ type: 'img-unstick', img: wrapper, stuckTo: wrapper.dataset.stuckTo, offsetX: wrapper.dataset.offsetX, offsetY: wrapper.dataset.offsetY });
          } else if (wrapper.dataset.stuckToImg) {
            pushUndo({ type: 'img-unstick-img', img: wrapper, stuckToImg: wrapper.dataset.stuckToImg, offsetX: wrapper.dataset.offsetX, offsetY: wrapper.dataset.offsetY });
          }
          unstickImage(wrapper);
          // Update origLeft/origTop to match new world position after unstick
          origLeft = parseFloat(wrapper.style.left);
          origTop = parseFloat(wrapper.style.top);
          // Ensure peeled sticker renders above everything
          let maxZ = 0;
          world.querySelectorAll('.card, .canvas-image').forEach(c => {
            const z = parseInt(c.style.zIndex) || 0;
            if (z > maxZ) maxZ = z;
          });
          wrapper.style.zIndex = Math.min(maxZ + 1, 5);
          // Reindex so children stuck to this image can still find it
          reindexStuckReferences();
          peeled = true;
        }

        wrapper.style.left = (origLeft + dx) + 'px';
        wrapper.style.top = (origTop + dy) + 'px';
        moved = true;
        moveStuckItems(wrapper);

        // Move all other multi-selected items together
        if (multiSelected.size > 1) {
          multiSelected.forEach(el => {
            if (el === wrapper) return;
            el.style.left = (el._dragStartX + dx) + 'px';
            el.style.top  = (el._dragStartY + dy) + 'px';
            moveStuckItems(el);
          });
        }
        updateMinimap();
      }
      function onUp() {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);

        if (moved) {
          if (multiSelected.size > 1) {
            const moves = [];
            multiSelected.forEach(el => {
              moves.push({
                el,
                oldX: el._dragStartX,
                oldY: el._dragStartY,
                newX: parseFloat(el.style.left),
                newY: parseFloat(el.style.top)
              });
            });
            pushUndo({ type: 'multi-move', moves });
          } else {
            const newLeft = parseFloat(wrapper.style.left);
            const newTop = parseFloat(wrapper.style.top);
            pushUndo({ type: 'img-move', img: wrapper, oldX: origLeft, oldY: origTop, newX: newLeft, newY: newTop });
          }
          if (!isStuck(wrapper)) tryStickImage(wrapper);
          saveCanvasImages();
          saveCardPositions();
        }
      }
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    });

    world.appendChild(wrapper);
    applyImageBadgeColors();
    if (!skipSave) saveCanvasImages();
    rebuildMinimapCards();
    return wrapper;
  }

  // ── Image sticking to cards ──
  function tryStickImage(imgEl) {
    const imgX = parseFloat(imgEl.style.left);
    const imgY = parseFloat(imgEl.style.top);
    const imgW = parseFloat(imgEl.style.width);
    const imgH = parseFloat(imgEl.style.height);
    const imgZ = parseInt(imgEl.style.zIndex) || 0;

    // Collect all images that are stuck to this one (direct children in the chain)
    // so we don't try to stick to our own children
    const myChain = new Set([imgEl]);
    function collectChain(el) {
      world.querySelectorAll('.canvas-image').forEach(img => {
        if (img.dataset.stuckToImg === getImgId(el) && !myChain.has(img)) {
          myChain.add(img);
          collectChain(img);
        }
      });
    }
    collectChain(imgEl);

    // 1. Try sticking to a smaller image first (most specific target wins)
    // Check ALL images including those reparented inside cards
    const allImgs = [...world.querySelectorAll('.canvas-image')];
    let bestImg = null;
    let bestArea = Infinity;
    for (const baseImg of allImgs) {
      if (baseImg === imgEl || myChain.has(baseImg)) continue;

      const bPos = getImgWorldPos(baseImg);
      const bW = parseFloat(baseImg.style.width);
      const bH = parseFloat(baseImg.style.height);

      // Image must be smaller than base and fully within its bounds
      if (imgW < bW && imgH < bH &&
          imgX >= bPos.x && imgY >= bPos.y &&
          imgX + imgW <= bPos.x + bW && imgY + imgH <= bPos.y + bH) {
        // Pick the smallest matching image (most specific target)
        const area = bW * bH;
        if (area < bestArea) {
          bestArea = area;
          bestImg = baseImg;
        }
      }
    }

    if (bestImg) {
      const bPos = getImgWorldPos(bestImg);
      const bZ = parseInt(bestImg.style.zIndex) || 0;
      const baseId = getImgId(bestImg);
      const offX = (imgX - bPos.x).toString();
      const offY = (imgY - bPos.y).toString();
      imgEl.dataset.stuckToImg = baseId;
      imgEl.dataset.offsetX = offX;
      imgEl.dataset.offsetY = offY;
      imgEl._peelReady = false;
      imgEl.classList.add('stuck');
      // Ensure stuck image renders above its base
      const targetZ = Math.max(imgZ, bZ);
      imgEl.style.zIndex = targetZ;
      const badge = imgEl.querySelector('.layer-badge');
      if (badge) badge.textContent = 'layer ' + targetZ;
      // Place at end of world so it renders on top
      world.appendChild(imgEl);
      reindexStuckReferences();
      pushUndo({ type: 'img-stick-img', img: imgEl, stuckToImg: getImgId(bestImg), offsetX: offX, offsetY: offY });
      playStickShimmer(imgEl);
      return;
    }

    // 2. Try sticking to a card
    const cards = world.querySelectorAll('.card');
    for (const card of cards) {
      const cx = parseFloat(card.style.left);
      const cy = parseFloat(card.style.top);
      const cw = 290; // card width
      const ch = 435; // card height

      const cardZ = parseInt(card.style.zIndex) || 0;
      if (imgZ >= cardZ && imgW <= cw && imgH <= ch &&
          imgX >= cx && imgY >= cy &&
          imgX + imgW <= cx + cw && imgY + imgH <= cy + ch) {
        const stuckIdx = getCardIndex(card);
        const offX = (imgX - cx).toString();
        const offY = (imgY - cy).toString();
        imgEl.dataset.stuckTo = stuckIdx;
        imgEl.dataset.offsetX = offX;
        imgEl.dataset.offsetY = offY;
        imgEl._peelReady = false;
        imgEl.classList.add('stuck');
        reparentStickerToCard(imgEl, card);
        pushUndo({ type: 'img-stick', img: imgEl, stuckTo: stuckIdx, offsetX: offX, offsetY: offY });
        playStickShimmer(imgEl);
        return;
      }
    }

    // Not within any card or image
    delete imgEl.dataset.stuckTo;
    delete imgEl.dataset.stuckToImg;
    delete imgEl.dataset.offsetX;
    delete imgEl.dataset.offsetY;
    imgEl.classList.remove('stuck');
  }

  function playStickShimmer(imgEl) {
    // Remove any existing shimmer
    const old = imgEl.querySelector('.shimmer-overlay');
    if (old) old.remove();
    const shimmer = document.createElement('div');
    shimmer.className = 'shimmer-overlay';
    imgEl.appendChild(shimmer);
    shimmer.addEventListener('animationend', () => shimmer.remove(), { once: true });
  }

  // Get world-coordinate position of an image (handles reparented stuck stickers)
  function getImgWorldPos(img) {
    // Reparented into a card
    if (img.dataset.stuckTo !== undefined && img.parentElement?.classList.contains('card')) {
      const card = img.parentElement;
      return {
        x: parseFloat(card.style.left) + parseFloat(img.style.left),
        y: parseFloat(card.style.top) + parseFloat(img.style.top)
      };
    }
    // Stuck to another image — walk up the chain
    if (img.dataset.stuckToImg !== undefined) {
      const baseImg = getImgById(parseInt(img.dataset.stuckToImg));
      if (baseImg) {
        const basePos = getImgWorldPos(baseImg);
        return {
          x: basePos.x + parseFloat(img.dataset.offsetX || 0),
          y: basePos.y + parseFloat(img.dataset.offsetY || 0)
        };
      }
    }
    return { x: parseFloat(img.style.left), y: parseFloat(img.style.top) };
  }

  // Reparent sticker into card DOM (creates proper stacking context)
  function reparentStickerToCard(imgEl, card) {
    const offX = parseFloat(imgEl.dataset.offsetX);
    const offY = parseFloat(imgEl.dataset.offsetY);
    card.appendChild(imgEl);
    imgEl.style.left = offX + 'px';
    imgEl.style.top = offY + 'px';
  }

  // Reparent sticker back to world DOM
  function reparentStickerToWorld(imgEl) {
    const pos = getImgWorldPos(imgEl);
    world.appendChild(imgEl);
    imgEl.style.left = pos.x + 'px';
    imgEl.style.top = pos.y + 'px';
  }

  function unstickImage(imgEl) {
    // Move back to world if inside a card
    if (imgEl.parentElement?.classList.contains('card')) {
      reparentStickerToWorld(imgEl);
    }
    // If stuck to another image, convert to world coordinates
    if (imgEl.dataset.stuckToImg) {
      const pos = getImgWorldPos(imgEl);
      imgEl.style.left = pos.x + 'px';
      imgEl.style.top = pos.y + 'px';
    }
    delete imgEl.dataset.stuckTo;
    delete imgEl.dataset.stuckToImg;
    delete imgEl.dataset.offsetX;
    delete imgEl.dataset.offsetY;
    imgEl._peelReady = false;
    imgEl.classList.remove('stuck');
  }

  function getCardIndex(card) {
    const cards = [...world.querySelectorAll('.card')];
    return cards.indexOf(card).toString();
  }

  // Get all images stuck to a card (they are children of the card element)
  function getStuckImages(card) {
    return [...card.querySelectorAll('.canvas-image')];
  }

  function getCardByIndex(idx) {
    const cards = [...world.querySelectorAll('.card')];
    return cards[parseInt(idx)] || null;
  }

  function getImgId(imgEl) {
    // Use DOM index as ID
    const imgs = [...world.querySelectorAll('.canvas-image')];
    return imgs.indexOf(imgEl).toString();
  }

  function getImgById(id) {
    const imgs = [...world.querySelectorAll('.canvas-image')];
    return imgs[parseInt(id)] || null;
  }

  // Re-index all stuckTo/stuckToImg references after DOM changes
  function reindexStuckReferences() {
    const cards = [...world.querySelectorAll('.card')];
    const imgs = [...world.querySelectorAll('.canvas-image')];
    // Fix image→card references (stuckTo)
    imgs.forEach(img => {
      if (img.dataset.stuckTo !== undefined) {
        // If reparented into a card, use parentElement directly
        if (img.parentElement?.classList.contains('card')) {
          const ci = cards.indexOf(img.parentElement);
          if (ci >= 0) {
            img.dataset.stuckTo = ci.toString();
          } else {
            // Parent card no longer in DOM — unstick and reparent to world
            reparentStickerToWorld(img);
            delete img.dataset.stuckTo;
            delete img.dataset.offsetX;
            delete img.dataset.offsetY;
            img.classList.remove('stuck');
          }
        } else {
          // Not reparented — find by position matching
          const pos = getImgWorldPos(img);
          const offX = parseFloat(img.dataset.offsetX);
          const offY = parseFloat(img.dataset.offsetY);
          const expectedCardX = pos.x - offX;
          const expectedCardY = pos.y - offY;
          let found = false;
          cards.forEach((card, ci) => {
            const cx = parseFloat(card.style.left);
            const cy = parseFloat(card.style.top);
            if (Math.abs(cx - expectedCardX) < 1 && Math.abs(cy - expectedCardY) < 1) {
              img.dataset.stuckTo = ci.toString();
              found = true;
            }
          });
          if (!found) {
            delete img.dataset.stuckTo;
            delete img.dataset.offsetX;
            delete img.dataset.offsetY;
            img.classList.remove('stuck');
          }
        }
      }
    });
    // Fix image→image references (stuckToImg)
    // First pass: resolve old index to actual element reference
    const imgRefMap = new Map();
    imgs.forEach(img => {
      if (img.dataset.stuckToImg !== undefined) {
        const oldIdx = parseInt(img.dataset.stuckToImg);
        // The old index may point to wrong element now, so find the base by offset matching
        // Use the element that was at oldIdx before reindex — but indices already shifted.
        // Instead, store ref for second pass.
        imgRefMap.set(img, oldIdx);
      }
    });
    // Second pass: find the correct base by position matching using current world positions
    imgRefMap.forEach((oldIdx, img) => {
      const offX = parseFloat(img.dataset.offsetX);
      const offY = parseFloat(img.dataset.offsetY);
      // Calculate where the base image should be based on this image's current position
      // For images not inside cards, use style.left/top directly
      let myX, myY;
      if (img.parentElement?.classList.contains('card')) {
        const card = img.parentElement;
        myX = parseFloat(card.style.left) + parseFloat(img.style.left);
        myY = parseFloat(card.style.top) + parseFloat(img.style.top);
      } else {
        myX = parseFloat(img.style.left);
        myY = parseFloat(img.style.top);
      }
      const expectedX = myX - offX;
      const expectedY = myY - offY;
      let found = false;
      imgs.forEach((other, oi) => {
        if (other === img) return;
        let oX, oY;
        if (other.parentElement?.classList.contains('card')) {
          const oCard = other.parentElement;
          oX = parseFloat(oCard.style.left) + parseFloat(other.style.left);
          oY = parseFloat(oCard.style.top) + parseFloat(other.style.top);
        } else {
          oX = parseFloat(other.style.left);
          oY = parseFloat(other.style.top);
        }
        if (Math.abs(oX - expectedX) < 2 && Math.abs(oY - expectedY) < 2) {
          img.dataset.stuckToImg = oi.toString();
          found = true;
        }
      });
      if (!found) {
        delete img.dataset.stuckToImg;
        delete img.dataset.offsetX;
        delete img.dataset.offsetY;
        img.classList.remove('stuck');
      }
    });
  }

  // Ensure all items stuck to 'el' have z-index >= el's z-index.
  // Maintains relative ordering but guarantees stickers are always in front of their base.
  function propagateZToStuck(el) {
    const baseZ = parseInt(el.style.zIndex) || 0;

    if (el.classList.contains('card')) {
      // Reparented stickers inside the card: they inherit the card's stacking context,
      // so just ensure their internal z-index is >= 1 relative to sibling content
      el.querySelectorAll('.canvas-image').forEach(img => {
        // These are within the card's stacking context, so their z-index is local.
        // But stuckToImg children in the world need the card's z-index propagated.
        propagateZToStuck(img);
      });

      // Cards stuck to this card
      const cardIdx = getCardIndex(el);
      world.querySelectorAll('.card').forEach(c => {
        if (c !== el && c.dataset.stuckToCard === cardIdx) {
          const cZ = parseInt(c.style.zIndex) || 0;
          if (cZ < baseZ) {
            c.style.zIndex = baseZ;
            updateBadge(c);
          }
          propagateZToStuck(c);
        }
      });
    }

    if (el.classList.contains('canvas-image')) {
      const imgId = getImgId(el);
      // For reparented images, use the card's z-index as the effective base
      const effectiveZ = el.parentElement?.classList.contains('card')
        ? Math.max(parseInt(el.parentElement.style.zIndex) || 0, baseZ)
        : baseZ;

      world.querySelectorAll('.canvas-image').forEach(img => {
        if (img !== el && img.dataset.stuckToImg === imgId) {
          const iZ = parseInt(img.style.zIndex) || 0;
          if (iZ < effectiveZ) {
            img.style.zIndex = effectiveZ;
            const badge = img.querySelector('.layer-badge');
            if (badge) badge.textContent = 'layer ' + effectiveZ;
          }
          propagateZToStuck(img);
        }
      });

      // Cards stuck to this image
      world.querySelectorAll('.card').forEach(c => {
        if (c.dataset.stuckToImg === imgId) {
          const cZ = parseInt(c.style.zIndex) || 0;
          if (cZ < effectiveZ) {
            c.style.zIndex = effectiveZ;
            updateBadge(c);
          }
          propagateZToStuck(c);
        }
      });
    }
  }

  function moveStuckItems(el) {
    if (el.classList.contains('card')) {
      const cardIdx = getCardIndex(el);
      const cx = parseFloat(el.style.left);
      const cy = parseFloat(el.style.top);
      // Cards stuck to this card
      world.querySelectorAll('.card').forEach(c => {
        if (c !== el && c.dataset.stuckToCard === cardIdx) {
          const offX = parseFloat(c.dataset.offsetX) || 0;
          const offY = parseFloat(c.dataset.offsetY) || 0;
          c.style.left = (cx + offX) + 'px';
          c.style.top = (cy + offY) + 'px';
          moveStuckItems(c);
        }
      });
      // Images reparented inside this card may have stuckToImg children in the world
      // Those children need to be updated since the card (and its children) moved
      el.querySelectorAll('.canvas-image').forEach(childImg => {
        moveStuckItems(childImg);
      });
    }
    // Move items stuck to an image
    if (el.classList.contains('canvas-image')) {
      const imgId = getImgId(el);
      // Use world position — handles reparented images inside cards
      const elPos = getImgWorldPos(el);
      const ix = elPos.x;
      const iy = elPos.y;
      // Images stuck to this image
      world.querySelectorAll('.canvas-image').forEach(img => {
        if (img !== el && img.dataset.stuckToImg === imgId) {
          const offX = parseFloat(img.dataset.offsetX) || 0;
          const offY = parseFloat(img.dataset.offsetY) || 0;
          img.style.left = (ix + offX) + 'px';
          img.style.top = (iy + offY) + 'px';
          moveStuckItems(img);
        }
      });
      // Cards stuck to this image
      world.querySelectorAll('.card').forEach(c => {
        if (c.dataset.stuckToImg === imgId) {
          const offX = parseFloat(c.dataset.offsetX) || 0;
          const offY = parseFloat(c.dataset.offsetY) || 0;
          c.style.left = (ix + offX) + 'px';
          c.style.top = (iy + offY) + 'px';
          moveStuckItems(c);
        }
      });
    }
  }

  // Legacy wrapper
  function moveStuckImages(card) {
    moveStuckItems(card);
  }

  // Find the root base of a stuck chain
  function findGroupBase(el) {
    const visited = new Set();
    let current = el;
    while (current && !visited.has(current)) {
      visited.add(current);
      if (current.classList.contains('canvas-image') && current.dataset.stuckTo) {
        // Image stuck to card — if reparented, parent IS the card
        if (current.parentElement?.classList.contains('card')) {
          current = current.parentElement; continue;
        }
        const card = getCardByIndex(parseInt(current.dataset.stuckTo));
        if (card) { current = card; continue; }
      }
      if (current.dataset.stuckToImg) {
        // Stuck to image
        const img = getImgById(parseInt(current.dataset.stuckToImg));
        if (img) { current = img; continue; }
      }
      if (current.dataset.stuckToCard) {
        // Card stuck to card
        const card = getCardByIndex(parseInt(current.dataset.stuckToCard));
        if (card) { current = card; continue; }
      }
      break; // Not stuck to anything — this is the base
    }
    return current;
  }

  // Check if element is stuck to something (any type)
  function isStuck(el) {
    return !!(el.dataset.stuckTo || el.dataset.stuckToImg || el.dataset.stuckToCard);
  }

  function selectImage(imgEl, shiftKey) {
    if (shiftKey) {
      // Multi-select: toggle this image
      if (multiSelected.has(imgEl)) {
        multiSelected.delete(imgEl);
        imgEl.classList.remove('selected');
      } else {
        // Add current selectedCard to multi-select if not already there
        if (selectedCard && !multiSelected.has(selectedCard)) {
          multiSelected.add(selectedCard);
          selectedCard.classList.add('selected');
        }
        // Add any currently selected images too
        world.querySelectorAll('.canvas-image.selected').forEach(i => {
          if (!multiSelected.has(i)) multiSelected.add(i);
        });
        multiSelected.add(imgEl);
        imgEl.classList.add('selected');
      }
    } else {
      // Single select: clear everything
      multiSelected.forEach(el => el.classList.remove('selected'));
      multiSelected.clear();
      if (selectedCard) {
        selectedCard.classList.remove('selected');
        selectedCard = null;
      }
      world.querySelectorAll('.canvas-image.selected').forEach(i => i.classList.remove('selected'));
      imgEl.classList.add('selected');
    }
    updateMinimap();
  }

  function applyImageBadgeColors() {
    world.querySelectorAll('.canvas-image .layer-badge').forEach(badge => {
      badge.style.background = 'rgba(120,120,120,0.7)';
      badge.style.color = '#fff';
    });
  }

  // Save/load canvas images
  function saveCanvasImages() {
    const images = world.querySelectorAll('.canvas-image');
    const data = [];
    images.forEach(img => {
      const pos = getImgWorldPos(img);
      const entry = {
        src: img.dataset.src,
        x: pos.x,
        y: pos.y,
        w: parseFloat(img.style.width),
        h: parseFloat(img.style.height),
        z: parseInt(img.style.zIndex) || 0
      };
      if (img.dataset.stuckTo !== undefined) {
        entry.stuckTo = img.dataset.stuckTo;
        entry.offsetX = img.dataset.offsetX;
        entry.offsetY = img.dataset.offsetY;
      }
      if (img.dataset.stuckToImg !== undefined) {
        entry.stuckToImg = img.dataset.stuckToImg;
        entry.offsetX = img.dataset.offsetX;
        entry.offsetY = img.dataset.offsetY;
      }
      if (img.dataset.groupId) entry.groupId = img.dataset.groupId;
      data.push(entry);
    });
    localStorage.setItem('canvasImages', JSON.stringify(data));
  }

  function loadCanvasImages() {
    try {
      const data = JSON.parse(localStorage.getItem('canvasImages'));
      if (!data) return;
      data.forEach(item => {
        const imgEl = createCanvasImage(item.src, item.x, item.y, item.w, item.h, item.z, false, true);
        if (item.stuckTo !== undefined) {
          imgEl.dataset.stuckTo = item.stuckTo;
          imgEl.dataset.offsetX = item.offsetX;
          imgEl.dataset.offsetY = item.offsetY;
          imgEl.classList.add('stuck');
          // Reparent into card for proper stacking
          const card = getCardByIndex(parseInt(item.stuckTo));
          if (card) reparentStickerToCard(imgEl, card);
        }
        if (item.stuckToImg !== undefined) {
          imgEl.dataset.stuckToImg = item.stuckToImg;
          imgEl.dataset.offsetX = item.offsetX;
          imgEl.dataset.offsetY = item.offsetY;
          imgEl.classList.add('stuck');
        }
        if (item.groupId) imgEl.dataset.groupId = item.groupId;
      });
      rebuildGroupRegistry();
      saveCanvasImages(); // Save once after all stuck states are restored
    } catch(e) {}
  }

  // Deselect images when clicking on canvas (unless shift held) & reset peel state
  viewport.addEventListener('mousedown', (e) => {
    if (e.shiftKey) return; // Don't deselect when shift-clicking
    if (e.target.closest('.canvas-image')) return; // Don't deselect when clicking an image
    if (e.target.closest('.card')) return; // Don't clear when clicking a card (card handler manages highlights)
    clearGroupHighlight(); // Clear group highlights on canvas click
    world.querySelectorAll('.canvas-image.selected').forEach(i => {
      i.classList.remove('selected');
      i._peelReady = false;
    });
    // Reset peel state for stuck cards
    world.querySelectorAll('.card').forEach(c => {
      c._peelReady = false;
    });
  });

  // Load saved images on startup
  loadCanvasImages();

  function spawnNewCard() {
    let maxZ = 0;
    world.querySelectorAll('.card').forEach(c => {
      const z = parseInt(c.style.zIndex) || 0;
      if (z > maxZ) maxZ = z;
    });
    const newZ = Math.min(maxZ + 1, 5);
    const wx = (lastMouseX - panX) / zoom - 145;
    const wy = (lastMouseY - panY) / zoom - 217;
    const card = createCard(wx, wy, newZ);
    selectCard(card);
    startEditing(card);
  }

  // Click handlers for menu items
  document.getElementById('quick-add-menu').addEventListener('click', (e) => {
    const item = e.target.closest('.menu-item');
    if (!item) return;
    closeQuickAddMenu();
    if (item.dataset.action === 'new-card') {
      spawnNewCard();
    } else if (item.dataset.action === 'scan-in') {
      triggerScanIn();
    }
  });

  // Close menu when clicking elsewhere
  document.addEventListener('mousedown', (e) => {
    const menu = document.getElementById('quick-add-menu');
    if (menu.classList.contains('visible') && !menu.contains(e.target)) {
      closeQuickAddMenu();
    }
  });

  // Close menu on Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const menu = document.getElementById('quick-add-menu');
      if (menu.classList.contains('visible')) {
        closeQuickAddMenu();
        e.stopPropagation();
      }
    }
  }, true);

  function createCard(worldX, worldY, zIndex) {
    const card = document.createElement('div');
    card.className = 'card';
    card.style.left = worldX + 'px';
    card.style.top = worldY + 'px';
    card.style.zIndex = zIndex;
    card.dataset.rawText = '';

    const badge = document.createElement('span');
    badge.className = 'layer-badge';
    badge.textContent = 'layer ' + zIndex;
    card.appendChild(badge);

    const inner = document.createElement('div');
    inner.className = 'card-inner';

    const content = document.createElement('div');
    content.className = 'card-content';
    content.innerHTML = '';
    inner.appendChild(content);

    const editor = document.createElement('div');
    editor.className = 'card-editor';
    editor.contentEditable = 'true';
    editor.spellcheck = false;
    inner.appendChild(editor);

    card.appendChild(inner);
    world.appendChild(card);
    applyCardColors();
    rebuildMinimapCards();
    saveCardPositions();
    return card;
  }

  // Prevent context menu on middle-click
  viewport.addEventListener('auxclick', (e) => e.preventDefault());

  // ── Keyboard ──────────────────────────────────────────────────────
  document.addEventListener('keydown', (e) => {
    // Space to pan
    if (e.code === 'Space' && !['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) {
      e.preventDefault();
      spaceHeld = true;
      if (!isPanning) viewport.style.cursor = 'grab';
    }

    // Undo / Redo — works regardless of card selection
    if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
      e.preventDefault();
      undo();
      return;
    }
    if ((e.metaKey || e.ctrlKey) && e.key === 'z' && e.shiftKey) {
      e.preventDefault();
      redo();
      return;
    }

    // Copy selected card or image (Ctrl/Cmd+C)
    if ((e.metaKey || e.ctrlKey) && e.key === 'c') {
      if (document.activeElement?.isContentEditable || ['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return;
      const selImg = world.querySelector('.canvas-image.selected');
      const selCard = selectedCard;
      let clipData = null;
      if (selImg) {
        clipData = {
          type: 'image',
          src: selImg.dataset.src,
          width: parseFloat(selImg.style.width),
          height: parseFloat(selImg.style.height),
          zIndex: parseInt(selImg.style.zIndex) || 1
        };
      } else if (selCard) {
        const rawText = selCard.dataset.rawText || '';
        const stuckImgs = getStuckImages(selCard);
        const cardX = parseFloat(selCard.style.left);
        const cardY = parseFloat(selCard.style.top);
        const stickers = stuckImgs.map(img => {
          const isChild = img.parentElement === selCard;
          return {
            src: img.dataset.src,
            width: parseFloat(img.style.width),
            height: parseFloat(img.style.height),
            zIndex: parseInt(img.style.zIndex) || 1,
            offsetX: isChild ? parseFloat(img.style.left) : parseFloat(img.style.left) - cardX,
            offsetY: isChild ? parseFloat(img.style.top) : parseFloat(img.style.top) - cardY
          };
        });
        clipData = {
          type: 'card',
          rawText: rawText,
          zIndex: parseInt(selCard.style.zIndex) || 1,
          stickers: stickers
        };
      }
      if (clipData) {
        window._clipboardItem = clipData;
        const json = JSON.stringify({ __nozey__: true, ...clipData });
        // Use modern Clipboard API (works cross-instance), fallback to execCommand
        if (navigator.clipboard?.writeText) {
          e.preventDefault();
          navigator.clipboard.writeText(json).catch(() => {});
        } else {
          window._pendingCopy = true;
          document.execCommand('copy');
        }
      }
      return;
    }

    // Group (Cmd/Ctrl+G) — peer-based group system
    if ((e.metaKey || e.ctrlKey) && e.key === 'g') {
      if (document.activeElement?.isContentEditable || ['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return;
      e.preventDefault();

      // Gather all selected items
      let items = [...multiSelected];
      if (selectedCard && !items.includes(selectedCard)) items.push(selectedCard);
      const selImg = world.querySelector('.canvas-image.selected');
      if (selImg && !items.includes(selImg)) items.push(selImg);
      if (items.length < 2) return;

      // Find if any selected item is already in a group — join that group
      let targetGroupId = null;
      for (const el of items) {
        if (el.dataset.groupId) { targetGroupId = el.dataset.groupId; break; }
      }
      if (!targetGroupId) targetGroupId = generateGroupId();

      // Also include ALL existing members of that group (so the whole group stays together)
      if (groups.has(targetGroupId)) {
        for (const existing of groups.get(targetGroupId)) {
          if (!items.includes(existing)) items.push(existing);
        }
      }

      // Assign all items to this group
      const batchActions = [];
      for (const el of items) {
        const oldGid = el.dataset.groupId || null;
        if (oldGid === targetGroupId) continue; // already in this group
        // Remove from old group if in a different one
        if (oldGid && oldGid !== targetGroupId) removeFromGroup(el);
        addToGroup(el, targetGroupId);
        batchActions.push({ type: 'group-assign', el, oldGroupId: oldGid, newGroupId: targetGroupId });
      }

      // Play sparkle on ALL group members
      const allMembers = getGroupMembers(items[0]);
      allMembers.forEach(el => playStickShimmer(el));

      if (batchActions.length > 0) {
        pushUndo({ type: 'batch', actions: batchActions });
        saveCardPositions();
        saveCanvasImages();
      }
      return;
    }

    // Quick-add menu with + key
    if (e.key === '+' || e.key === '=') {
      if (document.activeElement?.isContentEditable || ['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return;
      e.preventDefault();
      const menu = document.getElementById('quick-add-menu');
      if (menu.classList.contains('visible')) {
        // Menu already open — second press creates new card
        closeQuickAddMenu();
        spawnNewCard();
      } else {
        openQuickAddMenu();
      }
      return;
    }

    // Backslash triggers scan-in only when quick-add menu is open
    if (e.key === '\\' && quickAddMenuOpen) {
      if (document.activeElement?.isContentEditable || ['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return;
      e.preventDefault();
      triggerScanIn();
      return;
    }

    // Bring to top layer (') key
    const selImg = world.querySelector('.canvas-image.selected');
    if (e.key === "'" && (selImg || selectedCard)) {
      e.preventDefault();
      // Reset any active drag state to prevent stuck-on-cursor bugs
      isDragging = false;
      dragCard = null;
      let maxZ = 0;
      world.querySelectorAll('.card, .canvas-image').forEach(c => {
        const z = parseInt(c.style.zIndex) || 0;
        if (z > maxZ) maxZ = z;
      });
      const topZ = Math.min(maxZ + 1, 5);
      if (selImg) {
        const oldZ = parseInt(selImg.style.zIndex) || 1;
        selImg.style.zIndex = topZ;
        // Re-append to parent so it renders above siblings with same z-index
        selImg.parentElement.appendChild(selImg);
        // Reindex since DOM order changed (stuckToImg uses DOM indices)
        reindexStuckReferences();
        propagateZToStuck(selImg);
        const badge = selImg.querySelector('.layer-badge');
        if (badge) badge.textContent = 'layer ' + topZ;
        if (oldZ !== topZ) {
          pushUndo({ type: 'img-layer', img: selImg, oldZ, newZ: topZ });
        }
        saveCanvasImages();
      } else if (selectedCard) {
        const oldZ = parseInt(selectedCard.style.zIndex) || 1;
        selectedCard.style.zIndex = topZ;
        // Re-append to world so it renders above siblings with same z-index
        world.appendChild(selectedCard);
        reindexStuckReferences();
        propagateZToStuck(selectedCard);
        if (oldZ !== topZ) {
          pushUndo({ type: 'layer', card: selectedCard, oldZ, newZ: topZ });
        }
        updateBadge(selectedCard);
        saveCardPositions();
      }
      return;
    }

    // Layer keys for selected image
    if (selImg && (e.key === ']' || e.key === '[')) {
      e.preventDefault();
      const oldZ = parseInt(selImg.style.zIndex) || 1;
      if (e.key === ']' && oldZ < 5) {
        selImg.style.zIndex = oldZ + 1;
        const badge = selImg.querySelector('.layer-badge');
        if (badge) badge.textContent = 'layer ' + (oldZ + 1);
        pushUndo({ type: 'img-layer', img: selImg, oldZ, newZ: oldZ + 1 });
      } else if (e.key === '[' && oldZ > 0) {
        selImg.style.zIndex = oldZ - 1;
        const badge = selImg.querySelector('.layer-badge');
        if (badge) badge.textContent = 'layer ' + (oldZ - 1);
        pushUndo({ type: 'img-layer', img: selImg, oldZ, newZ: oldZ - 1 });
      }
      propagateZToStuck(selImg);
      saveCanvasImages();
      return;
    }

    // Multi-delete: delete all selected items
    if (multiSelected.size > 1 && (e.key === 'Delete' || e.key === 'Backspace')) {
      if (document.activeElement?.isContentEditable || ['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return;
      e.preventDefault();
      const deleted = [];
      const extraStuckImgs = [];
      multiSelected.forEach(el => {
        if (el.classList.contains('card')) {
          const cards = [...world.querySelectorAll('.card')];
          const stuckImgs = getStuckImages(el);
          deleted.push({ type: 'card', el, index: cards.indexOf(el), stuckImgs });
          // Collect stuck images not already in multiSelected
          stuckImgs.forEach(img => {
            if (!multiSelected.has(img)) extraStuckImgs.push(img);
          });
        } else if (el.classList.contains('canvas-image')) {
          deleted.push({ type: 'image', el });
        }
      });
      // Before deleting, unstick any items stuck to the items being deleted
      const toDelete = new Set([...multiSelected, ...extraStuckImgs]);
      toDelete.forEach(el => {
        if (el.classList.contains('canvas-image')) {
          const imgId = getImgId(el);
          world.querySelectorAll('.canvas-image').forEach(img => {
            if (!toDelete.has(img) && img.dataset.stuckToImg === imgId) {
              delete img.dataset.stuckToImg;
              delete img.dataset.offsetX;
              delete img.dataset.offsetY;
              img.classList.remove('stuck');
              img._peelReady = false;
            }
          });
          world.querySelectorAll('.card').forEach(c => {
            if (!toDelete.has(c) && c.dataset.stuckToImg === imgId) {
              delete c.dataset.stuckToImg;
              delete c.dataset.offsetX;
              delete c.dataset.offsetY;
              c.classList.remove('stuck');
              c._peelReady = false;
            }
          });
        }
      });
      pushUndo({ type: 'multi-delete', items: deleted });
      extraStuckImgs.forEach(img => img.remove());
      multiSelected.forEach(el => el.remove());
      multiSelected.clear();
      selectedCard = null;
      reindexStuckReferences();
      rebuildMinimapCards();
      saveCardPositions();
      saveCanvasImages();
      return;
    }

    // Delete selected image
    if (selImg && (e.key === 'Delete' || e.key === 'Backspace')) {
      e.preventDefault();
      // Before deleting, unstick all images that were stuck to this image
      const delImgId = getImgId(selImg);
      world.querySelectorAll('.canvas-image').forEach(img => {
        if (img.dataset.stuckToImg === delImgId) {
          delete img.dataset.stuckToImg;
          delete img.dataset.offsetX;
          delete img.dataset.offsetY;
          img.classList.remove('stuck');
          img._peelReady = false;
        }
      });
      // Also unstick any cards stuck to this image
      world.querySelectorAll('.card').forEach(c => {
        if (c.dataset.stuckToImg === delImgId) {
          delete c.dataset.stuckToImg;
          delete c.dataset.offsetX;
          delete c.dataset.offsetY;
          c.classList.remove('stuck');
          c._peelReady = false;
        }
      });
      removeFromGroup(selImg); // safely remove from group before deleting
      pushUndo({ type: 'img-delete', imgEl: selImg });
      selImg.remove();
      reindexStuckReferences();
      saveCanvasImages();
      rebuildMinimapCards();
      return;
    }

    // Layer keys + re-home — only when a card is selected
    if (!selectedCard) return;

    if (e.key === '0') {
      e.preventDefault();
      homeToCard(selectedCard);
    }

    if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      const card = selectedCard;
      const cards = [...world.querySelectorAll('.card')];
      const index = cards.indexOf(card);
      const stuckImgs = getStuckImages(card);
      removeFromGroup(card); // safely remove from group before deleting
      pushUndo({ type: 'delete', cardEl: card, index, stuckImgs });
      stuckImgs.forEach(img => {
        removeFromGroup(img);
        img.remove();
      });
      selectedCard = null;
      card.remove();
      reindexStuckReferences();
      rebuildMinimapCards();
      saveCardPositions();
      saveCanvasImages();
      return;
    }

    if (e.key === ']') {
      e.preventDefault();
      const oldZ = parseInt(selectedCard.style.zIndex) || 1;
      if (oldZ >= 5) { updateBadge(selectedCard); return; }
      selectedCard.style.zIndex = oldZ + 1;
      pushUndo({ type: 'layer', card: selectedCard, oldZ, newZ: oldZ + 1 });
      propagateZToStuck(selectedCard);
      updateBadge(selectedCard);
      saveCardPositions();
    } else if (e.key === '[') {
      e.preventDefault();
      const oldZ = parseInt(selectedCard.style.zIndex) || 1;
      if (oldZ > 0) {
        selectedCard.style.zIndex = oldZ - 1;
        pushUndo({ type: 'layer', card: selectedCard, oldZ, newZ: oldZ - 1 });
      }
      propagateZToStuck(selectedCard);
      updateBadge(selectedCard);
      saveCardPositions();
    }
  });

  document.addEventListener('keyup', (e) => {
    if (e.code === 'Space') {
      spaceHeld = false;
      viewport.style.cursor = '';
    }
  });

  // ── Copy event: write Nozey data to system clipboard reliably ──────
  document.addEventListener('copy', (e) => {
    if (window._pendingCopy && window._clipboardItem) {
      e.preventDefault();
      const json = JSON.stringify({ __nozey__: true, ...window._clipboardItem });
      e.clipboardData.setData('text/plain', json);
      window._pendingCopy = false;
    }
  });

  // ── Paste from system clipboard (external images) ──────────────────
  document.addEventListener('paste', (e) => {
    // Skip if we're editing a card
    if (document.activeElement?.isContentEditable || ['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return;

    const items = e.clipboardData?.items;
    const cx = (window.innerWidth / 2 - panX) / zoom;
    const cy = (window.innerHeight / 2 - panY) / zoom;

    // Determine if the most recent copy was internal (from any Nozey instance)
    const clipText = e.clipboardData?.getData('text/plain') || '';
    let nozeyClipData = null;
    try {
      const parsed = JSON.parse(clipText);
      if (parsed && parsed.__nozey__) {
        nozeyClipData = parsed;
        delete nozeyClipData.__nozey__;
      }
    } catch(ignored) {}

    // If this window has a local clipboard item AND the system clipboard matches, use local
    // Otherwise if system clipboard has Nozey data (from another instance), use that
    const lastCopyWasInternal = nozeyClipData !== null;
    if (nozeyClipData && !window._clipboardItem) {
      // Data from another Nozey instance — use it
      window._clipboardItem = nozeyClipData;
    }

    // 1. If most recent copy was internal, use internal clipboard
    if (lastCopyWasInternal) {
      // Skip to internal paste handling below (section 3)
    }

    // 2. Check external clipboard for images — only if last copy was external
    if (!lastCopyWasInternal && items) {
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/')) {
          e.preventDefault();
          window._clipboardItem = null;
          const blob = items[i].getAsFile();
          const reader = new FileReader();
          reader.onload = (ev) => {
            const dataUrl = ev.target.result;
            const tempImg = new Image();
            tempImg.onload = () => {
              const targetHeight = 435;
              const aspect = tempImg.naturalWidth / tempImg.naturalHeight;
              const targetWidth = targetHeight * aspect;
              const wx = cx - targetWidth / 2;
              const wy = cy - targetHeight / 2;
              let maxZ = 0;
              world.querySelectorAll('.card, .canvas-image').forEach(c => {
                const z = parseInt(c.style.zIndex) || 0;
                if (z > maxZ) maxZ = z;
              });
              const newZ = Math.min(maxZ + 1, 5);
              const newImg = createCanvasImage(dataUrl, wx, wy, targetWidth, targetHeight, newZ, true);
              pushUndo({ type: 'img-create', imgEl: newImg });
            };
            tempImg.src = dataUrl;
          };
          reader.readAsDataURL(blob);
          return;
        }
      }
    }

    // 3. Internal clipboard (copied card or canvas image)
    if (window._clipboardItem) {
      e.preventDefault();
      const item = window._clipboardItem;
      if (item.type === 'image') {
        const wx = cx - item.width / 2;
        const wy = cy - item.height / 2;
        let maxZ = 0;
        world.querySelectorAll('.card, .canvas-image').forEach(c => {
          const z = parseInt(c.style.zIndex) || 0;
          if (z > maxZ) maxZ = z;
        });
        const newZ = Math.min(maxZ + 1, 5);
        const newImg = createCanvasImage(item.src, wx, wy, item.width, item.height, newZ, true);
        pushUndo({ type: 'img-create', imgEl: newImg });
      } else if (item.type === 'card') {
        const wx = cx - 145;
        const wy = cy - 217;
        let maxZ = 0;
        world.querySelectorAll('.card, .canvas-image').forEach(c => {
          const z = parseInt(c.style.zIndex) || 0;
          if (z > maxZ) maxZ = z;
        });
        const newZ = Math.min(maxZ + 1, 5);
        const newCard = createCard(wx, wy, newZ);
        newCard.dataset.rawText = item.rawText;
        const content = newCard.querySelector('.card-content');
        if (content) content.innerHTML = renderCardContent(item.rawText);
        // Recreate stuck stickers
        const batchActions = [{ type: 'card-create', card: newCard }];
        if (item.stickers && item.stickers.length > 0) {
          const newCardIdx = getCardIndex(newCard);
          item.stickers.forEach(s => {
            const sx = wx + s.offsetX;
            const sy = wy + s.offsetY;
            const stickerEl = createCanvasImage(s.src, sx, sy, s.width, s.height, newZ, false);
            stickerEl.dataset.stuckTo = newCardIdx;
            stickerEl.dataset.offsetX = s.offsetX.toString();
            stickerEl.dataset.offsetY = s.offsetY.toString();
            stickerEl.classList.add('stuck');
            reparentStickerToCard(stickerEl, newCard);
            batchActions.push({ type: 'img-create', imgEl: stickerEl });
          });
          saveCanvasImages();
          rebuildMinimapCards();
        }
        pushUndo(batchActions.length > 1
          ? { type: 'batch', actions: batchActions }
          : batchActions[0]);
        saveCardPositions();
      }
    }
  });

  // ── Drag & Drop images onto canvas ─────────────────────────────────
  // Prevent Electron from navigating to dropped files
  document.addEventListener('dragover', (e) => e.preventDefault());
  document.addEventListener('drop', (e) => e.preventDefault());

  viewport.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  });

  viewport.addEventListener('drop', (e) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (!files || files.length === 0) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.type.startsWith('image/')) continue;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const dataUrl = ev.target.result;
        const tempImg = new Image();
        tempImg.onload = () => {
          const targetHeight = 435;
          const aspect = tempImg.naturalWidth / tempImg.naturalHeight;
          const targetWidth = targetHeight * aspect;
          // Drop at mouse position in world coordinates
          const wx = (e.clientX - panX) / zoom - targetWidth / 2;
          const wy = (e.clientY - panY) / zoom - targetHeight / 2;
          let maxZ = 0;
          world.querySelectorAll('.card, .canvas-image').forEach(c => {
            const z = parseInt(c.style.zIndex) || 0;
            if (z > maxZ) maxZ = z;
          });
          const newZ = Math.min(maxZ + 1, 5);
          const newImg = createCanvasImage(dataUrl, wx, wy, targetWidth, targetHeight, newZ, true);
          pushUndo({ type: 'img-create', imgEl: newImg });
        };
        tempImg.src = dataUrl;
      };
      reader.readAsDataURL(file);
    }
  });

  // ── Day / Night Cycle ─────────────────────────────────────────────
  //  Each stop: h=hour(0-24), bg=canvas rgb, grid=rgba, cardBg=rgb,
  //             cardText=rgb, overlay=rgba (golden/tint glow)
  const TIME_STOPS = [
    // Cards stay near-white throughout — only subtle tinting from the ambient light
    { h: 0,    bg:[13,22,38],     grid:[60,100,200,0.28],  cardBg:[240,244,255],  cardText:[0,0,0],  overlay:[0,10,40,0.00]   }, // night — white + moonlit blue wash
    { h: 5,    bg:[11,17,36],     grid:[55,88,185,0.26],   cardBg:[238,242,255],  cardText:[0,0,0],  overlay:[0,5,30,0.00]    }, // pre-dawn
    { h: 6,    bg:[255,244,216],  grid:[215,162,75,0.40],  cardBg:[252,248,240],  cardText:[0,0,0],  overlay:[255,150,40,0.11] }, // sunrise — faint warmth
    { h: 7.5,  bg:[242,241,237],  grid:[175,185,215,0.42], cardBg:[245,247,252],  cardText:[0,0,0],  overlay:[255,200,100,0.03] },
    { h: 10,   bg:[238,239,243],  grid:[168,182,215,0.45], cardBg:[244,246,251],  cardText:[0,0,0],  overlay:[255,210,110,0.018] },
    { h: 16,   bg:[239,238,241],  grid:[170,178,215,0.44], cardBg:[244,246,251],  cardText:[0,0,0],  overlay:[255,200,100,0.020] },
    { h: 17.5, bg:[255,247,226],  grid:[215,168,80,0.40],  cardBg:[248,244,234],  cardText:[0,0,0],  overlay:[255,155,45,0.09]  }, // golden hour — very subtle amber
    { h: 19,   bg:[255,228,178],  grid:[228,142,52,0.50],  cardBg:[250,243,228],  cardText:[0,0,0],  overlay:[255,118,18,0.17]  }, // sunset — soft warm blush
    { h: 20.5, bg:[32,25,60],     grid:[85,72,178,0.35],   cardBg:[240,240,252],  cardText:[0,0,0],  overlay:[0,0,0,0.00]      }, // dusk — white + hint of lavender
    { h: 22,   bg:[13,22,38],     grid:[60,100,200,0.28],  cardBg:[240,244,255],  cardText:[0,0,0],  overlay:[0,0,0,0.00]      }, // night
    { h: 24,   bg:[13,22,38],     grid:[60,100,200,0.28],  cardBg:[240,244,255],  cardText:[0,0,0],  overlay:[0,0,0,0.00]      },
  ];

  const PHASE_NAMES = [
    [0, 5,    'Night'],
    [5, 6,    'Pre-dawn'],
    [6, 8,    'Sunrise'],
    [8, 11,   'Morning'],
    [11, 16,  'Midday'],
    [16, 17.5,'Afternoon'],
    [17.5,19, 'Golden hour'],
    [19, 20.5,'Sunset'],
    [20.5,22, 'Dusk'],
    [22, 24,  'Night'],
  ];

  function lerpArr(a, b, t) { return a.map((v, i) => v + (b[i] - v) * t); }

  function getTimeColors(h) {
    h = ((h % 24) + 24) % 24;
    let i = 0;
    while (i < TIME_STOPS.length - 2 && TIME_STOPS[i + 1].h <= h) i++;
    const s0 = TIME_STOPS[i], s1 = TIME_STOPS[i + 1];
    const t  = (h - s0.h) / (s1.h - s0.h);
    return {
      bg:       lerpArr(s0.bg,       s1.bg,       t),
      grid:     lerpArr(s0.grid,     s1.grid,     t),
      cardBg:   lerpArr(s0.cardBg,   s1.cardBg,   t),
      cardText: lerpArr(s0.cardText, s1.cardText, t),
      overlay:  lerpArr(s0.overlay,  s1.overlay,  t),
    };
  }

  function getPhaseName(h) {
    h = ((h % 24) + 24) % 24;
    for (const [start, end, name] of PHASE_NAMES) {
      if (h >= start && h < end) return name;
    }
    return 'Night';
  }

  const skyOverlay = document.getElementById('sky-overlay');

  function applyDayNight(h) {
    const c = getTimeColors(h);
    currentDayColors = c;
    currentGridColor = c.grid;

    // Canvas bg
    viewport.style.backgroundColor = `rgb(${c.bg.map(Math.round).join(',')})`;

    // Sky overlay
    const [or, og, ob, oa] = c.overlay;
    skyOverlay.style.backgroundColor =
      `rgba(${Math.round(or)},${Math.round(og)},${Math.round(ob)},${oa.toFixed(3)})`;

    applyCardColors();
    applyTransformNow(); // redraw grid with new color

    // Brand text — subtle golden glow at night
    const brandName    = document.querySelector('.brand-name');
    const brandTagline = document.querySelector('.brand-tagline');
    const brandVersion = document.querySelector('.brand-version');
    // Night factor: 1.0 during deep night, 0.0 during day
    // Glow fades out by 5:30am, fades in starting 19:30 (7:30pm)
    let nightF = 0;
    const hh = ((h % 24) + 24) % 24;
    if (hh >= 20.5) nightF = 1;
    else if (hh >= 19.5) nightF = (hh - 19.5) / 1;
    else if (hh <= 4.5) nightF = 1;
    else if (hh < 5.5) nightF = Math.max(1 - (hh - 4.5) / 1, 0);

    if (nightF > 0) {
      const gR = Math.round(210 + 35 * nightF);
      const gG = Math.round(180 + 10 * nightF);
      const gB = Math.round(100 + 20 * nightF);
      const nameA = 0.75 + 0.15 * nightF;
      const glowA = (0.35 * nightF).toFixed(2);
      brandName.style.color = `rgba(${gR},${gG},${gB},${nameA})`;
      brandName.style.textShadow = `0 0 12px rgba(${gR},${gG},${gB},${glowA}), 0 0 30px rgba(${gR},${gG},${gB},${(glowA * 0.4).toFixed(2)})`;
      brandTagline.style.color = `rgba(${gR},${gG},${gB},${(0.35 * nightF).toFixed(2)})`;
      brandVersion.style.color = `rgba(${gR},${gG},${gB},${(0.3 * nightF).toFixed(2)})`;
    } else {
      brandName.style.color = 'rgba(0,0,0,0.75)';
      brandName.style.textShadow = 'none';
      brandTagline.style.color = 'rgba(0,0,0,0.3)';
      brandVersion.style.color = 'rgba(0,0,0,0.25)';
    }

    // Dynamic selection glow — warm golden at night, grey during day
    if (!window._selGlowStyle) {
      window._selGlowStyle = document.createElement('style');
      document.head.appendChild(window._selGlowStyle);
    }
    if (nightF > 0) {
      const gR = Math.round(225 + 30 * nightF);
      const gG = Math.round(185 + 10 * nightF);
      const gB = Math.round(100 + 20 * nightF);
      const borderA = (0.5 + 0.4 * nightF).toFixed(2);
      const glowA1 = (0.3 + 0.4 * nightF).toFixed(2);
      const glowA2 = (0.15 + 0.25 * nightF).toFixed(2);
      const glowA3 = (0.05 + 0.12 * nightF).toFixed(2);
      window._selGlowStyle.textContent = `
        .card.selected {
          box-shadow:
            0 0 0 2px rgba(${gR},${gG},${gB},${borderA}),
            0 0 18px rgba(${gR},${gG},${gB},${glowA1}),
            0 0 45px rgba(${gR},${gG},${gB},${glowA2}),
            0 0 80px rgba(${gR},${gG},${gB},${glowA3}),
            0 2px 6px rgba(0,0,0,0.15) !important;
        }
        .canvas-image.selected {
          box-shadow:
            0 0 0 2px rgba(${gR},${gG},${gB},${borderA}),
            0 0 18px rgba(${gR},${gG},${gB},${glowA1}),
            0 0 45px rgba(${gR},${gG},${gB},${glowA2}),
            0 0 80px rgba(${gR},${gG},${gB},${glowA3}),
            0 2px 6px rgba(0,0,0,0.15) !important;
        }
        .canvas-image.selected.stuck {
          box-shadow:
            0 0 0 2px rgba(${gR},${gG},${gB},${borderA}),
            0 0 18px rgba(${gR},${gG},${gB},${glowA1}),
            0 0 45px rgba(${gR},${gG},${gB},${glowA2}),
            0 0 80px rgba(${gR},${gG},${gB},${glowA3}) !important;
        }
      `;
    } else {
      window._selGlowStyle.textContent = '';
    }

    // Auto-adjust sliders based on time of day
    // Day defaults: Shadow=40, Grid=100, LeafOpacity=40, LeafAmount=60, LeafSize=80
    // Night targets: Shadow=35, Grid=100, LeafOpacity=30, LeafAmount=65, LeafSize=85
    const daySettings   = { shadow: 40, grid: 100, leafOp: 40, leafAmt: 60, leafSz: 80 };
    const nightSettings = { shadow: 35, grid: 100, leafOp: 30, leafAmt: 65, leafSz: 85 };
    const lerp = (a, b, t) => Math.round(a + (b - a) * t);

    const shadowVal  = lerp(daySettings.shadow,  nightSettings.shadow,  nightF);
    const gridVal    = lerp(daySettings.grid,    nightSettings.grid,    nightF);
    const leafOpVal  = lerp(daySettings.leafOp,  nightSettings.leafOp,  nightF);
    const leafAmtVal = lerp(daySettings.leafAmt, nightSettings.leafAmt, nightF);
    const leafSzVal  = lerp(daySettings.leafSz,  nightSettings.leafSz,  nightF);

    const shadowSlider = document.getElementById('dev-shadow-slider');
    const gridSlider   = document.getElementById('dev-grid-slider');
    const leafOpSlider = document.getElementById('dev-leaf-opacity');
    const leafAmtSlider = document.getElementById('dev-leaf-amount');
    const leafSzSlider = document.getElementById('dev-leaf-size');

    // Shadow opacity is controlled only by the slider — no auto-adjust
    if (gridSlider && !gridSlider._userOverride) {
      gridSlider.value = gridVal;
      gridOpacityMult = gridVal / 100;
    }
    if (leafOpSlider && !leafOpSlider._userOverride) {
      leafOpSlider.value = leafOpVal;
      window.leafOpacity = leafOpVal / 100;
    }
    if (leafAmtSlider && !leafAmtSlider._userOverride) {
      leafAmtSlider.value = leafAmtVal;
      window.leafAmount = leafAmtVal / 100;
    }
    if (leafSzSlider && !leafSzSlider._userOverride) {
      leafSzSlider.value = leafSzVal;
      window.leafSize = leafSzVal / 100;
    }
  }

  // ── Dev bar ───────────────────────────────────────────────────────
  const devSlider    = document.getElementById('dev-slider');
  const devTimeEl    = document.getElementById('dev-time');
  const devPhaseEl   = document.getElementById('dev-phase');
  const devLiveBtn   = document.getElementById('dev-live');

  let isLive           = true;
  let isSliderDragging = false;
  let sliderRafId      = null;

  function pad(n) { return String(n).padStart(2, '0'); }
  function formatMinutes(m) {
    return `${pad(Math.floor(m / 60) % 24)}:${pad(m % 60)}`;
  }

  // Update the text labels only — devSlider.value is NEVER touched here
  function updateDevDisplay(h) {
    const totalMin = Math.round(h * 60) % 1440;
    devTimeEl.textContent  = formatMinutes(totalMin);
    devPhaseEl.textContent = getPhaseName(h);
  }

  function getLiveHour() {
    const n = new Date();
    return n.getHours() + n.getMinutes() / 60 + n.getSeconds() / 3600;
  }

  function tickDayNight() {
    if (!isLive || isSliderDragging) return;
    const h = getLiveHour();
    updateDevDisplay(h);
    applyDayNight(h);
  }

  devSlider.addEventListener('mousedown', () => { isSliderDragging = true; });
  document.addEventListener('mouseup', () => { isSliderDragging = false; });

  devSlider.addEventListener('input', () => {
    isLive = false;
    devLiveBtn.classList.remove('is-live');
    const h = parseInt(devSlider.value) / 60;
    updateDevDisplay(h);
    // Throttle visual update to one call per frame
    if (sliderRafId) cancelAnimationFrame(sliderRafId);
    sliderRafId = requestAnimationFrame(() => {
      sliderRafId = null;
      applyDayNight(parseInt(devSlider.value) / 60);
    });
  });

  devLiveBtn.addEventListener('click', () => {
    isLive = true;
    devLiveBtn.classList.add('is-live');
    const h = getLiveHour();
    devSlider.value = Math.round(h * 60) % 1440;
    updateDevDisplay(h);
    // Enable smooth transition only for this snap-back
    document.body.classList.add('day-night-transitioning');
    applyDayNight(h);
    setTimeout(() => document.body.classList.remove('day-night-transitioning'), 3500);
  });

  // Init: set slider to current time, apply colors
  const initH = getLiveHour();
  devSlider.value = Math.round(initH * 60) % 1440;
  updateDevDisplay(initH);
  applyDayNight(initH);
  devLiveBtn.classList.add('is-live');

  // Tick every 30 s (only updates display text, never the slider)
  const dayNightInterval = setInterval(tickDayNight, 30_000);

  // ── Tree shadow (dappled light through branches & leaves) ──────
  (function initTreeShadow() {
    // Create shadow container inside #world so it pans/zooms with the canvas
    const container = document.createElement('div');
    container.id = 'tree-shadow-container';
    const shadowEl = document.createElement('div');
    shadowEl.id = 'tree-shadow';
    container.appendChild(shadowEl);
    container.style.opacity = '1'; // container stays full opacity; inner div controls visibility
    world.appendChild(container);

    // Direct canvas covering the full shadow container — CSS stretches it
    const cvs = document.createElement('canvas');
    const W = 2048, H = 2048;  // resolution — CSS stretches to 8000x8000
    cvs.width = W; cvs.height = H;
    cvs.style.width = '100%';
    cvs.style.height = '100%';
    cvs.style.filter = 'blur(16px)';
    shadowEl.appendChild(cvs);
    const ctx = cvs.getContext('2d');

    function rand(min, max) { return Math.random() * (max - min) + min; }

    // Draw a flowing curved branch, returns points along it
    function drawBranch(sx, sy, length, angle, width, opacity) {
      const pts = [{ x: sx, y: sy, angle }];
      const segs = Math.floor(rand(4, 7));
      let x = sx, y = sy, a = angle;
      ctx.beginPath();
      ctx.moveTo(x, y);
      for (let s = 0; s < segs; s++) {
        const segLen = length / segs;
        a += rand(-0.4, 0.4);
        const cx1 = x + Math.cos(a + rand(-0.25, 0.25)) * segLen * 0.33;
        const cy1 = y + Math.sin(a + rand(-0.25, 0.25)) * segLen * 0.33;
        const cx2 = x + Math.cos(a + rand(-0.25, 0.25)) * segLen * 0.66;
        const cy2 = y + Math.sin(a + rand(-0.25, 0.25)) * segLen * 0.66;
        x += Math.cos(a) * segLen;
        y += Math.sin(a) * segLen;
        ctx.bezierCurveTo(cx1, cy1, cx2, cy2, x, y);
        pts.push({ x, y, angle: a });
      }
      ctx.strokeStyle = `rgba(0,0,0,${opacity})`;
      ctx.lineWidth = width;
      ctx.lineCap = 'round';
      ctx.stroke();
      return pts;
    }

    function drawLeafCluster(cx, cy, rx, ry, rot, opacity) {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(rot);
      ctx.beginPath();
      ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(0,0,0,${opacity})`;
      ctx.fill();
      ctx.restore();
    }

    // Evenly distribute trees across the full canvas, including margins
    // so branches near edges still extend to the very border
    const trees = [];
    const margin = 80; // extra trees outside the visible area
    const gridN = 7;
    const totalW = W + margin * 2;
    const cell = totalW / gridN;
    for (let r = 0; r < gridN; r++) {
      for (let c = 0; c < gridN; c++) {
        trees.push({
          x: -margin + cell * c + rand(cell * 0.15, cell * 0.85),
          y: -margin + cell * r + rand(cell * 0.15, cell * 0.85)
        });
      }
    }

    trees.forEach(tree => {
      const branchCount = Math.floor(rand(4, 7));
      for (let b = 0; b < branchCount; b++) {
        const angle = rand(0, Math.PI * 2);
        const length = rand(120, 380);
        const width = rand(3, 12);
        const pts = drawBranch(tree.x, tree.y, length, angle, width, rand(0.35, 0.65));

        // Sub-branches
        const subCount = Math.floor(rand(2, 5));
        for (let sb = 0; sb < subCount; sb++) {
          const pi = Math.floor(rand(1, pts.length - 1));
          const p = pts[pi];
          const subAngle = p.angle + rand(-1.0, 1.0);
          const subLen = length * rand(0.25, 0.5);
          const subW = width * rand(0.3, 0.6);
          const subPts = drawBranch(p.x, p.y, subLen, subAngle, subW, rand(0.25, 0.55));

          // Leaf clusters along sub-branches
          for (let l = 0; l < rand(2, 5); l++) {
            const sp = subPts[Math.floor(rand(0, subPts.length))];
            drawLeafCluster(sp.x + rand(-25, 25), sp.y + rand(-25, 25),
              rand(18, 55), rand(12, 38), rand(0, Math.PI * 2), rand(0.15, 0.4));
          }
        }

        // Leaf clusters along main branch
        for (let ml = 0; ml < rand(4, 9); ml++) {
          const pi = Math.floor(rand(1, pts.length));
          const p = pts[pi];
          drawLeafCluster(p.x + rand(-30, 30), p.y + rand(-30, 30),
            rand(20, 60), rand(14, 42), rand(0, Math.PI * 2), rand(0.12, 0.38));
        }
      }
    });

    // Ambient scattered clusters for soft fill (including edges)
    for (let i = 0; i < 200; i++) {
      drawLeafCluster(rand(-40, W + 40), rand(-40, H + 40),
        rand(10, 40), rand(8, 28), rand(0, Math.PI * 2), rand(0.04, 0.14));
    }

    // ── Shadow intensity slider ──
    const shadowSlider = document.getElementById('dev-shadow-slider');
    shadowEl.style.opacity = shadowSlider.value / 100; // apply default
    shadowSlider.addEventListener('input', () => {
      shadowSlider._userOverride = true;
      shadowEl.style.opacity = shadowSlider.value / 100;
    });

    // ── Grid opacity slider ──
    const gridSlider = document.getElementById('dev-grid-slider');
    gridSlider.addEventListener('input', () => {
      gridSlider._userOverride = true;
      gridOpacityMult = gridSlider.value / 100;
      applyTransformNow();
    });
  })();

  // ── Pan-activity tracker (used by falling leaves) ──────────────
  let leafPanFade = 1;           // 1 = fully visible, 0 = hidden
  let leafPanTimer = null;
  const LEAF_FADE_OUT = 200;     // ms to fade out
  const LEAF_FADE_IN  = 600;     // ms to fade back in
  let leafFadeStart = 0;
  let leafFadeFrom  = 1;
  let leafFadeTo    = 1;

  function onPanActivity() {
    // When wind is on, keep leaves visible during panning
    if (window._windEnabled) return;
    // Start fading out
    if (leafFadeTo !== 0) {
      leafFadeFrom = leafPanFade;
      leafFadeTo = 0;
      leafFadeStart = performance.now();
    }
    clearTimeout(leafPanTimer);
    leafPanTimer = setTimeout(() => {
      // 1s of stillness — fade back in
      leafFadeFrom = leafPanFade;
      leafFadeTo = 1;
      leafFadeStart = performance.now();
    }, 1000);
  }

  function updateLeafPanFade(now) {
    const dur = leafFadeTo === 0 ? LEAF_FADE_OUT : LEAF_FADE_IN;
    const t = Math.min((now - leafFadeStart) / dur, 1);
    leafPanFade = leafFadeFrom + (leafFadeTo - leafFadeFrom) * t;
  }

  // ── Falling leaves ──────────────────────────────────────────────
  (function initFallingLeaves() {
    function rand(min, max) { return Math.random() * (max - min) + min; }

    const LEAF_COLORS_DAY   = ['#4a6741', '#5a7a50', '#3d5c35', '#6b8c5a', '#7a9968'];
    const LEAF_COLORS_NIGHT = ['#2a3d28', '#354a32', '#1e2e1c', '#3a5035', '#455c40'];

    const leafOpacitySlider = document.getElementById('dev-leaf-opacity');
    const leafAmountSlider  = document.getElementById('dev-leaf-amount');
    const leafSizeSlider    = document.getElementById('dev-leaf-size');
    window.leafOpacity = leafOpacitySlider.value / 100;
    window.leafAmount  = leafAmountSlider.value / 100;
    window.leafSize    = leafSizeSlider.value / 100;  // 0.1–1.0

    leafOpacitySlider.addEventListener('input', () => { leafOpacitySlider._userOverride = true; window.leafOpacity = leafOpacitySlider.value / 100; });
    leafAmountSlider.addEventListener('input', () => { leafAmountSlider._userOverride = true; window.leafAmount = leafAmountSlider.value / 100; });
    leafSizeSlider.addEventListener('input', () => { leafSizeSlider._userOverride = true; window.leafSize = leafSizeSlider.value / 100; });

    function getLeafColors() {
      const h = isLive ? getLiveHour() : parseInt(devSlider.value) / 60;
      return (h > 6 && h < 20) ? LEAF_COLORS_DAY : LEAF_COLORS_NIGHT;
    }

    function createLeafSVG(color, size) {
      return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24">
        <path d="M12 2C6.5 6 3 10 3 14c0 4 3.5 7 9 8 5.5-1 9-4 9-8 0-4-3.5-8-9-12z" fill="${color}" opacity="0.75"/>
        <line x1="12" y1="6" x2="12" y2="20" stroke="${color}" stroke-width="0.5" opacity="0.5"/>
      </svg>`;
    }

    const activeLeaves = [];

    function spawnLeaf() {
      if (leafAmount <= 0) return;

      const colors = getLeafColors();
      const color = colors[Math.floor(Math.random() * colors.length)];
      const baseSize = rand(14, 28);
      const size = baseSize * (0.5 + leafSize * 1.5); // scale with slider

      const leaf = document.createElement('div');
      leaf.className = 'leaf';
      leaf.style.width = size + 'px';
      leaf.style.height = size + 'px';
      leaf.innerHTML = createLeafSVG(color, Math.round(size));
      document.body.appendChild(leaf);

      // With wind, spawn leaves from left edge and full top so they cover entire viewport
      const hasWind = window._windEnabled && window._windSpeed > 0;
      const ws = hasWind ? window._windSpeed : 0;
      let startX, startY;
      if (hasWind) {
        const r = Math.random();
        if (r < 0.5) {
          // Spawn from left edge at any height — these blow across the screen
          startX = rand(-window.innerWidth * ws * 0.6, 0);
          startY = rand(-40, window.innerHeight * 0.9);
        } else {
          // Spawn from top across full width — covers top-right area
          startX = rand(-5, 105) * window.innerWidth / 100;
          startY = rand(-40, -10);
        }
      } else {
        startX = rand(-5, 95) * window.innerWidth / 100;
        startY = rand(-40, -10);
      }
      // Wind shortens fall duration (leaves blow faster)
      const baseDuration = rand(10, 18) * 1000;
      const windFactor = hasWind ? (1 - ws * 0.85) : 1;
      const duration = baseDuration * windFactor;
      const fallDist = window.innerHeight + 80;
      // Wind suppresses sway — leaves align with wind direction
      const swaySuppression = hasWind ? (1 - ws * 0.85) : 1;
      const swayAmp = rand(40, 120) * swaySuppression;
      const swayFreq = rand(1.5, 3.5);        // sway cycles over fall
      const swayPhase = rand(0, Math.PI * 2); // random start phase
      const rotSpeed = rand(60, 200) * (Math.random() > 0.5 ? 1 : -1); // deg over duration
      const scaleStart = rand(0.7, 1.0);
      const scaleEnd = rand(0.4, 0.7);

      const state = {
        el: leaf, startTime: performance.now(), duration,
        startX, startY, fallDist, swayAmp, swayFreq, swayPhase,
        rotSpeed, scaleStart, scaleEnd
      };
      activeLeaves.push(state);
    }

    // Animation loop for all active leaves
    function tickLeaves(now) {
      updateLeafPanFade(now);
      for (let i = activeLeaves.length - 1; i >= 0; i--) {
        const s = activeLeaves[i];
        const elapsed = now - s.startTime;
        const t = Math.min(elapsed / s.duration, 1); // 0→1

        // Fade in quickly, hold, fade out at end
        let opacity;
        if (t < 0.05) opacity = (t / 0.05) * leafOpacity;
        else if (t > 0.85) opacity = ((1 - t) / 0.15) * leafOpacity;
        else opacity = leafOpacity;
        opacity *= leafPanFade;

        // Vertical: ease-in slightly for natural acceleration
        const yT = t * t * 0.3 + t * 0.7; // blend of linear + quadratic
        const y = s.startY + s.fallDist * yT;

        // Horizontal: sine-wave sway + wind drift
        const swayT = t * s.swayFreq * Math.PI * 2 + s.swayPhase;
        let x = s.startX + Math.sin(swayT) * s.swayAmp;
        // Wind pushes leaves horizontally (right = positive)
        if (window._windEnabled && window._windSpeed > 0) {
          const windDrift = window._windSpeed * 1400 * t; // max ~1400px drift at full storm speed
          x += windDrift;
        }

        // Add wind tilt to rotation
        const windTilt = (window._windEnabled && window._windSpeed > 0) ? window._windSpeed * 90 : 0;
        const rot = s.rotSpeed * t + windTilt;
        const scale = s.scaleStart + (s.scaleEnd - s.scaleStart) * t;

        s.el.style.transform = `translate(${x}px, ${y}px) rotate(${rot}deg) scale(${scale})`;
        s.el.style.opacity = opacity;

        if (t >= 1) {
          s.el.remove();
          activeLeaves.splice(i, 1);
        }
      }
      requestAnimationFrame(tickLeaves);
    }
    requestAnimationFrame(tickLeaves);

    // Spawn at intervals controlled by amount slider
    function scheduleLeaf() {
      const minDelay = 500, maxDelay = 8000;
      const delay = leafAmount > 0
        ? minDelay + (1 - leafAmount) * (maxDelay - minDelay)
        : maxDelay;
      setTimeout(() => {
        spawnLeaf();
        scheduleLeaf();
      }, delay);
    }

    setTimeout(() => spawnLeaf(), 800);
    setTimeout(() => spawnLeaf(), 1800);
    scheduleLeaf();

    // ── Wind system (experimental) — affects falling leaves only ──
    let windEnabled = false;
    let windSpeed = 0.3; // 0-1
    let windSpawnTimer = null;

    const windToggle = document.getElementById('dev-wind-toggle');
    const windSlider = document.getElementById('dev-wind-speed');
    const windStatus = document.getElementById('dev-wind-status');

    // Extra leaf spawning driven by wind speed
    function windSpawnLoop() {
      if (!windEnabled) return;
      // Higher wind = more frequent spawns
      // At max speed: spawn every ~200ms, at low speed: every ~3000ms
      const minDelay = 200, maxDelay = 3000;
      const delay = maxDelay - windSpeed * (maxDelay - minDelay);
      spawnLeaf();
      windSpawnTimer = setTimeout(windSpawnLoop, delay);
    }

    windToggle.addEventListener('change', () => {
      windEnabled = windToggle.checked;
      windSlider.disabled = !windEnabled;
      windStatus.textContent = windEnabled ? 'ON' : 'OFF';
      windStatus.style.opacity = windEnabled ? '1' : '0.6';
      window._windEnabled = windEnabled;
      if (windEnabled) {
        windSpawnLoop();
      } else {
        if (windSpawnTimer) { clearTimeout(windSpawnTimer); windSpawnTimer = null; }
      }
    });

    windSlider.addEventListener('input', () => {
      windSpeed = parseInt(windSlider.value) / 100;
      window._windSpeed = windSpeed;
    });

    // Initialize global wind state
    window._windEnabled = false;
    window._windSpeed = 0.3;

    // ── Wind lines — visual streaks showing wind direction ──
    const windLineSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    windLineSvg.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;pointer-events:none;z-index:9998;overflow:visible;';
    document.body.appendChild(windLineSvg);

    let windLineTimer = null;

    function spawnWindLine() {
      if (!windEnabled) return;
      const W = window.innerWidth, H = window.innerHeight;
      const ws = windSpeed;

      // Start from random point across the viewport
      const startX = rand(W * -0.05, W * 0.75);
      const startY = rand(H * -0.05, H * 0.7);

      // ~45 degree angle: equal horizontal and vertical travel
      const segCount = rand(2, 3);
      const travel = rand(W * 0.12, W * 0.25);
      const totalDX = travel;
      const totalDY = travel * rand(0.3, 0.5); // gentle downward slope
      const segDX = totalDX / segCount;
      const segDY = totalDY / segCount;
      let pathD = `M ${startX} ${startY}`;
      let cx = startX, cy = startY;
      // Decide once if this line has a loop, and which segment gets it
      const hasLoop = Math.random() < 0.3;
      const loopSeg = hasLoop ? Math.floor(Math.random() * segCount) : -1;

      for (let i = 0; i < segCount; i++) {
        const nextX = cx + segDX;
        const nextY = cy + segDY;
        if (i === loopSeg) {
          // Small tight cursive loop
          const loopR = rand(10, 18);
          const loopDir = -1; // always loop upwards
          const loopX = cx + segDX * 0.5;
          const loopY = cy + segDY * 0.5;
          pathD += ` Q ${cx + segDX * 0.25} ${cy + segDY * 0.25}, ${loopX} ${loopY}`;
          pathD += ` c ${loopR * 0.5} ${loopDir * loopR * 0.2}, ${loopR * 0.4} ${loopDir * loopR * 1.1}, ${0} ${loopDir * loopR * 0.9}`;
          pathD += ` c ${-loopR * 0.4} ${-loopDir * loopR * 0.2}, ${-loopR * 0.3} ${-loopDir * loopR * 1.0}, ${loopR * 0.1} ${-loopDir * loopR * 0.9}`;
          pathD += ` Q ${(loopX + nextX) / 2} ${(loopY + nextY) / 2}, ${nextX} ${nextY}`;
        } else {
          // Smooth gentle curve — minimal vertical variation
          const cpx = cx + segDX * 0.5;
          const cpy = cy + segDY * 0.5 + rand(-6, 6);
          pathD += ` Q ${cpx} ${cpy}, ${nextX} ${nextY}`;
        }
        cx = nextX;
        cy = nextY;
      }

      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', pathD);
      path.setAttribute('fill', 'none');
      path.setAttribute('stroke', 'rgba(160, 160, 160, 0.25)');
      path.setAttribute('stroke-width', String(rand(1, 2)));
      path.setAttribute('stroke-linecap', 'round');
      windLineSvg.appendChild(path);

      // Animate: draw with a visible trail that moves along the path
      const len = path.getTotalLength();
      const trailLen = len * rand(0.4, 0.6); // visible trail portion
      path.style.strokeDasharray = `${trailLen} ${len}`;
      path.style.strokeDashoffset = len;

      const drawDuration = (0.7 - ws * 0.3) * 1000 + rand(200, 400);

      // Animate the trail moving along the path
      path.animate([
        { strokeDashoffset: len },
        { strokeDashoffset: -trailLen }
      ], { duration: drawDuration, easing: 'ease-in-out', fill: 'forwards' });

      setTimeout(() => path.remove(), drawDuration);
    }

    function windLineLoop() {
      if (!windEnabled) return;
      spawnWindLine();
      // ~1 line per 8s at low wind, ~1 per 3s at max wind
      const minDelay = 2000, maxDelay = 8000;
      const delay = maxDelay - windSpeed * (maxDelay - minDelay) + rand(0, 2000);
      windLineTimer = setTimeout(windLineLoop, delay);
    }

    // Hook into wind toggle
    const origWindChange = windToggle.onchange;
    windToggle.addEventListener('change', () => {
      if (windEnabled) {
        windLineLoop();
      } else {
        if (windLineTimer) { clearTimeout(windLineTimer); windLineTimer = null; }
        // Clear existing lines
        while (windLineSvg.firstChild) windLineSvg.firstChild.remove();
      }
    });

  })();

  // Cleanup
  return () => {
    clearInterval(dayNightInterval);
    if (animFrame) cancelAnimationFrame(animFrame);
  };
}
