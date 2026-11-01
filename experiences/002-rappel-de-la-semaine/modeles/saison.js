/* Modèle « Saison » : anniversaire de Mimi, Noël, Halloween, l'été.
   Le décor (neige, confettis, ballons, chauves-souris, bulles) est dessiné en code dans un canvas. */
(() => {
  "use strict";

  const CONFETTIS = ["#ff5d8f", "#ffd23f", "#4cc9f0", "#9d7fd6", "#4ee1a0"];

  // Chaque type de particule : comment elle naît, bouge et se dessine.
  const PARTICULES = {
    neige: {
      nombre: 55,
      naitre: (W, H, debut) => ({ x: Math.random() * W, y: debut ? Math.random() * H : -6, r: 1 + Math.random() * 2.4, vy: 18 + Math.random() * 30, phase: Math.random() * 6, a: 0.55 + Math.random() * 0.4 }),
      bouger: (p, dt) => { p.y += p.vy * dt; p.phase += dt; p.x += Math.sin(p.phase) * 12 * dt; },
      dessiner: (ctx, p) => { ctx.globalAlpha = p.a; ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 7); ctx.fill(); },
    },
    confettis: {
      nombre: 38,
      naitre: (W, H, debut) => ({ x: Math.random() * W, y: debut ? Math.random() * H : -10, w: 4 + Math.random() * 4, h: 7 + Math.random() * 5, rot: Math.random() * 6, vrot: (Math.random() * 2 - 1) * 5, vy: 40 + Math.random() * 50, vx: (Math.random() * 2 - 1) * 20, c: CONFETTIS[Math.floor(Math.random() * CONFETTIS.length)] }),
      bouger: (p, dt) => { p.y += p.vy * dt; p.x += p.vx * dt; p.rot += p.vrot * dt; },
      dessiner: (ctx, p) => { ctx.globalAlpha = 0.9; ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.scale(1, Math.cos(p.rot * 2)); ctx.fillStyle = p.c; ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); ctx.restore(); },
    },
    ballons: {
      nombre: 5,
      naitre: (W, H, debut) => ({ x: 20 + Math.random() * (W - 40), y: debut ? H * (0.3 + Math.random() * 0.8) : H + 40, r: 13 + Math.random() * 6, vy: -(22 + Math.random() * 18), phase: Math.random() * 6, c: CONFETTIS[Math.floor(Math.random() * CONFETTIS.length)] }),
      bouger: (p, dt) => { p.y += p.vy * dt; p.phase += dt * 1.5; p.x += Math.sin(p.phase) * 8 * dt; },
      dessiner: (ctx, p) => {
        ctx.globalAlpha = 0.92;
        ctx.strokeStyle = "rgba(0,0,0,.25)"; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(p.x, p.y + p.r * 1.15); ctx.quadraticCurveTo(p.x + 6, p.y + p.r * 2, p.x, p.y + p.r * 3); ctx.stroke();
        ctx.fillStyle = p.c; ctx.beginPath(); ctx.ellipse(p.x, p.y, p.r, p.r * 1.18, 0, 0, 7); ctx.fill();
        ctx.fillStyle = "rgba(255,255,255,.45)"; ctx.beginPath(); ctx.ellipse(p.x - p.r * 0.35, p.y - p.r * 0.45, p.r * 0.22, p.r * 0.32, -0.5, 0, 7); ctx.fill();
      },
    },
    chauvesSouris: {
      nombre: 6,
      naitre: (W, H, debut) => ({ x: debut ? Math.random() * W : -30, y: H * (0.06 + Math.random() * 0.45), vx: 45 + Math.random() * 45, phase: Math.random() * 6, taille: 16 + Math.random() * 12 }),
      bouger: (p, dt) => { p.x += p.vx * dt; p.phase += dt * 10; p.y += Math.sin(p.phase / 3) * 10 * dt; },
      dessiner: (ctx, p) => {
        ctx.globalAlpha = 0.9; ctx.save(); ctx.translate(p.x, p.y); ctx.scale(1, 0.55 + 0.45 * Math.abs(Math.sin(p.phase)));
        ctx.font = `${p.taille}px "Noto Color Emoji", "Apple Color Emoji", "Segoe UI Emoji", sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText("🦇", 0, 0); ctx.restore();
      },
    },
    bulles: {
      nombre: 22,
      naitre: (W, H, debut) => ({ x: Math.random() * W, y: debut ? Math.random() * H : H + 10, r: 3 + Math.random() * 9, vy: -(18 + Math.random() * 28), phase: Math.random() * 6 }),
      bouger: (p, dt) => { p.y += p.vy * dt; p.phase += dt * 2; p.x += Math.sin(p.phase) * 10 * dt; },
      dessiner: (ctx, p) => {
        ctx.globalAlpha = 0.75; ctx.strokeStyle = "#fff"; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 7); ctx.stroke();
        ctx.fillStyle = "rgba(255,255,255,.6)"; ctx.beginPath(); ctx.arc(p.x - p.r * 0.35, p.y - p.r * 0.35, p.r * 0.22, 0, 7); ctx.fill();
      },
    },
  };

  const AMBIANCES = {
    anniversaire: { types: ["confettis", "ballons"], salve: "confettis", decor: `<div class="sa-fanions">${"<span></span>".repeat(9)}</div>` },
    noel: { types: ["neige"], salve: "neige", decor: `<div class="sa-sol"></div><div class="sa-guirlande"></div>` },
    halloween: { types: ["chauvesSouris"], salve: "chauvesSouris", decor: `<div class="sa-lune"></div><span class="sa-citrouille" aria-hidden="true">🎃</span>` },
    ete: { types: ["bulles"], salve: "bulles", decor: `<div class="sa-soleil"></div><div class="sa-mer"></div>` },
  };

  let animation = null;

  function particules(canvas, ambiance, reduit) {
    const ctx = canvas.getContext("2d");
    let W = 0, H = 0;
    const dimensionner = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      W = canvas.clientWidth; H = canvas.clientHeight;
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    dimensionner();
    let liste = ambiance.types.flatMap((t) => Array.from({ length: PARTICULES[t].nombre }, () => ({ t, ...PARTICULES[t].naitre(W, H, true) })));
    const dessinerTout = () => { ctx.clearRect(0, 0, W, H); for (const p of liste) PARTICULES[p.t].dessiner(ctx, p); ctx.globalAlpha = 1; };
    const dehors = (p) => p.y > H + 40 || p.y < -60 || p.x > W + 40 || p.x < -60;
    let arret = false, raf = 0, avant = performance.now();
    const image = (t) => {
      if (arret) return;
      const dt = Math.min(0.05, (t - avant) / 1000);
      avant = t;
      for (const p of liste) PARTICULES[p.t].bouger(p, dt);
      liste = liste.flatMap((p) => (!dehors(p) ? [p] : p.ephemere ? [] : [{ t: p.t, ...PARTICULES[p.t].naitre(W, H, false) }]));
      dessinerTout();
      raf = requestAnimationFrame(image);
    };
    window.addEventListener("resize", dimensionner);
    if (reduit) dessinerTout(); else raf = requestAnimationFrame(image);
    return {
      // Une salve de particules en plus à chaque changement d'écran.
      salve() {
        if (reduit) return;
        const t = ambiance.salve;
        for (let k = 0; k < (t === "chauvesSouris" ? 3 : 24); k++) {
          const p = { t, ...PARTICULES[t].naitre(W, H, false), ephemere: true };
          if (t === "confettis") { p.x = W / 2 + (Math.random() * 2 - 1) * 40; p.y = H * 0.18; p.vx = (Math.random() * 2 - 1) * 160; p.vy = 20 + Math.random() * 120; }
          liste.push(p);
        }
      },
      arreter() { arret = true; cancelAnimationFrame(raf); window.removeEventListener("resize", dimensionner); },
    };
  }

  const pop = (o, el, delay, depuis = 0.55) => el && o.animer(el, [
    { opacity: 0, transform: `scale(${depuis}) rotate(-4deg)` },
    { opacity: 1, transform: "scale(1.08) rotate(1deg)", offset: 0.55 },
    { opacity: 1, transform: "none" },
  ], { duration: 520, delay, easing: "ease-out" });

  RS.enregistrer("saison", {
    accents: ["#ff5d8f"],

    installer(decor, o) {
      const ambiance = AMBIANCES[o.saison] || AMBIANCES.anniversaire;
      decor.innerHTML = `${ambiance.decor}<canvas class="sa-particules" aria-hidden="true"></canvas>`;
      animation = particules(decor.querySelector("canvas"), ambiance, o.reduit);
    },

    passer(ancien, nouveau, sens, o) {
      animation?.salve();
      o.animer(ancien, [{ opacity: 1, transform: "none" }, { opacity: 0, transform: `scale(.9) rotate(${sens * -3}deg)` }], { duration: 300, easing: "ease-in" });
      o.animer(nouveau.querySelector(".rs-ecran-contenu"), [
        { transform: "scale(.6) rotate(-6deg)" },
        { transform: "scale(1.05) rotate(1.5deg)", offset: 0.6 },
        { transform: "none" },
      ], { duration: 620, delay: 80, easing: "cubic-bezier(.3,.7,.3,1)" });
      const a = o.animer(nouveau, [{ opacity: 0 }, { opacity: 1 }], { duration: 240, delay: 80 });
      return a.finished.catch(() => {});
    },

    entrer(ecran, o) {
      const q = (s) => ecran.querySelector(s);
      pop(o, q(".rs-entete"), 100);
      let d = 240;
      for (const el of ecran.querySelectorAll(".rs-corps > [data-rs]")) {
        if (el.matches(".rs-tampon")) continue;
        if (el.matches(".rs-liste, .rs-duo, .rs-photos, .rs-semaine, .rs-meteo")) {
          [...el.children].forEach((li, k) => pop(o, li, d + k * 85, 0.7));
          d += el.children.length * 85;
        } else { pop(o, el, d, 0.7); d += 110; }
      }
      o.remplir(ecran, { delai: 420, duree: 1000, easing: "cubic-bezier(.34,1.56,.64,1)" });
      o.compter(ecran, { delai: 360, duree: 1150 });
      const tampon = q(".rs-tampon");
      if (tampon) o.animer(tampon, [
        { opacity: 0, transform: "rotate(-7deg) scale(2.3)" },
        { opacity: 1, transform: "rotate(-7deg) scale(.9)", offset: 0.7 },
        { opacity: 1, transform: "rotate(-7deg) scale(1)" },
      ], { duration: 420, delay: q(".rs-chiffre") ? 1600 : d + 200, easing: "cubic-bezier(.5,0,.75,0)" });
      o.animer(q(".rs-mimi"), [
        { transform: "translateY(75%) rotate(10deg)" }, { transform: "translateY(-8%) rotate(-4deg)", offset: 0.6 }, { transform: "none" },
      ], { duration: 720, delay: 160, easing: "cubic-bezier(.3,.7,.3,1)" });
      o.animer(q(".rs-bulle"), [
        { opacity: 0, transform: "scale(.3)" }, { opacity: 1, transform: "scale(1.06)", offset: 0.7 }, { opacity: 1, transform: "none" },
      ], { duration: 460, delay: 560, easing: "ease-out" });
    },

    quitter() { animation?.arreter(); animation = null; },
  });
})();
