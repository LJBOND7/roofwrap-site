/* ============================================================
   RoofWrap Experience
   One continuous scene. Scroll controls time.
   Real project anchors: story-damage-real.jpg / multifamily-after.jpg
   ============================================================ */

import * as THREE from 'three';

/* ------------------------------------------------------------
   0. Boot, capability check, quality tier
   ------------------------------------------------------------ */
const canWebGL = (() => {
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
  } catch (e) { return false; }
})();
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const $ = (id) => document.getElementById(id);
const loaderEl = $('loader');

if (!canWebGL || reducedMotion) {
  document.body.classList.add('is-fallback');
  $('fallback').hidden = false;
  loaderEl.classList.add('is-done');
  window.__expBooted = true;
} else {
  main();
}

function main() {
window.__expBooted = true;

const coarse = window.matchMedia('(pointer: coarse)').matches;
const small = Math.min(window.innerWidth, window.innerHeight) <= 820;
const LOW = coarse && small;

const Q = LOW ? {
  dpr: 1.25, shadows: false,
  fireN: 380, emberN: 110, smokeN: 130, waterN: 220,
  memNX: 66, memNZ: 40, palms: 9,
} : {
  dpr: 1.75, shadows: true,
  fireN: 900, emberN: 260, smokeN: 270, waterN: 480,
  memNX: 100, memNZ: 60, palms: 14,
};

/* ------------------------------------------------------------
   1. Small math helpers
   ------------------------------------------------------------ */
const clamp01 = (v) => Math.min(1, Math.max(0, v));
const seg = (p, a, b) => clamp01((p - a) / (b - a));
const smooth = (t) => t * t * (3 - 2 * t);
const sseg = (p, a, b) => smooth(seg(p, a, b));
const bump = (p, a, b, c, d) => Math.min(sseg(p, a, b), 1 - sseg(p, c, d));
const lerp = (a, b, t) => a + (b - a) * t;
const rand = (() => { let s = 421; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();

/* ------------------------------------------------------------
   2. Renderer, scene, camera
   ------------------------------------------------------------ */
const renderer = new THREE.WebGLRenderer({
  canvas: $('scene'), antialias: true, powerPreference: 'high-performance',
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, Q.dpr));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.06;
if (Q.shadows) {
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
}

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(48, window.innerWidth / window.innerHeight, 0.5, 900);

/* ------------------------------------------------------------
   3. Procedural canvas textures
   ------------------------------------------------------------ */
function makeTex(w, h, draw, opts = {}) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  if (opts.repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; }
  t.anisotropy = 4;
  return t;
}

/* asphalt shingle */
const shingleTex = makeTex(256, 256, (g, w, h) => {
  g.fillStyle = '#5a5e62'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 3400; i++) {
    const v = 74 + Math.floor(rand() * 48);
    g.fillStyle = `rgba(${v},${v + 2},${v + 4},0.45)`;
    g.fillRect(rand() * w, rand() * h, 2 + rand() * 3, 2 + rand() * 2);
  }
  const course = 13;
  for (let y = 0; y < h; y += course) {
    g.fillStyle = 'rgba(16,18,20,0.7)'; g.fillRect(0, y, w, 2.4);
    g.fillStyle = 'rgba(255,255,255,0.09)'; g.fillRect(0, y + 2.4, w, 1.2);
    const off = (y / course) % 2 ? 16 : 0;
    for (let x = off; x < w; x += 32) {
      g.fillStyle = 'rgba(24,26,28,0.22)'; g.fillRect(x, y + 2, 1.4, course - 2);
    }
  }
}, { repeat: true });
shingleTex.repeat.set(9, 5.6);

/* stucco walls */
const stuccoTex = makeTex(128, 128, (g, w, h) => {
  g.fillStyle = '#d9dcdd'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 900; i++) {
    const v = 190 + Math.floor(rand() * 50);
    g.fillStyle = `rgba(${v},${v + 2},${v + 3},0.35)`;
    g.fillRect(rand() * w, rand() * h, 2, 2);
  }
}, { repeat: true });
stuccoTex.repeat.set(6, 3);

/* ground: lawn, dirt yard, roads, sidewalk, parking */
const GROUND = 240, GPX = 2048;
const w2g = (v) => ((v + GROUND / 2) / GROUND) * GPX;
const groundTex = makeTex(GPX, GPX, (g) => {
  g.fillStyle = '#7b874f'; g.fillRect(0, 0, GPX, GPX);
  for (let i = 0; i < 16000; i++) {
    const r = 2 + rand() * 14;
    const greens = ['#74814d', '#87935d', '#6e7b49', '#8f9364', '#7f8a54', '#6a7746'];
    g.fillStyle = greens[Math.floor(rand() * greens.length)];
    g.globalAlpha = 0.22 + rand() * 0.2;
    g.beginPath(); g.arc(rand() * GPX, rand() * GPX, r, 0, 7); g.fill();
  }
  g.globalAlpha = 1;
  /* bare dirt front yard */
  const dirt = (x0, z0, x1, z1, n) => {
    for (let i = 0; i < n; i++) {
      const tans = ['#a5906c', '#b09a74', '#93805f', '#b3a075', '#9c8a66'];
      g.fillStyle = tans[Math.floor(rand() * tans.length)];
      g.globalAlpha = 0.2 + rand() * 0.25;
      g.beginPath();
      g.arc(lerp(w2g(x0), w2g(x1), rand()), lerp(w2g(z0), w2g(z1), rand()), 3 + rand() * 14, 0, 7);
      g.fill();
    }
    g.globalAlpha = 1;
  };
  dirt(-17, 2, 17, 20, 5200);
  dirt(-14, -9, 14, 4, 1600);
  dirt(-19, -20, 19, -9, 700);
  /* right road along z */
  g.fillStyle = '#3c3f42'; g.fillRect(w2g(24.5), 0, w2g(31.5) - w2g(24.5), GPX);
  /* back road along x */
  g.fillStyle = '#3c3f42'; g.fillRect(0, w2g(-29), GPX, w2g(-23) - w2g(-29));
  /* center lines */
  g.strokeStyle = '#c9a83c'; g.lineWidth = 4; g.setLineDash([26, 30]);
  g.beginPath(); g.moveTo(w2g(28), 0); g.lineTo(w2g(28), GPX); g.stroke();
  g.beginPath(); g.moveTo(0, w2g(-26)); g.lineTo(GPX, w2g(-26)); g.stroke();
  g.setLineDash([]);
  /* sidewalk strip */
  g.fillStyle = '#b9b6ae'; g.fillRect(w2g(21), 0, w2g(23) - w2g(21), GPX);
  g.strokeStyle = 'rgba(0,0,0,0.18)'; g.lineWidth = 2;
  for (let z = -120; z < 120; z += 4) {
    g.beginPath(); g.moveTo(w2g(21), w2g(z)); g.lineTo(w2g(23), w2g(z)); g.stroke();
  }
  /* parking lot behind */
  g.fillStyle = '#45484b'; g.fillRect(w2g(-22), w2g(-40), w2g(12) - w2g(-22), w2g(-29.5) - w2g(-40));
  g.strokeStyle = 'rgba(255,255,255,0.55)'; g.lineWidth = 3;
  for (let x = -20; x <= 10; x += 3.2) {
    g.beginPath(); g.moveTo(w2g(x), w2g(-39)); g.lineTo(w2g(x), w2g(-33)); g.stroke();
  }
  /* road grime */
  for (let i = 0; i < 500; i++) {
    g.fillStyle = 'rgba(0,0,0,0.12)';
    g.beginPath(); g.arc(rand() * GPX, rand() * GPX, 2 + rand() * 8, 0, 7); g.fill();
  }
});

/* soft round sprite for smoke */
const smokeTex = makeTex(128, 128, (g, w, h) => {
  g.clearRect(0, 0, w, h);
  for (let i = 0; i < 9; i++) {
    const x = w / 2 + (rand() - 0.5) * 44, y = h / 2 + (rand() - 0.5) * 44, r = 22 + rand() * 26;
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, 'rgba(255,255,255,0.5)');
    gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
  }
});
smokeTex.colorSpace = THREE.NoColorSpace;

/* flame sprite */
const flameTex = makeTex(64, 64, (g, w, h) => {
  g.clearRect(0, 0, w, h);
  const gr = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
  gr.addColorStop(0, 'rgba(255,255,255,1)');
  gr.addColorStop(0.35, 'rgba(255,220,120,0.85)');
  gr.addColorStop(0.7, 'rgba(255,120,30,0.35)');
  gr.addColorStop(1, 'rgba(255,60,0,0)');
  g.fillStyle = gr; g.fillRect(0, 0, w, h);
});
flameTex.colorSpace = THREE.NoColorSpace;

/* palm frond */
const frondTex = makeTex(128, 64, (g, w, h) => {
  g.clearRect(0, 0, w, h);
  g.strokeStyle = '#4a6b32'; g.lineWidth = 3;
  g.beginPath(); g.moveTo(0, h / 2); g.quadraticCurveTo(w * 0.6, h / 2 - 6, w, h / 2 + 8); g.stroke();
  g.lineWidth = 2;
  for (let i = 0; i < 22; i++) {
    const t = i / 22, x = t * w, y = h / 2 - t * -2;
    const len = 20 * (1 - Math.abs(t - 0.45));
    g.strokeStyle = `rgba(${60 + rand() * 30},${100 + rand() * 30},${45},0.9)`;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + 6, y - len); g.stroke();
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + 8, y + len); g.stroke();
  }
});

/* membrane seams */
const memTex = makeTex(256, 256, (g, w, h) => {
  g.fillStyle = '#f5f6f4'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 700; i++) {
    const v = 236 + Math.floor(rand() * 18);
    g.fillStyle = `rgba(${v},${v},${v - 2},0.5)`;
    g.fillRect(rand() * w, rand() * h, 3, 8 + rand() * 20);
  }
  g.fillStyle = 'rgba(120,124,126,0.5)'; g.fillRect(0, 0, 3, h);
  g.fillStyle = 'rgba(255,255,255,0.7)'; g.fillRect(3, 0, 2, h);
}, { repeat: true });
memTex.repeat.set(19, 1);

/* attic floor seen through the burned roof */
const atticTex = makeTex(512, 512, (g, w, h) => {
  g.fillStyle = '#98927f'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 40; i++) {
    g.fillStyle = 'rgba(238,235,226,0.85)';
    g.fillRect(rand() * w, rand() * h, 26 + rand() * 100, 10 + rand() * 18);
  }
  for (let i = 0; i < 240; i++) {
    g.fillStyle = `rgba(${14 + rand() * 34},${12 + rand() * 28},${12 + rand() * 24},${0.3 + rand() * 0.4})`;
    g.beginPath(); g.arc(rand() * w, rand() * h, 5 + rand() * 30, 0, 7); g.fill();
  }
  for (let i = 0; i < 120; i++) {
    g.fillStyle = `rgba(${150 + rand() * 60},${120 + rand() * 40},${80 + rand() * 30},0.4)`;
    g.fillRect(rand() * w, rand() * h, 4 + rand() * 30, 3 + rand() * 8);
  }
});

/* ------------------------------------------------------------
   4. Lights, sky, fog
   ------------------------------------------------------------ */
const sunDir = new THREE.Vector3(0.55, 0.72, -0.42).normalize();
const sun = new THREE.DirectionalLight(0xfff2d8, 1.2);
sun.position.copy(sunDir).multiplyScalar(90);
if (Q.shadows) {
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  const sc = sun.shadow.camera;
  sc.left = -46; sc.right = 46; sc.top = 46; sc.bottom = -46; sc.near = 20; sc.far = 220;
  sun.shadow.bias = -0.0009;
}
scene.add(sun, sun.target);

const hemi = new THREE.HemisphereLight(0xcfe3f5, 0x8a7a63, 0.8);
scene.add(hemi);
const amb = new THREE.AmbientLight(0xffffff, 0.12);
scene.add(amb);

const fireLightA = new THREE.PointLight(0xff7020, 0, 70, 1.9);
fireLightA.position.set(-3, 10, 1);
const fireLightB = new THREE.PointLight(0xff9540, 0, 55, 1.9);
fireLightB.position.set(3, 9, -1);
scene.add(fireLightA, fireLightB);

scene.fog = new THREE.FogExp2(0xdfe8ee, 0.0035);

const skyUniforms = {
  uTop: { value: new THREE.Color('#69b2e6') },
  uBottom: { value: new THREE.Color('#ead9c0') },
  uSunCol: { value: new THREE.Color('#fff3d8') },
  uSunDir: { value: sunDir },
};
const sky = new THREE.Mesh(
  new THREE.SphereGeometry(420, 24, 16),
  new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: skyUniforms,
    vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: `
      varying vec3 vDir;
      uniform vec3 uTop, uBottom, uSunCol, uSunDir;
      void main(){
        float t = pow(clamp(vDir.y, 0.0, 1.0), 0.38);
        vec3 col = mix(uBottom, uTop, t);
        float sd = max(dot(vDir, uSunDir), 0.0);
        col += uSunCol * (pow(sd, 340.0) * 1.6 + pow(sd, 10.0) * 0.16);
        gl_FragColor = vec4(col, 1.0);
      }`,
  })
);
sky.renderOrder = -1;
scene.add(sky);

/* ------------------------------------------------------------
   5. Ground and site
   ------------------------------------------------------------ */
const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(GROUND, GROUND),
  new THREE.MeshStandardMaterial({ map: groundTex, roughness: 1 })
);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = Q.shadows;
scene.add(ground);

/* far ground so the horizon melts into fog instead of a hard edge */
const farGroundMat = new THREE.MeshLambertMaterial({ color: 0x7b874f });
const farGround = new THREE.Mesh(new THREE.PlaneGeometry(1600, 1600), farGroundMat);
farGround.rotation.x = -Math.PI / 2;
farGround.position.y = -0.08;
scene.add(farGround);

const site = new THREE.Group();
scene.add(site);

/* bollards along the sidewalk */
{
  const n = 16;
  const im = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(0.09, 0.1, 0.95, 6),
    new THREE.MeshStandardMaterial({ color: 0xf0efe9, roughness: 0.8 }), n);
  const m = new THREE.Matrix4();
  for (let i = 0; i < n; i++) {
    m.setPosition(20.4, 0.48, -19 + i * 2.55);
    im.setMatrixAt(i, m);
  }
  im.castShadow = Q.shadows;
  site.add(im);
}

/* power pole and lines */
{
  const poleMat = new THREE.MeshStandardMaterial({ color: 0x6d5c48, roughness: 1 });
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.2, 11.5, 6), poleMat);
  pole.position.set(23.2, 5.75, 13.5);
  pole.castShadow = Q.shadows;
  const arm = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.14, 0.14), poleMat);
  arm.position.set(23.2, 10.6, 13.5);
  site.add(pole, arm);
  const wireMat = new THREE.LineBasicMaterial({ color: 0x2a2b2c });
  const mkWire = (a, b) => {
    const midY = Math.min(a.y, b.y) - 1.1;
    const curve = new THREE.QuadraticBezierCurve3(a, new THREE.Vector3((a.x + b.x) / 2, midY, (a.z + b.z) / 2), b);
    site.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(curve.getPoints(18)), wireMat));
  };
  mkWire(new THREE.Vector3(22.2, 10.5, 13.5), new THREE.Vector3(24, 10.2, -40));
  mkWire(new THREE.Vector3(24.2, 10.5, 13.5), new THREE.Vector3(25, 10.1, 60));
}

/* palms */
const palmSway = [];
{
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x8a7355, roughness: 1 });
  const frondMat = new THREE.MeshStandardMaterial({
    map: frondTex, transparent: true, alphaTest: 0.15, side: THREE.DoubleSide, roughness: 1,
  });
  const spots = [
    [31, -14], [33.5, -3], [31.5, 6], [33, 16], [30.5, 24], [34, -22],
    [-14, -33], [-2, -34], [10, -33], [19, -32], [-24, -30],
    [-30, -14], [-33, 2], [-28, 18],
  ].slice(0, Q.palms);
  for (const [x, z] of spots) {
    const h = 4.6 + rand() * 3.0;
    const palm = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.3, h, 6), trunkMat);
    trunk.position.y = h / 2;
    trunk.rotation.z = (rand() - 0.5) * 0.12;
    trunk.castShadow = Q.shadows;
    palm.add(trunk);
    const crown = new THREE.Group();
    crown.position.y = h;
    for (let i = 0; i < 10; i++) {
      const f = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 1.35), frondMat);
      f.position.y = 0.12;
      f.rotation.y = (i / 10) * Math.PI * 2 + rand() * 0.4;
      f.rotation.z = -0.35 - rand() * 0.45;
      f.translateX(1.55);
      crown.add(f);
    }
    palm.add(crown);
    palm.position.set(x, 0, z);
    palmSway.push({ crown, phase: rand() * 6.28 });
    site.add(palm);
  }
}

/* winter brush, left side */
{
  const mat = new THREE.MeshStandardMaterial({ color: 0x4c4731, roughness: 1, flatShading: true });
  for (const [x, z, s] of [
    [-20, 6, 1.25], [-22.5, 9.5, 1.05], [-21.5, 3.5, 1.15], [-19, 10.5, 0.9], [-23.5, 6.5, 1.2],
  ]) {
    const b = new THREE.Mesh(new THREE.IcosahedronGeometry(s, 1), mat);
    b.position.set(x, s * 0.42, z);
    b.scale.y = 0.55;
    b.rotation.y = rand() * 3;
    site.add(b);
  }
}

/* parked cars and a flatbed trailer */
{
  const mk = (color) => {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.62, 4.4),
      new THREE.MeshStandardMaterial({ color, roughness: 0.4, metalness: 0.4 }));
    body.position.y = 0.55;
    const cab = new THREE.Mesh(new THREE.BoxGeometry(1.66, 0.52, 2.2),
      new THREE.MeshStandardMaterial({ color: 0x22262a, roughness: 0.2, metalness: 0.5 }));
    cab.position.y = 0.98;
    g.add(body, cab);
    body.castShadow = Q.shadows;
    return g;
  };
  const cars = [
    [mk(0xd8d8d4), -16, -35.6, 0], [mk(0x8e2f2f), -9.6, -35.6, 0], [mk(0x9aa2a8), -3.2, -35.6, 0],
    [mk(0x36404a), 28, 12, 0],
  ];
  for (const [c, x, z, ry] of cars) { c.position.set(x, 0, z); c.rotation.y = ry; site.add(c); }
  const trailer = new THREE.Mesh(new THREE.BoxGeometry(9, 0.5, 2.4),
    new THREE.MeshStandardMaterial({ color: 0x2c2e30, roughness: 0.8 }));
  trailer.position.set(1, 0.55, -32); site.add(trailer);
}

/* ------------------------------------------------------------
   6. The building
   ------------------------------------------------------------ */
const bld = new THREE.Group();
scene.add(bld);

const EAVE = 6.2, SLOPE = 0.42;
/* roof rectangles: center block plus two wings (half sizes include overhang) */
const roofRects = [
  { cx: 0, cz: 0, hw: 13.7, hd: 6.2 },
  { cx: -9.5, cz: 0, hw: 4.05, hd: 8.55 },
  { cx: 9.5, cz: 0, hw: 4.05, hd: 8.55 },
];
const UVX = 14.6, UVZ = 9.4; /* plan-space normalize box */
const planUV = (x, z) => [(x + UVX) / (2 * UVX), (z + UVZ) / (2 * UVZ)];

function hipH(rect, x, z) {
  const a = rect.hw - Math.abs(x - rect.cx);
  const b = rect.hd - Math.abs(z - rect.cz);
  return EAVE + SLOPE * Math.min(a, b);
}
function roofHeightAt(x, z) {
  let h = -1e9;
  for (const r of roofRects) h = Math.max(h, hipH(r, x, z));
  return h;
}

/* wall char shader hook, shared by wall materials */
const wallUniforms = { uBurn: { value: 0 } };
function charWalls(mat) {
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uBurn = wallUniforms.uBurn;
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWp;')
      .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvWp = (modelMatrix * vec4(transformed,1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWp;\nuniform float uBurn;')
      .replace('#include <map_fragment>', `#include <map_fragment>
        float chD = distance(vWp.xz, vec2(-1.5, 2.0));
        float chF = uBurn * smoothstep(11.0, 3.5, chD) * smoothstep(2.2, 6.0, vWp.y);
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.06,0.055,0.05), clamp(chF * 1.25, 0.0, 0.92));`);
  };
  return mat;
}
const wallMat = charWalls(new THREE.MeshStandardMaterial({ map: stuccoTex, color: 0xdfe2e2, roughness: 0.95 }));
const trimMat = charWalls(new THREE.MeshStandardMaterial({ color: 0xefede6, roughness: 0.85 }));

/* massing */
function box(w, h, d, x, y, z, mat) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  m.castShadow = Q.shadows; m.receiveShadow = Q.shadows;
  bld.add(m);
  return m;
}
box(26, EAVE, 11, 0, EAVE / 2, 0, wallMat);          /* center block */
box(7, EAVE, 16, -9.5, EAVE / 2, 0, wallMat);        /* left wing */
box(7, EAVE, 16, 9.5, EAVE / 2, 0, wallMat);         /* right wing */

/* windows: single textured plane per window */
const winTex = makeTex(128, 160, (g, w, h) => {
  g.fillStyle = '#e8e7e0'; g.fillRect(0, 0, w, h);
  g.fillStyle = '#20272c'; g.fillRect(12, 12, 70, h - 24);
  g.fillStyle = 'rgba(180,205,220,0.25)'; g.fillRect(12, 12, 70, 30);
  g.strokeStyle = '#cfd0c9'; g.lineWidth = 4;
  g.strokeRect(12, 12, 70, h - 24);
  g.beginPath(); g.moveTo(47, 12); g.lineTo(47, h - 12); g.stroke();
  g.fillStyle = '#b3985e'; g.fillRect(90, 12, 26, h - 24); /* tan shutter */
  g.strokeStyle = 'rgba(0,0,0,0.25)'; g.lineWidth = 2;
  for (let y = 16; y < h - 14; y += 8) { g.beginPath(); g.moveTo(90, y); g.lineTo(116, y); g.stroke(); }
});
const winMat = charWalls(new THREE.MeshStandardMaterial({ map: winTex, roughness: 0.6 }));
function addWin(x, y, z, ry) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 1.9), winMat);
  m.position.set(x, y, z); m.rotation.y = ry;
  bld.add(m);
}
{
  const F = 5.53, WF = 8.03, S = 13.03, B = -5.53, WB = -8.03;
  for (const y of [1.75, 4.7]) {
    /* wing fronts */
    for (const x of [-11.3, -7.7, 7.7, 11.3]) addWin(x, y, WF, 0);
    /* center front between porticoes */
    for (const x of [-5.05, -1.95, 1.95, 5.05]) addWin(x, y, F, 0);
    /* wing sides */
    for (const z of [-4.5, 0, 4.5]) { addWin(S, y, z, Math.PI / 2); addWin(-S, y, z, -Math.PI / 2); }
    /* backs */
    for (const x of [-4.4, -2.2, 0, 2.2, 4.4]) addWin(x, y, B, Math.PI);
    for (const x of [-11.3, -7.7, 7.7, 11.3]) addWin(x, y, WB, Math.PI);
  }
}

/* portico towers */
const towerRects = [];
for (const tx of [-3.9, 0, 3.9]) {
  const t = new THREE.Group();
  const colGeom = new THREE.BoxGeometry(0.26, EAVE, 0.26);
  for (const [ox, oz] of [[-1, 0], [1, 0]]) {
    const c = new THREE.Mesh(colGeom, trimMat);
    c.position.set(tx + ox * 0.95, EAVE / 2, 7.35 + oz);
    c.castShadow = Q.shadows;
    t.add(c);
  }
  const slab = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.22, 2.2), trimMat);
  slab.position.set(tx, 3.12, 6.5);
  slab.castShadow = Q.shadows;
  const rail = new THREE.Mesh(new THREE.PlaneGeometry(2.3, 0.95),
    charWalls(new THREE.MeshStandardMaterial({ color: 0xf2f1ec, roughness: 0.9, transparent: true, opacity: 0.85, side: THREE.DoubleSide })));
  rail.position.set(tx, 3.72, 7.42);
  const railG = new THREE.Mesh(new THREE.PlaneGeometry(2.3, 0.95), rail.material);
  railG.position.set(tx, 0.6, 7.42);
  const door = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 2.1),
    new THREE.MeshStandardMaterial({ color: 0x3a3f44, roughness: 0.7 }));
  door.position.set(tx, 1.1, 5.56);
  t.add(slab, rail, railG, door);
  bld.add(t);
  towerRects.push({ cx: tx, cz: 6.55, hw: 1.8, hd: 1.25 });
}

/* AC condensers by the entries */
for (const [x, z] of [[-2.9, 8.6], [-1.6, 8.6], [1.5, 8.6], [3, 8.6]]) {
  const ac = box(0.85, 0.75, 0.85, x, 0.4, z,
    new THREE.MeshStandardMaterial({ color: 0x9aa0a2, roughness: 0.6, metalness: 0.3 }));
  ac.castShadow = Q.shadows;
}

/* ------------------------------------------------------------
   7. Roof with burn shader
   ------------------------------------------------------------ */
function buildHip(cx, cz, hw, hd) {
  /* generic hip via min-form, ridge along the longer half-axis */
  const swap = hd > hw;
  const HW = swap ? hd : hw, HD = swap ? hw : hd;
  const rise = SLOPE * HD, rh = HW - HD;
  const V = (x, y, z) => swap ? [cx + z, y, cz + x] : [cx + x, y, cz + z];
  const A = V(-HW, EAVE, -HD), B = V(HW, EAVE, -HD), C = V(HW, EAVE, HD), D = V(-HW, EAVE, HD);
  const R1 = V(-rh, EAVE + rise, 0), R2 = V(rh, EAVE + rise, 0);
  const tris = swap
    ? [[A, B, R1], [B, R2, R1], [C, D, R2], [D, R1, R2], [B, C, R2], [D, A, R1]]
    : [[A, R1, B], [B, R1, R2], [C, R2, D], [D, R2, R1], [B, R2, C], [D, R1, A]];
  const pos = [], uv = [];
  for (const t of tris) for (const v of t) {
    pos.push(v[0], v[1], v[2]);
    const [u, w] = planUV(v[0], v[2]);
    uv.push(u, w);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.computeVertexNormals();
  return g;
}

const burnUniforms = {
  uBurn: { value: 0 }, uHole: { value: 0 }, uGlow: { value: 0 }, uTime: { value: 0 },
};
const roofMat = new THREE.MeshStandardMaterial({
  map: shingleTex, roughness: 0.95, side: THREE.DoubleSide,
});
roofMat.onBeforeCompile = (sh) => {
  Object.assign(sh.uniforms, burnUniforms);
  sh.vertexShader = sh.vertexShader
    .replace('#include <common>', '#include <common>\nvarying vec2 vBUv;')
    .replace('#include <uv_vertex>', '#include <uv_vertex>\nvBUv = uv;');
  sh.fragmentShader = sh.fragmentShader
    .replace('#include <common>', `#include <common>
      varying vec2 vBUv;
      uniform float uBurn, uHole, uGlow, uTime;
      float bhash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
      float bnoise(vec2 p){
        vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
        return mix(mix(bhash(i), bhash(i+vec2(1,0)), f.x), mix(bhash(i+vec2(0,1)), bhash(i+vec2(1,1)), f.x), f.y);
      }
      float bfbm(vec2 p){ return 0.55*bnoise(p) + 0.3*bnoise(p*2.13) + 0.15*bnoise(p*4.7); }
      float g_charm; float g_edge;`)
    .replace('#include <map_fragment>', `#include <map_fragment>
      /* main burn ellipse + smaller left-front lobe, plan space */
      vec2 c1 = vec2(0.447, 0.517); vec2 r1 = vec2(0.253, 0.345);
      vec2 c2 = vec2(0.205, 0.70);  vec2 r2 = vec2(0.155, 0.27);
      float n = bfbm(vBUv * 6.5 + 3.7);
      float s1 = 1.0 - length((vBUv - c1) / r1) + (n - 0.5) * 0.55;
      float s2 = 1.0 - length((vBUv - c2) / r2) + (n - 0.5) * 0.45;
      float sChar = max(s1, s2 * 0.9);
      float charT = 1.04 - 1.18 * uBurn;
      float holeT = 1.3 - 1.32 * uHole;
      if (s1 > holeT) discard;
      g_charm = smoothstep(charT, charT + 0.18, sChar);
      g_edge = smoothstep(holeT - 0.24, holeT, s1);
      vec3 charCol = vec3(0.05, 0.045, 0.042) * (0.55 + 0.9 * bfbm(vBUv * 22.0));
      diffuseColor.rgb = mix(diffuseColor.rgb, charCol, g_charm);
      if (!gl_FrontFacing) diffuseColor.rgb = vec3(0.05, 0.045, 0.04);`)
    .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
      float fl = 0.7 + 0.3 * sin(uTime * 9.0 + bnoise(vBUv * 30.0) * 40.0);
      totalEmissiveRadiance += vec3(1.0, 0.3, 0.045) * uGlow * fl *
        (g_edge * 1.5 + g_charm * (1.0 - g_charm) * 0.35);`);
};

for (const r of roofRects.concat(towerRects)) {
  const m = new THREE.Mesh(buildHip(r.cx, r.cz, r.hw, r.hd), roofMat);
  /* no castShadow: the burn hole is alpha-discarded, and a shadow from the
     intact silhouette would black out the exposed cavity */
  m.receiveShadow = Q.shadows;
  bld.add(m);
}

/* fascia bands */
{
  const fm = new THREE.MeshStandardMaterial({ color: 0xe9e7e0, roughness: 0.85 });
  for (const r of roofRects) {
    const mk = (w, d, x, z) => {
      const b = new THREE.Mesh(new THREE.BoxGeometry(w, 0.34, d), fm);
      b.position.set(x, EAVE - 0.08, z); bld.add(b);
    };
    mk(r.hw * 2 + 0.1, 0.15, r.cx, r.cz - r.hd);
    mk(r.hw * 2 + 0.1, 0.15, r.cx, r.cz + r.hd);
    mk(0.15, r.hd * 2 + 0.1, r.cx - r.hw, r.cz);
    mk(0.15, r.hd * 2 + 0.1, r.cx + r.hw, r.cz);
  }
}

/* roof vents (kept clear of the burn zone) */
{
  const vm = new THREE.MeshStandardMaterial({ color: 0x50545a, roughness: 0.7, metalness: 0.3 });
  for (const [x, z] of [[8.5, -3], [10.5, -2], [11.5, 2], [-11, -2.5], [7.5, 3.4], [9.8, 3.8]]) {
    const v = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.35, 0.5), vm);
    v.position.set(x, roofHeightAt(x, z) + 0.18, z);
    bld.add(v);
  }
}

/* ------------------------------------------------------------
   8. Exposed structure under the burn hole
   ------------------------------------------------------------ */
const cavity = new THREE.Group();
bld.add(cavity);
{
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(20, 10.7),
    new THREE.MeshStandardMaterial({ map: atticTex, roughness: 1 }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(-2, 3.32, 0);
  cavity.add(floor);

  /* unit partition walls glimpsed from above */
  const pw = new THREE.MeshStandardMaterial({ color: 0xd8d4c8, roughness: 1 });
  for (let i = 0; i < 9; i++) {
    const x = -8.5 + i * 1.85;
    const wallH = 1.6 + rand() * 0.9;
    const wpiece = new THREE.Mesh(new THREE.BoxGeometry(0.14, wallH, 3 + rand() * 5), pw);
    wpiece.position.set(x, 3.32 + wallH / 2, (rand() - 0.5) * 4);
    cavity.add(wpiece);
  }

  /* charred truss chords */
  const trussMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1 });
  const count = 23 * 2;
  const trusses = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), trussMat, count);
  const tc = new THREE.Color();
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), s3 = new THREE.Vector3();
  const ang = Math.atan2(SLOPE * 6.2, 6.2);
  let idx = 0;
  for (let i = 0; i < 23; i++) {
    const x = -8.6 + i * 0.63;
    for (const sideZ of [-1, 1]) {
      const broken = rand() < 0.34;
      const len = broken ? 2.2 + rand() * 2.6 : 6.75;
      e.set(sideZ * ang, 0, broken ? (rand() - 0.5) * 0.14 : 0);
      q.setFromEuler(e);
      s3.set(0.12, 0.16, len);
      const zc = sideZ * (broken ? 4.4 - len * 0.32 : 3.1);
      const yc = broken ? 6.05 + rand() * 0.3 : 7.3;
      m4.compose(new THREE.Vector3(x, yc, zc), q, s3);
      const shade = 0.06 + rand() * 0.16;
      tc.setRGB(shade + rand() * 0.07, shade * 0.8, shade * 0.6);
      trusses.setColorAt(idx, tc);
      trusses.setMatrixAt(idx++, m4);
    }
  }
  cavity.add(trusses);

  /* debris */
  const debN = 60;
  const deb = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1),
    new THREE.MeshStandardMaterial({ color: 0x1d1a17, roughness: 1 }), debN);
  for (let i = 0; i < debN; i++) {
    e.set(rand() * 3, rand() * 3, rand() * 3);
    q.setFromEuler(e);
    s3.set(0.25 + rand() * 1.1, 0.1 + rand() * 0.3, 0.25 + rand() * 1.3);
    m4.compose(new THREE.Vector3(-8 + rand() * 13, 3.5 + rand() * 0.35, (rand() - 0.5) * 8), q, s3);
    deb.setMatrixAt(i, m4);
  }
  cavity.add(deb);
}

/* ------------------------------------------------------------
   9. The RoofWrap membrane
   ------------------------------------------------------------ */
const MEM = { drop: 1.38, margin: 1.05, off: 0.3 };
function coverH(x, z) {
  let h = -1e9;
  for (const r of roofRects) h = Math.max(h, hipH(r, x, z));
  for (const r of towerRects) h = Math.max(h, hipH(r, x, z));
  return h;
}

const membrane = (() => {
  const nx = Q.memNX, nz = Q.memNZ;
  const x0 = -15.6, x1 = 15.6, z0 = -10.3, z1 = 10.3;
  const idxMap = new Int32Array(nx * nz).fill(-1);
  const base = [], final = [], skirtF = [], center = [];
  let count = 0;
  const eps = 0.25;
  for (let j = 0; j < nz; j++) {
    for (let i = 0; i < nx; i++) {
      const bx = lerp(x0, x1, i / (nx - 1));
      const bz = lerp(z0, z1, j / (nz - 1));
      const h = coverH(bx, bz);
      const d = Math.max(0, (EAVE - h) / SLOPE); /* outward distance past the eave */
      if (d > MEM.margin * 1.02) continue;
      idxMap[j * nx + i] = count++;
      /* inward direction from the height gradient */
      let gx = (coverH(bx + eps, bz) - coverH(bx - eps, bz)) / (2 * eps);
      let gz = (coverH(bx, bz + eps) - coverH(bx, bz - eps)) / (2 * eps);
      const gl = Math.hypot(gx, gz) || 1; gx /= gl; gz /= gl;
      const sf = clamp01(d / MEM.margin);
      let fx = bx, fy, fz = bz;
      if (d > 0.0001) {
        fx = bx + gx * d * 0.85;
        fz = bz + gz * d * 0.85;
        fy = EAVE + MEM.off + 0.08 - Math.pow(sf, 1.2) * MEM.drop;
      } else {
        fy = h + MEM.off;
      }
      base.push(bx, bz);
      final.push(fx, fy, fz);
      skirtF.push(sf);
      center.push(Math.hypot(bx, bz) / 17.5);
    }
  }
  const indices = [];
  for (let j = 0; j < nz - 1; j++) {
    for (let i = 0; i < nx - 1; i++) {
      const a = idxMap[j * nx + i], b = idxMap[j * nx + i + 1];
      const c = idxMap[(j + 1) * nx + i], dd = idxMap[(j + 1) * nx + i + 1];
      if (a < 0 || b < 0 || c < 0 || dd < 0) continue;
      indices.push(a, c, b, b, c, dd);
    }
  }
  const geo = new THREE.BufferGeometry();
  const posArr = new Float32Array(count * 3);
  const uvArr = new Float32Array(count * 2);
  for (let k = 0; k < count; k++) {
    uvArr[k * 2] = (base[k * 2] + UVX) / (2 * UVX);
    uvArr[k * 2 + 1] = (base[k * 2 + 1] + UVZ) / (2 * UVZ);
  }
  geo.setAttribute('position', new THREE.BufferAttribute(posArr, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uvArr, 2));
  geo.setIndex(indices);
  const mat = new THREE.MeshStandardMaterial({
    map: memTex, color: 0xffffff, roughness: 0.42, metalness: 0.0,
    emissive: 0x232323,
    side: THREE.DoubleSide, transparent: true, opacity: 0,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = Q.shadows;
  mesh.visible = false;
  scene.add(mesh);
  return { mesh, geo, base, final, skirtF, center, count, posArr };
})();

function updateMembrane(mt, t) {
  const { base, final, skirtF, center, count, posArr, geo } = membrane;
  const mA = sseg(mt, 0, 0.34);
  const mB = seg(mt, 0.28, 0.74);
  const mC = seg(mt, 0.70, 0.94);
  const mD = seg(mt, 0.88, 1.0);
  const hoverY = lerp(15.5, 9.0, mA);
  const amp = Math.max(0.018, 0.62 * (1 - 0.4 * mA) * (1 - 0.62 * mB) * (1 - 0.7 * mC) * (1 - 0.8 * mD));
  const eaveTop = EAVE + MEM.off + 0.08;
  for (let k = 0; k < count; k++) {
    const bx = base[k * 2], bz = base[k * 2 + 1];
    const sf = skirtF[k];
    /* suspended sheet */
    const sX = bx * 1.05, sZ = bz * 1.07, sY = hoverY;
    /* conform wavefront sweeping from the center outward */
    const wv = smooth(clamp01((mB * 1.32 - center[k]) / 0.3));
    /* skirt curls late */
    const curl = smooth(clamp01((mC * 1.3 - sf * 0.3)));
    let tx = final[k * 3], ty = final[k * 3 + 1], tz = final[k * 3 + 2];
    if (sf > 0.0001) {
      /* pre-curl: skirt splayed outward flat at the eave */
      const px = bx + (bx - tx) * 0.6, pz = bz + (bz - tz) * 0.6;
      tx = lerp(px, tx, curl);
      tz = lerp(pz, tz, curl);
      ty = lerp(eaveTop + 0.05, ty, curl);
    }
    let x = lerp(sX, tx, wv), y = lerp(sY, ty, wv), z = lerp(sZ, tz, wv);
    y += amp * (Math.sin(bx * 0.55 + t * 2.3) * Math.cos(bz * 0.72 - t * 1.7)
      + 0.5 * Math.sin((bx + bz) * 1.25 + t * 3.0)) * (1 - 0.65 * sf * curl);
    posArr[k * 3] = x; posArr[k * 3 + 1] = y; posArr[k * 3 + 2] = z;
  }
  geo.attributes.position.needsUpdate = true;
  geo.computeVertexNormals();
}

/* perimeter attachment straps */
const straps = new THREE.Group();
{
  const sm = new THREE.MeshStandardMaterial({ color: 0x33342f, roughness: 0.6, transparent: true, opacity: 0 });
  for (const r of roofRects) {
    const y = EAVE - MEM.drop + 0.34;
    const mk = (w, d, x, z) => {
      const b = new THREE.Mesh(new THREE.BoxGeometry(w, 0.12, d), sm);
      b.position.set(x, y, z); straps.add(b);
    };
    mk(r.hw * 2 + 0.5, 0.1, r.cx, r.cz - r.hd - 0.22);
    mk(r.hw * 2 + 0.5, 0.1, r.cx, r.cz + r.hd + 0.22);
    mk(0.1, r.hd * 2 + 0.5, r.cx - r.hw - 0.22, r.cz);
    mk(0.1, r.hd * 2 + 0.5, r.cx + r.hw + 0.22, r.cz);
  }
  straps.visible = false;
  scene.add(straps);
}

/* ------------------------------------------------------------
   10. Fire, embers, smoke
   ------------------------------------------------------------ */
function ellipseSpawn() {
  /* main burn ellipse in world space, weighted to the middle */
  const a = 7.2, b = 5.8, cx = -1.5, cz = 0.3;
  const r = Math.sqrt(rand()), th = rand() * Math.PI * 2;
  const x = cx + Math.cos(th) * r * a;
  const z = THREE.MathUtils.clamp(cz + Math.sin(th) * r * b, -6, 6.2);
  return [x, roofHeightAt(x, z), z];
}

function makePoints(n, buildAttrs, vertex, fragment, uniforms, blending) {
  const geo = new THREE.BufferGeometry();
  buildAttrs(geo, n);
  const mat = new THREE.ShaderMaterial({
    uniforms, vertexShader: vertex, fragmentShader: fragment,
    transparent: true, depthWrite: false, blending,
  });
  const pts = new THREE.Points(geo, mat);
  pts.frustumCulled = false;
  pts.visible = false;
  scene.add(pts);
  return pts;
}

const fireU = { uTime: { value: 0 }, uInt: { value: 0 }, uTex: { value: flameTex } };
const fire = makePoints(Q.fireN, (geo, n) => {
  const p = new Float32Array(n * 3), s = new Float32Array(n * 4);
  for (let i = 0; i < n; i++) {
    const [x, y, z] = ellipseSpawn();
    p.set([x, y - 0.2, z], i * 3);
    s.set([rand(), 0.28 + rand() * 0.5, 7 + rand() * 15, rand()], i * 4);
  }
  geo.setAttribute('position', new THREE.BufferAttribute(p, 3));
  geo.setAttribute('aSeed', new THREE.BufferAttribute(s, 4));
}, `
  attribute vec4 aSeed;
  uniform float uTime, uInt;
  varying float vLife; varying float vA;
  void main(){
    float life = fract(aSeed.x + uTime * aSeed.y);
    vLife = life;
    vec3 p = position;
    p.y += life * 4.4 * (0.5 + uInt * 0.7);
    float sw = sin(uTime * 2.4 + aSeed.w * 6.283 + p.y * 0.9) * 0.4 * life;
    p.x += sw - life * life * 0.8;
    p.z += sw * 0.55;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    float sz = aSeed.z * uInt * (1.0 - life * 0.72);
    gl_PointSize = clamp(sz * (185.0 / -mv.z), 0.0, 230.0);
    vA = uInt * 0.42 * smoothstep(0.0, 0.07, life) * (1.0 - life);
  }`, `
  uniform sampler2D uTex;
  varying float vLife; varying float vA;
  void main(){
    vec4 t = texture2D(uTex, gl_PointCoord);
    vec3 col = mix(vec3(1.0, 0.86, 0.35), vec3(0.95, 0.28, 0.05), vLife);
    gl_FragColor = vec4(col, t.a * vA);
  }`, fireU, THREE.AdditiveBlending);

const emberU = { uTime: { value: 0 }, uInt: { value: 0 } };
const embers = makePoints(Q.emberN, (geo, n) => {
  const p = new Float32Array(n * 3), s = new Float32Array(n * 4);
  for (let i = 0; i < n; i++) {
    const [x, y, z] = ellipseSpawn();
    p.set([x, y, z], i * 3);
    s.set([rand(), 0.12 + rand() * 0.2, 2 + rand() * 4, rand()], i * 4);
  }
  geo.setAttribute('position', new THREE.BufferAttribute(p, 3));
  geo.setAttribute('aSeed', new THREE.BufferAttribute(s, 4));
}, `
  attribute vec4 aSeed;
  uniform float uTime, uInt;
  varying float vA;
  void main(){
    float life = fract(aSeed.x + uTime * aSeed.y);
    vec3 p = position;
    p.y += life * 13.0;
    p.x += sin(uTime * 1.5 + aSeed.w * 9.0) * 1.4 * life - life * life * 5.0;
    p.z += cos(uTime * 1.2 + aSeed.w * 7.0) * 1.2 * life;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = clamp(aSeed.z * uInt * (1.0 - life * 0.6) * (160.0 / -mv.z), 0.0, 24.0);
    float tw = 0.6 + 0.4 * sin(uTime * 14.0 + aSeed.x * 60.0);
    vA = uInt * tw * smoothstep(0.0, 0.05, life) * (1.0 - life);
  }`, `
  varying float vA;
  void main(){
    float d = length(gl_PointCoord - 0.5);
    if (d > 0.5) discard;
    gl_FragColor = vec4(1.0, 0.55, 0.15, vA * (1.0 - d * 2.0));
  }`, emberU, THREE.AdditiveBlending);

const smokeU = {
  uTime: { value: 0 }, uAmt: { value: 0 }, uSteam: { value: 0 },
  uTex: { value: smokeTex }, uGlow: { value: 0 },
};
const smoke = makePoints(Q.smokeN, (geo, n) => {
  const p = new Float32Array(n * 3), s = new Float32Array(n * 4);
  for (let i = 0; i < n; i++) {
    const [x, y, z] = ellipseSpawn();
    p.set([x, y + 0.4, z], i * 3);
    s.set([rand(), 0.05 + rand() * 0.10, 55 + rand() * 100, rand()], i * 4);
  }
  geo.setAttribute('position', new THREE.BufferAttribute(p, 3));
  geo.setAttribute('aSeed', new THREE.BufferAttribute(s, 4));
}, `
  attribute vec4 aSeed;
  uniform float uTime;
  varying float vLife; varying float vSeed;
  void main(){
    float life = fract(aSeed.x + uTime * aSeed.y);
    vLife = life; vSeed = aSeed.w;
    vec3 p = position;
    p.y += life * 26.0;
    p.x += sin(uTime * 0.5 + aSeed.w * 6.283) * 1.6 - life * life * 13.0;
    p.z += cos(uTime * 0.4 + aSeed.w * 5.0) * 1.8 - life * 3.0;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = clamp(aSeed.z * (0.35 + life * 2.2) * (150.0 / -mv.z), 0.0, 400.0);
  }`, `
  uniform sampler2D uTex;
  uniform float uAmt, uSteam, uGlow;
  varying float vLife; varying float vSeed;
  void main(){
    vec4 t = texture2D(uTex, gl_PointCoord);
    vec3 dark = vec3(0.16, 0.15, 0.15) * (0.6 + 0.4 * vSeed);
    vec3 light = vec3(0.93, 0.93, 0.94);
    vec3 col = mix(dark, light, clamp(uSteam + vLife * 0.25, 0.0, 1.0));
    col += vec3(0.55, 0.2, 0.03) * uGlow * (1.0 - vLife) * (1.0 - vLife);
    float a = t.a * uAmt * 0.34 * smoothstep(0.0, 0.1, vLife) * pow(1.0 - vLife, 1.15);
    gl_FragColor = vec4(col, a);
  }`, smokeU, THREE.NormalBlending);
smoke.renderOrder = 10;
fire.renderOrder = 11;
embers.renderOrder = 12;

/* ------------------------------------------------------------
   11. Fire apparatus and water
   ------------------------------------------------------------ */
function makeTruck(x, z, ry) {
  const g = new THREE.Group();
  const red = new THREE.MeshStandardMaterial({ color: 0xb3202a, roughness: 0.35, metalness: 0.25, transparent: true });
  const dark = new THREE.MeshStandardMaterial({ color: 0x23262a, roughness: 0.6, transparent: true });
  const white = new THREE.MeshStandardMaterial({ color: 0xe8e8e6, roughness: 0.4, transparent: true });
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.5, 2.2, 8.2), red); body.position.y = 1.45;
  const cab = new THREE.Mesh(new THREE.BoxGeometry(2.5, 1.5, 2.2), red); cab.position.set(0, 1.1, 4.6);
  const chassis = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.5, 10.4), dark); chassis.position.y = 0.5;
  body.castShadow = Q.shadows;
  g.add(body, cab, chassis);
  g.position.set(x, 0, z); g.rotation.y = ry;
  g.userData.mats = [red, dark, white];
  scene.add(g);
  return { g, white };
}
const truckA = makeTruck(27.5, 6.5, 0);
const truckB = makeTruck(6, -25.5, Math.PI / 2);
const NOZ_A = new THREE.Vector3(19.5, 9.5, 6.0), TGT_A = new THREE.Vector3(-2, 7.4, 1.6);
const NOZ_B = new THREE.Vector3(7.0, 9.5, -17.5), TGT_B = new THREE.Vector3(-1, 7.6, -1.4);
function addLadder(truck, noz) {
  const basePos = truck.g.position.clone().add(new THREE.Vector3(0, 2.7, 0));
  const dir = noz.clone().sub(basePos);
  const len = dir.length();
  const lad = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.35, len), truck.white);
  lad.position.copy(basePos).add(dir.multiplyScalar(0.5));
  lad.lookAt(noz);
  scene.add(lad);
  truck.g.userData.extra = lad;
}
addLadder(truckA, NOZ_A);
addLadder(truckB, NOZ_B);
const trucksAll = [truckA.g, truckB.g, truckA.g.userData.extra, truckB.g.userData.extra];

const waterU = {
  uTime: { value: 0 }, uWater: { value: 0 },
  uN0: { value: NOZ_A }, uT0: { value: TGT_A },
  uN1: { value: NOZ_B }, uT1: { value: TGT_B },
};
const water = makePoints(Q.waterN, (geo, n) => {
  const p = new Float32Array(n * 3), s = new Float32Array(n * 4);
  for (let i = 0; i < n; i++) {
    p.set([0, 0, 0], i * 3);
    s.set([rand(), i % 2, rand(), rand()], i * 4);
  }
  geo.setAttribute('position', new THREE.BufferAttribute(p, 3));
  geo.setAttribute('aSeed', new THREE.BufferAttribute(s, 4));
}, `
  attribute vec4 aSeed;
  uniform float uTime, uWater;
  uniform vec3 uN0, uT0, uN1, uT1;
  varying float vA;
  void main(){
    float sPar = fract(aSeed.x + uTime * 0.55);
    vec3 n = aSeed.y < 0.5 ? uN0 : uN1;
    vec3 t = aSeed.y < 0.5 ? uT0 : uT1;
    vec3 mid = mix(n, t, 0.5) + vec3(0.0, 5.6, 0.0);
    vec3 p = mix(mix(n, mid, sPar), mix(mid, t, sPar), sPar);
    p += (vec3(aSeed.z, aSeed.w, fract(aSeed.z * 7.31)) - 0.5) * (0.25 + sPar * sPar * 2.6);
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = clamp((2.5 + sPar * 8.0) * (170.0 / -mv.z), 0.0, 70.0);
    vA = uWater * (0.5 - sPar * 0.18) * smoothstep(0.0, 0.04, sPar);
  }`, `
  varying float vA;
  void main(){
    float d = length(gl_PointCoord - 0.5);
    if (d > 0.5) discard;
    gl_FragColor = vec4(0.82, 0.9, 1.0, vA * (1.0 - d * 1.9));
  }`, waterU, THREE.AdditiveBlending);
water.renderOrder = 13;

/* ------------------------------------------------------------
   12. Timeline
   ------------------------------------------------------------ */
const C = (h) => new THREE.Color(h);
const envKeys = [
  { p: 0.00, top: C('#69b2e6'), bot: C('#ead9c0'), sun: C('#fff2d6'), sunI: 1.25, hemiI: 0.8, fog: C('#dce6ec'), fogD: 0.0044, amb: 0.12 },
  { p: 0.16, top: C('#6fa8d6'), bot: C('#e3cfb4'), sun: C('#ffe9c4'), sunI: 1.1, hemiI: 0.75, fog: C('#d6dce1'), fogD: 0.0048, amb: 0.12 },
  { p: 0.27, top: C('#2c292b'), bot: C('#544335'), sun: C('#ff9a4d'), sunI: 0.34, hemiI: 0.4, fog: C('#514640'), fogD: 0.013, amb: 0.1 },
  { p: 0.37, top: C('#5d646b'), bot: C('#93989b'), sun: C('#e9e4da'), sunI: 0.5, hemiI: 0.55, fog: C('#8c9296'), fogD: 0.009, amb: 0.12 },
  { p: 0.47, top: C('#6db4e4'), bot: C('#e9d8be'), sun: C('#fff0d0'), sunI: 1.15, hemiI: 0.78, fog: C('#dce6ec'), fogD: 0.0044, amb: 0.12 },
  { p: 0.70, top: C('#5fb0ea'), bot: C('#ecdfca'), sun: C('#fff4dc'), sunI: 1.22, hemiI: 0.8, fog: C('#e0eaf0'), fogD: 0.004, amb: 0.13 },
  { p: 1.00, top: C('#57b0f0'), bot: C('#f0e6d4'), sun: C('#fff6e2'), sunI: 1.3, hemiI: 0.85, fog: C('#e6eef4'), fogD: 0.0036, amb: 0.14 },
];
const envNow = {
  top: new THREE.Color(), bot: new THREE.Color(), sun: new THREE.Color(), fog: new THREE.Color(),
};
function applyEnv(p) {
  let i = 0;
  while (i < envKeys.length - 2 && envKeys[i + 1].p < p) i++;
  const a = envKeys[i], b = envKeys[i + 1];
  const t = smooth(seg(p, a.p, b.p));
  envNow.top.lerpColors(a.top, b.top, t);
  envNow.bot.lerpColors(a.bot, b.bot, t);
  envNow.sun.lerpColors(a.sun, b.sun, t);
  envNow.fog.lerpColors(a.fog, b.fog, t);
  skyUniforms.uTop.value.copy(envNow.top);
  skyUniforms.uBottom.value.copy(envNow.bot);
  sun.color.copy(envNow.sun);
  sun.intensity = lerp(a.sunI, b.sunI, t);
  hemi.intensity = lerp(a.hemiI, b.hemiI, t);
  amb.intensity = lerp(a.amb, b.amb, t);
  scene.fog.color.copy(envNow.fog);
  scene.fog.density = lerp(a.fogD, b.fogD, t);
}

/* camera path */
const camKeys = [
  [0.00, 27, 35, 58, 0, 4, 0],
  [0.08, 16, 27, 44, 0, 5, 0],
  [0.15, 7, 21, 33, 0, 6, 0],
  [0.24, -15, 17, 29, -2, 6.5, 1],
  [0.32, -25, 26, 41, 0, 6, 0],
  [0.40, 19, 29, 45, 2, 5, 0],
  [0.465, 1.5, 22.5, 27.5, 0, 3.4, -1.5],
  [0.535, 1.5, 22.5, 27.5, 0, 3.4, -1.5],
  [0.60, -24, 24, 32, 0, 5, 0],
  [0.67, -30, 24, 18, 0, 5.5, 0],
  [0.74, 18, 19, 34, 2, 6.2, 2],
  [0.82, 17, 26, 42, 0, 5, 0],
  [0.865, 2, 27, 37, 0, 3, 0],
  [0.93, 4, 38, 52, 0, 3, 0],
  [1.00, 8, 52, 68, 0, 2, 0],
];
const camTimes = new Float32Array(camKeys.map(k => k[0]));
const camPosVals = new Float32Array(camKeys.flatMap(k => [k[1], k[2], k[3]]));
const camLookVals = new Float32Array(camKeys.flatMap(k => [k[4], k[5], k[6]]));
const posInterp = new THREE.CubicInterpolant(camTimes, camPosVals, 3, new Float32Array(3));
const lookInterp = new THREE.CubicInterpolant(camTimes, camLookVals, 3, new Float32Array(3));
const camPos = new THREE.Vector3(), camLook = new THREE.Vector3();

/* captions */
const caps = [...document.querySelectorAll('.cap')].map(el => ({
  el, a: parseFloat(el.dataset.in), b: parseFloat(el.dataset.out),
}));

/* DOM refs */
const photoBefore = $('photo-before'), photoAfter = $('photo-after');
const imgBefore = photoBefore.querySelector('img'), imgAfter = photoAfter.querySelector('img');
const finaleEl = $('finale'), hintEl = $('scrollhint'), progressEl = $('progressfill');

$('replay').addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

/* ------------------------------------------------------------
   13. Master update
   ------------------------------------------------------------ */
function update(p, t) {
  /* narrative signals */
  const fireI = bump(p, 0.155, 0.30, 0.335, 0.45);
  const burn = sseg(p, 0.18, 0.44);
  const hole = sseg(p, 0.24, 0.44);
  const smokeAmt = bump(p, 0.16, 0.30, 0.385, 0.475);
  const steam = sseg(p, 0.33, 0.41);
  const waterI = bump(p, 0.325, 0.355, 0.415, 0.455);
  const trucksI = bump(p, 0.30, 0.335, 0.425, 0.472);
  const memT = sseg(p, 0.585, 0.82);
  const memOp = seg(p, 0.578, 0.606);
  const strapI = seg(p, 0.79, 0.835);
  const pb = bump(p, 0.468, 0.483, 0.514, 0.532);
  const pa = sseg(p, 0.878, 0.918);
  const fin = sseg(p, 0.935, 0.978);

  applyEnv(p);

  /* roof burn */
  burnUniforms.uBurn.value = burn;
  burnUniforms.uHole.value = hole;
  burnUniforms.uGlow.value = fireI * 1.25 + Math.max(0, burn - hole) * 0.15;
  burnUniforms.uTime.value = t;
  wallUniforms.uBurn.value = burn;

  /* particles */
  fire.visible = fireI > 0.004;
  fireU.uTime.value = t; fireU.uInt.value = fireI;
  embers.visible = fireI > 0.004;
  emberU.uTime.value = t; emberU.uInt.value = fireI;
  smoke.visible = smokeAmt > 0.004;
  smokeU.uTime.value = t; smokeU.uAmt.value = smokeAmt;
  smokeU.uSteam.value = steam; smokeU.uGlow.value = fireI;
  water.visible = waterI > 0.004;
  waterU.uTime.value = t; waterU.uWater.value = waterI;

  const flick = 0.72 + 0.28 * Math.sin(t * 31) * Math.sin(t * 17.3);
  fireLightA.intensity = fireI * 115 * flick;
  fireLightB.intensity = fireI * 78 * (1.44 - flick);

  /* apparatus */
  const showTrucks = trucksI > 0.004;
  for (const g of trucksAll) g.visible = showTrucks;
  if (showTrucks) {
    for (const m of [...truckA.g.userData.mats, ...truckB.g.userData.mats]) m.opacity = trucksI;
  }

  /* membrane */
  membrane.mesh.visible = memOp > 0.004;
  if (membrane.mesh.visible) {
    membrane.mesh.material.opacity = memOp;
    updateMembrane(memT, t);
  }
  straps.visible = strapI > 0.004;
  if (straps.visible) straps.children.forEach(c => { c.material.opacity = strapI; });

  /* camera */
  if (p >= 0.468 && p <= 0.532) {
    camPos.set(1.5, 22.5, 27.5); camLook.set(0, 3.4, -1.5);
  } else {
    const pv = posInterp.evaluate(p); camPos.set(pv[0], pv[1], pv[2]);
    const lv = lookInterp.evaluate(p); camLook.set(lv[0], lv[1], lv[2]);
  }
  const drift = (1 - Math.max(pb, pa, fin)) * 0.9;
  camPos.x += Math.sin(t * 0.23) * 0.55 * drift;
  camPos.y += Math.sin(t * 0.31) * 0.32 * drift;
  camPos.z += Math.cos(t * 0.19) * 0.5 * drift;
  if (camera.aspect < 1) {
    camPos.sub(camLook).multiplyScalar(1.32).add(camLook);
  }
  camera.position.copy(camPos);
  camera.lookAt(camLook);

  /* palms sway */
  for (const s of palmSway) s.crown.rotation.z = Math.sin(t * 0.9 + s.phase) * 0.045;

  /* photo dissolves */
  photoBefore.style.opacity = pb.toFixed(3);
  imgBefore.style.transform = `scale(${(1.07 - 0.05 * seg(p, 0.468, 0.532)).toFixed(4)})`;
  photoAfter.style.opacity = pa.toFixed(3);
  imgAfter.style.transform = `scale(${(1.14 - 0.14 * seg(p, 0.88, 1)).toFixed(4)})`;

  /* captions */
  for (const c of caps) {
    const inn = seg(p, c.a, c.a + 0.022);
    const out = 1 - seg(p, c.b - 0.018, c.b + 0.004);
    const o = Math.min(inn, out);
    c.el.style.opacity = o.toFixed(3);
    const ty = (1 - inn) * 26 - (1 - out) * 14;
    c.el.style.transform = c.el.classList.contains('cap--center')
      ? `translate(-50%, calc(-46% + ${ty.toFixed(1)}px))`
      : `translateX(-50%) translateY(${ty.toFixed(1)}px)`;
    c.el.style.filter = `blur(${((1 - o) * 5).toFixed(1)}px)`;
  }

  /* finale + hud */
  finaleEl.style.opacity = fin.toFixed(3);
  finaleEl.classList.toggle('is-live', fin > 0.6);
  hintEl.style.opacity = p < 0.02 ? '1' : '0';
  progressEl.style.height = `${(p * 100).toFixed(2)}%`;
}

/* ------------------------------------------------------------
   14. Scroll engine and loop
   ------------------------------------------------------------ */
let target = 0, display = -0.0001, lastT = performance.now(), forceP = null;
window.__exp = {
  setP(v) { forceP = clamp01(v); },
  clear() { forceP = null; },
  bench(p, n = 60) {
    const t0 = performance.now();
    for (let i = 0; i < n; i++) {
      update(p, i / 60);
      renderer.render(scene, camera);
    }
    const gl = renderer.getContext();
    gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4));
    return (performance.now() - t0) / n;
  },
};

function readScroll() {
  const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
  target = clamp01(window.scrollY / max);
}
window.addEventListener('scroll', readScroll, { passive: true });
readScroll();

function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.fov = camera.aspect < 1 ? 60 : 48;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  readScroll();
}
window.addEventListener('resize', onResize);
onResize();

let frames = 0, fpsFrames = 0, fpsT = performance.now();
function loop(now) {
  requestAnimationFrame(loop);
  const dt = Math.min(0.1, (now - lastT) / 1000);
  lastT = now;
  display += (target - display) * (1 - Math.exp(-dt * 3.4));
  if (Math.abs(target - display) < 0.00005) display = target;
  update(forceP !== null ? forceP : clamp01(display), now / 1000);
  renderer.render(scene, camera);
  if (++frames === 3) loaderEl.classList.add('is-done');
  fpsFrames++;
  if (now - fpsT >= 1000) {
    window.__exp.fps = Math.round(fpsFrames * 1000 / (now - fpsT));
    fpsFrames = 0; fpsT = now;
  }
}
requestAnimationFrame(loop);
}

/* safety net: if the module failed silently, the inline timer in the
   HTML reveals the fallback story */
