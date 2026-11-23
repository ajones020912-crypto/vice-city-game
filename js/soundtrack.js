/*
 * Vice City 3D — original soundtrack.
 * Every track is composed here and synthesized live with the Web Audio API,
 * so there are no audio files to download or host.
 *
 * In the game this file picks music automatically (title screen, cruising,
 * night, bayou, police chase, Coastal Clash) and plays stings for WASTED / BUSTED.
 * Press N in game to turn the score on or off.
 *
 * It also exposes window.VCSoundtrack = { Engine, TRACKS, STINGS, renderOffline }
 * for a standalone listening page.
 */
(function () {
  'use strict';

  // ---------------------------------------------------------------- music helpers
  const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
  const PC = { C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11 };
  const N = (s) => { const m = /^([A-G][#b]?)(-?\d)$/.exec(s); return (Number(m[2]) + 1) * 12 + PC[m[1]]; };
  const Q = { maj: [0, 4, 7], min: [0, 3, 7], maj7: [0, 4, 7, 11], m7: [0, 3, 7, 10], dom7: [0, 4, 7, 10] };
  const chord = (root, q, bass) => ({ notes: Q[q].map((i) => root + i), bass });
  // melody line: [bar, step, note, lengthInSteps, glideFromNote?]
  const line = (rows) => rows.map(([b, s, n, d, g]) => ({ b, s, n: N(n), d, g: g ? N(g) : null }));
  const notesAt = (mel, bar, st) => mel.filter((x) => x.b === bar && x.s === st);

  function impulse(ctx, seconds, decay) {
    const len = Math.floor(ctx.sampleRate * seconds), buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
    return buf;
  }
  function noiseBuffer(ctx) {
    const len = ctx.sampleRate * 2, buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }

  // ---------------------------------------------------------------- engine
  class Engine {
    constructor(ctx) {
      this.ctx = ctx;
      this.out = ctx.createGain(); this.out.gain.value = 0.75;
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -16; comp.knee.value = 12; comp.ratio.value = 3.5; comp.attack.value = 0.005; comp.release.value = 0.22;
      this.master = ctx.createGain(); this.master.gain.value = 0.62;
      this.master.connect(comp); comp.connect(this.out); this.out.connect(ctx.destination);
      this.analyser = ctx.createAnalyser(); this.analyser.fftSize = 1024; this.out.connect(this.analyser);
      // shared reverb
      this.verbIn = ctx.createGain();
      const verb = ctx.createConvolver(); verb.buffer = impulse(ctx, 2.6, 2.4);
      const verbOut = ctx.createGain(); verbOut.gain.value = 0.34;
      this.verbIn.connect(verb); verb.connect(verbOut); verbOut.connect(this.master);
      // shared tempo delay
      this.dlyIn = ctx.createGain();
      this.dly = ctx.createDelay(2); this.dly.delayTime.value = 0.3;
      const fb = ctx.createGain(); fb.gain.value = 0.34;
      const tone = ctx.createBiquadFilter(); tone.type = 'lowpass'; tone.frequency.value = 2600;
      const dlyOut = ctx.createGain(); dlyOut.gain.value = 0.3;
      this.dlyIn.connect(this.dly); this.dly.connect(tone); tone.connect(fb); fb.connect(this.dly); tone.connect(dlyOut);
      if (ctx.createStereoPanner) { const dp = ctx.createStereoPanner(); dp.pan.value = 0.45; dlyOut.connect(dp); dp.connect(this.master); } else dlyOut.connect(this.master);
      this.noise = noiseBuffer(ctx);
      this.bus = null; this.track = null; this.timer = null; this.intensity = 0.5;
    }

    // route a voice: dry into the current track bus, plus reverb/delay sends
    route(node, verb = 0, dly = 0, pan = 0) {
      let dry = node;
      if (pan && this.ctx.createStereoPanner) { const p = this.ctx.createStereoPanner(); p.pan.value = pan; node.connect(p); dry = p; }
      dry.connect(this.bus || this.master);
      if (verb) { const g = this.ctx.createGain(); g.gain.value = verb; node.connect(g); g.connect(this.verbIn); }
      if (dly) { const g = this.ctx.createGain(); g.gain.value = dly; node.connect(g); g.connect(this.dlyIn); }
    }
    vca(t, peak, attack, hold, release) {
      const g = this.ctx.createGain(); const p = g.gain;
      p.setValueAtTime(0.0001, t); p.exponentialRampToValueAtTime(Math.max(peak, 0.0002), t + attack);
      p.setValueAtTime(Math.max(peak, 0.0002), t + attack + hold); p.exponentialRampToValueAtTime(0.0001, t + attack + hold + release);
      return g;
    }
    osc(type, f, t, stop) { const o = this.ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(f, t); o.start(t); o.stop(stop); return o; }
    noiseSrc(t, dur) { const s = this.ctx.createBufferSource(); s.buffer = this.noise; s.start(t, Math.random() * 1.5, dur + 0.05); return s; }
    filt(type, f, q = 0.8) { const b = this.ctx.createBiquadFilter(); b.type = type; b.frequency.value = f; b.Q.value = q; return b; }

    // ---- drums
    kick(t, v = 1) {
      const o = this.osc('sine', 150, t, t + 0.5); o.frequency.exponentialRampToValueAtTime(42, t + 0.13);
      const g = this.vca(t, 0.95 * v, 0.002, 0.02, 0.38); o.connect(g); this.route(g);
      const n = this.noiseSrc(t, 0.02), f = this.filt('highpass', 2500), ng = this.vca(t, 0.12 * v, 0.001, 0, 0.015); n.connect(f); f.connect(ng); this.route(ng);
    }
    snare(t, v = 1, verb = 0.25) {
      const n = this.noiseSrc(t, 0.25), f = this.filt('bandpass', 1900, 0.7), g = this.vca(t, 0.45 * v, 0.001, 0.01, 0.17); n.connect(f); f.connect(g); this.route(g, verb);
      const o = this.osc('triangle', 190, t, t + 0.2), og = this.vca(t, 0.28 * v, 0.001, 0, 0.09); o.connect(og); this.route(og);
    }
    clap(t, v = 1) {
      const n = this.noiseSrc(t, 0.3), f = this.filt('bandpass', 1250, 1.1), g = this.ctx.createGain(), p = g.gain;
      p.setValueAtTime(0.0001, t);
      for (const k of [0, 0.011, 0.023]) { p.setValueAtTime(0.42 * v, t + k); p.exponentialRampToValueAtTime(0.05 * v, t + k + 0.009); }
      p.setValueAtTime(0.38 * v, t + 0.03); p.exponentialRampToValueAtTime(0.0001, t + 0.24);
      n.connect(f); f.connect(g); this.route(g, 0.3);
    }
    hat(t, v = 0.25, open = false) {
      const n = this.noiseSrc(t, open ? 0.35 : 0.06), f = this.filt('highpass', 7600), g = this.vca(t, v * 0.5, 0.001, 0, open ? 0.26 : 0.04);
      n.connect(f); f.connect(g); this.route(g, 0, 0, 0.3);
    }
    shaker(t, v = 0.2) {
      const n = this.noiseSrc(t, 0.08), f = this.filt('bandpass', 5200, 1.4), g = this.vca(t, v * 0.5, 0.012, 0, 0.05); n.connect(f); f.connect(g); this.route(g, 0, 0, -0.35);
    }
    brush(t, v = 0.4) {
      const n = this.noiseSrc(t, 0.3), f = this.filt('bandpass', 2800, 0.5), g = this.vca(t, v * 0.3, 0.03, 0.02, 0.18); n.connect(f); f.connect(g); this.route(g, 0.3);
    }
    tom(t, m, v = 0.6) {
      const o = this.osc('sine', mtof(m) * 1.7, t, t + 0.5); o.frequency.exponentialRampToValueAtTime(mtof(m), t + 0.12);
      const g = this.vca(t, 0.6 * v, 0.002, 0.03, 0.3); o.connect(g); this.route(g, 0.25, 0, (m % 5) / 5 - 0.4);
    }
    crash(t, v = 0.5) {
      const n = this.noiseSrc(t, 1.6), f = this.filt('highpass', 4800), g = this.vca(t, 0.22 * v, 0.002, 0.05, 1.4); n.connect(f); f.connect(g); this.route(g, 0.4);
    }
    riser(t, dur, v = 0.4) {
      const n = this.noiseSrc(t, dur), f = this.filt('bandpass', 300, 2); f.frequency.setValueAtTime(300, t); f.frequency.exponentialRampToValueAtTime(7000, t + dur);
      const g = this.ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.3 * v, t + dur); g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.05);
      n.connect(f); f.connect(g); this.route(g, 0.4);
    }
    // ---- tonal voices
    bass(t, m, dur, v = 0.5, o = {}) {
      const type = o.type || 'saw', end = t + dur + 0.12;
      const g = this.vca(t, 0.5 * v, 0.004, Math.max(0, dur - 0.03), 0.08);
      const f = this.filt('lowpass', o.cut || 600, o.q || 4);
      if (type !== 'sub') { f.frequency.setValueAtTime((o.cut || 600) * (o.env || 3.5), t); f.frequency.exponentialRampToValueAtTime(o.cut || 600, t + 0.16); }
      if (type === 'reese') {
        for (const det of [-12, 12]) { const a = this.osc('sawtooth', mtof(m), t, end); a.detune.value = det; a.connect(f); }
      } else {
        const a = this.osc(type === 'sub' ? 'sine' : type === 'square' ? 'square' : type === 'tri' ? 'triangle' : 'sawtooth', mtof(m), t, end); a.connect(f);
        if (type !== 'sub') { const s = this.osc('sine', mtof(m - 12), t, end), sg = this.ctx.createGain(); sg.gain.value = 0.6; s.connect(sg); sg.connect(g); }
      }
      f.connect(g); this.route(g);
    }
    pad(t, notes, dur, v = 0.1, o = {}) {
      const att = o.att ?? 0.35, rel = o.rel ?? 0.9, end = t + dur + rel + 0.05;
      for (const [det, pan] of [[-8, -0.6], [8, 0.6]]) {
        const f = this.filt('lowpass', o.cut || 1400, 0.4), g = this.vca(t, v, att, Math.max(0, dur - att), rel);
        for (const n of notes) { const a = this.osc('sawtooth', mtof(n), t, end); a.detune.value = det; a.connect(f); }
        f.connect(g); this.route(g, o.verb ?? 0.55, 0, pan);
      }
    }
    pluck(t, m, v = 0.12, o = {}) {
      const a = this.osc(o.type || 'sawtooth', mtof(m), t, t + 0.6), f = this.filt('lowpass', 3600, 2);
      f.frequency.setValueAtTime(o.bright || 3600, t); f.frequency.exponentialRampToValueAtTime(420, t + (o.decay || 0.22));
      const g = this.vca(t, v, 0.003, 0, o.decay || 0.28); a.connect(f); f.connect(g); this.route(g, o.verb ?? 0.2, o.dly ?? 0.35, o.pan ?? ((m % 2) ? 0.35 : -0.35));
    }
    stab(t, notes, v = 0.12, o = {}) {
      const f = this.filt('lowpass', 900, 1.5); f.frequency.setValueAtTime(o.bright || 3200, t); f.frequency.exponentialRampToValueAtTime(700, t + 0.18);
      const g = this.vca(t, v, 0.004, 0.05, o.decay || 0.22);
      for (const n of notes) for (const det of [-6, 6]) { const a = this.osc('sawtooth', mtof(n), t, t + 0.5); a.detune.value = det; a.connect(f); }
      f.connect(g); this.route(g, 0.3, o.dly ?? 0.15, o.pan ?? -0.2);
    }
    lead(t, m, dur, v = 0.12, o = {}) {
      const end = t + dur + 0.3, f0 = o.from != null ? mtof(o.from) : mtof(m);
      const a = this.osc(o.wave || 'square', f0, t, end), b = this.osc('sawtooth', f0, t, end); b.detune.value = 7;
      if (o.from != null) for (const x of [a, b]) x.frequency.exponentialRampToValueAtTime(mtof(m), t + (o.glide || 0.09));
      if (dur > 0.25) {
        const lfo = this.osc('sine', 5.4, t + 0.18, end), dep = this.ctx.createGain(); dep.gain.value = mtof(m) * 0.006;
        lfo.connect(dep); dep.connect(a.frequency); dep.connect(b.frequency);
      }
      const mix = this.ctx.createGain(); mix.gain.value = 0.5; a.connect(mix); b.connect(mix);
      const f = this.filt('lowpass', o.cut || 2600, 1), g = this.vca(t, v, 0.02, Math.max(0, dur - 0.05), 0.16);
      mix.connect(f); f.connect(g); this.route(g, o.verb ?? 0.3, o.dly ?? 0.25);
    }
    bell(t, m, v = 0.09, o = {}) {
      const car = this.osc('sine', mtof(m), t, t + 2.2), mod = this.osc('sine', mtof(m) * 3.5, t, t + 2.2), idx = this.ctx.createGain();
      idx.gain.setValueAtTime(mtof(m) * 2.2, t); idx.gain.exponentialRampToValueAtTime(1, t + 1.4); mod.connect(idx); idx.connect(car.frequency);
      const g = this.vca(t, v, 0.003, 0, o.decay || 1.7); car.connect(g); this.route(g, 0.5, o.dly ?? 0.2, 0.25);
    }
    cricket(t, v = 0.05) {
      const a = this.osc('sine', 4300 + Math.random() * 500, t, t + 0.2), am = this.osc('square', 42, t, t + 0.2), ag = this.ctx.createGain();
      ag.gain.value = 0.5; am.connect(ag); const g = this.vca(t, v, 0.01, 0.08, 0.05), mod = this.ctx.createGain(); mod.gain.value = 0.5;
      ag.connect(mod.gain); a.connect(mod); mod.connect(g); this.route(g, 0.4, 0, Math.random() * 1.6 - 0.8);
    }

    // ---- transport
    stepLen(i) { const s = 60 / this.track.bpm / 4, sw = this.track.swing || 0; return i % 2 === 0 ? s * (1 + sw) : s * (1 - sw); }
    section(bar) {
      const form = this.track.form; let total = 0; for (const [, n] of form) total += n;
      let b = bar % total;
      for (const [name, n] of form) { if (b < n) return { name, bar: b, len: n }; b -= n; }
      return { name: form[0][0], bar: 0, len: form[0][1] };
    }
    runStep(t) {
      const i = this.step, bar = Math.floor(i / 16), st = i % 16, tr = this.track;
      const sec = this.section(bar), ch = tr.prog[bar % tr.prog.length];
      try { tr.step(this, { t, st, bar, i, sec, ch, I: this.intensity, beat: 60 / tr.bpm }); } catch (e) { /* never let one note stop the music */ }
      this.step++;
    }
    play(track, fade = 1.2) {
      const ctx = this.ctx, now = ctx.currentTime;
      if (this.track === track && this.timer) return;
      this.stop(fade);
      this.track = track; this.step = 0;
      this.bus = ctx.createGain(); this.bus.connect(this.master);
      this.bus.gain.setValueAtTime(0.0001, now); this.bus.gain.exponentialRampToValueAtTime(1, now + Math.max(0.05, fade));
      this.dly.delayTime.setValueAtTime(Math.min(1.5, (60 / track.bpm) * 0.75), now);
      this.next = now + 0.06;
      const tick = () => { const ahead = ctx.currentTime + 0.2; while (this.next < ahead) { this.runStep(this.next); this.next += this.stepLen(this.step - 1); } };
      tick(); this.timer = setInterval(tick, 25);
    }
    stop(fade = 1.2) {
      if (this.timer) { clearInterval(this.timer); this.timer = null; }
      if (this.bus) { const b = this.bus, now = this.ctx.currentTime; b.gain.cancelScheduledValues(now); b.gain.setValueAtTime(Math.max(0.0001, b.gain.value), now); b.gain.exponentialRampToValueAtTime(0.0001, now + Math.max(0.05, fade)); setTimeout(() => b.disconnect(), (fade + 0.5) * 1000); }
      this.bus = null; this.track = null;
    }
    sting(name) {
      const s = STINGS[name]; if (!s) return;
      const now = this.ctx.currentTime;
      if (this.bus) { const g = this.bus.gain; g.cancelScheduledValues(now); g.setValueAtTime(Math.max(0.0001, g.value), now); g.exponentialRampToValueAtTime(0.25, now + 0.1); g.setValueAtTime(0.25, now + s.length); g.exponentialRampToValueAtTime(1, now + s.length + 1.2); }
      const keep = this.bus; this.bus = null; s.play(this, now + 0.03); this.bus = keep;
    }
  }

  // ---------------------------------------------------------------- the score
  const TRACKS = {};

  // 1. Title screen — warm synthwave in A minor.
  {
    const prog = [chord(N('A3'), 'min', N('A2')), chord(N('F3'), 'maj', N('F2')), chord(N('C4'), 'maj', N('C2')), chord(N('G3'), 'maj', N('G2'))];
    const mel = line([
      [0, 0, 'E5', 6], [0, 6, 'D5', 2], [0, 8, 'C5', 4], [0, 12, 'B4', 4],
      [1, 0, 'A4', 6], [1, 6, 'C5', 2], [1, 8, 'F5', 8],
      [2, 0, 'E5', 4], [2, 4, 'G5', 4], [2, 8, 'E5', 4], [2, 12, 'D5', 4],
      [3, 0, 'D5', 8], [3, 8, 'B4', 4], [3, 12, 'G4', 4],
      [4, 0, 'A4', 4], [4, 4, 'C5', 4], [4, 8, 'E5', 4], [4, 12, 'A5', 4],
      [5, 0, 'G5', 6], [5, 6, 'F5', 2], [5, 8, 'E5', 4], [5, 12, 'C5', 4],
      [6, 0, 'E5', 4], [6, 4, 'D5', 4], [6, 8, 'C5', 4], [6, 12, 'G4', 4],
      [7, 0, 'B4', 8, 'A4'], [7, 8, 'D5', 4], [7, 12, 'E5', 4]]);
    TRACKS.title = {
      id: 'title', title: 'Neon Overture', mood: 'Title screen', bpm: 100, swing: 0,
      form: [['intro', 4], ['verse', 8], ['theme', 8], ['break', 4]], prog,
      step(E, s) {
        const { t, st, sec, ch, beat } = s, bl = beat * 4, sn = sec.name, full = sn === 'verse' || sn === 'theme';
        if (st === 0) E.pad(t, ch.notes, bl, sn === 'break' ? 0.07 : 0.085, { cut: sn === 'intro' ? 900 : 1500 });
        if ((sn === 'intro' || sn === 'break') && (st === 0 || st === 8)) E.bell(t, ch.notes[2] + 12, 0.06);
        const arp = [ch.notes[0] + 12, ch.notes[1] + 12, ch.notes[2] + 12, ch.notes[0] + 24];
        if (sn !== 'break') E.pluck(t, arp[[0, 1, 2, 3, 2, 3, 1, 2][st % 8]], sn === 'intro' ? 0.05 : 0.07, { bright: 2600 });
        if (full) {
          if (st === 0 || st === 8 || (sn === 'theme' && st === 10)) E.kick(t, 0.9);
          if (st === 4 || st === 12) E.snare(t, 0.8, 0.35);
          if (st % 2 === 0) E.hat(t, st % 4 === 2 ? 0.22 : 0.13); if (st === 14) E.hat(t, 0.18, true);
          if (st % 2 === 0) E.bass(t, ch.bass + (st % 8 === 6 ? 12 : 0), beat / 2 * 0.9, 0.55, { cut: 520 });
        }
        if (sn === 'theme') for (const n of notesAt(mel, sec.bar, st)) E.lead(t, n.n, n.d * beat / 4, 0.085, { from: n.g });
        if (sn === 'theme' && sec.bar === 7 && st === 0) E.riser(t, bl, 0.35);
        if (st === 0 && s.bar % 24 === 4) E.crash(t, 0.5);
      }
    };
  }

  // 2. Daytime cruising — bright funk-pop in F.
  {
    const prog = [chord(N('F4'), 'maj7', N('F2')), chord(N('E4'), 'm7', N('E2')), chord(N('D4'), 'm7', N('D2')), chord(N('C4'), 'maj7', N('C2'))];
    const mel = line([
      [0, 0, 'A5', 2], [0, 2, 'C6', 2], [0, 4, 'A5', 2], [0, 6, 'G5', 4], [0, 12, 'F5', 4],
      [1, 0, 'E5', 4], [1, 4, 'G5', 2], [1, 6, 'A5', 4], [1, 10, 'G5', 2], [1, 12, 'E5', 4],
      [2, 0, 'F5', 2], [2, 2, 'A5', 2], [2, 4, 'C6', 4], [2, 8, 'D6', 4], [2, 12, 'C6', 4],
      [3, 0, 'G5', 8, 'F5'], [3, 8, 'E5', 4], [3, 12, 'G5', 4],
      [4, 0, 'A5', 2], [4, 2, 'C6', 2], [4, 4, 'D6', 2], [4, 6, 'C6', 4], [4, 12, 'A5', 4],
      [5, 0, 'G5', 4], [5, 4, 'E5', 2], [5, 6, 'G5', 4], [5, 10, 'A5', 2], [5, 12, 'B5', 4],
      [6, 0, 'C6', 4], [6, 4, 'A5', 4], [6, 8, 'F5', 4], [6, 12, 'D5', 4],
      [7, 0, 'C6', 6, 'A5'], [7, 6, 'A5', 2], [7, 8, 'G5', 8]]);
    const bassPat = { 0: [0, 2], 3: [0, 1], 6: [12, 1], 8: [0, 2], 10: [7, 1], 11: [12, 1], 14: [10, 2] };
    TRACKS.cruise = {
      id: 'cruise', title: 'Sunlit Boulevard', mood: 'Daytime cruising', bpm: 112, swing: 0.08,
      form: [['groove', 8], ['hook', 8], ['breather', 4]], prog,
      step(E, s) {
        const { t, st, sec, ch, beat } = s, sn = sec.name;
        if (st === 0) E.pad(t, ch.notes, beat * 4, 0.05, { cut: 2200, att: 0.08, verb: 0.35 });
        if (sn !== 'breather') {
          if (st === 0 || st === 8 || st === 7) E.kick(t, st === 7 ? 0.55 : 0.85);
          if (st === 4 || st === 12) E.clap(t, 0.7);
          if (st % 2 === 0) E.hat(t, 0.15, st % 4 === 2 && st !== 6);
          if (st % 4 === 3) E.shaker(t, 0.14);
          const b = bassPat[st]; if (b) E.bass(t, ch.bass + b[0], b[1] * beat / 4 * 0.9, 0.55, { cut: 750, type: 'square', q: 6 });
        } else if (st % 4 === 0) E.shaker(t, 0.12);
        if (st === 3 || st === 11) for (const n of ch.notes) E.pluck(t, n + 12, 0.032, { bright: 3000, dly: 0.2, decay: 0.18 });
        if (sn === 'hook') for (const n of notesAt(mel, sec.bar, st)) E.lead(t, n.n, n.d * beat / 4, 0.075, { from: n.g, wave: 'triangle', cut: 3400 });
        if (sn === 'breather' && (st === 0 || st === 6 || st === 10)) E.bell(t, ch.notes[(st / 2) % 4 | 0] + 12, 0.05);
      }
    };
  }

  // 3. Night driving — slow, wide and moody in D minor.
  {
    const prog = [{ notes: [N('D4'), N('F4'), N('A4')], bass: N('D2') }, { notes: [N('Bb3'), N('D4'), N('F4')], bass: N('Bb1') },
      { notes: [N('D4'), N('G4'), N('Bb4')], bass: N('G1') }, { notes: [N('C#4'), N('E4'), N('A4')], bass: N('A1') }];
    const mel = line([
      [0, 0, 'A5', 8], [0, 8, 'F5', 8], [1, 0, 'D5', 12], [1, 12, 'F5', 4], [2, 0, 'G5', 8], [2, 8, 'Bb5', 8], [3, 0, 'A5', 16, 'G5'],
      [4, 0, 'D6', 8], [4, 8, 'C6', 4], [4, 12, 'A5', 4], [5, 0, 'F5', 16], [6, 0, 'G5', 6], [6, 6, 'A5', 2], [6, 8, 'Bb5', 8], [7, 0, 'A5', 16, 'C#5']]);
    TRACKS.night = {
      id: 'night', title: 'Midnight Causeway', mood: 'Night driving', bpm: 88, swing: 0,
      form: [['intro', 4], ['drive', 8], ['theme', 8], ['fade', 4]], prog,
      step(E, s) {
        const { t, st, sec, ch, beat } = s, sn = sec.name, drums = sn === 'drive' || sn === 'theme';
        if (st === 0) E.pad(t, ch.notes, beat * 4, 0.085, { cut: 1100, att: 0.7, rel: 1.5, verb: 0.75 });
        if (st % 2 === 0 && sn !== 'fade') E.pluck(t, ch.notes[[0, 2, 1, 2][(st / 2) % 4]] + 12, 0.055, { bright: 1900, dly: 0.5, verb: 0.35 });
        if (st === 0) E.bass(t, ch.bass, beat * 2.4, 0.6, { type: 'sub' });
        if (st === 10) E.bass(t, ch.bass + 7, beat * 1.4, 0.45, { type: 'sub' });
        if (drums) {
          if (st === 0 || st === 10) E.kick(t, 0.8);
          if (st === 8) E.snare(t, 0.7, 0.7);
          if (st % 2 === 0) E.hat(t, 0.1);
        }
        if (sn === 'theme') for (const n of notesAt(mel, sec.bar, st)) E.lead(t, n.n, n.d * beat / 4, 0.07, { from: n.g, wave: 'sawtooth', cut: 1700, dly: 0.4, verb: 0.45 });
        if (sn === 'fade' && st === 0) E.bell(t, ch.notes[2] + 12, 0.05, { decay: 2.4 });
      }
    };
  }

  // 4. Police chase — driving E minor; gets busier as the wanted level rises (intensity 0..1).
  {
    const E3 = N('E4');
    const prog = [{ notes: [E3, E3 + 3, E3 + 7], bass: N('E2') }, { notes: [E3, E3 + 3, E3 + 7], bass: N('E2') },
      { notes: [N('C4'), N('E4'), N('G4')], bass: N('C2') }, { notes: [N('D4'), N('F#4'), N('A4')], bass: N('D2') },
      { notes: [E3, E3 + 3, E3 + 7], bass: N('E2') }, { notes: [N('F4'), N('A4'), N('C5')], bass: N('F2') },
      { notes: [E3, E3 + 3, E3 + 7], bass: N('E2') }, { notes: [N('D#4'), N('F#4'), N('B4')], bass: N('B1') }];
    const siren = line([
      [0, 0, 'E5', 4, 'B4'], [0, 4, 'E5', 2], [0, 6, 'G5', 2], [0, 8, 'F#5', 4], [0, 12, 'E5', 4],
      [1, 0, 'D5', 4], [1, 4, 'E5', 4], [1, 8, 'B4', 8, 'D5'],
      [2, 0, 'G5', 4, 'E5'], [2, 4, 'G5', 2], [2, 6, 'A5', 2], [2, 8, 'B5', 8],
      [3, 0, 'A5', 4], [3, 4, 'F#5', 4], [3, 8, 'D5', 8],
      [4, 0, 'E5', 4, 'B4'], [4, 4, 'E5', 2], [4, 6, 'G5', 2], [4, 8, 'F#5', 4], [4, 12, 'E5', 4],
      [5, 0, 'F5', 8], [5, 8, 'A5', 4], [5, 12, 'C6', 4],
      [6, 0, 'B5', 8, 'G5'], [6, 8, 'G5', 4], [6, 12, 'E5', 4],
      [7, 0, 'D#5', 8], [7, 8, 'F#5', 8, 'B4']]);
    TRACKS.chase = {
      id: 'chase', title: 'Six Stars', mood: 'Police chase', bpm: 140, swing: 0,
      form: [['pursuit', 8], ['manhunt', 8]], prog,
      step(E, s) {
        const { t, st, sec, ch, beat, I } = s, hot = sec.name === 'manhunt' || I > 0.66;
        if (st % 4 === 0) E.kick(t, 1);
        if (st === 4 || st === 12) E.snare(t, 0.9, 0.25);
        if (I > 0.6 || st % 2 === 0) E.hat(t, st % 4 === 2 ? 0.2 : 0.1);
        if (st % 2 === 0) E.bass(t, ch.bass + (st % 4 === 2 ? 12 : 0), beat / 2 * 0.8, 0.5, { type: 'reese', cut: 420 + I * 500, q: 5 });
        if ((st === 0 || st === 6 || (I > 0.5 && st === 10)) && s.bar % 2 === 0) E.stab(t, ch.notes.map((n) => n + 12), 0.06 + I * 0.04);
        if (hot) for (const n of notesAt(siren, sec.bar, st)) E.lead(t, n.n, n.d * beat / 4, 0.07 + I * 0.03, { from: n.g, glide: 0.14, cut: 3000 });
        if (sec.bar === sec.len - 1 && st >= 12) E.tom(t, [N('E3'), N('D3'), N('B2'), N('A2')][st - 12], 0.7);
        if (sec.bar === 0 && st === 0) E.crash(t, 0.6);
        if (I > 0.85 && st % 8 === 4) E.pluck(t, ch.notes[2] + 24, 0.05, { bright: 4200 });
      }
    };
  }

  // 5. Grassrun Bayou — swampy shuffle in E with a sliding lead and crickets.
  {
    const prog = [chord(N('E3'), 'dom7', N('E2')), chord(N('A3'), 'dom7', N('A1')), chord(N('E3'), 'dom7', N('E2')), chord(N('B3'), 'dom7', N('B1'))];
    const mel = line([
      [0, 0, 'B4', 4, 'A4'], [0, 6, 'D5', 2], [0, 8, 'E5', 8, 'D5'],
      [1, 0, 'C#5', 4], [1, 4, 'E5', 4], [1, 8, 'A4', 8, 'G4'],
      [2, 0, 'G5', 4, 'F#5'], [2, 4, 'E5', 4], [2, 8, 'D5', 4], [2, 12, 'B4', 4],
      [3, 0, 'D#5', 4], [3, 4, 'F#5', 4], [3, 8, 'B4', 8, 'A4']]);
    TRACKS.bayou = {
      id: 'bayou', title: 'Grassrun Shuffle', mood: 'Grassrun Bayou', bpm: 76, swing: 0.2,
      form: [['porch', 4], ['shuffle', 8], ['porch', 4]], prog,
      step(E, s) {
        const { t, st, sec, ch, beat } = s;
        if (st % 2 === 0 && Math.random() < 0.35) E.cricket(t + Math.random() * 0.1, 0.035);
        if (st % 4 === 0) E.bass(t, ch.bass + [0, 4, 7, 9][st / 4], beat * 0.85, 0.5, { type: 'tri', cut: 900, env: 1.6 });
        if (st === 6 || st === 14) for (const n of ch.notes) E.pluck(t, n + 12, 0.03, { type: 'triangle', bright: 2200, dly: 0.1, decay: 0.35 });
        if (sec.name === 'shuffle') {
          if (st === 0 || st === 8) E.kick(t, 0.55);
          if (st === 4 || st === 12) E.brush(t, 0.6);
          if (st % 2 === 1) E.shaker(t, 0.1);
          for (const n of notesAt(mel, sec.bar % 4, st)) E.lead(t, n.n, n.d * beat / 4, 0.07, { from: n.g, glide: 0.18, wave: 'triangle', cut: 2200, dly: 0.15 });
        } else if (st === 0) E.pad(t, ch.notes, beat * 4, 0.04, { cut: 800, att: 0.9, verb: 0.6 });
      }
    };
  }

  // 6. Coastal Clash — high-energy race theme in F# minor.
  {
    const prog = [chord(N('F#4'), 'min', N('F#2')), chord(N('D4'), 'maj', N('D2')), { notes: [N('C#4'), N('E4'), N('A4')], bass: N('A1') }, chord(N('E4'), 'maj', N('E2'))];
    const hook = line([
      [0, 0, 'C#6', 3], [0, 3, 'A5', 3], [0, 6, 'F#5', 2], [0, 8, 'G#5', 4], [0, 12, 'A5', 4],
      [1, 0, 'F#5', 6], [1, 6, 'A5', 2], [1, 8, 'D6', 8, 'C#6'],
      [2, 0, 'C#6', 3], [2, 3, 'E6', 3], [2, 6, 'C#6', 2], [2, 8, 'A5', 8],
      [3, 0, 'B5', 4], [3, 4, 'G#5', 4], [3, 8, 'E5', 4], [3, 12, 'G#5', 4]]);
    const bassHits = { 0: 0, 3: 0, 6: 12, 8: 0, 11: 0, 14: 12 };
    TRACKS.race = {
      id: 'race', title: 'Coastal Clash', mood: 'Street race', bpm: 150, swing: 0,
      form: [['grid', 4], ['lap', 8], ['final lap', 8], ['cooldown', 4]], prog,
      step(E, s) {
        const { t, st, sec, ch, beat } = s, sn = sec.name, full = sn === 'lap' || sn === 'final lap';
        if (sn === 'grid') { if (st % 4 === 0) E.kick(t, 0.7); if (st % 2 === 0) E.hat(t, 0.12); if (sec.bar === 3 && st === 0) E.riser(t, beat * 4, 0.5); }
        if (full) {
          if (st === 0 || st === 10 || (sn === 'final lap' && st === 6)) E.kick(t, 1);
          if (st === 4 || st === 12) E.snare(t, 0.95, 0.2);
          if (st === 7 || st === 15) E.snare(t, 0.22, 0);
          if (st % 2 === 0) E.hat(t, st % 4 === 2 ? 0.17 : 0.11);
          if (sec.bar === 0 && st === 0) E.crash(t, 0.6);
        }
        if (sn !== 'grid' && bassHits[st] !== undefined) E.bass(t, ch.bass + bassHits[st], beat / 4 * 2.2, 0.55, { type: 'reese', cut: 600, q: 4 });
        if (sn !== 'cooldown' && st % 2 === 0) E.pluck(t, [ch.notes[0], ch.notes[1], ch.notes[2], ch.notes[1]][(st / 2) % 4] + 24, 0.045, { bright: 4200, decay: 0.12, dly: 0.25 });
        if (sn === 'final lap') for (const n of notesAt(hook, sec.bar % 4, st)) E.lead(t, n.n, n.d * beat / 4, 0.085, { from: n.g, cut: 3600 });
        if (sn === 'cooldown' && st === 0) E.pad(t, ch.notes, beat * 4, 0.07, { cut: 1300 });
      }
    };
  }


  // Thirty original restaurant tracks and a dedicated nightclub soundtrack.
  const VENUE_SONGS = {
    nightclub:[['afterglow-mainstage','Afterglow Mainstage','club',126,45]],
    burger:[['bennys-griddle-groove','Griddle Groove','funk',108,3],['bennys-neon-refill','Neon Refill','pop',116,8],['bennys-late-night-stack','Late Night Stack','disco',112,13]],
    palmgrill:[['palm-paradise-breeze','Paradise Breeze','tropical',96,4],['palm-paradise-sunset','Coconut Sunset','tropical',102,9],['palm-paradise-shoreline','Shoreline Stroll','reggae',88,14]],
    oceandiner:[['ocean-view-morning','Ocean View Morning','retro',112,2],['ocean-view-neon','Chrome & Neon','rock',120,7],['ocean-view-moonlight','Moonlight Milkshake','jazz',92,12]],
    havana:[['havana-calle-ocho','Calle Ocho Stroll','latin',108,1],['havana-cafe-nocturne','Café Nocturne','latin',100,6],['havana-sugarcane','Sugarcane Swing','latin',116,11]],
    bigwave:[['bigwave-bluewater','Bluewater Drive','coastal',94,5],['bigwave-saltair','Salt Air','coastal',102,10],['bigwave-deepcurrent','Deep Current','jazz',88,15]],
    sunsetsteak:[['sunset-steakhouse-gold','Golden Hour Lounge','lounge',84,3],['sunset-steakhouse-midnight','Midnight Reserve','jazz',90,8],['sunset-steakhouse-candlelight','Candlelight Suite','lounge',78,13]],
    flamingo:[['flamingo-pizza-parade','Pizza Parade','pop',120,4],['flamingo-pink-neon','Pink Neon','disco',116,9],['flamingo-boardwalk','Boardwalk Bounce','rock',124,14]],
    ricos:[['ricos-street-market','Street Market','latin',112,2],['ricos-sunlit-plaza','Sunlit Plaza','latin',104,7],['ricos-midnight-salsa','Midnight Salsa','latin',118,12]],
    goldenfry:[['golden-fry-crispy','Crispy Beat','funk',110,5],['golden-fry-drivein','Drive-In Dash','pop',122,10],['golden-fry-afterhours','Afterhours Combo','disco',114,15]],
    baysidebbq:[['bayside-smokehouse','Smokehouse Stomp','country',98,1],['bayside-sunset-pit','Sunset Pit','blues',90,6],['bayside-backporch','Back Porch Breeze','country',86,11]]
  };
  const VENUE_KIND = {nightclub:'nightclub',burger:'burger',palmgrill:'palmgrill',oceandiner:'oceandiner',havana:'havana',bigwave:'bigwave',sunsetsteak:'sunsetsteak',flamingo:'flamingo',ricos:'ricos',goldenfry:'goldenfry',baysidebbq:'baysidebbq'};
  function makeVenueTrack(id,title,style,bpm,seed) {
    const roots=[45,48,50,43,46,41,48,45],root=roots[seed%roots.length];
    const intervals=style==='jazz'||style==='lounge'?[0,5,3,7]:style==='latin'?[0,7,5,3]:style==='blues'?[0,3,5,0]:[0,5,7,3];
    const qualities=style==='jazz'||style==='lounge'?['m7','maj7','dom7','maj7']:style==='blues'?['min','min','maj','min']:['min','maj','maj','min'];
    const prog=intervals.map((iv,i)=>chord(root+iv,qualities[i],root+iv-12));
    const scale=style==='latin'||style==='tropical'||style==='reggae'?[0,2,4,7,9,12,14,16,19,21]:style==='blues'?[0,3,5,6,7,10,12,15,17,19]:[0,2,3,5,7,9,10,12,14,15,17,19,21];
    const motif=Array.from({length:16},(_,i)=>scale[(i*3+seed*2+Math.floor(i/4))%scale.length]);
    return {id,title,mood:style+' venue original',bpm,swing:style==='funk'||style==='blues'?0.12:0,form:[['intro',4],['groove',8],['hook',8],['break',4]],prog,
      step(E,s){const {t,st,sec,ch,beat}=s,full=sec.name==='groove'||sec.name==='hook',club=style==='club';
        if(st===0)E.pad(ch.notes.map(n=>n+((style==='lounge'||style==='jazz')?12:0)),beat*4,club?0.12:0.065,{cut:club?2100:style==='lounge'?1100:1600,att:sec.name==='intro'?0.7:0.2,verb:0.48});
        if(club){
          if(full&&st%4===0)E.kick(t,st===0?1:0.82);if(full&&(st===4||st===12))E.clap(t,0.72);if(full&&st%2===0)E.hat(t,st%4===0?0.18:0.11,st===14);
          if(st%4===0)E.bass(t,ch.bass+(st===8?12:0),beat*0.82,0.68,{type:'reese',cut:520,q:3});
          if(full&&st%2===0)E.stab(t,ch.notes.map(n=>n+12),0.045,{bright:2400,decay:0.13});
          if(sec.name==='hook'&&st%2===0)E.lead(t,root+24+motif[(sec.bar*2+st/2)%16],beat*0.42,0.06,{wave:'sawtooth',cut:3400,dly:0.2});
        } else {
          if(full&&(st===0||st===8))E.kick(t,style==='rock'?0.72:0.58);
          if(full&&(st===4||st===12)){if(style==='jazz'||style==='lounge'||style==='coastal')E.brush(t,0.48);else E.snare(t,0.48,0.22);}
          if(full&&st%2===1)E.shaker(t,style==='tropical'||style==='latin'?0.17:0.08);if(full&&st%4===2)E.hat(t,0.07);
          if(st===0||st===8)E.bass(t,ch.bass,beat*1.65,0.42,{type:style==='jazz'||style==='lounge'?'tri':'square',cut:style==='country'?500:850,env:2});
          if(st===6||st===14)E.pluck(t,ch.notes[(st/2)%3]+12,0.045,{type:style==='coastal'||style==='country'?'triangle':'sawtooth',bright:style==='jazz'?1900:2800,decay:0.28,dly:0.12});
          if(sec.name==='hook'&&st%4===0){const note=root+24+motif[(sec.bar*4+st/4+seed)%16];if(style==='jazz'||style==='lounge')E.bell(t,note,0.055);else E.lead(t,note,beat*0.7,0.045,{wave:style==='country'?'triangle':'sawtooth',cut:style==='blues'?1800:2800,dly:0.16});}
          if(style==='latin'&&full&&(st===3||st===11))E.tom(t,root+7,0.28);
          if(style==='country'&&st===10)E.pluck(t,root+19,0.05,{type:'triangle',bright:2100,decay:0.38});
          if(style==='funk'&&full&&(st===6||st===14))E.stab(t,ch.notes.map(n=>n+12),0.045,{bright:2500,decay:0.16});
        }
        if(sec.name==='break'&&(st===0||st===8))E.bell(t,ch.notes[1]+12,0.045);
      }};
  }
  const VENUE_TRACKS={};
  for(const [kind,songs] of Object.entries(VENUE_SONGS))songs.forEach((song,i)=>{const tr=makeVenueTrack(song[0],song[1],song[2],song[3],song[4]+i*3);TRACKS[tr.id]=tr;VENUE_TRACKS[tr.id]={kind,index:i,title:tr.title};});
  function venueSongs(kind){return VENUE_SONGS[kind]||null;}
  // ---------------------------------------------------------------- stings
  const STINGS = {
    passed: { title: 'Mission Passed', length: 2.6, play(E, t) {
      [N('C5'), N('E5'), N('G5'), N('C6'), N('E6')].forEach((m, i) => E.pluck(t + i * 0.085, m, 0.09, { bright: 4200, decay: 0.4, dly: 0.25 }));
      E.pad(t + 0.4, [N('C4'), N('E4'), N('G4'), N('B4'), N('D5')], 1.6, 0.11, { att: 0.15, rel: 1.2, cut: 2600 });
      E.bell(t + 0.42, N('G6'), 0.07); E.kick(t + 0.4, 0.8); E.crash(t + 0.4, 0.5);
    } },
    wasted: { title: 'Wasted', length: 3.2, play(E, t) {
      E.kick(t, 1); E.crash(t, 0.4);
      [[N('E5'), N('F5')], [N('C5'), N('D5')], [N('A4'), N('B4')], [N('E4'), N('F4')]].forEach(([to, from], i) => E.lead(t + 0.2 + i * 0.42, to, 0.4, 0.07, { from, glide: 0.3, wave: 'sawtooth', cut: 1400 - i * 250, dly: 0.3 }));
      E.pad(t + 0.2, [N('A3'), N('C4'), N('E4')], 2.2, 0.09, { att: 0.3, rel: 1.4, cut: 700 });
      E.bass(t + 1.9, N('A1'), 1.2, 0.6, { type: 'sub' });
    } },
    busted: { title: 'Busted', length: 3.0, play(E, t) {
      E.kick(t, 1); E.snare(t, 0.7, 0.5);
      for (let i = 0; i < 4; i++) E.lead(t + 0.15 + i * 0.32, i % 2 ? N('F5') : N('B4'), 0.28, 0.065, { wave: 'square', cut: 2400, dly: 0.2 });
      E.stab(t + 1.5, [N('B3'), N('D4'), N('F4')], 0.12, { decay: 0.9 });
      E.bass(t + 1.5, N('B1'), 1.1, 0.6, { type: 'sub' });
    } },
  };

  // Render a track (or sting) into an AudioBuffer without real-time playback.
  async function renderOffline(id, seconds, opts = {}) {
    const sr = opts.sampleRate || 32000, OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    const ctx = new OAC(2, Math.ceil(sr * seconds), sr), E = new Engine(ctx);
    if (opts.intensity != null) E.intensity = opts.intensity;
    if (STINGS[id]) { E.bus = ctx.createGain(); E.bus.connect(E.master); STINGS[id].play(E, 0.05); }
    else {
      const tr = TRACKS[id]; E.track = tr; E.step = 0; E.bus = ctx.createGain(); E.bus.connect(E.master);
      E.dly.delayTime.value = Math.min(1.5, (60 / tr.bpm) * 0.75);
      // schedule a little at a time (like live playback) so finished voices can be released
      let t = 0.05; const sched = (until) => { while (t < Math.min(until, seconds - 0.05)) { E.runStep(t); t += E.stepLen(E.step - 1); } };
      sched(0.7);
      for (let at = 0.5; at < seconds - 0.1; at += 0.5) { const s = at; ctx.suspend(s).then(() => { sched(s + 0.7); ctx.resume(); }); }
    }
    return ctx.startRendering();
  }

  window.VCSoundtrack = { Engine, TRACKS, STINGS, VENUE_SONGS, renderOffline };

  // ---------------------------------------------------------------- game hookup
  // Only runs inside the game page (which exposes window.__vc).
  const SETTINGS_KEY = 'vc_soundtrack_v1';
  const venueSelection = Object.create(null);
  let settings = { on: true };
  try { Object.assign(settings, JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}')); } catch (e) { /* storage blocked */ }
  const saveSettings = () => { try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch (e) { /* storage blocked */ } };

  let ctx = null, engine = null, current = null, lastBig = '', radioHeld = false;
  let venuePanel=null,venueLabel=null,venueNext=null,venueDownload=null,activeVenueKind=null;
  function ensureAudio() {
    if (!window.__vc) return;
    try {
      if (!ctx) { ctx = new (window.AudioContext || window.webkitAudioContext)(); engine = new Engine(ctx); }
      if (ctx.state === 'suspended') ctx.resume();
    } catch (e) { ctx = null; engine = null; }
  }
  addEventListener('pointerdown', ensureAudio, { passive: true });
  addEventListener('keydown', ensureAudio);


  function audioBufferToWav(buffer){const channels=buffer.numberOfChannels,length=buffer.length,dataLength=length*channels*2,ab=new ArrayBuffer(44+dataLength),v=new DataView(ab);const put=(o,str)=>{for(let i=0;i<str.length;i++)v.setUint8(o+i,str.charCodeAt(i));};put(0,'RIFF');v.setUint32(4,36+dataLength,true);put(8,'WAVE');put(12,'fmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,channels,true);v.setUint32(24,buffer.sampleRate,true);v.setUint32(28,buffer.sampleRate*channels*2,true);v.setUint16(32,channels*2,true);v.setUint16(34,16,true);put(36,'data');v.setUint32(40,dataLength,true);let o=44;for(let i=0;i<length;i++)for(let c=0;c<channels;c++){const x=Math.max(-1,Math.min(1,buffer.getChannelData(c)[i]));v.setInt16(o,x<0?x*32768:x*32767,true);o+=2;}return ab;}
  // Hold the car radio quiet while chase / race music plays, then give it back.
  function holdRadio(G, hold) {
    const a = G.audio; if (!a || !a.setStation || hold === radioHeld) return;
    radioHeld = hold; a.setStation(hold ? -1 : (G.station ?? -1));
  }

  function choose(G) {
    if (!settings.on) return null;
    if (G.state === 'menu') return 'title';
    if (G.state !== 'play') return current; // paused, shops, dead: keep whatever is playing
    const pl = G.pl, SJ = G.ext && G.ext.SJ;
    if (SJ && SJ.kind === 'race') return 'race';
    if (pl.wanted >= 2) return 'chase';
    if (pl.inside) { const raw=pl.inside.door&&pl.inside.door.kind, kind=VENUE_KIND[raw]||raw, list=venueSongs(kind); return list?list[venueSelection[kind]||0][0]:null; }
    if (pl.car && (G.station ?? -1) >= 0) return null; // the radio has the car
    const zone = G.zoneName ? G.zoneName(pl.x, pl.z) : '';
    if (zone === 'GRASSRUN BAYOU') return 'bayou';
    const night = G.clock >= 20 || G.clock < 5.5;
    return night ? 'night' : 'cruise';
  }

  function update() {
    const G = window.__vc; if (!G || !engine) return;
    // stings for WASTED / BUSTED
    const big = document.getElementById('big'), bigt = document.getElementById('bigt');
    const shown = big && getComputedStyle(big).display !== 'none' ? (bigt && bigt.textContent || '') : '';
    if (shown && shown !== lastBig && settings.on) {
      const name = /BUSTED/i.test(shown) ? 'busted' : /WASTED/i.test(shown) ? 'wasted' : null;
      if (name) { engine.stop(0.3); current = null; engine.sting(name); }
    }
    lastBig = shown;
    if (shown) return;


    if(G.pl&&G.pl.inside&&G.pl.inside.door){const raw=G.pl.inside.door.kind,kind=VENUE_KIND[raw]||raw,list=venueSongs(kind);activeVenueKind=kind;if(list){if(!venuePanel){venuePanel=document.createElement('div');venuePanel.style.cssText='position:fixed;right:14px;bottom:14px;z-index:10000;display:none;gap:7px;align-items:center;flex-wrap:wrap;max-width:310px;padding:10px 12px;border:1px solid #ffffff55;border-radius:12px;background:#071426ed;color:white;font:12px Arial,sans-serif';venueLabel=document.createElement('div');venueLabel.style.cssText='width:100%;font-weight:bold';venueNext=document.createElement('button');venueNext.textContent='Next track';venueDownload=document.createElement('button');venueDownload.textContent='Download WAV';for(const b of [venueNext,venueDownload])b.style.cssText='border:1px solid #ffffff55;border-radius:7px;padding:7px 9px;background:#183b58;color:white;cursor:pointer';venueNext.onclick=()=>{const k=activeVenueKind,ls=venueSongs(k);if(!ls)return;venueSelection[k]=((venueSelection[k]||0)+1)%ls.length;current=null;update();};venueDownload.onclick=async()=>{const k=activeVenueKind,ls=venueSongs(k);if(!ls)return;const id=ls[venueSelection[k]||0][0];venueDownload.disabled=true;venueDownload.textContent='Rendering…';try{const buf=await renderOffline(id,48),wav=audioBufferToWav(buf),url=URL.createObjectURL(new Blob([wav],{type:'audio/wav'})),a=document.createElement('a');a.href=url;a.download=id+'.wav';a.click();setTimeout(()=>URL.revokeObjectURL(url),5000);}catch(err){console.warn(err);if(G.toast)G.toast('WAV export failed in this browser',2000);}finally{venueDownload.disabled=false;venueDownload.textContent='Download WAV';};};venuePanel.append(venueLabel,venueNext,venueDownload);document.body.appendChild(venuePanel);}venueLabel.textContent='♫ '+(kind==='nightclub'?'AFTERGLOW NIGHTCLUB':'RESTAURANT MUSIC')+' · '+list[venueSelection[kind]||0][1];venuePanel.style.display='flex';}else if(venuePanel)venuePanel.style.display='none';}else if(venuePanel)venuePanel.style.display='none';
    const want = choose(G);
    const loud = want === 'chase' || want === 'race';
    holdRadio(G, !!(loud && G.pl && G.pl.car));
    if (want === 'chase') engine.intensity = Math.min(1, Math.max(0.2, (G.pl.wanted - 1) / 5));
    // quieter underscore on foot, full level for title / chase / race
    const level = want === 'title' || loud ? 1 : 0.55;
    engine.master.gain.setTargetAtTime(0.62 * level, ctx.currentTime, 0.6);
    if (want !== current) {
      current = want;
      if (want) engine.play(TRACKS[want], want === 'chase' || want === 'race' ? 0.6 : 2.2);
      else engine.stop(1.8);
    }
  }
  setInterval(update, 400);
  window.VCSoundtrack.status = () => ({ playing: current, audio: ctx ? ctx.state : 'not started', on: settings.on, radioPaused: radioHeld });

  addEventListener('keydown', (e) => {
    const G = window.__vc;
    if (!G || e.repeat || e.key.toLowerCase() !== 'n' || G.state !== 'play') return;
    const tag = (document.activeElement && document.activeElement.tagName) || '';
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;
    settings.on = !settings.on; saveSettings();
    if (!settings.on && G.pl) holdRadio(G, false);
    if (G.toast) G.toast(settings.on ? '🎵 Soundtrack on (N to turn off)' : '🎵 Soundtrack off (N to turn on)', 1800);
  });
})();
