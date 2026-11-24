/*
 * Vice City 3D — low-poly SUV body
 * A chunky flat-shaded angular SUV built from procedural lofts and crisp geometric trim.
 * window.VCSportSUV.geos(THREE, carType) -> { body, gh, trim, head, tail } geometries
 * window.VCSportSUV.wheelGeo(THREE, radius) -> low-poly 8-sided wheel with flat octagonal hubcap
 * in car space (y up from the ground, +z forward), matching the game's other car models.
 */
(function () {
  'use strict';
  const cache = new WeakMap();
  const wheelCache = new Map();

  // Builds a flat-shaded non-indexed loft. rings[i] = { z, pts:[[x,y],...] } or 3D pts [[x,y,z],...].
  function loft(T, rings, closed, caps, centreFn) {
    const pos = [];
    const tri = (a, b, c, ctr) => {
      const ab = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
      const ac = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
      const n = [
        ab[1] * ac[2] - ab[2] * ac[1],
        ab[2] * ac[0] - ab[0] * ac[2],
        ab[0] * ac[1] - ab[1] * ac[0],
      ];
      const m = [
        (a[0] + b[0] + c[0]) / 3 - ctr[0],
        (a[1] + b[1] + c[1]) / 3 - ctr[1],
        (a[2] + b[2] + c[2]) / 3 - ctr[2],
      ];
      if (n[0] * m[0] + n[1] * m[1] + n[2] * m[2] < 0) pos.push(...a, ...c, ...b);
      else pos.push(...a, ...b, ...c);
    };
    const P = (r, j) => (r.pts[j].length === 3 ? r.pts[j] : [r.pts[j][0], r.pts[j][1], r.z]);
    for (let i = 0; i < rings.length - 1; i++) {
      const A = rings[i], B = rings[i + 1], n = A.pts.length;
      const ctr = centreFn(A, B);
      for (let j = 0; j < (closed ? n : n - 1); j++) {
        const k = (j + 1) % n;
        tri(P(A, j), P(A, k), P(B, k), ctr);
        tri(P(A, j), P(B, k), P(B, j), ctr);
      }
    }
    if (caps) {
      for (const [r, dz] of [[rings[0], 1], [rings[rings.length - 1], -1]]) {
        const n = r.pts.length;
        let cx = 0, cy = 0, cz = 0;
        for (let j = 0; j < n; j++) {
          const p = P(r, j);
          cx += p[0]; cy += p[1]; cz += p[2];
        }
        cx /= n; cy /= n; cz /= n;
        const c = [cx, cy, cz];
        for (let j = 0; j < n; j++) {
          tri(c, P(r, j), P(r, (j + 1) % n), [cx, cy, cz - dz]);
        }
      }
    }
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
    const uv = [];
    for (let i = 0; i < pos.length; i += 3) uv.push(pos[i] * 0.45 + 0.5, pos[i + 2] * 0.2 + 0.5);
    g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
    g.computeVertexNormals();
    return g;
  }

  // Builds a flat-shaded closed frustum/band between two 3D polygon loops (bottom -> top), optional top cap.
  function band(T, botLoop, topLoop, capTop) {
    const pos = [];
    const n = botLoop.length;
    let cx = 0, cy = 0, cz = 0;
    for (let i = 0; i < n; i++) {
      cx += botLoop[i][0] + topLoop[i][0];
      cy += botLoop[i][1] + topLoop[i][1];
      cz += botLoop[i][2] + topLoop[i][2];
    }
    const ctr = [cx / (2 * n), cy / (2 * n), cz / (2 * n)];
    const tri = (a, b, c, ref) => {
      const ab = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
      const ac = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
      const nv = [
        ab[1] * ac[2] - ab[2] * ac[1],
        ab[2] * ac[0] - ab[0] * ac[2],
        ab[0] * ac[1] - ab[1] * ac[0],
      ];
      const m = [
        (a[0] + b[0] + c[0]) / 3 - ref[0],
        (a[1] + b[1] + c[1]) / 3 - ref[1],
        (a[2] + b[2] + c[2]) / 3 - ref[2],
      ];
      if (nv[0] * m[0] + nv[1] * m[1] + nv[2] * m[2] < 0) pos.push(...a, ...c, ...b);
      else pos.push(...a, ...b, ...c);
    };
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      tri(botLoop[i], botLoop[j], topLoop[j], ctr);
      tri(botLoop[i], topLoop[j], topLoop[i], ctr);
    }
    if (capTop) {
      let tx = 0, ty = 0, tz = 0;
      for (let i = 0; i < n; i++) { tx += topLoop[i][0]; ty += topLoop[i][1]; tz += topLoop[i][2]; }
      const tc = [tx / n, ty / n, tz / n];
      const ref = [tc[0], tc[1] - 1, tc[2]];
      for (let i = 0; i < n; i++) tri(tc, topLoop[i], topLoop[(i + 1) % n], ref);
    }
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
    const uv = [];
    for (let i = 0; i < pos.length; i += 3) uv.push(pos[i] * 0.45 + 0.5, pos[i + 2] * 0.2 + 0.5);
    g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
    g.computeVertexNormals();
    return g;
  }

  // Merges flat-shaded geometries into one non-indexed geometry with vertex colors.
  function parts(T, list) {
    const pos = [], nor = [], col = [];
    for (const [geo, m, c] of list) {
      const g = (geo.index ? geo.toNonIndexed() : geo.clone());
      if (m) g.applyMatrix4(m);
      g.computeVertexNormals();
      const p = g.attributes.position, n = g.attributes.normal;
      for (let i = 0; i < p.count; i++) {
        pos.push(p.getX(i), p.getY(i), p.getZ(i));
        nor.push(n.getX(i), n.getY(i), n.getZ(i));
        col.push(c[0], c[1], c[2]);
      }
      g.dispose();
    }
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
    g.setAttribute('normal', new T.Float32BufferAttribute(nor, 3));
    g.setAttribute('color', new T.Float32BufferAttribute(col, 3));
    return g;
  }

  // Builds a thick extruded angular prism from a 2D [x, z] footprint between y0 and y1 (with optional top taper).
  function prismXZ(T, botXZ, topXZ, y0, y1) {
    const bot = botXZ.map(([x, z]) => [x, y0, z]);
    const top = topXZ.map(([x, z]) => [x, y1, z]);
    const pos = [];
    const n = botXZ.length;
    let cx = 0, cz = 0;
    for (let i = 0; i < n; i++) { cx += botXZ[i][0] + topXZ[i][0]; cz += botXZ[i][1] + topXZ[i][1]; }
    cx /= (2 * n); cz /= (2 * n);
    const mid = [cx, (y0 + y1) / 2, cz];
    const tri = (a, b, c, ref) => {
      const ab = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
      const ac = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
      const nv = [
        ab[1] * ac[2] - ab[2] * ac[1],
        ab[2] * ac[0] - ab[0] * ac[2],
        ab[0] * ac[1] - ab[1] * ac[0],
      ];
      const m = [
        (a[0] + b[0] + c[0]) / 3 - ref[0],
        (a[1] + b[1] + c[1]) / 3 - ref[1],
        (a[2] + b[2] + c[2]) / 3 - ref[2],
      ];
      if (nv[0] * m[0] + nv[1] * m[1] + nv[2] * m[2] < 0) pos.push(...a, ...c, ...b);
      else pos.push(...a, ...b, ...c);
    };
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      tri(bot[i], bot[j], top[j], mid);
      tri(bot[i], top[j], top[i], mid);
      tri([cx, y1, cz], top[i], top[j], [cx, y0, cz]);
      tri([cx, y0, cz], bot[i], bot[j], [cx, y1, cz]);
    }
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
    g.computeVertexNormals();
    return g;
  }

  // Builds a single chunky hexagonal wheel-arch fender flare extruded along X between xIn and xOut.
  function archFlare(T, zc, archW, sillY, archTop, xIn, xOut) {
    const w = archW + 0.02;
    const t = 0.095;
    const inner = [
      [zc + w,        sillY],
      [zc + w * 0.54, archTop],
      [zc - w * 0.54, archTop],
      [zc - w,        sillY],
    ];
    const outer = [
      [zc + w + t,        sillY],
      [zc + w * 0.54 + t * 0.55, archTop + t],
      [zc - w * 0.54 - t * 0.55, archTop + t],
      [zc - w - t,        sillY],
    ];
    const pos = [];
    const pushQuad = (a, b, c, d, ctr) => {
      const tri = (p0, p1, p2) => {
        const ab = [p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]];
        const ac = [p2[0] - p0[0], p2[1] - p0[1], p2[2] - p0[2]];
        const nv = [
          ab[1] * ac[2] - ab[2] * ac[1],
          ab[2] * ac[0] - ab[0] * ac[2],
          ab[0] * ac[1] - ab[1] * ac[0],
        ];
        const m = [
          (p0[0] + p1[0] + p2[0]) / 3 - ctr[0],
          (p0[1] + p1[1] + p2[1]) / 3 - ctr[1],
          (p0[2] + p1[2] + p2[2]) / 3 - ctr[2],
        ];
        if (nv[0] * m[0] + nv[1] * m[1] + nv[2] * m[2] < 0) pos.push(...p0, ...p2, ...p1);
        else pos.push(...p0, ...p1, ...p2);
      };
      tri(a, b, c);
      tri(a, c, d);
    };
    const xm = (xIn + xOut) / 2;
    for (let i = 0; i < 3; i++) {
      const i0 = inner[i], i1 = inner[i + 1], o0 = outer[i], o1 = outer[i + 1];
      const ctr = [xm, (i0[1] + i1[1] + o0[1] + o1[1]) / 4, (i0[0] + i1[0] + o0[0] + o1[0]) / 4];
      const A0 = [xOut, i0[1], i0[0]], A1 = [xOut, i1[1], i1[0]], B1 = [xOut, o1[1], o1[0]], B0 = [xOut, o0[1], o0[0]];
      const C0 = [xIn, i0[1], i0[0]], C1 = [xIn, i1[1], i1[0]], D1 = [xIn, o1[1], o1[0]], D0 = [xIn, o0[1], o0[0]];
      pushQuad(A0, A1, B1, B0, ctr);
      pushQuad(C0, D0, D1, C1, ctr);
      pushQuad(B0, B1, D1, D0, ctr);
      pushQuad(A0, C0, C1, A1, ctr);
      if (i === 0) pushQuad(A0, B0, D0, C0, ctr);
      if (i === 2) pushQuad(A1, C1, D1, B1, ctr);
    }
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
    g.computeVertexNormals();
    return g;
  }

  function geos(T, t) {
    if (cache.has(t)) return cache.get(t);
    const L2 = t.L / 2;
    const hw = t.W / 2;
    const ax = t.wb / 2;
    const wr = t.wr;

    // Proportions cleanly parameterized from carType so any SUV dimensions fit with zero clipping
    const sillY = Math.max(0.34, wr * 0.88);
    const bumpTop = sillY + 0.23; // clean two-tone seam where dark bumpers meet painted body
    const sillTop = sillY + 0.14; // clean two-tone seam where dark side sills meet painted doors
    const archW = wr + 0.12;
    const archMid = wr * 1.78;
    const archTop = wr * 2.16;

    // ---- lower painted body loft: [z, halfWidth, bottomY, beltY, topY, topHalfWidth]
    // Bottom starts right at the top of bumpers/sills so there is ZERO Z-fighting anywhere!
    const st = [
      [L2,                 hw * 0.86, bumpTop, 0.96, 1.04, hw * 0.80], // flat angular nose face
      [L2 - 0.10,          hw * 0.98, bumpTop, 0.99, 1.07, hw * 0.90], // crisp front corner bevel
      [ax + archW,         hw * 0.99, bumpTop, 1.02, 1.10, hw * 0.92], // ahead of front arch
      [ax + archW * 0.54,  hw * 0.99, archMid, 1.04, 1.12, hw * 0.92], // front arch rise
      [ax,                 hw * 0.99, archTop, 1.05, 1.13, hw * 0.92], // over front wheel
      [ax - archW * 0.54,  hw * 0.99, archMid, 1.07, 1.15, hw * 0.93], // front arch fall
      [ax - archW,         hw * 0.99, sillTop, 1.09, 1.17, hw * 0.93], // windshield base / door start
      [-ax + archW,        hw * 0.99, sillTop, 1.14, 1.22, hw * 0.93], // door end / ahead of rear arch
      [-ax + archW * 0.54, hw * 0.99, archMid, 1.15, 1.23, hw * 0.93], // rear arch rise
      [-ax,                hw * 0.99, archTop, 1.16, 1.24, hw * 0.93], // over rear wheel
      [-ax - archW * 0.54, hw * 0.99, archMid, 1.17, 1.24, hw * 0.92], // rear arch fall
      [-ax - archW,        hw * 0.98, bumpTop, 1.17, 1.25, hw * 0.91], // behind rear arch
      [-L2 + 0.08,         hw * 0.96, bumpTop, 1.18, 1.25, hw * 0.88], // rear corner bevel
      [-L2,                hw * 0.89, bumpTop, 1.18, 1.25, hw * 0.82], // flat rear hatch
    ];
    const makeRing = ([z, w, yb, ybelt, ytop, th]) => {
      const yMid = yb + (ybelt - yb) * 0.16;
      const q = [
        [0, yb],
        [w * 0.92, yb],
        [w, yMid],
        [w * 0.99, ybelt],
        [th, ytop],
        [0, ytop + 0.015],
      ];
      const pts = q.concat(q.slice(1, -1).reverse().map(([x, y]) => [-x, y]));
      return { z, pts };
    };
    const rings = st.map(makeRing);
    const bodyLoft = loft(
      T,
      rings,
      true,
      true,
      (A, B) => [0, (A.pts[0][1] + A.pts[5][1] + B.pts[0][1] + B.pts[5][1]) / 4, (A.z + B.z) / 2]
    );

    // ---- wrap-around dark-tinted faceted greenhouse (chunky sporty SUV cabin)
    const zWsBot = ax - archW + 0.14;
    const zWsTop = 0.42;
    const zRrTop = -L2 + 0.54;
    const zRrBot = -L2 + 0.12;
    const yGbF = 1.12, yGbR = 1.21;
    const yRf = 1.72;
    const bwF = hw * 0.89, bwM = hw * 0.92, bwR = hw * 0.86;
    const twF = hw * 0.70, twM = hw * 0.74, twR = hw * 0.69;

    const ghBot = [
      [ bwF * 0.88, yGbF,        zWsBot + 0.03],
      [ bwM,        yGbF + 0.02, zWsBot - 0.10],
      [ bwM,        yGbR,        zRrBot + 0.14],
      [ bwR * 0.88, yGbR,        zRrBot],
      [-bwR * 0.88, yGbR,        zRrBot],
      [-bwM,        yGbR,        zRrBot + 0.14],
      [-bwM,        yGbF + 0.02, zWsBot - 0.10],
      [-bwF * 0.88, yGbF,        zWsBot + 0.03],
    ];
    const ghTop = [
      [ twF * 0.88, yRf,        zWsTop + 0.03],
      [ twM,        yRf,        zWsTop - 0.08],
      [ twM,        yRf - 0.02, zRrTop + 0.10],
      [ twR * 0.88, yRf - 0.02, zRrTop],
      [-twR * 0.88, yRf - 0.02, zRrTop],
      [-twM,        yRf - 0.02, zRrTop + 0.10],
      [-twM,        yRf,        zWsTop - 0.08],
      [-twF * 0.88, yRf,        zWsTop + 0.03],
    ];
    const gh = band(T, ghBot, ghTop, false);

    // ---- flat beveled painted roof cap (merged into body so resprays repaint roof + body)
    const yRoofTop = yRf + 0.065;
    const rfBase = ghTop.map(([x, y, z]) => [x * 1.015, y - 0.005, z]);
    const rfCap = [
      [ twF * 0.78, yRoofTop,         zWsTop - 0.02],
      [ twM * 0.88, yRoofTop,         zWsTop - 0.12],
      [ twM * 0.88, yRoofTop - 0.015, zRrTop + 0.16],
      [ twR * 0.78, yRoofTop - 0.015, zRrTop + 0.06],
      [-twR * 0.78, yRoofTop - 0.015, zRrTop + 0.06],
      [-twM * 0.88, yRoofTop - 0.015, zRrTop + 0.16],
      [-twM * 0.88, yRoofTop,         zWsTop - 0.12],
      [-twF * 0.78, yRoofTop,         zWsTop - 0.02],
    ];
    const roof = band(T, rfBase, rfCap, true);

    const body = new T.BufferGeometry();
    for (const a of ['position', 'normal', 'uv']) {
      const a1 = bodyLoft.attributes[a].array;
      const a2 = roof.attributes[a].array;
      const out = new Float32Array(a1.length + a2.length);
      out.set(a1);
      out.set(a2, a1.length);
      body.setAttribute(a, new T.BufferAttribute(out, bodyLoft.attributes[a].itemSize));
    }
    body.computeBoundingBox();
    body.computeBoundingSphere();
    bodyLoft.dispose();
    roof.dispose();

    // ---- dark-grey geometric trim: bumpers, grille, fender flares, sills, mirrors, roof rails
    const M = (x, y, z, ry = 0, rz = 0, rx = 0) =>
      new T.Matrix4().compose(
        new T.Vector3(x, y, z),
        new T.Quaternion().setFromEuler(new T.Euler(rx, ry, rz)),
        new T.Vector3(1, 1, 1)
      );
    const B = (w, h, d) => new T.BoxGeometry(w, h, d);
    const dk = [0.065, 0.07, 0.08];    // deep recessed grille / taillight surround / wheel well / underbody
    const mid = [0.16, 0.17, 0.19];    // charcoal bumpers / wheel-arch flares / sills / rails / mirrors

    // Faceted angled front bumper block cleanly underneath painted nose (zero Z-fighting)
    const fbBot = [
      [ hw * 0.85, L2 + 0.01],
      [ hw * 0.99, L2 - 0.11],
      [ hw * 1.00, ax + archW + 0.04],
      [-hw * 1.00, ax + archW + 0.04],
      [-hw * 0.99, L2 - 0.11],
      [-hw * 0.85, L2 + 0.01],
    ];
    const fbTop = [
      [ hw * 0.88, L2 + 0.03],
      [ hw * 1.01, L2 - 0.10],
      [ hw * 1.01, ax + archW + 0.04],
      [-hw * 1.01, ax + archW + 0.04],
      [-hw * 1.01, L2 - 0.10],
      [-hw * 0.88, L2 + 0.03],
    ];
    const frontBumper = prismXZ(T, fbBot, fbTop, sillY - 0.01, bumpTop + 0.012);

    // Faceted angled rear bumper block cleanly underneath rear hatch (zero Z-fighting)
    const rbBot = [
      [ hw * 0.88, -L2 - 0.01],
      [ hw * 0.98, -L2 + 0.09],
      [ hw * 0.99, -ax - archW - 0.04],
      [-hw * 0.99, -ax - archW - 0.04],
      [-hw * 0.98, -L2 + 0.09],
      [-hw * 0.88, -L2 - 0.01],
    ];
    const rbTop = [
      [ hw * 0.91, -L2 - 0.03],
      [ hw * 1.00, -L2 + 0.08],
      [ hw * 1.00, -ax - archW - 0.04],
      [-hw * 1.00, -ax - archW - 0.04],
      [-hw * 1.00, -L2 + 0.08],
      [-hw * 0.91, -L2 - 0.03],
    ];
    const rearBumper = prismXZ(T, rbBot, rbTop, sillY + 0.01, bumpTop + 0.02);

    // Clean flat horizontal front grille bar sitting proud of the nose face
    const grPoly = [
      [ hw * 0.82, L2 + 0.022],
      [ hw * 0.88, L2 - 0.035],
      [ hw * 0.78, L2 - 0.10],
      [-hw * 0.78, L2 - 0.10],
      [-hw * 0.88, L2 - 0.035],
      [-hw * 0.82, L2 + 0.022],
    ];
    const grilleBar = prismXZ(T, grPoly, grPoly, 0.835, 0.935);

    const trimList = [
      [frontBumper, null, mid],
      [rearBumper, null, mid],
      [grilleBar, null, dk],
      // Solid dark underbody floor pan between the wheels
      [B((hw - 0.36) * 2, 0.15, t.L - 0.50), M(0, sillY + 0.07, 0), dk],
      // Full-width recessed dark rear taillight bezel sitting cleanly proud of rear hatch
      [B(t.W * 0.85, 0.12, 0.036), M(0, 1.07, -L2 - 0.014), dk],
    ];

    // 4 chunky angular dark wheel-arch fender flares + wheel-well inner walls + sills + roof rails + mirrors
    const sillLen = Math.max(0.4, (ax - archW) * 2 + 0.04);
    for (const sx of [1, -1]) {
      const xIn = sx * (hw - 0.05);
      const xOut = sx * (hw + 0.042);
      for (const sz of [1, -1]) {
        trimList.push([archFlare(T, sz * ax, archW, sillY, archTop, xIn, xOut), null, mid]);
        trimList.push([B(0.06, archTop - sillY + 0.05, archW * 1.85), M(sx * (hw - 0.36), (sillY + archTop) / 2, sz * ax), dk]);
      }
      // Clean dark lower side sill tucked neatly under the painted door (zero Z-fighting)
      trimList.push([B(0.11, sillTop - sillY + 0.015, sillLen), M(sx * (hw - 0.02), (sillY + sillTop) / 2, 0), mid]);

      // Sleek low-profile dark-grey roof rails integrated tightly onto the painted roof
      const railZ0 = zWsTop - 0.10, railZ1 = zRrTop + 0.14;
      const railLen = railZ0 - railZ1, railZc = (railZ0 + railZ1) / 2;
      const railX = sx * hw * 0.56;
      trimList.push([B(0.055, 0.038, railLen), M(railX, yRoofTop + 0.032, railZc), mid]);
      trimList.push([B(0.055, 0.045, 0.10), M(railX, yRoofTop + 0.012, railZ0 - 0.03, 0, 0, -0.35), mid]);
      trimList.push([B(0.055, 0.045, 0.10), M(railX, yRoofTop + 0.012, railZ1 + 0.03, 0, 0, 0.35), mid]);

      // Tiny boxy dark-grey wing mirrors mounted at the windshield base corner
      trimList.push([B(0.15, 0.105, 0.125), M(sx * (hw + 0.035), 1.18, zWsBot - 0.12, sx * 0.12), mid]);
      trimList.push([B(0.08, 0.042, 0.055), M(sx * (hw - 0.04), 1.16, zWsBot - 0.12), dk]);
    }

    const trim = parts(T, trimList);

    // ---- glowing white front LED headlight bars flush-framing the outer ends of the front grille bar
    const head = parts(T, [
      [B(0.36, 0.078, 0.034), M( hw * 0.68, 0.885, L2 + 0.020, -0.12), [1, 1, 1]],
      [B(0.36, 0.078, 0.034), M(-hw * 0.68, 0.885, L2 + 0.020,  0.12), [1, 1, 1]],
    ]);

    // ---- crisp full-width glowing red rear LED taillight bar proud of the dark surround
    const tail = parts(T, [
      [B(t.W * 0.80, 0.072, 0.032), M(0, 1.07, -L2 - 0.024), [1, 1, 1]],
    ]);

    const out = { body, gh, trim, head, tail };
    cache.set(t, out);
    return out;
  }

  // Chunky 8-sided low-poly wheel with solid flat light-grey octagonal hubcap.
  // Octagonal flats + subtle center cap & 4 tiny radial recesses make wheel spin unmistakably clear.
  function wheelGeo(T, r) {
    const key = Number(r).toFixed(3);
    if (wheelCache.has(key)) return wheelCache.get(key);
    const rotZ = new T.Matrix4().makeRotationZ(Math.PI / 2);
    const tire = new T.CylinderGeometry(r, r, 0.28, 8);
    const hub = new T.CylinderGeometry(r * 0.58, r * 0.58, 0.30, 8);
    const cap = new T.CylinderGeometry(r * 0.13, r * 0.13, 0.312, 8);
    const list = [
      [tire, rotZ, [0.06, 0.065, 0.075]],
      [hub, rotZ, [0.72, 0.74, 0.78]],
      [cap, rotZ, [0.48, 0.50, 0.54]],
    ];
    const lugR = r * 0.33;
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + Math.PI / 8;
      const m = new T.Matrix4().makeTranslation(0.153, Math.cos(a) * lugR, Math.sin(a) * lugR);
      list.push([new T.BoxGeometry(0.010, r * 0.07, r * 0.07), m, [0.46, 0.48, 0.52]]);
    }
    const g = parts(T, list);
    g.computeBoundingBox();
    g.computeBoundingSphere();
    wheelCache.set(key, g);
    return g;
  }

  // Vice City SUV palette starting with the approved electric cyan-teal.
  const COLORS = [
    0x25c9d6, // electric cyan-teal (concept hero color)
    0x16181c, // obsidian black
    0xf4f4f1, // pearl white
    0xff4f6e, // sunset coral
    0x1a3566, // midnight navy
    0xb9bec6, // coastal silver
    0x6a2cd8, // vice violet
    0x2fc464, // palm emerald
  ];

  // Linear colors for the game's paint shader (same convention as VCSupercar).
  const GAME_COLORS = window.THREE
    ? COLORS.map((h) => new window.THREE.Color(h).convertSRGBToLinear().getHex())
    : COLORS;

  window.VCSportSUV = { geos, wheelGeo, COLORS, GAME_COLORS };
})();
