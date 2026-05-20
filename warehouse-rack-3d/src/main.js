/**
 * WAREHOUSE RACK 3D VISUALIZER
 * Rak 180x60x180 cm — 4 Rak (A-D) — 4 Baris — 4 Section Kanan + 4 Kiri
 *
 * Skala: 1 Three.js unit = 10 cm
 * Rak 18 × 6 × 18 units
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';

// ============================================================
// SCENE SETUP
// ============================================================
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x080c14);
scene.fog = new THREE.FogExp2(0x080c14, 0.008);

const W = window.innerWidth;
const H = window.innerHeight;

const camera = new THREE.PerspectiveCamera(48, W / H, 0.1, 1000);
camera.position.set(55, 28, 65);

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setSize(W, H);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;
document.getElementById('canvas-container').appendChild(renderer.domElement);

// CSS2D Renderer for rack labels
const labelRenderer = new CSS2DRenderer();
labelRenderer.setSize(W, H);
labelRenderer.domElement.style.position = 'absolute';
labelRenderer.domElement.style.top = '0';
labelRenderer.domElement.style.left = '0';
labelRenderer.domElement.style.pointerEvents = 'none';
document.getElementById('canvas-container').appendChild(labelRenderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.target.set(0, 9, 0);
controls.minDistance = 8;
controls.maxDistance = 160;
controls.maxPolarAngle = Math.PI / 2 + 0.05;
controls.update();

const DEFAULT_CAM_POS = new THREE.Vector3(55, 28, 65);
const DEFAULT_TARGET = new THREE.Vector3(0, 9, 0);

// ============================================================
// LIGHTING
// ============================================================
scene.add(new THREE.AmbientLight(0x1a2540, 2.0));

const keyLight = new THREE.DirectionalLight(0xfff5e0, 2.0);
keyLight.position.set(30, 50, 40);
keyLight.castShadow = true;
keyLight.shadow.mapSize.set(2048, 2048);
keyLight.shadow.camera.near = 1;
keyLight.shadow.camera.far = 250;
keyLight.shadow.camera.left = -80;
keyLight.shadow.camera.right = 80;
keyLight.shadow.camera.top = 60;
keyLight.shadow.camera.bottom = -10;
keyLight.shadow.bias = -0.001;
scene.add(keyLight);

const fillLight = new THREE.DirectionalLight(0x2244aa, 0.5);
fillLight.position.set(-30, 15, -20);
scene.add(fillLight);

const topLight = new THREE.PointLight(0x4488cc, 0.8, 120);
topLight.position.set(0, 40, 0);
scene.add(topLight);

// Warm accent lamps above racks
[-30, -10, 10, 30].forEach((x, i) => {
  const lamp = new THREE.PointLight(0xffcc77, 0.6, 40);
  lamp.position.set(x, 25, 0);
  scene.add(lamp);
});

// ============================================================
// FLOOR & GRID
// ============================================================
const floorGeo = new THREE.PlaneGeometry(300, 300);
const floorMat = new THREE.MeshStandardMaterial({
  color: 0x0c1120,
  roughness: 0.9,
  metalness: 0.05,
});
const floor = new THREE.Mesh(floorGeo, floorMat);
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);

// Floor stripe markings (warehouse floor lines)
const stripeGeo = new THREE.PlaneGeometry(300, 0.3);
const stripeMat = new THREE.MeshBasicMaterial({ color: 0x1a2540, transparent: true, opacity: 0.6 });
for (let z = -60; z <= 60; z += 10) {
  const stripe = new THREE.Mesh(stripeGeo, stripeMat);
  stripe.rotation.x = -Math.PI / 2;
  stripe.position.set(0, 0.01, z);
  scene.add(stripe);
}

const gridHelper = new THREE.GridHelper(300, 80, 0x111a2e, 0x0d1525);
gridHelper.position.y = 0.015;
scene.add(gridHelper);

// ============================================================
// RACK PARAMETERS
// ============================================================
// Real size: 180cm W × 60cm D × 180cm H → scaled ÷10
const RACK_W = 18;       // 180 cm
const RACK_D = 6;        // 60 cm
const RACK_H = 18;       // 180 cm
const ROWS = 4;          // 4 baris (row)
const COLS_PER_SIDE = 4; // 4 section kanan + 4 section kiri
const TOTAL_COLS = COLS_PER_SIDE * 2; // = 8 total columns per row
const RACK_GAP = 2.5;    // gap antar rak
const RACK_COUNT = 4;    // RAK A, B, C, D

const SEC_W = RACK_W / TOTAL_COLS;  // width per section  = 2.25
const SEC_H = RACK_H / ROWS;        // height per row     = 4.5

// Rack identity: A = rightmost (index 0), D = leftmost (index 3)
const RACK_NAMES = ['A', 'B', 'C', 'D'];

const RACK_PALETTE = {
  A: { color: 0x00e5ff, hex: '#00e5ff', name: 'CYAN'   },
  B: { color: 0x69ff47, hex: '#69ff47', name: 'GREEN'  },
  C: { color: 0xff6b35, hex: '#ff6b35', name: 'ORANGE' },
  D: { color: 0xff47d4, hex: '#ff47d4', name: 'PINK'   },
};

// ============================================================
// STATE
// ============================================================
// stockState[key] = true (terisi) | false/undefined (kosong)
// key format: "A-row-col"  row 0=bottom, col 0=leftmost
const stockState = {};
const sectionRegistry = {}; // key → { mesh, wireframe, data }
let lastSelectedKey = null;

// ============================================================
// HELPER: Rack X position
// ============================================================
function getRackX(rackIndex) {
  // rackIndex 0 = A = rightmost positive x
  const totalSpan = RACK_COUNT * RACK_W + (RACK_COUNT - 1) * RACK_GAP;
  const origin = -totalSpan / 2 + RACK_W / 2;
  return origin + (RACK_COUNT - 1 - rackIndex) * (RACK_W + RACK_GAP);
}

// ============================================================
// RACK BUILDER
// ============================================================
function buildRack(rackIndex) {
  const name = RACK_NAMES[rackIndex];
  const pal = RACK_PALETTE[name];
  const xPos = getRackX(rackIndex);

  const group = new THREE.Group();
  group.position.set(xPos, 0, 0);

  // --- Materials ---
  const steelMat = new THREE.MeshStandardMaterial({
    color: 0x1e2840,
    metalness: 0.88,
    roughness: 0.22,
  });
  const accentMat = new THREE.MeshStandardMaterial({
    color: pal.color,
    metalness: 0.7,
    roughness: 0.2,
    emissive: pal.color,
    emissiveIntensity: 0.35,
  });

  // --- Vertical Posts (4 corners) ---
  const postGeo = new THREE.BoxGeometry(0.22, RACK_H, 0.22);
  const corners = [
    [-RACK_W / 2, -RACK_D / 2],
    [ RACK_W / 2, -RACK_D / 2],
    [-RACK_W / 2,  RACK_D / 2],
    [ RACK_W / 2,  RACK_D / 2],
  ];
  corners.forEach(([px, pz]) => {
    const post = new THREE.Mesh(postGeo, accentMat.clone());
    post.position.set(px, RACK_H / 2, pz);
    post.castShadow = true;
    group.add(post);
  });

  // --- Horizontal Shelf Beams ---
  for (let r = 0; r <= ROWS; r++) {
    const y = r * SEC_H;

    // Front beam
    const fbGeo = new THREE.BoxGeometry(RACK_W, 0.18, 0.18);
    const fb = new THREE.Mesh(fbGeo, steelMat);
    fb.position.set(0, y, -RACK_D / 2);
    fb.castShadow = true;
    group.add(fb);

    // Back beam
    const bb = new THREE.Mesh(fbGeo, steelMat);
    bb.position.set(0, y, RACK_D / 2);
    group.add(bb);

    // Left/right side beams
    const sbGeo = new THREE.BoxGeometry(0.18, 0.18, RACK_D);
    const lsb = new THREE.Mesh(sbGeo, steelMat);
    lsb.position.set(-RACK_W / 2, y, 0);
    group.add(lsb);
    const rsb = new THREE.Mesh(sbGeo, steelMat);
    rsb.position.set(RACK_W / 2, y, 0);
    group.add(rsb);

    // Shelf panel (flat surface)
    if (r < ROWS) {
      const spGeo = new THREE.BoxGeometry(RACK_W - 0.4, 0.07, RACK_D - 0.04);
      const spMat = new THREE.MeshStandardMaterial({ color: 0x141c2e, metalness: 0.5, roughness: 0.6 });
      const sp = new THREE.Mesh(spGeo, spMat);
      sp.position.set(0, y + 0.035, 0);
      sp.receiveShadow = true;
      group.add(sp);
    }

    // Center divider column (separates kanan & kiri) 
    if (r === 0) {
      const divGeo = new THREE.BoxGeometry(0.18, RACK_H, 0.18);
      const div = new THREE.Mesh(divGeo, steelMat);
      div.position.set(0, RACK_H / 2, -RACK_D / 2);
      group.add(div);
      const div2 = new THREE.Mesh(divGeo, steelMat);
      div2.position.set(0, RACK_H / 2, RACK_D / 2);
      group.add(div2);
    }
  }

  // --- Column dividers every section ---
  for (let c = 1; c < TOTAL_COLS; c++) {
    const cx = -RACK_W / 2 + c * SEC_W;
    const cvGeo = new THREE.BoxGeometry(0.1, RACK_H, 0.1);
    const cvF = new THREE.Mesh(cvGeo, steelMat);
    cvF.position.set(cx, RACK_H / 2, -RACK_D / 2);
    group.add(cvF);
    const cvB = new THREE.Mesh(cvGeo, steelMat);
    cvB.position.set(cx, RACK_H / 2, RACK_D / 2);
    group.add(cvB);
  }

  // Center divider bead (visual accent between kiri/kanan)
  const cdGeo = new THREE.BoxGeometry(0.12, RACK_H, RACK_D);
  const cdMat = new THREE.MeshStandardMaterial({
    color: pal.color,
    transparent: true,
    opacity: 0.12,
    emissive: pal.color,
    emissiveIntensity: 0.05,
  });
  const cd = new THREE.Mesh(cdGeo, cdMat);
  cd.position.set(0, RACK_H / 2, 0);
  group.add(cd);

  // --- Section Slots ---
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < TOTAL_COLS; col++) {
      const key = `${name}-${row}-${col}`;
      const occupied = stockState[key] || false;

      const isRightSide = col >= COLS_PER_SIDE; // kanan = col 4-7

      // Slot geometry (slightly inset from beams)
      const slotW = SEC_W - 0.15;
      const slotH = SEC_H - 0.15;
      const slotD = RACK_D - 0.12;

      const slotGeo = new THREE.BoxGeometry(slotW, slotH, slotD);

      const slotMat = new THREE.MeshStandardMaterial({
        color: pal.color,
        transparent: true,
        opacity: occupied ? 0.82 : 0.06,
        metalness: 0.15,
        roughness: 0.35,
        emissive: pal.color,
        emissiveIntensity: occupied ? 0.5 : 0.02,
        side: THREE.DoubleSide,
      });

      const slot = new THREE.Mesh(slotGeo, slotMat);

      // Wireframe overlay
      const wireGeo = new THREE.EdgesGeometry(slotGeo);
      const wireMat = new THREE.LineBasicMaterial({
        color: pal.color,
        transparent: true,
        opacity: occupied ? 0.85 : 0.18,
      });
      const wire = new THREE.LineSegments(wireGeo, wireMat);

      // Position: col 0 = leftmost (-RACK_W/2 side)
      const slotX = -RACK_W / 2 + SEC_W / 2 + col * SEC_W;
      const slotY = SEC_H / 2 + row * SEC_H;

      slot.position.set(slotX, slotY, 0);
      wire.position.set(slotX, slotY, 0);

      slot.userData = { rack: name, row, col, key, isRightSide };
      slot.castShadow = false;
      slot.receiveShadow = true;

      group.add(slot);
      group.add(wire);

      sectionRegistry[key] = { mesh: slot, wire, pal, data: slot.userData };
    }
  }

  // --- Rack Label (CSS2D) ---
  const labelDiv = document.createElement('div');
  labelDiv.className = 'rack-label';
  labelDiv.style.color = pal.hex;
  labelDiv.style.border = `1px solid ${pal.hex}`;
  labelDiv.style.boxShadow = `0 0 12px ${pal.hex}55`;
  labelDiv.textContent = `RAK ${name}`;
  const label = new CSS2DObject(labelDiv);
  label.position.set(0, RACK_H + 1.8, 0);
  group.add(label);

  // Side label (cm info)
  const sizeLabel = document.createElement('div');
  sizeLabel.className = 'rack-label';
  sizeLabel.style.color = 'rgba(255,255,255,0.35)';
  sizeLabel.style.border = '1px solid rgba(255,255,255,0.08)';
  sizeLabel.style.fontSize = '9px';
  sizeLabel.style.letterSpacing = '1px';
  sizeLabel.textContent = '180×60×180 cm';
  const sizeL = new CSS2DObject(sizeLabel);
  sizeL.position.set(0, RACK_H + 0.8, 0);
  group.add(sizeL);

  scene.add(group);
  return group;
}

// ============================================================
// BUILD ALL RACKS
// ============================================================
RACK_NAMES.forEach((_, i) => buildRack(i));

// ============================================================
// SECTION STATE UPDATE
// ============================================================
function setSectionState(key, occupied) {
  const reg = sectionRegistry[key];
  if (!reg) return;

  stockState[key] = occupied;

  const mat = reg.mesh.material;
  mat.opacity = occupied ? 0.82 : 0.06;
  mat.emissiveIntensity = occupied ? 0.5 : 0.02;
  mat.needsUpdate = true;

  reg.wire.material.opacity = occupied ? 0.85 : 0.18;
  reg.wire.material.needsUpdate = true;

  updateStats();
}

function toggleSection(key) {
  setSectionState(key, !stockState[key]);
}

// ============================================================
// CLICK SELECTION (Raycaster)
// ============================================================
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
const tooltip = document.createElement('div');
tooltip.className = 'section-tooltip';
document.getElementById('canvas-container').appendChild(tooltip);

let hoveredKey = null;

window.addEventListener('mousemove', (e) => {
  const rect = renderer.domElement.getBoundingClientRect();
  mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const meshes = Object.values(sectionRegistry).map(r => r.mesh);
  const hits = raycaster.intersectObjects(meshes);

  if (hits.length > 0) {
    const { rack, row, col, key, isRightSide } = hits[0].object.userData;
    const side = isRightSide ? 'Kanan' : 'Kiri';
    const secNum = isRightSide ? col - COLS_PER_SIDE + 1 : col + 1;
    const occupied = stockState[key] ? '✓ TERISI' : '○ KOSONG';

    tooltip.style.display = 'block';
    tooltip.style.left = (e.clientX + 12) + 'px';
    tooltip.style.top = (e.clientY - 30) + 'px';
    tooltip.textContent = `RAK ${rack} | Baris ${row + 1} | Sec ${secNum} ${side} | ${occupied}`;
    renderer.domElement.style.cursor = 'pointer';

    if (hoveredKey !== key) {
      // Slight highlight on hover
      if (hoveredKey && sectionRegistry[hoveredKey]) {
        const prev = sectionRegistry[hoveredKey];
        const prevOccupied = stockState[hoveredKey];
        prev.mesh.material.emissiveIntensity = prevOccupied ? 0.5 : 0.02;
      }
      const reg = sectionRegistry[key];
      const occ = stockState[key];
      reg.mesh.material.emissiveIntensity = occ ? 0.75 : 0.12;
      hoveredKey = key;
    }
  } else {
    tooltip.style.display = 'none';
    renderer.domElement.style.cursor = 'default';
    if (hoveredKey && sectionRegistry[hoveredKey]) {
      const prev = sectionRegistry[hoveredKey];
      const prevOcc = stockState[hoveredKey];
      prev.mesh.material.emissiveIntensity = prevOcc ? 0.5 : 0.02;
      hoveredKey = null;
    }
  }
});

window.addEventListener('click', (e) => {
  if (e.target !== renderer.domElement) return;

  const rect = renderer.domElement.getBoundingClientRect();
  mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const meshes = Object.values(sectionRegistry).map(r => r.mesh);
  const hits = raycaster.intersectObjects(meshes);

  if (hits.length > 0) {
    const { key } = hits[0].object.userData;
    toggleSection(key);
    lastSelectedKey = key;
    showInfoPanel(key);
  }
});

// ============================================================
// INFO PANEL
// ============================================================
function showInfoPanel(key) {
  const reg = sectionRegistry[key];
  if (!reg) return;
  const { rack, row, col, isRightSide } = reg.data;
  const occupied = stockState[key] || false;
  const side = isRightSide ? 'Kanan' : 'Kiri';
  const secNum = isRightSide ? col - COLS_PER_SIDE + 1 : col + 1;

  document.getElementById('info-rack').textContent = `RAK ${rack}`;
  document.getElementById('info-rack').style.color = reg.pal.hex;
  document.getElementById('info-row').textContent = `Baris ${row + 1}`;
  document.getElementById('info-section').textContent = `Sec ${secNum} (${side})`;

  const statusEl = document.getElementById('info-status');
  statusEl.textContent = occupied ? 'TERISI' : 'KOSONG';
  statusEl.className = occupied ? 'info-val status-occupied' : 'info-val status-empty';

  document.getElementById('info-panel').style.display = 'block';
}

// ============================================================
// STATS UPDATE
// ============================================================
function updateStats() {
  const total = RACK_COUNT * ROWS * TOTAL_COLS; // 4×4×8 = 128
  const occupied = Object.values(stockState).filter(Boolean).length;
  const empty = total - occupied;
  const pct = Math.round((occupied / total) * 100);

  document.getElementById('stat-total').textContent = total;
  document.getElementById('stat-occupied').textContent = occupied;
  document.getElementById('stat-empty').textContent = empty;
  document.getElementById('stat-bar').style.width = pct + '%';
  document.getElementById('stat-percent').textContent = `${pct}% terisi`;

  // Re-render info panel if open
  if (lastSelectedKey) showInfoPanel(lastSelectedKey);
}

// ============================================================
// QUICK-FILL PANEL
// ============================================================
const quickRacksEl = document.getElementById('quick-racks');
RACK_NAMES.forEach(name => {
  const pal = RACK_PALETTE[name];
  const div = document.createElement('div');
  div.className = 'quick-rack';
  div.innerHTML = `
    <div class="quick-rack-name" style="color:${pal.hex}">RAK ${name}</div>
    <div class="quick-buttons">
      <button class="quick-btn fill-all" onclick="window._fillRack('${name}')">ISI</button>
      <button class="quick-btn clear-all" onclick="window._clearRack('${name}')">KOSONG</button>
    </div>
  `;
  quickRacksEl.appendChild(div);
});

// ============================================================
// EXPOSED GLOBAL FUNCTIONS (called from HTML)
// ============================================================
window._fillRack = (rackName) => {
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < TOTAL_COLS; col++) {
      setSectionState(`${rackName}-${row}-${col}`, true);
    }
  }
};

window._clearRack = (rackName) => {
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < TOTAL_COLS; col++) {
      setSectionState(`${rackName}-${row}-${col}`, false);
    }
  }
};

window._clearAll = () => {
  RACK_NAMES.forEach(name => window._clearRack(name));
  document.getElementById('info-panel').style.display = 'none';
  lastSelectedKey = null;
};

window._toggleSelected = () => {
  if (lastSelectedKey) {
    toggleSection(lastSelectedKey);
    showInfoPanel(lastSelectedKey);
  }
};

window._resetCamera = () => {
  camera.position.copy(DEFAULT_CAM_POS);
  controls.target.copy(DEFAULT_TARGET);
  controls.update();
};

// ============================================================
// RESIZE
// ============================================================
window.addEventListener('resize', () => {
  const w = window.innerWidth, h = window.innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  labelRenderer.setSize(w, h);
});

// ============================================================
// ANIMATE LOOP
// ============================================================
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const t = clock.getElapsedTime();

  // Gentle camera sway — disabled while user interacts
  if (!controls.enabled) {
    camera.position.x = Math.sin(t * 0.05) * 2 + 55;
  }

  // Pulse emissive on occupied sections
  Object.entries(sectionRegistry).forEach(([key, reg]) => {
    if (stockState[key]) {
      const pulse = 0.42 + Math.sin(t * 2.5 + reg.data.col * 0.5) * 0.08;
      reg.mesh.material.emissiveIntensity = pulse;
    }
  });

  controls.update();
  renderer.render(scene, camera);
  labelRenderer.render(scene, camera);
}

animate();
updateStats();
