/*
 * Vice City 3D — character designs.
 * Builds stylized low-poly characters on the game's existing human rig
 * (hips / spine / headP, arms A[i].sh / A[i].el, legs Lg[i].hp / Lg[i].kn),
 * so the game's walk, run, aim and punch animations drive them unchanged.
 *
 * window.VCCharacters = { build(THREE, designOrId, overrides?), DESIGNS }
 */
(function () {
  'use strict';

  // ---------------------------------------------------------------- designs
  const DESIGNS = {
    jason: {
      name: 'Jason', role: 'Lead',
      skin: 0xc98e68, hair: 0x1d1410, hairStyle: 'fade', beard: true,
      top: { kind: 'tee', color: 0xf3f1ec },
      jacket: { kind: 'bomber', color: 0x4b5a3a, trim: 0x1f1f1f },
      legs: { kind: 'jeans', color: 0x283a58 },
      shoes: { color: 0xf2f2f2, sole: 0xd9d9d9 },
      extras: ['chain', 'watch'],
    },
    lucia: {
      name: 'Lucia', role: 'Lead',
      skin: 0xb9784e, hair: 0x1a0f0a, hairStyle: 'ponytail', build: 'slim',
      top: { kind: 'tank', color: 0x1c1c22 },
      jacket: { kind: 'cropjacket', color: 0xff6f5e, trim: 0xffb3a7 },
      legs: { kind: 'jeans', color: 0x8fb3d9, highWaist: true },
      shoes: { color: 0xfafafa, sole: 0xff6f5e, chunky: true },
      extras: ['hoops', 'shades'],
    },
    jasonB: {
      name: 'Jason', role: 'Lead · option B',
      skin: 0xc48a63, hair: 0x2a1a10, hairStyle: 'messy', beard: true,
      top: { kind: 'tank', color: 0x8e9096 },
      jacket: { kind: 'campshirt', color: 0x2f7f86, trim: 0xe9d9a6, print: 0xe9d9a6 },
      legs: { kind: 'cargoshorts', color: 0x6b6a4a },
      shoes: { kind: 'boots', color: 0x5a4330, sole: 0x2a2018 },
      extras: ['watch'],
    },
    luciaB: {
      name: 'Lucia', role: 'Lead · option B', build: 'slim',
      skin: 0xb07650, hair: 0x140c08, hairStyle: 'lowbun',
      top: { kind: 'tank', color: 0xd9a52b },
      jacket: { kind: 'denim', color: 0x6f93c2, trim: 0x52739e },
      legs: { kind: 'bikeshorts', color: 0x1d1d22 },
      shoes: { kind: 'hightops', color: 0xf4f4f4, sole: 0xe6e6e6 },
      extras: ['hoops', 'shades'],
    },
    jasonC: {
      name: 'Jason', role: 'Lead · option C',
      skin: 0xc98e68, hair: 0x1d1410, hairStyle: 'buzz',
      top: { kind: 'tank', color: 0xf2f1ec },
      legs: { kind: 'trousers', color: 0xb39b6e },
      shoes: { kind: 'boots', color: 0x5a4330, sole: 0x2a2018 },
      extras: ['watch'],
    },
    luciaC: {
      name: 'Lucia', role: 'Lead · option C', build: 'slim',
      skin: 0xb9784e, hair: 0x4a2c1a, hairStyle: 'longdown',
      top: { kind: 'tank', color: 0x3c3e44 },
      legs: { kind: 'jeans', color: 0x1f2228, highWaist: true },
      shoes: { color: 0xf6f6f6, sole: 0xe2e2e2, accent: 0x3c3e44 },
      extras: ['hoops', 'bracelets', 'ring', 'necklace'], female: true,
    },
    officer: {
      name: 'Officer', role: 'Police',
      skin: 0xe0ac69, hair: 0x3b2314, hairStyle: 'short',
      top: { kind: 'uniform', color: 0x1f3557 },
      legs: { kind: 'trousers', color: 0x141c2c },
      shoes: { color: 0x0f0f10, sole: 0x0f0f10 },
      extras: ['policecap', 'badge', 'dutybelt', 'radio', 'shades'], 
    },
    harbor: {
      name: 'Harbor King', role: 'Gang',
      skin: 0x8d5524, hair: 0x120c08, hairStyle: 'buzz',
      top: { kind: 'hoodie', color: 0x5b2a9e, trim: 0x3d1c6b },
      legs: { kind: 'cargo', color: 0x2b2b30 },
      shoes: { color: 0x1c1c1c, sole: 0xf0f0f0 },
      extras: ['bandana', 'backcap', 'chain'],
    },
    tourist: {
      name: 'Beach Tourist', role: 'Pedestrian',
      skin: 0xf1c6a0, hair: 0x7a4f27, hairStyle: 'short',
      top: { kind: 'aloha', color: 0x2ab3c9, print: 0xffd34d },
      legs: { kind: 'shorts', color: 0xd9cba8 },
      shoes: { kind: 'sandals', color: 0x7a4f27, sole: 0x5a3a1c },
      extras: ['buckethat', 'camera'],
    },
    office: {
      name: 'Office Worker', role: 'Pedestrian',
      skin: 0x5c3a21, hair: 0x101010, hairStyle: 'curly', build: 'slim',
      top: { kind: 'shirt', color: 0xeef3f8 },
      jacket: { kind: 'blazer', color: 0x3f4650, trim: 0x2e333b },
      legs: { kind: 'trousers', color: 0x3f4650 },
      shoes: { color: 0x2a1a10, sole: 0x1a1008 },
      extras: ['tie', 'briefcase'],
    },
    jogger: {
      name: 'Jogger', role: 'Pedestrian',
      skin: 0xe8b98f, hair: 0xd8b45a, hairStyle: 'bun', build: 'slim',
      top: { kind: 'tank', color: 0x5dd39e },
      legs: { kind: 'runshorts', color: 0x24262b },
      shoes: { color: 0xff5a7a, sole: 0xffffff },
      extras: ['headband', 'earbuds'], female: true,
    },
    fisherman: {
      name: 'Old Fisherman', role: 'Pedestrian',
      skin: 0xd9a37e, hair: 0xd6d6d6, hairStyle: 'bald', beard: true, beardColor: 0xe6e6e6, build: 'stocky',
      top: { kind: 'polo', color: 0x7da4c7 },
      jacket: { kind: 'vest', color: 0x6b7a4a, trim: 0x4f5a36 },
      legs: { kind: 'trousers', color: 0x8a7a62 },
      shoes: { kind: 'boots', color: 0x4b3a2a, sole: 0x2a2018 },
      extras: ['fishcap', 'rod'],
    },
  };

  // ---------------------------------------------------------------- builder
  function build(T, design, over) {
    const d = Object.assign({}, typeof design === 'string' ? DESIGNS[design] : design, over || {});
    const B = d.build || 'regular';
    const W = B === 'slim' ? 0.9 : B === 'stocky' ? 1.12 : 1;      // width factor
    const mat = (color, rough = 0.82, extra = {}) => new T.MeshStandardMaterial(Object.assign({ color, roughness: rough, metalness: 0, flatShading: true }, extra));
    const m = {
      skin: mat(d.skin, 0.7), hair: mat(d.hair, 0.75), shoe: mat(d.shoes.color, 0.6),
      shirt: mat(d.top.color, 0.88), pants: mat(d.legs.color, 0.9),
      sole: mat(d.shoes.sole, 0.9), dark: mat(0x15171b, 0.5), white: mat(0xf5f2ea, 0.4),
      metal: mat(0xd9b65c, 0.35, { metalness: 0.6 }), steel: mat(0x9aa2ab, 0.35, { metalness: 0.6 }),
      jacket: d.jacket ? mat(d.jacket.color, 0.85) : null, trim: mat((d.jacket && d.jacket.trim) || (d.top.trim) || 0x222222, 0.85),
    };
    const root = new T.Group();
    const add = (parent, geo, material, x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1) => {
      const me = new T.Mesh(geo, material); me.position.set(x, y, z); me.scale.set(sx, sy, sz); me.castShadow = true; parent.add(me); return me;
    };
    // geometry helpers (all low-poly, flat shaded)
    const limb = (rTop, rBot, len, seg = 7) => { const g = new T.CylinderGeometry(rTop, rBot, len, seg); g.translate(0, -len / 2, 0); return g; };
    const ball = (r, w = 8, h = 6, ...part) => new T.SphereGeometry(r, w, h, ...part);
    const box = (x, y, z) => new T.BoxGeometry(x, y, z);

    // ---- skeleton (same names & offsets as the game's makeHuman)
    const hips = new T.Group(); hips.position.y = 0.93; root.add(hips);
    const spine = new T.Group(); spine.position.y = 0.08; hips.add(spine);
    const headP = new T.Group(); headP.position.y = 0.6; spine.add(headP);

    // ---- pelvis + torso
    const pelvisMat = d.legs.highWaist ? m.pants : m.pants;
    add(hips, new T.CylinderGeometry(0.17 * W, 0.16 * W, 0.2, 8), pelvisMat, 0, 0, 0, 1, 1, 0.68);
    const torsoGeo = new T.CylinderGeometry(0.205 * W, 0.165 * W, 0.5, 8); torsoGeo.translate(0, 0.27, 0);
    const torsoMat = d.top.kind === 'crop' ? m.skin : m.shirt;
    add(spine, torsoGeo, torsoMat, 0, 0, 0, 1, 1, 0.66);
    if (d.top.kind === 'crop') { // cropped top over bare midriff
      const g = new T.CylinderGeometry(0.212 * W, 0.19 * W, 0.26, 8); g.translate(0, 0.4, 0); add(spine, g, m.shirt, 0, 0, 0, 1, 1, 0.68);
    }
    if (d.top.kind === 'tank') {
      for (const sx of [-1, 1]) add(spine, box(0.06, 0.12, 0.02), m.shirt, sx * 0.1 * W, 0.5, 0.07);
    }
    // chest shaping
    add(spine, ball(0.17 * W, 8, 5), torsoMat, 0, 0.4, 0.015, 1.05, 0.62, 0.62);
    // aloha print dots / polo collar / shirt collar
    if (d.top.kind === 'aloha') {
      const pm = mat(d.top.print, 0.8);
      const spots = [[-0.09, 0.42], [0.1, 0.33], [-0.05, 0.2], [0.07, 0.5], [0.12, 0.13], [-0.13, 0.32], [0.0, 0.1], [-0.1, 0.07]];
      for (const [x, y] of spots) add(spine, ball(0.026, 6, 4), pm, x * W, y, 0.135, 1, 1, 0.3);
      for (const [x, y] of spots.slice(0, 5)) add(spine, ball(0.024, 6, 4), pm, x * W, y + 0.05, -0.135, 1, 1, 0.3);
    }
    if (d.top.kind === 'polo' || d.top.kind === 'shirt' || d.top.kind === 'uniform' || d.top.kind === 'aloha') {
      for (const sx of [-1, 1]) { const c = add(spine, box(0.09, 0.045, 0.06), d.top.kind === 'aloha' ? m.shirt : m.shirt, sx * 0.055, 0.55, 0.075); c.rotation.z = sx * 0.5; }
    }
    if (d.top.kind === 'uniform') { // button placket + pocket flaps
      add(spine, box(0.02, 0.42, 0.012), m.trim, 0, 0.3, 0.138);
      for (const sx of [-1, 1]) add(spine, box(0.085, 0.022, 0.014), m.trim, sx * 0.09, 0.44, 0.13);
    }
    if (d.top.kind === 'hoodie') {
      const hood = add(spine, ball(0.15, 8, 6), m.shirt, 0, 0.55, -0.09, 1.15, 0.8, 0.9);
      hood.rotation.x = -0.2;
      add(spine, box(0.2, 0.09, 0.03), m.trim, 0, 0.17, 0.13); // front pocket
      for (const sx of [-1, 1]) add(spine, limb(0.006, 0.006, 0.12, 4), m.white, sx * 0.03, 0.55, 0.13);
    }

    // ---- jackets (open layers over the top)
    if (d.jacket) {
      const k = d.jacket.kind, J = m.jacket, len = k === 'cropjacket' ? 0.3 : k === 'vest' ? 0.42 : k === 'denim' ? 0.56 : 0.5, y0 = 0.55 - len, JW = k === 'denim' ? 1.1 : 1;
      // shell wraps around the back; the opening is centred on the front (theta 0 = +z in three.js)
      const gap = (k === 'campshirt' || k === 'denim') ? 0.3 : k === 'vest' ? 0.22 : 0.14;
      const back = new T.CylinderGeometry(0.218 * W * JW, (k === 'blazer' ? 0.19 : 0.182) * W * JW, len, 10, 1, true, Math.PI * gap, Math.PI * (2 - 2 * gap));
      back.translate(0, y0 + len / 2, 0); add(spine, back, J, 0, 0, 0, 1, 1, 0.7);
      for (const sx of [-1, 1]) { // front panels leave a gap that shows the top
        const open = k === 'campshirt' || k === 'denim', pw = open ? 0.085 : 0.11, px = open ? 0.145 : 0.12;
        const p = add(spine, box(pw * W * JW, len, 0.03), J, sx * px * W * JW, y0 + len / 2, 0.118 * JW);
        p.rotation.y = sx * -0.35;
      }
      if (k === 'bomber') { add(spine, new T.TorusGeometry(0.19 * W, 0.025, 4, 10), m.trim, 0, 0.06, 0, 1, 0.4, 0.66).rotation.x = Math.PI / 2; add(spine, new T.TorusGeometry(0.11, 0.03, 4, 10), m.trim, 0, 0.56, 0, 1, 1, 0.8).rotation.x = Math.PI / 2; }
      if (k === 'blazer') for (const sx of [-1, 1]) { const l = add(spine, box(0.05, 0.2, 0.02), J, sx * 0.07, 0.45, 0.14); l.rotation.z = sx * 0.35; }
      if (k === 'vest') for (const sx of [-1, 1]) for (const y of [0.22, 0.36]) add(spine, box(0.07, 0.06, 0.03), m.trim, sx * 0.13 * W, y, 0.13);
      if (k === 'campshirt') {
        const pm = mat(d.jacket.print, 0.85);
        for (const [x, y] of [[-0.15, 0.42], [0.14, 0.3], [-0.12, 0.16], [0.16, 0.47], [0.12, 0.12], [-0.17, 0.3]]) { const leaf = add(spine, box(0.05, 0.015, 0.006), pm, x * W, y, 0.135); leaf.rotation.z = (x * 31) % 1.2; }
        for (const sx of [-1, 1]) { const c = add(spine, box(0.1, 0.05, 0.03), J, sx * 0.07, 0.54, 0.09); c.rotation.z = sx * 0.6; }
      }
      if (k === 'denim') {
        for (const sx of [-1, 1]) { add(spine, box(0.07, 0.06, 0.015), m.trim, sx * 0.13 * W, 0.4, 0.14); const c = add(spine, box(0.11, 0.05, 0.04), J, sx * 0.075, 0.55, 0.1); c.rotation.z = sx * 0.55; }
        add(spine, box(0.42 * W, 0.04, 0.27), m.trim, 0, 0.07, 0, 1, 1, 0.7);
      }
      if (k === 'cropjacket') add(spine, new T.TorusGeometry(0.11, 0.03, 4, 10), mat(d.jacket.trim, 0.9), 0, 0.56, 0, 1, 1, 0.8).rotation.x = Math.PI / 2;
    }
    if (d.extras.includes('tie')) { add(spine, box(0.045, 0.24, 0.014), mat(0xb43b4b, 0.7), 0, 0.38, 0.138); add(spine, box(0.05, 0.04, 0.02), mat(0xb43b4b, 0.7), 0, 0.51, 0.135); }

    // ---- neck + head
    add(spine, limb(0.052, 0.058, 0.1, 6), m.skin, 0, 0.66, 0);
    const head = add(headP, d.detail ? ball(0.118, 16, 12) : ball(0.118, 10, 8), m.skin, 0, 0.165, 0.005, 0.93, 1.08, 1.0);
    add(headP, ball(0.1, 8, 5), m.skin, 0, 0.1, 0.022, 0.85, 0.6, 0.9); // jaw
    for (const sx of [-1, 1]) add(headP, ball(0.026, 5, 4), m.skin, sx * 0.112, 0.16, -0.004, 0.5, 1, 0.8); // ears
    const nose = add(headP, new T.ConeGeometry(0.018, 0.045, 4), m.skin, 0, 0.152, 0.118); nose.rotation.x = Math.PI / 2;
    for (const sx of [-1, 1]) {
      add(headP, ball(0.019, 6, 4), m.white, sx * 0.042, 0.182, 0.098, 1, 0.75, 0.5);
      add(headP, ball(0.011, 5, 4), m.dark, sx * 0.042, 0.181, 0.106, 1, 1, 0.5);
      const brow = add(headP, box(0.042, 0.011, 0.012), m.hair, sx * 0.044, 0.212, 0.104); brow.rotation.z = sx * -0.12;
    }
    add(headP, box(0.05, 0.009, 0.01), mat(0x7a3b32, 0.6), 0, 0.104, 0.108); // mouth
    if (d.beard) {
      const bm = mat(d.beardColor || d.hair, 0.9);
      add(headP, ball(0.1, 8, 5), bm, 0, 0.09, 0.03, 0.86, 0.55, 0.88);
      add(headP, box(0.05, 0.012, 0.012), bm, 0, 0.122, 0.112); // moustache
    }
    // hair styles
    const hs = d.hairStyle;
    const scalp = (sy = 1, lift = 0.17) => add(headP, ball(0.126, 10, 6, 0, Math.PI * 2, 0, Math.PI * 0.52), m.hair, 0, lift, -0.008, 0.97, sy, 1.04);
    if (hs === 'fade') { scalp(1.0, 0.17); add(headP, ball(0.08, 6, 4), m.hair, 0.01, 0.285, 0.04, 1.2, 0.45, 1.0); }
    if (hs === 'short') { scalp(1.02, 0.17); add(headP, box(0.17, 0.04, 0.05), m.hair, 0, 0.26, 0.085); }
    if (hs === 'buzz') { add(headP, ball(0.126, 10, 7, 0, Math.PI * 2, 0, Math.PI * 0.42), m.hair, 0, 0.165, -0.01, 0.97, 1.12, 1.03); add(headP, ball(0.122, 10, 6, 0, Math.PI * 2, Math.PI * 0.4, Math.PI * 0.22), m.hair, 0, 0.165, -0.025, 0.98, 1.1, 0.98); }
    if (hs === 'curly') { scalp(1.0, 0.17); for (let i = 0; i < 11; i++) { const a = (i / 11) * Math.PI * 2; add(headP, new T.IcosahedronGeometry(0.045, 0), m.hair, Math.cos(a) * 0.095, 0.27 + (i % 2) * 0.02, Math.sin(a) * 0.09); } add(headP, new T.IcosahedronGeometry(0.06, 0), m.hair, 0, 0.3, 0); }
    if (hs === 'ponytail') {
      scalp(1.02, 0.17);
      add(headP, ball(0.06, 6, 4), m.hair, 0, 0.29, -0.07, 1, 0.7, 1); // tie point
      const tail = add(headP, limb(0.04, 0.018, 0.3, 6), m.hair, 0, 0.28, -0.12); tail.rotation.x = 0.45;
      add(headP, box(0.2, 0.05, 0.05), m.hair, 0, 0.255, 0.075).rotation.z = 0.08; // side-swept fringe
    }
    if (hs === 'messy') { scalp(1.03, 0.17); for (const [x, y, z, r] of [[-0.06, 0.29, 0.05, 0.05], [0.05, 0.3, 0.04, 0.055], [0.0, 0.31, -0.03, 0.06], [0.08, 0.27, -0.02, 0.045], [-0.08, 0.27, -0.04, 0.045], [0.02, 0.27, 0.09, 0.045]]) add(headP, new T.IcosahedronGeometry(r, 0), m.hair, x, y, z); }
    if (hs === 'lowbun') { scalp(1.02, 0.17); add(headP, ball(0.058, 7, 5), m.hair, 0, 0.13, -0.135); add(headP, box(0.2, 0.04, 0.05), m.hair, 0, 0.262, 0.07).rotation.z = -0.06; }
    if (hs === 'longdown') {
      add(headP, ball(0.128, 10, 7, 0, Math.PI * 2, 0, Math.PI * 0.56), m.hair, 0, 0.16, -0.008, 0.98, 1.12, 1.05); // crown
      add(headP, ball(0.13, 8, 7), m.hair, 0, 0.03, -0.075, 0.95, 1.55, 0.5);            // length falling down the back
      add(headP, ball(0.1, 8, 6), m.hair, 0, -0.14, -0.07, 1.15, 0.6, 0.5);              // ends resting on the shoulders
      for (const sx of [-1, 1]) add(headP, ball(0.05, 6, 6), m.hair, sx * 0.105, 0.06, 0.01, 0.7, 2.6, 0.9); // strands framing the face
      const fr = add(headP, ball(0.08, 8, 5), m.hair, 0.025, 0.245, 0.07, 1.25, 0.35, 0.8); fr.rotation.z = -0.15; // side-parted fringe
    }
    if (hs === 'bun') { scalp(1.0, 0.17); add(headP, ball(0.055, 7, 5), m.hair, 0, 0.32, -0.04); }
    if (hs === 'bald') { for (const sx of [-1, 1]) add(headP, ball(0.06, 6, 4), m.hair, sx * 0.09, 0.17, -0.04, 0.6, 0.9, 1.1); }

    // head accessories
    const ex = d.extras;
    if (ex.includes('shades')) { for (const sx of [-1, 1]) add(headP, box(0.05, 0.03, 0.01), m.dark, sx * 0.043, 0.182, 0.118); add(headP, box(0.13, 0.008, 0.008), m.dark, 0, 0.19, 0.118); }
    if (ex.includes('hoops')) for (const sx of [-1, 1]) add(headP, new T.TorusGeometry(0.022, 0.004, 4, 10), m.metal, sx * 0.118, 0.125, 0.0).rotation.y = Math.PI / 2;
    if (ex.includes('earbuds')) for (const sx of [-1, 1]) add(headP, ball(0.012, 5, 4), m.white, sx * 0.118, 0.16, 0.01);
    if (ex.includes('headband')) add(headP, new T.TorusGeometry(0.118, 0.016, 4, 14), mat(0xff5a7a, 0.8), 0, 0.235, 0.004, 0.96, 1, 1.02).rotation.x = Math.PI / 2;
    if (ex.includes('policecap')) {
      const pc = mat(0x16213a, 0.7);
      add(headP, new T.CylinderGeometry(0.135, 0.125, 0.08, 10), pc, 0, 0.29, -0.005);
      add(headP, box(0.16, 0.012, 0.08), m.dark, 0, 0.255, 0.1).rotation.x = 0.15;
      add(headP, box(0.035, 0.035, 0.01), m.metal, 0, 0.3, 0.13);
    }
    if (ex.includes('backcap')) { const c = mat(0x111111, 0.8); add(headP, new T.CylinderGeometry(0.128, 0.132, 0.07, 9), c, 0, 0.265, 0); add(headP, box(0.15, 0.012, 0.09), c, 0, 0.24, -0.12); }
    if (ex.includes('buckethat')) { const c = mat(0xf2e6c8, 0.9); add(headP, new T.CylinderGeometry(0.11, 0.13, 0.09, 9), c, 0, 0.29, 0); add(headP, new T.CylinderGeometry(0.19, 0.19, 0.012, 12), c, 0, 0.25, 0); }
    if (ex.includes('fishcap')) { const c = mat(0xeeeeee, 0.85); add(headP, new T.CylinderGeometry(0.126, 0.132, 0.07, 9), c, 0, 0.265, 0); add(headP, box(0.16, 0.012, 0.1), mat(0x2a5d8f, 0.8), 0, 0.24, 0.11); }
    if (ex.includes('bandana')) { const b = mat(0x7d3fd6, 0.85); add(headP, ball(0.105, 8, 5, 0, Math.PI * 2, Math.PI * 0.5, Math.PI * 0.35), b, 0, 0.165, 0.012, 0.98, 1.05, 1.05); add(headP, new T.ConeGeometry(0.06, 0.09, 4), b, 0, 0.04, 0.07).rotation.x = Math.PI; }

    // ---- neck / chest accessories
    if (ex.includes('chain')) add(spine, new T.TorusGeometry(0.075, 0.009, 4, 14), m.metal, 0, 0.55, 0.06, 1, 1.3, 1).rotation.x = 1.25;
    if (ex.includes('badge')) add(spine, box(0.05, 0.06, 0.012), m.metal, -0.1, 0.43, 0.135);
    if (ex.includes('radio')) add(spine, box(0.04, 0.07, 0.03), m.dark, 0.14, 0.52, 0.06);
    if (ex.includes('camera')) { add(spine, box(0.1, 0.07, 0.05), m.dark, 0.04, 0.28, 0.16); add(spine, limb(0.022, 0.022, 0.04, 8), m.steel, 0.04, 0.29, 0.19).rotation.x = Math.PI / 2; const strap = add(spine, box(0.012, 0.36, 0.01), m.dark, -0.04, 0.45, 0.14); strap.rotation.z = 0.5; }

    // ---- arms
    const sleeve = { tee: 'short', crop: 'short', tank: 'none', aloha: 'short', polo: 'short', shirt: 'long', uniform: 'short', hoodie: 'long' }[d.top.kind] || 'short';
    const jacketSleeves = d.jacket && d.jacket.kind !== 'vest' && d.jacket.kind !== 'campshirt';
    const campSleeves = d.jacket && d.jacket.kind === 'campshirt';
    const baggy = d.jacket && d.jacket.kind === 'denim' ? 1.18 : 1;
    const A = [];
    for (const sx of [-1, 1]) {
      const sh = new T.Group(); sh.position.set(sx * 0.255 * W, 0.52, 0); spine.add(sh);
      add(sh, ball(0.07 * W * baggy, 6, 5), jacketSleeves || campSleeves ? m.jacket : sleeve === 'none' ? m.skin : m.shirt, 0, -0.01, 0); // shoulder cap
      const upperMat = jacketSleeves ? m.jacket : sleeve === 'none' ? m.skin : m.shirt;
      add(sh, limb(0.062 * W * baggy, 0.052 * W * baggy, 0.29), (sleeve === 'short' || sleeve === 'none' || campSleeves) && !jacketSleeves ? m.skin : upperMat);
      if (campSleeves) add(sh, limb(0.078 * W, 0.074 * W, 0.17), m.jacket);
      if (sleeve === 'short' && !jacketSleeves) add(sh, limb(0.07 * W, 0.064 * W, 0.15), m.shirt);
      const el = new T.Group(); el.position.y = -0.29; sh.add(el);
      const longSleeve = jacketSleeves || sleeve === 'long';
      add(el, limb(0.05 * W * baggy, 0.042 * W * baggy, 0.26), longSleeve ? (jacketSleeves ? m.jacket : m.shirt) : m.skin);
      if (baggy > 1) { add(el, limb(0.062, 0.062, 0.07), m.trim, 0, -0.14, 0); add(el, limb(0.041, 0.038, 0.12), m.skin, 0, -0.17, 0); }
      if (d.jacket && d.jacket.kind === 'bomber') add(el, limb(0.048, 0.048, 0.04), m.trim, 0, -0.22, 0);
      add(el, ball(0.05, 6, 5), m.skin, 0, -0.3, 0.005, 0.85, 1.1, 0.75); // hand
      if (sx > 0 && ex.includes('watch')) add(el, limb(0.047, 0.047, 0.03, 8), m.metal, 0, -0.235, 0);
      A.push({ sh, el });
    }
    // carried items (left hand)
    const leftHand = A[0].el;
    if (ex.includes('briefcase')) { add(leftHand, box(0.08, 0.26, 0.34), mat(0x4a2c18, 0.6), 0, -0.47, 0.02); add(leftHand, box(0.02, 0.05, 0.08), m.steel, 0, -0.33, 0.02); }
    if (ex.includes('rod')) { const r = add(leftHand, limb(0.008, 0.004, 1.6, 5), mat(0x3a2a1a, 0.6), 0, -0.3, 0.02); r.rotation.x = -2.6; }

    // ---- legs
    const lk = d.legs.kind, shortsK = lk === 'shorts' || lk === 'runshorts' || lk === 'cargoshorts' || lk === 'bikeshorts';
    const Lg = [];
    for (const sx of [-1, 1]) {
      const hp = new T.Group(); hp.position.set(sx * 0.1 * W, -0.08, 0); hips.add(hp);
      const thighR = (lk === 'cargo' ? 0.098 : 0.088) * W;
      if (shortsK) {
        const sl = { runshorts: 0.17, bikeshorts: 0.27, cargoshorts: 0.36 }[lk] || 0.25, sr = lk === 'bikeshorts' ? -0.004 : lk === 'cargoshorts' ? 0.014 : 0.008;
        add(hp, limb(thighR + sr, thighR - 0.004 + sr, sl), m.pants);
        if (lk === 'cargoshorts') add(hp, box(0.04, 0.09, 0.1), m.pants, sx * 0.1, -0.24, 0.0);
        add(hp, limb(thighR - 0.01, 0.068, 0.43), m.skin);
      } else add(hp, limb(thighR, 0.072 * W, 0.43), m.pants);
      if (lk === 'cargo') add(hp, box(0.035, 0.1, 0.09), m.pants, sx * 0.09, -0.25, 0.01);
      const kn = new T.Group(); kn.position.y = -0.43; hp.add(kn);
      const shin = add(kn, limb(0.07 * W, 0.055 * W, 0.42), shortsK ? m.skin : m.pants);
      if (lk === 'jeans' && !d.legs.highWaist) add(kn, limb(0.06, 0.062, 0.05), m.pants, 0, -0.37, 0);
      // feet
      const s = d.shoes, boots = s.kind === 'boots', sandals = s.kind === 'sandals', chunky = s.chunky;
      if (sandals) { add(kn, box(0.1, 0.02, 0.24), m.sole, 0, -0.47, 0.045); add(kn, ball(0.05, 6, 4), m.skin, 0, -0.44, 0.06, 1, 0.5, 2); add(kn, box(0.1, 0.015, 0.03), m.shoe, 0, -0.44, 0.08); }
      else {
        if (boots) add(kn, limb(0.062, 0.064, 0.12), m.shoe, 0, -0.33, 0);
        if (s.kind === 'hightops') { add(kn, limb(0.06, 0.063, 0.11), m.shoe, 0, -0.34, 0); add(kn, limb(0.064, 0.064, 0.015), mat(0xd23c4a, 0.7), 0, -0.34, 0); }
        add(kn, ball(0.062, 7, 5), m.shoe, 0, -0.435, 0.05, 0.95, chunky ? 0.75 : 0.6, 2.0);
        add(kn, box(0.115, chunky ? 0.04 : 0.025, 0.25), m.sole, 0, chunky ? -0.47 : -0.465, 0.05);
      }
      Lg.push({ hp, kn, shin });
    }
    // belts
    if (ex.includes('dutybelt')) { add(hips, new T.CylinderGeometry(0.18, 0.18, 0.05, 10), m.dark, 0, 0.06, 0, 1, 1, 0.7); add(hips, box(0.06, 0.1, 0.06), m.dark, 0.17, 0.0, 0.02); add(hips, box(0.04, 0.04, 0.02), m.metal, 0, 0.06, 0.125); }
    else if (!shortsK && d.top.kind !== 'hoodie' && d.top.kind !== 'tank') add(hips, new T.CylinderGeometry(0.172 * W, 0.172 * W, 0.03, 10), mat(0x2a1d14, 0.7), 0, 0.075, 0, 1, 1, 0.69);

    // ---- weapon mount in right hand (same as the game rig)
    const gun = new T.Group(); gun.position.set(0, -0.3, 0); A[1].el.add(gun);
    const gm = mat(0x1b1d22, 0.4, { metalness: 0.6 });
    const mk = (parts) => { const g = new T.Group(); for (const [w, h, dd, y, z] of parts) { const me = new T.Mesh(box(w, h, dd), gm); me.position.set(0, y, z || 0); g.add(me); } g.visible = false; gun.add(g); return g; };
    const guns = {
      pistol: mk([[0.04, 0.2, 0.06, -0.1], [0.04, 0.06, 0.1, -0.02, 0.05]]),
      smg: mk([[0.05, 0.4, 0.07, -0.18], [0.04, 0.12, 0.05, -0.07, 0.09]]),
      shot: mk([[0.05, 0.7, 0.06, -0.3], [0.06, 0.25, 0.08, 0.05]]),
      rifle: mk([[0.05, 0.85, 0.07, -0.36], [0.04, 0.16, 0.06, -0.18, 0.1], [0.06, 0.22, 0.09, 0.08]]),
    };

    if (d.detail) detailPass();
    function detailPass() {
      const shade = (hex, f) => { const c = new T.Color(hex); c.multiplyScalar(f); return c.getHex(); };
      const skinDark = mat(shade(d.skin, 0.78), 0.75), lip = mat(shade(d.skin, 0.68) | 0x200808, 0.55), iris = mat(0x4a2f1c, 0.4);
      const female = d.build === 'slim';
      // ---- face
      for (const sx of [-1, 1]) {
        add(headP, ball(0.03, 6, 5), m.skin, sx * 0.062, 0.148, 0.074, 1, 0.5, 0.35);          // cheekbones
        add(headP, ball(0.0085, 6, 5), iris, sx * 0.042, 0.181, 0.104, 1, 1, 0.5);              // iris
        add(headP, box(0.044, 0.01, 0.014), skinDark, sx * 0.042, 0.194, 0.101);               // upper eyelid
        add(headP, ball(0.014, 5, 4), skinDark, sx * 0.118, 0.16, 0.004, 0.3, 0.7, 0.5);        // inner ear
        add(headP, ball(0.006, 4, 3), skinDark, sx * 0.01, 0.137, 0.116);                      // nostril
        if (female) add(headP, box(0.012, 0.016, 0.004), m.dark, sx * 0.064, 0.188, 0.099).rotation.z = sx * -0.6; // lashes
      }
      add(headP, box(0.018, 0.045, 0.016), m.skin, 0, 0.165, 0.108);                           // nose bridge
      add(headP, ball(0.015, 6, 5), m.skin, 0, 0.143, 0.115);                                   // nose tip
      add(headP, ball(0.036, 7, 5), m.skin, 0, 0.075, 0.064, 1, 0.75, 0.8);                     // chin
      add(headP, box(0.052, 0.011, 0.012), lip, 0, 0.11, 0.111);                                // upper lip
      add(headP, box(0.046, 0.013, 0.012), lip, 0, 0.099, 0.109);                               // lower lip
      if (!female) { // short stubble shadow along the jaw and upper lip
        const stub = new T.MeshStandardMaterial({ color: d.hair, roughness: 1, transparent: true, opacity: 0.35, flatShading: true });
        add(headP, ball(0.102, 10, 6, 0, Math.PI * 2, Math.PI * 0.45, Math.PI * 0.4), stub, 0, 0.12, 0.022, 0.88, 0.75, 0.9);
        for (const sx of [-1, 1]) add(headP, box(0.046, 0.016, 0.014), m.hair, sx * 0.044, 0.214, 0.104).rotation.z = sx * -0.1; // heavier brows
      }
      // ---- hair detail
      if (d.hairStyle === 'buzz') add(headP, ball(0.122, 12, 6, 0, Math.PI * 2, Math.PI * 0.42, Math.PI * 0.09), mat(shade(d.hair, 1.6), 0.95), 0, 0.165, -0.022, 0.97, 1.08, 1.0); // faded sides (lighter, shorter)
      if (d.hairStyle === 'longdown') {
        const h2 = mat(shade(d.hair, 1.18), 0.75);
        for (const [x, z, sy, r] of [[-0.06, -0.09, 1.6, -0.1], [0.06, -0.09, 1.5, 0.1], [0, -0.11, 1.7, 0]]) { const c = add(headP, ball(0.07, 7, 6), x ? h2 : m.hair, x, -0.02, z, 1, sy, 0.55); c.rotation.z = r; }
        for (const sx of [-1, 1]) { const w = add(headP, ball(0.045, 6, 5), h2, sx * 0.1, -0.12, -0.02, 0.9, 1.3, 0.9); w.rotation.z = sx * 0.4; } // soft waves on the shoulders
      }
      // ---- neck, shoulders, collarbones (visible with tank tops)
      if (d.top.kind === 'tank') {
        add(spine, new T.CylinderGeometry(0.168 * W, 0.168 * W, 0.025, 10), mat(shade(d.top.color, 0.85), 0.9), 0, 0.03, 0, 1, 1, 0.67); // hem
        if (female) for (let i = -3; i <= 3; i++) add(spine, box(0.004, 0.34, 0.004), mat(shade(d.top.color, 0.8), 0.9), i * 0.035, 0.24, 0.137); // ribbing
      }
      // ---- arms: muscle, elbows, hands with fingers
      for (const { sh, el } of A) {
        add(sh, ball(0.05, 7, 5), m.skin, 0, -0.13, 0.025, 1, 1.4, 0.9);   // biceps
        add(sh, ball(0.046, 6, 5), m.skin, 0, -0.14, -0.02, 1, 1.3, 0.8);  // triceps
        add(el, ball(0.045, 6, 5), m.skin, 0, -0.01, -0.01);               // elbow
        add(el, ball(0.044, 6, 5), m.skin, 0, -0.08, 0.008, 1, 1.5, 0.9);   // forearm muscle
        add(el, box(0.07, 0.075, 0.032), m.skin, 0, -0.305, 0.004);        // palm
        const f = add(el, box(0.066, 0.065, 0.026), m.skin, 0, -0.365, 0.012); f.rotation.x = 0.35; // fingers
        for (let i = 0; i < 3; i++) add(el, box(0.002, 0.05, 0.028), skinDark, -0.017 + i * 0.017, -0.37, 0.013);
        const th = add(el, box(0.022, 0.05, 0.022), m.skin, 0, -0.31, 0.04); th.rotation.x = 0.5; // thumb
      }
      // ---- trousers: waistband, belt loops, pockets, seams, hems
      if (!['shorts', 'runshorts', 'cargoshorts', 'bikeshorts'].includes(d.legs.kind)) {
        const seam = mat(shade(d.legs.color, d.legs.kind === 'jeans' ? 1.6 : 0.8), 0.9), band = mat(shade(d.legs.color, 0.8), 0.9);
        add(hips, new T.CylinderGeometry(0.172 * W, 0.172 * W, 0.045, 12), band, 0, 0.08, 0, 1, 1, 0.69);
        for (const a of [-1.2, -0.45, 0.45, 1.2, Math.PI]) add(hips, box(0.012, 0.05, 0.01), band, Math.sin(a) * 0.17 * W, 0.08, Math.cos(a) * 0.118 * W);
        if (!female) { add(hips, new T.CylinderGeometry(0.174 * W, 0.174 * W, 0.028, 12), mat(0x3b2a1c, 0.6), 0, 0.08, 0, 1, 1, 0.7); add(hips, box(0.045, 0.035, 0.012), m.steel, 0, 0.08, 0.123); }
        add(hips, box(0.006, 0.12, 0.006), seam, 0, -0.02, 0.118);                                   // fly
        for (const sx of [-1, 1]) {
          const fp = add(hips, box(0.06, 0.006, 0.006), seam, sx * 0.1, 0.02, 0.11); fp.rotation.z = sx * 0.7;   // front pocket opening
          add(hips, box(0.075, 0.08, 0.012), band, sx * 0.075, -0.02, -0.112);                                   // back pocket
        }
        Lg.forEach(({ hp, kn }, i) => {
          const sx = i ? 1 : -1;
          add(hp, box(0.005, 0.42, 0.005), seam, sx * 0.083, -0.21, 0);   // outer side seam
          add(kn, box(0.005, 0.4, 0.005), seam, sx * 0.064, -0.2, 0);
          if (d.legs.kind === 'trousers') add(hp, box(0.004, 0.4, 0.004), mat(shade(d.legs.color, 1.15), 0.9), 0, -0.21, 0.083); // pressed crease
          add(kn, limb(0.06, 0.062, 0.04, 9), band, 0, -0.36, 0);         // hem
        });
      }
      // ---- shoes: laces, toe cap, layered sole
      Lg.forEach(({ kn }) => {
        const boots = d.shoes.kind === 'boots';
        for (let i = 0; i < (boots ? 4 : 3); i++) add(kn, box(0.05, 0.006, 0.01), boots ? mat(0xc9a66b, 0.8) : m.white, 0, -0.405 + i * (boots ? 0.03 : 0.012) - (boots ? 0.05 : 0), 0.08 - i * 0.012);
        add(kn, ball(0.05, 7, 5), mat(shade(d.shoes.color, boots ? 0.8 : 0.95), 0.6), 0, -0.45, 0.15, 1.1, 0.6, 0.8);   // toe cap
        add(kn, box(0.118, 0.012, 0.255), mat(shade(d.shoes.sole, 0.75), 0.9), 0, -0.482, 0.05);                         // outsole
        if (boots) { add(kn, box(0.1, 0.035, 0.07), m.sole, 0, -0.47, -0.04); add(kn, box(0.03, 0.04, 0.01), m.shoe, 0, -0.29, -0.06); } // heel + pull tab
        else add(kn, box(0.122, 0.018, 0.12), mat(d.shoes.accent || 0x888888, 0.7), 0, -0.45, -0.01);                        // side panel
      });
      // ---- jewellery & watch
      const ex2 = d.extras;
      if (ex2.includes('watch')) { add(A[1].el, box(0.03, 0.03, 0.012), m.dark, 0, -0.235, 0.048); add(A[1].el, box(0.022, 0.022, 0.004), m.white, 0, -0.235, 0.055); }
      if (ex2.includes('bracelets')) for (const y of [-0.23, -0.245]) add(A[0].el, new T.TorusGeometry(0.044, 0.004, 4, 12), m.metal, 0, y, 0).rotation.x = Math.PI / 2;
      if (ex2.includes('ring')) add(A[0].el, new T.TorusGeometry(0.009, 0.003, 4, 8), m.metal, 0.015, -0.37, 0.03);
      if (ex2.includes('necklace')) { add(spine, new T.TorusGeometry(0.058, 0.0025, 4, 18), m.metal, 0, 0.585, 0.045, 1, 1.4, 1).rotation.x = 1.25; add(spine, ball(0.008, 5, 4), m.metal, 0, 0.535, 0.135); }
    }
    root.traverse((n) => { if (n.isMesh) { n.castShadow = true; n.receiveShadow = true; } });
    root.userData = { hips, spine, headP, A, Lg, m, gun, guns, ph: Math.random() * 6, dead: 0, state: {}, design: d.name };
    if (d.merge) mergeRig(T, root);
    return root;
  }

  // ---------------------------------------------------------------- draw-call merging
  // Merges the static meshes under each rig joint into one mesh per material,
  // so a character costs a few dozen draw calls instead of hundreds. Weapons stay separate.
  function mergeRig(T, root) {
    const skip = new Set();
    for (const g of Object.values(root.userData.guns || {})) g.traverse((n) => skip.add(n));
    if (root.userData.gun) skip.add(root.userData.gun);
    const groups = [];
    root.traverse((n) => { if (!n.isMesh && !skip.has(n)) groups.push(n); });
    for (const g of groups) {
      const byMat = new Map();
      for (const c of g.children) if (c.isMesh && !c.children.length && !skip.has(c) && !Array.isArray(c.material)) {
        if (!byMat.has(c.material)) byMat.set(c.material, []);
        byMat.get(c.material).push(c);
      }
      for (const [material, list] of byMat) {
        if (list.length < 2) continue;
        const pos = [], nor = [], idx = []; let base = 0;
        for (const c of list) {
          c.updateMatrix();
          const geo = c.geometry.clone().applyMatrix4(c.matrix);
          const p = geo.attributes.position, nn = geo.attributes.normal;
          for (let i = 0; i < p.count; i++) { pos.push(p.getX(i), p.getY(i), p.getZ(i)); if (nn) nor.push(nn.getX(i), nn.getY(i), nn.getZ(i)); else nor.push(0, 1, 0); }
          if (geo.index) for (let i = 0; i < geo.index.count; i++) idx.push(geo.index.getX(i) + base);
          else for (let i = 0; i < p.count; i++) idx.push(i + base);
          base += p.count; geo.dispose(); g.remove(c);
        }
        const merged = new T.BufferGeometry();
        merged.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
        merged.setAttribute('normal', new T.Float32BufferAttribute(nor, 3));
        merged.setIndex(base > 65535 ? new T.Uint32BufferAttribute(idx, 1) : new T.Uint16BufferAttribute(idx, 1));
        merged.computeBoundingSphere();
        const me = new T.Mesh(merged, material); me.castShadow = true; me.receiveShadow = true; g.add(me);
      }
    }
    return root;
  }

  window.VCCharacters = { build, DESIGNS };
})();
