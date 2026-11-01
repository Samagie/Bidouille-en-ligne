/* Modèle « Les toits de Paris » : trois plans de toits en parallaxe, dessinés au hasard
   pour chaque semaine ; Mimi saute d'un toit à l'autre à chaque écran. */
(() => {
  "use strict";

  const CIELS = [
    "linear-gradient(180deg, #0a0f2c 0%, #1a1f4d 55%, #3b2f63 100%)",
    "linear-gradient(180deg, #141a45 0%, #3d2f6b 45%, #8a4f7d 75%, #e9946c 100%)",
    "linear-gradient(180deg, #071a2e 0%, #12385a 60%, #2a5d7a 100%)",
  ];
  const DECALAGES = { loin: 3, milieu: 9, pres: 22 }; // cqw par écran

  const svg = (l, h, contenu) =>
    `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 ${l} ${h}' width='${l}' height='${h}' shape-rendering='geometricPrecision'>${contenu}</svg>`)}")`;

  function loin(h) {
    let s = "";
    for (let x = 0; x < 600;) {
      const w = 26 + h() * 44, haut = 70 + h() * 90;
      s += `<rect x='${x.toFixed(1)}' y='${(300 - haut).toFixed(1)}' width='${(w + 1).toFixed(1)}' height='${haut.toFixed(1)}'/>`;
      x += w;
    }
    // La tour Eiffel et le Sacré-Cœur, au loin.
    s += `<path d='M392 300 L 410 205 L 414 150 L 417 70 L 419 40 L 421 70 L 424 150 L 428 205 L 446 300 L 434 300 Q 419 262 404 300 Z'/>
          <rect x='405' y='200' width='28' height='5'/><rect x='410' y='148' width='18' height='4'/>
          <path d='M120 300 L 120 196 Q 140 160 160 196 L 160 300 Z M 150 300 L 150 210 Q 170 150 190 210 L 190 300 Z M 180 300 L 180 196 Q 200 160 220 196 L 220 300 Z'/>
          <rect x='167' y='150' width='6' height='16'/>`;
    return svg(600, 300, `<g fill='#2b2f5e'>${s}</g>`);
  }

  function milieu(h) {
    let s = "";
    for (let x = 0; x < 500;) {
      const w = 64 + h() * 46, corps = 100 + h() * 70, toit = 22 + h() * 10;
      const y = 220 - corps;
      s += `<rect x='${x}' y='${y}' width='${w + 1}' height='${corps}' fill='#1c1f42'/>`;
      s += `<path d='M${x + 4} ${y} L ${x + 12} ${y - toit} L ${x + w - 12} ${y - toit} L ${x + w - 4} ${y} Z' fill='#15183a'/>`;
      for (let c = 0, n = 1 + Math.floor(h() * 3); c < n; c++) {
        const cx = x + 14 + h() * (w - 34);
        s += `<rect x='${cx}' y='${y - toit - 14}' width='12' height='16' fill='#15183a'/><rect x='${cx + 2}' y='${y - toit - 19}' width='3' height='6' fill='#15183a'/><rect x='${cx + 7}' y='${y - toit - 18}' width='3' height='5' fill='#15183a'/>`;
      }
      for (let fy = y + 14; fy < 210; fy += 26) {
        for (let fx = x + 9; fx < x + w - 14; fx += 19) {
          const allumee = h() < 0.28;
          s += `<rect x='${fx}' y='${fy}' width='9' height='13' rx='1' fill='${allumee ? "#ffcf6b" : "#262a55"}'${allumee ? " opacity='.9'" : ""}/>`;
        }
      }
      x += w;
    }
    return svg(500, 220, s);
  }

  function pres(h) {
    let s = `<path d='M0 120 L 0 34 L 400 34 L 400 120 Z' fill='#0f1129'/>`;
    for (let x = 6; x < 400; x += 13) s += `<rect x='${x}' y='36' width='1.5' height='84' fill='#1a1d3d'/>`;
    s += `<rect x='0' y='30' width='400' height='6' rx='3' fill='#1d2046'/>`;
    const cx = 60 + h() * 260;
    s += `<rect x='${cx}' y='8' width='26' height='26' fill='#0f1129'/><rect x='${cx + 4}' y='0' width='6' height='10' fill='#0f1129'/><rect x='${cx + 15}' y='2' width='6' height='8' fill='#0f1129'/>`;
    return svg(400, 120, s);
  }

  let plans = null;
  let position = 0;
  let cible = 0;

  RS.enregistrer("toits", {
    accents: ["#ffcf6b"],

    installer(decor, o) {
      o.scene.style.setProperty("--to-ciel", CIELS[Math.floor(o.hasard() * CIELS.length)]);
      decor.innerHTML = `<div class="to-etoiles"></div><div class="to-etoiles2"></div><div class="to-lune"></div>
        <div class="to-plan to-loin"></div><div class="to-plan to-milieu"></div><div class="to-plan to-pres"></div>`;
      plans = {
        loin: decor.querySelector(".to-loin"),
        milieu: decor.querySelector(".to-milieu"),
        pres: decor.querySelector(".to-pres"),
      };
      plans.loin.style.backgroundImage = loin(o.hasard);
      plans.milieu.style.backgroundImage = milieu(o.hasard);
      plans.pres.style.backgroundImage = pres(o.hasard);
      position = 0;
    },

    preparer(ecran, infos, o, i) {
      cible = i;
      if (infos.type === "agenda") {
        ecran.querySelectorAll(".rs-semaine .rs-jour").forEach((j) => j.insertAdjacentHTML("afterbegin", `<span class="to-etoile" aria-hidden="true">★</span>`));
      }
    },

    passer(ancien, nouveau, sens, o) {
      // Les toits glissent, plus vite au premier plan.
      for (const [nom, el] of Object.entries(plans || {})) {
        o.animer(el, [
          { transform: `translateX(${-position * DECALAGES[nom]}cqw)` },
          { transform: `translateX(${-cible * DECALAGES[nom]}cqw)` },
        ], { duration: 1150, easing: "cubic-bezier(.45,.05,.3,1)" });
      }
      position = cible;
      // Une étoile filante, une fois sur deux.
      if (o.hasard() < 0.5) {
        const f = document.createElement("div");
        f.className = "to-filante";
        f.style.left = `${10 + o.hasard() * 50}cqw`;
        f.style.top = `${4 + o.hasard() * 14}cqh`;
        o.decor.append(f);
        const a = o.animer(f, [
          { opacity: 0, transform: "rotate(-24deg) translateX(0)" },
          { opacity: 1, transform: "rotate(-24deg) translateX(14cqw)", offset: 0.3 },
          { opacity: 0, transform: "rotate(-24deg) translateX(40cqw)" },
        ], { duration: 900, easing: "ease-out" });
        const retirer = () => f.remove();
        a.finished.then(retirer, retirer);
      }
      ancien.querySelector(".rs-mimi").style.visibility = "hidden";
      o.animer(ancien, [{ opacity: 1, filter: "blur(0)", transform: "none" }, { opacity: 0, filter: "blur(1.5cqw)", transform: `translateX(${-sens * 6}cqw)` }], { duration: 420, easing: "ease-in" });
      const a = o.animer(nouveau, [{ opacity: 0 }, { opacity: 1 }], { duration: 380, delay: 260 });
      return a.finished.catch(() => {});
    },

    entrer(ecran, o) {
      const q = (s) => ecran.querySelector(s);
      const doux = (el, delai) => el && o.animer(el, [
        { opacity: 0, filter: "blur(1cqw)", transform: "translateY(2.5cqh)" },
        { opacity: 1, filter: "blur(0)", transform: "none" },
      ], { duration: 650, delay: delai, easing: "cubic-bezier(.2,.7,.2,1)" });

      doux(q(".rs-entete"), 0);
      let d = 160;
      for (const el of ecran.querySelectorAll(".rs-corps > [data-rs]")) {
        if (el.matches(".rs-liste, .rs-duo, .rs-photos, .rs-semaine, .rs-meteo")) {
          [...el.children].forEach((li, k) => doux(li, d + k * 130));
          d += el.children.length * 130;
        } else if (!el.matches(".rs-tampon")) { doux(el, d); d += 140; }
      }
      // Les jours s'allument comme des étoiles.
      ecran.querySelectorAll(".to-etoile").forEach((e, k) => o.animer(e, [
        { opacity: 0.15, transform: "scale(.5)", textShadow: "none" },
        { opacity: 1, transform: "scale(1.5)", offset: 0.5 },
        { opacity: 1, transform: "scale(1)", textShadow: "0 0 2cqw rgba(255,207,107,.9)" },
      ], { duration: 520, delay: 300 + k * 190, easing: "ease-out" }));
      o.remplir(ecran, { delai: 400, duree: 1300, ecart: 160 });
      o.compter(ecran, { delai: 300, duree: 1500 });
      const tampon = q(".rs-tampon");
      if (tampon) o.animer(tampon, [
        { opacity: 0, transform: "rotate(-7deg) scale(1.4)", filter: "blur(1cqw)" },
        { opacity: 1, transform: "rotate(-7deg) scale(1)", filter: "blur(0)" },
      ], { duration: 600, delay: q(".rs-chiffre") ? 1700 : d + 150, easing: "ease-out" });

      // Mimi arrive en sautant du toit précédent.
      o.animer(q(".rs-mimi"), [
        { transform: "translate(-34cqw, 0) rotate(-8deg)" },
        { transform: "translate(-17cqw, -11cqh) rotate(4deg)", offset: 0.5 },
        { transform: "translate(0, 0) scale(1.06, .92)", offset: 0.85 },
        { transform: "none" },
      ], { duration: 760, easing: "cubic-bezier(.4,0,.6,1)" });
      doux(q(".rs-bulle"), 700);
    },

    quitter() { plans = null; },
  });
})();
