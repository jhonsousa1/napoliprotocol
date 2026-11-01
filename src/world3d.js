/* NapoliProtocol 3D — mundo da bancada em three.js (módulo ES).
   Um "mundo" procedural (sem modelos baixados): bancada, pote, tigela, copo, geladeira, balança, forno e pizza.
   Cada etapa da receita é uma "tomada": posição de câmera + objetos visíveis + timeline GSAP.
   Se não houver WebGL, GSAP ou se "reduzir movimento" estiver ativo, nada é iniciado e o player em SVG continua. */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const NP = window.NP, gsap = window.gsap;
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const prerender = location.search.includes('prerender');
const hasGL = (() => { try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch (e) { return false; } })();

/* ---------- utilitários ---------- */
let seed = 7; const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
const C = {
  dough: 0xEFD3A0, doughDark: 0xD7A867, crust: 0xC8843C, char: 0x2A160C, sauce: 0x9C1B0E, cheese: 0xFFF4DC,
  basil: 0x2F7A3E, ceramic: 0x2E6B6C, steel: 0xB9C0C4, white: 0xF4F1EC, water: 0x7DB7EE, oil: 0xE6B43A, flour: 0xFFFDF8, yeast: 0xC99A3B
};
function canvasTex(w, h, draw, repeat) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat); }
  return t;
}
const woodTex = () => canvasTex(1024, 512, (x, w, h) => {
  const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#C9925A'); g.addColorStop(1, '#B07842'); x.fillStyle = g; x.fillRect(0, 0, w, h);
  for (let i = 0; i < 140; i++) { x.strokeStyle = `rgba(${90 + rnd() * 40},${50 + rnd() * 25},${20},${0.08 + rnd() * 0.12})`; x.lineWidth = 1 + rnd() * 3;
    const y = rnd() * h; x.beginPath(); x.moveTo(0, y); for (let s = 0; s <= w; s += 32) x.lineTo(s, y + Math.sin(s / 90 + i) * 6 + (rnd() - .5) * 3); x.stroke(); }
}, [2, 1]);
const doughTex = (base = '#EFD3A0', spots = 0) => canvasTex(512, 512, (x, w, h) => {
  x.fillStyle = base; x.fillRect(0, 0, w, h);
  for (let i = 0; i < 2600; i++) { x.fillStyle = `rgba(255,255,255,${rnd() * .18})`; x.fillRect(rnd() * w, rnd() * h, 2, 2); }
  for (let i = 0; i < 900; i++) { x.fillStyle = `rgba(150,100,50,${rnd() * .07})`; x.beginPath(); x.arc(rnd() * w, rnd() * h, 1 + rnd() * 4, 0, 7); x.fill(); }
  for (let i = 0; i < spots; i++) { x.fillStyle = `rgba(42,22,12,${.45 + rnd() * .4})`; x.beginPath(); x.arc(rnd() * w, rnd() * h, 1 + rnd() * 6, 0, 7); x.fill(); }
});
function displace(geo, amp, freq = 3) {
  const p = geo.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); const n = Math.sin(v.x * freq + 1.3) * Math.cos(v.z * freq * .8) + Math.sin((v.x + v.y + v.z) * freq * 1.7) * .5;
    v.addScaledVector(v.clone().normalize(), n * amp); p.setXYZ(i, v.x, v.y, v.z); }
  geo.computeVertexNormals(); return geo;
}
const mat = (o) => new THREE.MeshStandardMaterial(o);
const phys = (o) => new THREE.MeshPhysicalMaterial(o);
function lathe(profile, segs = 64) { return new THREE.LatheGeometry(profile.map(([x, y]) => new THREE.Vector2(x, y)), segs); }
function shadowed(o) { o.traverse(m => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } }); return o; }

/* ---------- objetos ---------- */
function makeBowl() {
  const g = new THREE.Group();
  const prof = [[0, .06], [.75, .08], [1.05, .3], [1.25, .7], [1.32, 1.02], [1.4, 1.06], [1.44, 1.0], [1.36, .62], [1.12, .2], [.75, 0], [0, 0]];
  g.add(new THREE.Mesh(lathe(prof), phys({ color: C.ceramic, roughness: .22, clearcoat: 1, clearcoatRoughness: .08, side: THREE.DoubleSide })));
  const inner = new THREE.Mesh(lathe([[0, .1], [.7, .12], [1.0, .32], [1.2, .7], [1.3, 1.0]]), phys({ color: 0xE9EFEA, roughness: .3, clearcoat: .6, side: THREE.BackSide }));
  g.add(inner); return shadowed(g);
}
function makeJar() {
  const g = new THREE.Group();
  const glass = new THREE.Mesh(lathe([[0, 0], [.7, 0], [.78, .08], [.8, 1.9], [.72, 2.05], [.72, 2.15]], 48),
    phys({ color: 0xffffff, roughness: .04, metalness: 0, transparent: true, opacity: .28, clearcoat: 1, envMapIntensity: 1.6, side: THREE.DoubleSide, depthWrite: false }));
  glass.renderOrder = 2; g.add(glass);
  const fill = new THREE.Mesh(new THREE.CylinderGeometry(.74, .74, 1, 48), mat({ map: doughTex('#F2DDB3'), roughness: .75 }));
  fill.position.y = .06; fill.scale.y = .001; fill.geometry.translate(0, .5, 0); g.add(fill); g.userData.fill = fill;
  const bub = new THREE.InstancedMesh(new THREE.SphereGeometry(.05, 10, 8), mat({ color: 0xFFFFFF, roughness: .2, transparent: true, opacity: .85 }), 26);
  const m = new THREE.Matrix4(); for (let i = 0; i < 26; i++) { const a = rnd() * 6.28, r = .76; m.compose(new THREE.Vector3(Math.cos(a) * r, .2 + rnd() * 1.3, Math.sin(a) * r), new THREE.Quaternion(), new THREE.Vector3(1, 1, 1).multiplyScalar(.4 + rnd())); bub.setMatrixAt(i, m); }
  bub.visible = false; g.add(bub); g.userData.bubbles = bub;
  return shadowed(g);
}
function makeGlass() {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(lathe([[0, 0], [.42, 0], [.5, 1.3], [.5, 1.32]], 40), phys({ color: 0xffffff, transparent: true, opacity: .25, roughness: .03, clearcoat: 1, side: THREE.DoubleSide, depthWrite: false })));
  const water = new THREE.Mesh(new THREE.CylinderGeometry(.46, .4, .9, 40), phys({ color: C.water, transparent: true, opacity: .55, roughness: .05, clearcoat: 1 }));
  water.geometry.translate(0, .45, 0); water.position.y = .03; g.add(water); g.userData.water = water;
  return shadowed(g);
}
function makeDough(r = 1) {
  const m = new THREE.Mesh(displace(new THREE.SphereGeometry(r, 72, 54), .025, 4), phys({ map: doughTex(), roughness: .62, clearcoat: .15, sheen: .6, sheenColor: new THREE.Color(0xFFF3D6) }));
  m.castShadow = m.receiveShadow = true; return m;
}
function makeFridge() {
  const g = new THREE.Group(); const white = phys({ color: C.white, roughness: .25, clearcoat: .8 });
  const body = new THREE.Mesh(new RoundedBoxGeometry(1.9, 3.2, 1.6, 4, .12), white); body.position.y = 1.6; g.add(body);
  const inner = new THREE.Mesh(new THREE.BoxGeometry(1.6, 2.9, .2), mat({ color: 0xDCEAF5, emissive: 0x9CC8F0, emissiveIntensity: .25 })); inner.position.set(0, 1.6, .72); g.add(inner);
  const pivot = new THREE.Group(); pivot.position.set(-.95, 0, .82); g.add(pivot);
  const door = new THREE.Mesh(new RoundedBoxGeometry(1.9, 3.2, .14, 4, .06), white); door.position.set(.95, 1.6, 0); pivot.add(door);
  const handle = new THREE.Mesh(new RoundedBoxGeometry(.08, .9, .08, 2, .03), mat({ color: C.steel, metalness: 1, roughness: .25 })); handle.position.set(1.7, 2.1, .12); pivot.add(handle);
  g.userData.door = pivot; return shadowed(g);
}
function makeScale() {
  const g = new THREE.Group();
  const base = new THREE.Mesh(new RoundedBoxGeometry(1.7, .28, 1.4, 4, .1), phys({ color: 0x2B2B2E, roughness: .35, clearcoat: .5 })); base.position.y = .14; g.add(base);
  const plate = new THREE.Mesh(new THREE.CylinderGeometry(.62, .62, .05, 48), mat({ color: C.steel, metalness: 1, roughness: .2 })); plate.position.y = .31; g.add(plate);
  const disp = new THREE.Mesh(new THREE.BoxGeometry(.6, .16, .02), mat({ color: 0x0E2A1C, emissive: 0x29D17B, emissiveIntensity: .4 })); disp.position.set(0, .16, .71); g.add(disp);
  g.userData.top = new THREE.Vector3(0, .34, 0); return shadowed(g);
}
function makeCan() {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(new THREE.CylinderGeometry(.42, .42, 1.1, 40), mat({ color: C.steel, metalness: 1, roughness: .3 })));
  const label = new THREE.Mesh(new THREE.CylinderGeometry(.425, .425, .7, 40, 1, true), mat({ color: C.sauce, roughness: .55 })); g.add(label);
  g.children.forEach(m => m.position.y = .55); return shadowed(g);
}
function makeOven() {
  const g = new THREE.Group(); const steel = mat({ color: 0xC5CBCF, metalness: .92, roughness: .32 }), dark = mat({ color: 0x1B1512, roughness: .9 });
  const W = 3.6, H = 1.8, D = 2.6, t = .16;
  const part = (w, h, d, x, y, z, m = steel) => { const b = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 3, .05), m); b.position.set(x, y, z); g.add(b); return b; };
  part(W, t, D, 0, H - t / 2, 0); part(W, t, D, 0, t / 2 + .25, 0); part(t, H - .25, D, -W / 2 + t / 2, H / 2 + .12, 0); part(t, H - .25, D, W / 2 - t / 2, H / 2 + .12, 0); part(W, H - .25, t, 0, H / 2 + .12, -D / 2 + t / 2);
  part(W - 2 * t, H - 2 * t - .25, .02, 0, H / 2 + .12, -D / 2 + t + .02, dark);
  [[-1.4, 0], [1.4, 0]].forEach(([x]) => { const leg = new THREE.Mesh(new THREE.CylinderGeometry(.08, .08, .25, 12), steel); leg.position.set(x, .125, .9); g.add(leg); const l2 = leg.clone(); l2.position.z = -.9; g.add(l2); });
  const stone = new THREE.Mesh(new THREE.BoxGeometry(W - .5, .1, D - .5), mat({ color: 0x9C6A44, roughness: .95 })); stone.position.y = .45; g.add(stone);
  const elMat = () => mat({ color: 0x3A1A10, emissive: 0xFF5A1F, emissiveIntensity: 0, roughness: .6 });
  const topEl = new THREE.Group(), botEl = new THREE.Group(); const em1 = elMat(), em2 = elMat();
  for (let i = -2; i <= 2; i++) { const a = new THREE.Mesh(new THREE.CylinderGeometry(.035, .035, W - .6, 10), em1); a.rotation.z = Math.PI / 2; a.position.set(0, H - .28, i * .35); topEl.add(a);
    const b = new THREE.Mesh(new THREE.CylinderGeometry(.035, .035, W - .6, 10), em2); b.rotation.z = Math.PI / 2; b.position.set(0, .38, i * .35); botEl.add(b); }
  g.add(topEl, botEl);
  const glow = new THREE.PointLight(0xFF7A2C, 0, 6, 1.6); glow.position.set(0, 1.1, 0); g.add(glow);
  g.userData = { em1, em2, glow, mouth: new THREE.Vector3(0, .5, 0) };
  return shadowed(g);
}
function makePizza(ny) {
  const g = new THREE.Group(); const R = ny ? 1.75 : 1.6;
  const base = new THREE.Mesh(new THREE.CylinderGeometry(R, R, .07, 72), phys({ map: doughTex('#EED2A0'), roughness: .7 })); base.position.y = .035; g.add(base);
  const rimGeo = new THREE.TorusGeometry(R - .08, ny ? .09 : .17, 20, 120); const p = rimGeo.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); const a = Math.atan2(v.y, v.x); const s = 1 + (ny ? .04 : .14) * Math.sin(a * 7) + .06 * Math.sin(a * 17 + 1); p.setZ(i, v.z * s); }
  rimGeo.computeVertexNormals();
  const rimMat = phys({ map: doughTex(ny ? '#D9A45E' : '#E7C48A'), roughness: .6, sheen: .4 });
  const rim = new THREE.Mesh(rimGeo, rimMat); rim.rotation.x = Math.PI / 2; rim.position.y = .1; g.add(rim);
  const sauce = new THREE.Mesh(displace(new THREE.CylinderGeometry(R - .22, R - .22, .03, 72, 1), .006, 9), phys({ color: C.sauce, roughness: .5, clearcoat: .35, envMapIntensity: .6 })); sauce.position.y = .08; g.add(sauce);
  const cheese = new THREE.Group(); g.add(cheese); const chMat = phys({ color: C.cheese, roughness: .45, clearcoat: .3 });
  if (ny) { const layer = new THREE.Mesh(displace(new THREE.CylinderGeometry(R - .25, R - .25, .05, 72, 2), .02, 7), phys({ color: 0xE9B44A, roughness: .45, clearcoat: .3, envMapIntensity: .7 })); layer.position.y = .11; cheese.add(layer);
    for (let i = 0; i < 18; i++) { const s = new THREE.Mesh(new THREE.SphereGeometry(.12 + rnd() * .08, 16, 10), mat({ color: 0xC98B30, roughness: .5 })); const a = rnd() * 6.28, r = rnd() * (R - .5); s.scale.y = .15; s.position.set(Math.cos(a) * r, .14, Math.sin(a) * r); cheese.add(s); } }
  else for (let i = 0; i < 7; i++) { const s = new THREE.Mesh(new THREE.SphereGeometry(.24 + rnd() * .1, 24, 16), chMat); const a = i / 7 * 6.28 + rnd(), r = .35 + rnd() * .65; s.scale.y = .3; s.position.set(Math.cos(a) * r, .12, Math.sin(a) * r); cheese.add(s); }
  const basil = new THREE.Group(); g.add(basil);
  if (!ny) for (let i = 0; i < 4; i++) { const l = new THREE.Mesh(new THREE.SphereGeometry(.16, 16, 8), phys({ color: C.basil, roughness: .35, clearcoat: .7 })); l.scale.set(1, .12, .55); const a = rnd() * 6.28, r = rnd() * .9; l.position.set(Math.cos(a) * r, .2, Math.sin(a) * r); l.rotation.y = rnd() * 3; basil.add(l); }
  const spots = new THREE.InstancedMesh(new THREE.SphereGeometry(.035, 8, 6), mat({ color: C.char, roughness: .9 }), 60), m = new THREE.Matrix4();
  for (let i = 0; i < 60; i++) { const a = rnd() * 6.28, rr = R - .08 + (rnd() - .5) * .2; m.compose(new THREE.Vector3(Math.cos(a) * rr, .19 + rnd() * .06, Math.sin(a) * rr), new THREE.Quaternion(), new THREE.Vector3(1, .5, 1).multiplyScalar(.6 + rnd() * 1.4)); spots.setMatrixAt(i, m); }
  spots.scale.setScalar(.001); g.add(spots);
  const cuts = new THREE.Group(); g.add(cuts); cuts.visible = false;
  for (let i = 0; i < 4; i++) { const c = new THREE.Mesh(new THREE.BoxGeometry(2 * R, .02, .025), mat({ color: 0x3A2014, roughness: .8 })); c.position.y = .2; c.rotation.y = i * Math.PI / 4; cuts.add(c); }
  g.userData = { base, rim, rimMat, sauce, cheese, basil, spots, cuts, R };
  return shadowed(g);
}
function makePeel() {
  const g = new THREE.Group(); const wood = mat({ map: woodTex(), roughness: .7 });
  const pad = new THREE.Mesh(new RoundedBoxGeometry(3.6, .05, 3.4, 3, .02), wood); g.add(pad);
  const handle = new THREE.Mesh(new RoundedBoxGeometry(.4, .06, 2.2, 3, .03), wood); handle.position.z = 2.7; g.add(handle);
  return shadowed(g);
}
/* partículas que caem (farinha, fermento, sal) */
function makeFall(n, color, size) {
  const m = new THREE.InstancedMesh(new THREE.SphereGeometry(size, 8, 6), mat({ color, roughness: .9 }), n);
  m.userData.p = Array.from({ length: n }, () => ({ x: (rnd() - .5) * .5, z: (rnd() - .5) * .5, d: rnd() * .5, s: .6 + rnd() * .8 })); m.frustumCulled = false; m.visible = false; return m;
}
function placeFall(m, from, to, t) {
  const M = new THREE.Matrix4(), q = new THREE.Quaternion();
  m.userData.p.forEach((p, i) => { const k = Math.min(1, Math.max(0, (t - p.d) / .5)); const y = from.y + (to.y - from.y) * k * k;
    const spread = 1 + k * 1.6; M.compose(new THREE.Vector3(from.x + p.x * spread + (to.x - from.x) * k, y, from.z + p.z * spread + (to.z - from.z) * k), q, new THREE.Vector3(1, 1, 1).multiplyScalar(k >= 1 ? .0001 : p.s)); m.setMatrixAt(i, M); });
  m.instanceMatrix.needsUpdate = true;
}

/* ---------- mundo ---------- */
class World {
  constructor(stage, opts = {}) {
    this.stage = stage; this.opts = opts; this.tags = [];
    const r = this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    r.setPixelRatio(Math.min(devicePixelRatio, 1.75)); r.outputColorSpace = THREE.SRGBColorSpace; r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1.05;
    r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFSoftShadowMap;
    r.domElement.className = 'gl'; stage.prepend(r.domElement);
    this.tagLayer = document.createElement('div'); this.tagLayer.className = 'tags3d'; stage.appendChild(this.tagLayer);
    const s = this.scene = new THREE.Scene();
    s.environment = new THREE.PMREMGenerator(r).fromScene(new RoomEnvironment(), .04).texture;
    this.cam = new THREE.PerspectiveCamera(32, 1, .1, 100); this.target = new THREE.Vector3(0, .6, 0);
    const key = new THREE.DirectionalLight(0xFFE8CC, 2.2); key.position.set(-4, 8, 5); key.castShadow = true; key.shadow.mapSize.set(1024, 1024);
    Object.assign(key.shadow.camera, { left: -7, right: 7, top: 7, bottom: -7, near: 1, far: 30 }); key.shadow.bias = -.0004; key.shadow.radius = 4; s.add(key);
    s.add(new THREE.HemisphereLight(0xFFF4E2, 0x5A3A24, .45));
    const bench = new THREE.Mesh(new RoundedBoxGeometry(16, .5, 9, 4, .08), mat({ map: woodTex(), roughness: .55 })); bench.position.y = -.25; bench.receiveShadow = true; s.add(bench);
    this.objs = {};
    new ResizeObserver(() => this.resize()).observe(stage); this.resize();
    this.visible = true; new IntersectionObserver(e => { this.visible = e[0].isIntersecting; }).observe(stage);
    this.awake = 0; gsap.ticker.add(() => this.tick());
  }
  obj(name, make, pos) { if (!this.objs[name]) { const o = make(); if (pos) o.position.set(...pos); this.scene.add(o); this.objs[name] = o; } return this.objs[name]; }
  resize() { const w = this.stage.clientWidth, h = this.stage.clientHeight; if (!w || !h) return; this.renderer.setSize(w, h, false); this.cam.aspect = w / h; this.cam.updateProjectionMatrix(); this.wake(); }
  wake(frames = 2) { this.awake = Math.max(this.awake, frames); }
  tick() {
    if (!this.visible || document.hidden) return;
    if (this.opts.orbit) { this.orbitA = (this.orbitA || 0) + .0025; const R = 6.6; this.cam.position.set(Math.sin(this.orbitA) * R, 4.4, Math.cos(this.orbitA) * R); this.awake = 2; }
    if (this.awake <= 0 && !(this.tl && this.tl.isActive())) return;
    this.awake--; this.cam.lookAt(this.target); this.renderer.render(this.scene, this.cam); this.placeTags();
  }
  /* etiquetas HTML presas a pontos 3D */
  tag(html, anchor, cls = '') { const el = document.createElement('div'); el.className = 'tag3d ' + cls; el.innerHTML = html; el.style.opacity = 0; this.tagLayer.appendChild(el); const t = { el, anchor }; this.tags.push(t); return el; }
  clearTags() { this.tags.forEach(t => t.el.remove()); this.tags = []; }
  placeTags() {
    const w = this.stage.clientWidth, h = this.stage.clientHeight, v = new THREE.Vector3();
    this.tags.forEach(t => { const a = t.anchor; if (a.isObject3D) a.getWorldPosition(v); else v.copy(a); v.project(this.cam);
      const ew = t.el.offsetWidth / 2 + 10, eh = t.el.offsetHeight / 2 + 10;   // mantém a etiqueta dentro do palco
      const x = Math.min(w - ew, Math.max(ew, (v.x * .5 + .5) * w)), y = Math.min(h - eh - 60, Math.max(eh, (-v.y * .5 + .5) * h));
      t.el.style.transform = `translate(-50%,-50%) translate(${x}px,${y}px)`; });
  }
  hideAll() { Object.values(this.objs).forEach(o => { o.visible = false; }); }
  show(...names) { names.forEach(n => this.objs[n] && (this.objs[n].visible = true)); }
  camTo(tl, pos, target, d = 1.2, at = 0) {
    const f = this.cam.aspect < 1.25 ? Math.min(1.9, 1.25 / this.cam.aspect) : 1;   // palco em retrato: a câmera recua para caber a cena
    pos = pos.map((p, i) => target[i] + (p - target[i]) * f);
    tl.to(this.cam.position, { x: pos[0], y: pos[1], z: pos[2], duration: d, ease: 'power2.inOut' }, at).to(this.target, { x: target[0], y: target[1], z: target[2], duration: d, ease: 'power2.inOut' }, at); }
}

/* ---------- tomadas (uma por cena da receita) ---------- */
function shots(w, Q, L, fmt, ny) {
  const tagIn = (tl, el, at) => tl.to(el, { opacity: 1, duration: .35 }, at);
  const g = n => `<b>${fmt(n)}</b>`;
  const jarPos = [-1.4, 0, .2], fridgePos = [2.4, 0, -1.6];
  const S = {};
  S.pref = (tl) => {
    const jar = w.obj('jar', makeJar), fr = w.obj('fridge', makeFridge, fridgePos);
    const flour = w.obj('flour', () => makeFall(140, C.flour, .035)), yeast = w.obj('yeast', () => makeFall(24, C.yeast, .045));
    w.show('jar', 'fridge', 'flour', 'yeast'); jar.position.set(...jarPos); jar.scale.setScalar(1); jar.userData.fill.scale.y = .001; jar.userData.bubbles.visible = false; fr.userData.door.rotation.y = -1.9;
    w.camTo(tl, [-.4, 3.8, 8.2], [.4, 1.2, -.2]);
    const top = new THREE.Vector3(jarPos[0], 4.2, jarPos[2]), into = new THREE.Vector3(jarPos[0], .9, jarPos[2]);
    const tF = w.tag(`${g(Q.pfFlour)} g ${L.flour}`, new THREE.Vector3(-.3, 2.9, .2)), tY = w.tag(`${g(Q.yeast)} g ${L.yeast}`, new THREE.Vector3(-.3, 2.3, .2)), tW = w.tag(`${g(Q.pfWater)} g ${L.water}`, new THREE.Vector3(-.3, 1.7, .2));
    const k = { f: 0, y: 0 };
    tl.add(() => { flour.visible = true; }, .3); tagIn(tl, tF, .3);
    tl.to(k, { f: 1.05, duration: 1.3, ease: 'none', onUpdate: () => placeFall(flour, top, into, k.f) }, .3).to(jar.userData.fill.scale, { y: .45, duration: 1.1 }, .6);
    tl.add(() => { yeast.visible = true; }, 1.4); tagIn(tl, tY, 1.4);
    tl.to(k, { y: 1.05, duration: .9, ease: 'none', onUpdate: () => placeFall(yeast, top, into, k.y) }, 1.4);
    tagIn(tl, tW, 2.2); tl.to(jar.userData.fill.scale, { y: 1.05, duration: 1, ease: 'power1.out' }, 2.3);
    tl.add(() => { jar.userData.bubbles.visible = true; }, 3.2).fromTo(jar.userData.bubbles.scale, { x: .01, y: .01, z: .01 }, { x: 1, y: 1, z: 1, duration: .6, ease: 'back.out' }, 3.2);
    w.camTo(tl, [.8, 4.4, 9.4], [.8, 1.3, -.8], 1.2, 3.8);
    tl.to(jar.position, { x: fridgePos[0] - 1.9, z: fridgePos[2] + 1.5, duration: 1.2, ease: 'power2.inOut' }, 3.9);
    const tC = w.tag(`❄ ${fmt(Q.pfh)} h · ${fmt(Q.fridge)} °C`, new THREE.Vector3(fridgePos[0], 3.6, fridgePos[2]), 'cold'); tagIn(tl, tC, 5.6);
    tl.to([tF, tY, tW], { opacity: .35, duration: .4 }, 4);
  };
  S.mix = (tl, key) => {
    const bowl = w.obj('bowl', makeBowl), dough = w.obj('dough', () => makeDough(.62)), glass = w.obj('glass', makeGlass), flour = w.obj('flour', () => makeFall(140, C.flour, .035));
    w.show('bowl', 'dough', 'glass'); bowl.position.set(0, 0, 0); glass.position.set(2.3, 0, .6); glass.rotation.set(0, 0, 0); glass.userData.water.scale.y = 1;
    dough.position.set(0, .5, 0); dough.scale.set(1, .55, 1); dough.material.roughness = .62; dough.material.clearcoat = .15;
    w.camTo(tl, [0, 5, 6.2], [.4, .5, 0]);
    if (key === 'mix') {
      dough.scale.set(.7, .35, .7);
      const tS = w.tag(`${g(Q.salt)} g ${L.salt}`, new THREE.Vector3(2.3, 2, .6)), tW = w.tag(`${g(ny ? Q.water : Q.initWater)} g ${L.water}`, new THREE.Vector3(2.3, 1.5, .6)), tF = w.tag(`${g(ny ? Q.flour : Q.finFlour)} g ${L.flour}`, new THREE.Vector3(-1.6, 2.6, 0));
      const k = { f: 0 }; tl.add(() => { flour.visible = true; }, .2); tagIn(tl, tF, .2);
      tl.to(k, { f: 1.05, duration: 1.3, ease: 'none', onUpdate: () => placeFall(flour, new THREE.Vector3(0, 4, 0), new THREE.Vector3(0, .7, 0), k.f) }, .2).to(dough.scale, { x: 1, y: .5, z: 1, duration: 1.2 }, .5);
      tagIn(tl, tS, 1.4); tagIn(tl, tW, 1.6);
      tl.to(glass.position, { x: 1.05, y: 1.5, z: .3, duration: .7, ease: 'power2.inOut' }, 1.9).to(glass.rotation, { z: 1.9, duration: .7 }, 1.9).to(glass.userData.water.scale, { y: .02, duration: .8 }, 2.5);
      tl.to(dough.scale, { x: 1.35, y: .62, z: 1.35, duration: .9, ease: 'power1.out' }, 2.6).to(glass.position, { x: 2.3, y: 0, z: .6, duration: .6 }, 3.4).to(glass.rotation, { z: 0, duration: .6 }, 3.4);
      tl.to(dough.rotation, { y: Math.PI * 2, duration: 1.6, ease: 'power1.inOut' }, 3.6);
    } else if (key === 'bass') {
      dough.scale.set(1.35, .62, 1.35); w.show('glass');
      const per = Q.bassWater / 3;
      for (let i = 0; i < 3; i++) { const at = .3 + i * 1.3, t = w.tag(`+ ${g(per)} g ${L.water}`, new THREE.Vector3(2.3, 2.4 - i * .45, .6)); tagIn(tl, t, at);
        tl.to(glass.position, { x: 1.05, y: 1.5, z: .3, duration: .4 }, at).to(glass.rotation, { z: 1.6, duration: .4 }, at).to(glass.userData.water.scale, { y: 1 - (i + 1) * .3, duration: .4 }, at + .3)
          .to(glass.position, { x: 2.3, y: 0, z: .6, duration: .4 }, at + .75).to(glass.rotation, { z: 0, duration: .4 }, at + .75)
          .to(dough.scale, { x: 1.42, y: .56, z: 1.42, duration: .25, yoyo: true, repeat: 1, ease: 'sine.inOut' }, at + .6); }
    } else if (key === 'fold') {
      dough.scale.set(1.35, .62, 1.35); glass.visible = false;
      const t = w.tag(ny ? L.foldNY : L.foldN, new THREE.Vector3(0, 2.6, 0)); tagIn(tl, t, .2);
      for (let i = 0; i < 4; i++) { const at = .4 + i * 1.1; tl.to(dough.scale, { x: 1.1, y: 1.05, z: 1.1, duration: .35, ease: 'power2.out' }, at).to(dough.position, { y: .8, duration: .35 }, at)
          .to(dough.scale, { x: 1.38, y: .6, z: 1.38, duration: .5, ease: 'bounce.out' }, at + .4).to(dough.position, { y: .5, duration: .5 }, at + .4).to(dough.rotation, { y: '+=1.57', duration: .6 }, at + .35); }
      tl.to(dough.material, { clearcoat: .55, roughness: .45, duration: 1 }, 3);
      const win = w.tag(L.window, new THREE.Vector3(2.3, 1.2, .6), 'soft'); tagIn(tl, win, 4);
    } else if (key === 'oil') {
      dough.scale.set(1.35, .62, 1.35); glass.visible = false;
      const t = w.tag(`${g(Q.oil)} g ${L.oil}`, new THREE.Vector3(1.8, 2.4, .4)); tagIn(tl, t, .2);
      const stream = w.obj('oilStream', () => { const m = new THREE.Mesh(new THREE.CylinderGeometry(.03, .05, 1, 12), phys({ color: C.oil, roughness: .05, clearcoat: 1, transparent: true, opacity: .9 })); m.geometry.translate(0, -.5, 0); return m; });
      stream.visible = true; stream.position.set(.3, 3, 0); stream.scale.y = .001;
      tl.to(stream.scale, { y: 2.2, duration: .5 }, .5).to(stream.scale, { y: .001, duration: .4 }, 2.2);
      tl.to(dough.material, { clearcoat: 1, clearcoatRoughness: .05, roughness: .25, duration: 1.5 }, .8).to(dough.rotation, { y: '+=3.14', duration: 2, ease: 'power1.inOut' }, 1);
    }
  };
  S.balls = (tl, key) => {
    const sc = w.obj('scale', makeScale, [2.6, 0, 1.2]); const n = Math.min(Q.n, 8);
    if (!w.objs.balls) { w.objs.balls = new THREE.Group(); w.scene.add(w.objs.balls); for (let i = 0; i < 8; i++) w.objs.balls.add(makeDough(.42)); }
    const big = w.obj('dough', () => makeDough(.62)); const balls = w.objs.balls;
    w.show('scale', 'balls'); balls.children.forEach((b, i) => { b.visible = i < n; b.scale.setScalar(.001); b.position.set(0, .35, 0); });
    w.camTo(tl, [-.2, 6.4, 8.4], [-.2, .3, .2]);
    const spacing = Math.min(1.05, 6 / n), x0 = -spacing * (n - 1) / 2 - .6;
    if (key === 'lam') {
      big.visible = true; big.position.set(0, .4, 0); big.scale.set(1.3, .55, 1.3); big.rotation.set(0, 0, 0); balls.visible = false; sc.visible = false;
      const t = w.tag(L.lam, new THREE.Vector3(0, 2.2, 0)); tagIn(tl, t, .2);
      tl.to(big.scale, { x: 2.6, y: .18, z: 1.6, duration: 1, ease: 'power2.out' }, .3).to(big.position, { y: .16, duration: 1 }, .3)
        .to(big.scale, { x: 1.2, y: .38, duration: .6 }, 1.6).to(big.scale, { x: .9, y: .55, z: 1.1, duration: .6 }, 2.4).to(big.scale, { x: 1.2, y: .6, z: 1.2, duration: .7, ease: 'back.out' }, 3.2).to(big.position, { y: .4, duration: .7 }, 3.2);
      return;
    }
    if (key === 'temper') {
      big.visible = false; sc.visible = false;
      balls.children.forEach((b, i) => { if (i >= n) return; b.position.set(x0 + .6 + i * spacing, .3, .4); b.scale.set(.85, .7, .85); });
      tl.to(balls.children.slice(0, n).map(b => b.scale), { x: 1.08, y: .85, z: 1.08, duration: 2.2, ease: 'sine.inOut', stagger: .08 }, .3);
      const t = w.tag(`${fmt(Q.fridge)} → 26 °C · ${fmt(Q.outh)} h`, new THREE.Vector3(0, 2, .4)); tagIn(tl, t, .3);
      return;
    }
    big.visible = true; big.position.set(-.6, .55, .2); big.scale.set(1.5, .8, 1.5); big.rotation.set(0, 0, 0);
    tl.to(big.scale, { x: .01, y: .01, z: .01, duration: .5, ease: 'back.in' }, .4);
    balls.children.forEach((b, i) => { if (i >= n) return; const at = .7 + i * .16; b.position.set(-.6, .35, .2);
      tl.to(b.scale, { x: 1, y: .8, z: 1, duration: .45, ease: 'back.out(2)' }, at).to(b.position, { x: x0 + i * spacing, z: -.6, duration: .45, ease: 'power2.out' }, at); });
    const first = balls.children[0], st = sc.userData.top, tScale = w.tag(`<b>0</b> g`, new THREE.Vector3(2.6, -.05, 2.05), 'lcd');
    const k = { v: 0 }, at2 = .9 + n * .16;
    tl.to(first.position, { x: 2.6, y: st.y + .32, z: 1.2, duration: .6, ease: 'power2.inOut' }, at2); tagIn(tl, tScale, at2 + .3);
    tl.to(k, { v: Q.per, duration: .7, onUpdate: () => tScale.innerHTML = `<b>${Math.round(k.v)}</b> g` }, at2 + .4);
    tl.to(first.position, { x: x0, y: .35, z: -.6, duration: .6, ease: 'power2.inOut' }, at2 + 1.6);
    const tN = w.tag(`${Q.n} × ${g(Q.per)} g`, new THREE.Vector3(-.6, 1.8, -.6)); tagIn(tl, tN, at2 + 1.2);
    const tC = w.tag(`❄ ${fmt(Q.panh)} h`, new THREE.Vector3(-3.4, 1.6, -.6), 'cold'); tagIn(tl, tC, at2 + 2);
  };
  S.build = (tl, key) => {
    const pz = w.obj(ny ? 'pizzaNY' : 'pizza', () => makePizza(ny)), U = pz.userData; const peel = w.obj('peel', makePeel, [0, -.02, 0]);
    w.show(ny ? 'pizzaNY' : 'pizza', 'peel'); pz.position.set(0, .03, 0); pz.rotation.set(0, 0, 0); peel.position.set(0, .02, 0);
    U.spots.scale.setScalar(.001); U.cuts.visible = false; U.base.material.map && (U.rimMat.color.set(0xffffff));
    w.camTo(tl, [0, 6.4, 4.4], [0, 0, .2]);
    const ball = w.obj('ballOpen', () => makeDough(.45));
    if (key === 'open') {
      ball.visible = true; ball.position.set(0, .36, 0); ball.scale.set(1, .8, 1);
      [U.sauce, U.cheese, U.basil].forEach(o => o.visible = false); U.base.scale.set(.001, 1, .001); U.rim.scale.set(.001, .001, .001);
      tl.to(ball.scale, { x: 2, y: .25, z: 2, duration: .8, ease: 'power2.out' }, .3).to(ball.position, { y: .12, duration: .8 }, .3)
        .add(() => { ball.visible = false; }, 1.1).to(U.base.scale, { x: 1, z: 1, duration: 1, ease: 'power2.out' }, 1.0).to(U.rim.scale, { x: 1, y: 1, z: 1, duration: 1, ease: 'power2.out' }, 1.1);
      const t = w.tag(ny ? L.rimNY : L.rimN, new THREE.Vector3(1.6, .6, 1.4)), t2 = w.tag(`⌀ ${Q.size}`, new THREE.Vector3(0, .3, 2.1), 'soft'); tagIn(tl, t, 1.6); tagIn(tl, t2, 2);
      return;
    }
    ball.visible = false; U.base.scale.set(1, 1, 1); U.rim.scale.set(1, 1, 1); [U.sauce, U.cheese, U.basil].forEach(o => o.visible = true);
    U.sauce.scale.set(.001, 1, .001); U.cheese.children.forEach(c => { c.userData.y = c.userData.y ?? c.position.y; c.position.y = 3; c.visible = false; }); U.basil.children.forEach(b => { b.userData.y = b.userData.y ?? b.position.y; b.position.y = 3; b.visible = false; });
    tl.to(U.sauce.scale, { x: 1, z: 1, duration: 1, ease: 'power2.out' }, .3).to(U.sauce.rotation, { y: Math.PI * 2, duration: 1 }, .3);
    U.cheese.children.forEach((c, i) => { tl.add(() => { c.visible = true; }, 1.3 + i * .06).to(c.position, { y: c.userData.y, duration: .45, ease: 'bounce.out' }, 1.3 + i * .06); });
    U.basil.children.forEach((b, i) => { tl.add(() => { b.visible = true; }, 2.4 + i * .1).to(b.position, { y: b.userData.y, duration: .5, ease: 'power2.out' }, 2.4 + i * .1); });
    const t = w.tag(`${g(Q.sauceTotal / Q.n)} g ${L.sauce} · ${g(Q.cheeseTotal / Q.n)} g ${L.cheese}`, new THREE.Vector3(0, 1.4, -1.4)); tagIn(tl, t, .4);
    tl.to([pz.position, peel.position], { x: -.18, duration: .1, yoyo: true, repeat: 3 }, 3.2);
  };
  S.bake = (tl, key) => {
    const ov = w.obj('oven', makeOven, [0, 0, -2.2]), U0 = ov.userData; const pz = w.obj(ny ? 'pizzaNY' : 'pizza', () => makePizza(ny)), U = pz.userData;
    w.show('oven'); w.camTo(tl, [0, 2.6, 5.6], [0, 1.0, -2]);
    const tT = w.tag(`${L.top} <b>20</b> °C`, new THREE.Vector3(0, 2.2, -1)), tB = w.tag(`${L.bottom} <b>20</b> °C`, new THREE.Vector3(0, .05, -.8));
    const heat = { t: key === 'oven' ? 20 : Q.top, b: key === 'oven' ? 20 : Q.bottom };
    const upd = () => { tT.innerHTML = `${L.top} <b>${Math.round(heat.t)}</b> °C`; tB.innerHTML = `${L.bottom} <b>${Math.round(heat.b)}</b> °C`; const k = Math.min(1, (heat.t - 20) / 380); U0.em1.emissiveIntensity = 2.6 * k; U0.em2.emissiveIntensity = 2.2 * Math.min(1, (heat.b - 20) / 340); U0.glow.intensity = 6 * k; };
    upd(); tagIn(tl, tT, .2); tagIn(tl, tB, .2);
    if (key === 'oven') { tl.to(heat, { t: Q.top, b: Q.bottom, duration: 2.6, ease: 'power1.out', onUpdate: upd }, .4); return; }
    w.show(ny ? 'pizzaNY' : 'pizza'); [U.sauce, U.cheese, U.basil].forEach(o => o.visible = true); U.base.scale.set(1, 1, 1); U.rim.scale.set(1, 1, 1); U.sauce.scale.set(1, 1, 1);
    U.cheese.children.forEach(c => { c.visible = true; if (c.userData.y !== undefined) c.position.y = c.userData.y; }); U.basil.children.forEach(b => { b.visible = true; if (b.userData.y !== undefined) b.position.y = b.userData.y; });
    U.spots.scale.setScalar(.001); U.cuts.visible = false; U.rimMat.color.set(0xffffff);
    if (key === 'slice') {
      ov.visible = false; pz.position.set(0, .03, 0); pz.rotation.set(0, 0, 0); U.spots.scale.setScalar(1); U.rimMat.color.set(0xE7B98A); w.camTo(tl, [0, 6.2, 4.6], [0, 0, .2], .01);
      U.cuts.visible = true; U.cuts.children.forEach((c, i) => { c.scale.x = .001; tl.to(c.scale, { x: 1, duration: .4 }, .4 + i * .3); });
      const t = w.tag(L.foldSlice, new THREE.Vector3(0, 1.4, 1.8)); tagIn(tl, t, 1.8); tT.remove(); tB.remove();
      return;
    }
    upd(); pz.position.set(0, .55, 4); pz.rotation.set(0, 0, 0); pz.scale.setScalar(.82);
    const timer = w.tag(`<b>0</b> s`, new THREE.Vector3(1.9, 2.3, -1), 'timer'); tagIn(tl, timer, .3);
    tl.to(pz.position, { z: -2.1, duration: 1.1, ease: 'power2.out' }, .4);
    const T = ny ? 390 : 95, k = { s: 0 }, D = 3.4;
    tl.to(k, { s: T, duration: D, ease: 'none', onUpdate: () => { const s = Math.round(k.s); timer.innerHTML = ny ? `<b>${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}</b> min` : `<b>${s}</b> s`; } }, 1.5);
    (ny ? [60, 120, 180, 240, 300] : [28]).forEach(s => tl.to(pz.rotation, { y: '+=' + Math.PI, duration: .35, ease: 'power2.inOut' }, 1.5 + s / T * D));
    tl.to(U.spots.scale, { x: 1, y: 1, z: 1, duration: 1.6, ease: 'power1.in' }, 1.5 + D * .45).to(U.rimMat.color, { r: .93, g: .74, b: .55, duration: 2 }, 1.5 + D * .3);
    tl.to(pz.position, { z: 2.6, y: .3, duration: 1, ease: 'power2.inOut' }, 1.6 + D);
  };
  return S;
}
const ALIAS = { pref: ['pref'], mix: ['mix', 'mix'], bass: ['mix', 'bass'], fold: ['mix', 'fold'], oil: ['mix', 'oil'], lam: ['balls', 'lam'], balls: ['balls', 'balls'], temper: ['balls', 'temper'],
  sauce: ['build', 'build'], oven: ['bake', 'oven'], open: ['build', 'open'], build: ['build', 'build'], bake: ['bake', 'bake'], slice: ['bake', 'slice'] };

/* ---------- herói: pizza pronta girando ---------- */
function hero(el, ny) {
  const w = new World(el, { orbit: true }); w.target.set(0, .2, 0);
  const pz = w.obj('p', () => makePizza(ny)); pz.userData.spots.scale.setScalar(1); pz.userData.rimMat.color.set(0xEEC290);
  const peel = w.obj('peel', makePeel, [0, -.02, .4]);
  const steam = []; for (let i = 0; i < 6; i++) { const s = new THREE.Mesh(new THREE.SphereGeometry(.25, 12, 8), mat({ color: 0xffffff, transparent: true, opacity: 0, roughness: 1, depthWrite: false })); s.position.set((rnd() - .5) * 1.4, .4, (rnd() - .5) * 1.4); w.scene.add(s); steam.push(s);
    gsap.to(s.position, { y: 2.6, duration: 3.2, repeat: -1, delay: i * .55, ease: 'none' }); gsap.fromTo(s.material, { opacity: 0 }, { opacity: .18, duration: 1.6, repeat: -1, yoyo: true, delay: i * .55 }); gsap.to(s.scale, { x: 2.2, y: 2.2, z: 2.2, duration: 3.2, repeat: -1, delay: i * .55, ease: 'none' }); }
  return w;
}

/* ---------- ligação com a página ---------- */
function main() {
  if (!NP || !gsap || reduced || prerender || !hasGL) return;   // fica o player em SVG
  const stage = document.getElementById('stage3d'), heroEl = document.getElementById('hero3d'); if (!stage) return;
  const ny = NP.C.id !== 'napolitana', L = NP.T.player.lbl, fmt = v => { const n = Number(v); return Number.isInteger(n) ? new Intl.NumberFormat(NP.T.locale).format(n) : NP.fmt('x', n); };
  document.documentElement.classList.add('has-3d');
  if (heroEl) hero(heroEl, ny);
  const w = new World(stage); w.cam.position.set(0, 5, 7);
  let S = shots(w, NP.calc(), L, fmt, ny), cur = null, mode = 'film';
  const steps = [...document.querySelectorAll('#stepsRoot .step')], btn = document.getElementById('st3Play'), lbl = document.getElementById('st3Label');
  const play = (id, force) => {
    if (cur === id && !force) return; cur = id; const sc = NP.C.scenes[id]; if (!sc) return;
    const [fn, key] = ALIAS[sc] || ['mix', 'mix']; seed = 7;
    if (w.tl) w.tl.kill(); w.clearTags(); w.hideAll();
    w.tl = gsap.timeline({ onComplete: () => { w.wake(3); if (mode === 'film' && autoplay) next(); } });
    S = shots(w, NP.calc(), L, fmt, ny); S[fn](w.tl, key); w.wake(5);
    steps.forEach(s => s.classList.toggle('on', s.id === id));
    const i = steps.findIndex(s => s.id === id); if (lbl) lbl.textContent = `${NP.T.player.step} ${String(i + 1).padStart(2, '0')} / ${steps.length}`;
  };
  let autoplay = false;
  const next = () => { const i = steps.findIndex(s => s.id === cur); if (i < steps.length - 1) { setTimeout(() => steps[i + 1].scrollIntoView({ behavior: 'smooth', block: 'center' }), 900); } else autoplay = false; };
  const io = new IntersectionObserver(es => { es.forEach(e => { if (e.isIntersecting) play(e.target.id); }); }, { rootMargin: '-45% 0px -45% 0px' });
  steps.forEach(s => io.observe(s));
  if (btn) btn.onclick = () => { autoplay = !autoplay; btn.setAttribute('aria-pressed', autoplay); if (autoplay) { const first = cur ? document.getElementById(cur) : steps[0]; play(first.id, true); first.scrollIntoView({ behavior: 'smooth', block: 'center' }); } };
  document.getElementById('st3Replay')?.addEventListener('click', () => cur && play(cur, true));
  NP.onRender.push(() => { if (cur && !(w.tl && w.tl.isActive())) play(cur, true); });
  play(steps[0].id);
}
try { main(); } catch (e) { document.documentElement.classList.remove('has-3d'); console.warn('3D desativado:', e); }
