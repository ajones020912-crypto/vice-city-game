/*
 * Vice City 3D — low-poly supercar body
 * A faceted wedge built by lofting cross-sections along the car, flat shaded.
 * window.VCSupercar.geos(THREE, carType) → { body, gh, trim, head, tail } geometries
 * in car space (y up from the ground, +z forward), matching the game's other car models.
 */
(function () {
  'use strict';
  const cache = new WeakMap();

  // Builds a flat-shaded loft. rings[i] = { z, pts:[[x,y],...] }, every ring has the same point count.
  // Faces are oriented outward from a per-segment centre line; `closed` joins the last point to the first.
  function loft(T, rings, closed, caps, centreY) {
    const pos = [];
    const tri = (a, b, c, ctr) => {
      const ab = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], ac = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
      const n = [ab[1] * ac[2] - ab[2] * ac[1], ab[2] * ac[0] - ab[0] * ac[2], ab[0] * ac[1] - ab[1] * ac[0]];
      const m = [(a[0] + b[0] + c[0]) / 3 - ctr[0], (a[1] + b[1] + c[1]) / 3 - ctr[1], (a[2] + b[2] + c[2]) / 3 - ctr[2]];
      if (n[0] * m[0] + n[1] * m[1] + n[2] * m[2] < 0) pos.push(...a, ...c, ...b); else pos.push(...a, ...b, ...c);
    };
    const P = (r, j) => [r.pts[j][0], r.pts[j][1], r.z];
    for (let i = 0; i < rings.length - 1; i++) {
      const A = rings[i], B = rings[i + 1], n = A.pts.length;
      const ctr = [0, centreY(A, B), (A.z + B.z) / 2];
      for (let j = 0; j < (closed ? n : n - 1); j++) {
        const k = (j + 1) % n;
        tri(P(A, j), P(A, k), P(B, k), ctr); tri(P(A, j), P(B, k), P(B, j), ctr);
      }
    }
    if (caps) for (const [r, dz] of [[rings[0], 1], [rings[rings.length - 1], -1]]) {
      const n = r.pts.length, cy = r.pts.reduce((s, p) => s + p[1], 0) / n, c = [0, cy, r.z];
      for (let j = 0; j < n; j++) tri(c, P(r, j), P(r, (j + 1) % n), [0, cy, r.z - dz]);
    }
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
    const uv = []; for (let i = 0; i < pos.length; i += 3) uv.push(pos[i] * 0.5 + 0.5, pos[i + 2] * 0.22 + 0.5);
    g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
    g.computeVertexNormals();
    return g;
  }

  // Merges boxes (and other geometries) into one non-indexed geometry with a vertex colour per part.
  function parts(T, list) {
    const pos = [], nor = [], col = [];
    for (const [geo, m, c] of list) {
      const g = (geo.index ? geo.toNonIndexed() : geo.clone()).applyMatrix4(m);
      const p = g.attributes.position, n = g.attributes.normal;
      for (let i = 0; i < p.count; i++) { pos.push(p.getX(i), p.getY(i), p.getZ(i)); nor.push(n.getX(i), n.getY(i), n.getZ(i)); col.push(c[0], c[1], c[2]); }
    }
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
    g.setAttribute('normal', new T.Float32BufferAttribute(nor, 3));
    g.setAttribute('color', new T.Float32BufferAttribute(col, 3));
    return g;
  }

  function geos(T, t) {
    if (cache.has(t)) return cache.get(t);
    const L2 = t.L / 2, ax = t.wb / 2;
    // ---- body: [z, half width, bottom y, belt y, deck y, deck half width]
    const st = [
      [L2, 0.6, 0.27, 0.36, 0.42, 0.38],         // nose tip
      [L2 - 0.22, 0.86, 0.22, 0.4, 0.53, 0.52],   // front corners
      [ax + 0.44, 0.95, 0.24, 0.5, 0.62, 0.6],    // ahead of the front arch
      [ax + 0.2, 0.96, 0.52, 0.6, 0.66, 0.62],
      [ax, 0.96, 0.64, 0.68, 0.69, 0.63],         // over the front wheel
      [ax - 0.24, 0.96, 0.5, 0.64, 0.71, 0.64],
      [ax - 0.46, 0.96, 0.24, 0.58, 0.74, 0.66],  // door start
      [0.2, 0.97, 0.24, 0.6, 0.79, 0.7],
      [-0.5, 0.98, 0.24, 0.63, 0.83, 0.72],
      [-ax + 0.46, 0.99, 0.25, 0.66, 0.86, 0.74], // ahead of the rear arch
      [-ax + 0.22, 0.99, 0.52, 0.68, 0.87, 0.75],
      [-ax, 0.99, 0.65, 0.7, 0.88, 0.75],         // over the rear wheel
      [-ax - 0.22, 0.98, 0.52, 0.7, 0.89, 0.74],
      [-ax - 0.44, 0.97, 0.3, 0.68, 0.9, 0.72],   // ducktail
      [-L2, 0.9, 0.36, 0.64, 0.84, 0.62],         // tail
    ];
    const ring = ([z, hw, yb, ybelt, ytop, th]) => {
      const q = [[0, yb], [hw - 0.07, yb], [hw, Math.min(ybelt - 0.03, yb + 0.07)], [hw, ybelt], [hw * 0.92, (ybelt + ytop) / 2], [th, ytop], [0, ytop + 0.012]];
      const pts = q.concat(q.slice(1, -1).reverse().map(([x, y]) => [-x, y]));
      return { z, pts };
    };
    const rings = st.map(ring);
    const body = loft(T, rings, true, true, (A, B) => (A.pts[0][1] + A.pts[6][1] + B.pts[0][1] + B.pts[6][1]) / 4);

    // ---- cabin glass: [z, base half width, base y, roof y, roof half width]
    const cab = [
      [ax - 0.38, 0.8, 0.72, 0.735, 0.5],
      [0.05, 0.76, 0.79, 1.1, 0.5],
      [-0.7, 0.77, 0.83, 1.12, 0.52],
      [-ax + 0.12, 0.8, 0.865, 0.89, 0.56],
    ];
    const cring = ([z, hw, yb, yt, th]) => ({ z, pts: [[hw, yb], [th * 1.05, yt - 0.03], [th * 0.6, yt], [0, yt + 0.008], [-th * 0.6, yt], [-th * 1.05, yt - 0.03], [-hw, yb]] });
    const gh = loft(T, cab.map(cring), false, false, () => 0.7);
    // ---- painted roof panel over the glass
    const rf = [[0.02, 0.5, 1.1], [-0.68, 0.52, 1.12]].map(([z, th, yt]) => ({ z, pts: [[th * 0.85, yt + 0.004], [th * 0.5, yt + 0.012], [0, yt + 0.02], [-th * 0.5, yt + 0.012], [-th * 0.85, yt + 0.004]] }));
    const roof = loft(T, rf, false, false, () => 0.7);

    // ---- dark trim: splitter, nose intakes, side intakes, diffuser, mirrors, sills
    const M = (x, y, z, ry = 0, rz = 0, rx = 0) => new T.Matrix4().compose(new T.Vector3(x, y, z), new T.Quaternion().setFromEuler(new T.Euler(rx, ry, rz)), new T.Vector3(1, 1, 1));
    const dk = [0.05, 0.05, 0.06], mid = [0.12, 0.12, 0.14];
    const B = (w, h, d) => new T.BoxGeometry(w, h, d);
    const trim = parts(T, [
      [B(1.62, 0.05, 0.22), M(0, 0.2, L2 - 0.12), dk],                       // front splitter
      [B(0.42, 0.11, 0.05), M(0.46, 0.31, L2 - 0.2, -0.32), mid],             // nose intakes
      [B(0.42, 0.11, 0.05), M(-0.46, 0.31, L2 - 0.2, 0.32), mid],
      [B(0.5, 0.07, 0.04), M(0, 0.33, L2 + 0.005), mid],                       // centre intake
      [B(0.03, 0.2, 0.5), M(0.975, 0.45, -0.62, 0, 0.12), dk],                // side intakes
      [B(0.03, 0.2, 0.5), M(-0.975, 0.45, -0.62, 0, -0.12), dk],
      [B(1.5, 0.12, 0.08), M(0, 0.36, -L2 - 0.01), dk],                       // diffuser
      [B(0.06, 0.07, 1.4), M(0.95, 0.24, -0.15), dk],                         // sills
      [B(0.06, 0.07, 1.4), M(-0.95, 0.24, -0.15), dk],
      [B(0.17, 0.07, 0.12), M(0.88, 0.86, ax - 0.48, 0.2), mid],              // mirrors
      [B(0.17, 0.07, 0.12), M(-0.88, 0.86, ax - 0.48, -0.2), mid],
      [B(0.02, 0.04, 0.12), M(0.8, 0.85, ax - 0.48), dk],
      [B(0.02, 0.04, 0.12), M(-0.8, 0.85, ax - 0.48), dk],
      [B(1.5, 0.03, 0.12), M(0, 0.875, -L2 + 0.2), dk],                       // ducktail lip
    ]);
    // ---- lights: thin slanted headlight slits and a full-width tail bar
    const head = parts(T, [
      [B(0.4, 0.035, 0.06), M(0.55, 0.46, L2 - 0.13, -0.42, 0.1), [1, 1, 1]],
      [B(0.4, 0.035, 0.06), M(-0.55, 0.46, L2 - 0.13, 0.42, -0.1), [1, 1, 1]],
    ]);
    const tail = parts(T, [
      [B(1.5, 0.035, 0.04), M(0, 0.7, -L2 - 0.005), [1, 1, 1]],
      [B(0.24, 0.06, 0.04), M(0.68, 0.66, -L2 + 0.01, 0.12), [1, 1, 1]],
      [B(0.24, 0.06, 0.04), M(-0.68, 0.66, -L2 + 0.01, -0.12), [1, 1, 1]],
    ]);
    // the roof panel shares the paint, so it lives in the body geometry (resprays repaint both)
    const merged = new T.BufferGeometry();
    for (const a of ['position', 'normal', 'uv']) {
      const x = body.attributes[a].array, y = roof.attributes[a].array, z = new Float32Array(x.length + y.length);
      z.set(x); z.set(y, x.length); merged.setAttribute(a, new T.BufferAttribute(z, body.attributes[a].itemSize));
    }
    merged.computeBoundingSphere();
    const out = { body: merged, gh, trim, head, tail };
    cache.set(t, out);
    return out;
  }

  // Twenty factory colours.
  const COLORS = [
    0x6a2cd8, 0xb33cf0, 0xff3d9a, 0xff4f6e, 0xd81e2c, 0xff7a1a, 0xffb12e, 0xf5e04a, 0x9be22d, 0x2fc464,
    0x1bb5a3, 0x22d3ee, 0x3a8bff, 0x2343c9, 0x13234f, 0xf4f4f1, 0xb9bec6, 0x5a6270, 0x16181c, 0xc9a24a,
  ];

  // The game's paint shader shows colour values as-is (no sRGB decode), which washes them out,
  // so the game gets each colour converted to linear; COLORS keeps the colours as they should look.
  const GAME_COLORS = window.THREE ? COLORS.map((h) => new window.THREE.Color(h).convertSRGBToLinear().getHex()) : COLORS;

  window.VCSupercar = { geos, COLORS, GAME_COLORS };
})();
