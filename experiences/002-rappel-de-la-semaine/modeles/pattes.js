/* Modèle « Pattes de chat » : tout rebondit comme de la pâte à modeler. */
(() => {
  "use strict";

  // Paires pastel / texte foncé du thème « Pattes de chat » de Chez Miaouss.
  const PAIRES = [
    ["#f9d9d4", "#9c3d33"], ["#fbdcc4", "#8f4a1c"], ["#fbeac0", "#76550f"], ["#cfeadf", "#256a4d"],
    ["#dde9d4", "#40623f"], ["#d7e8f5", "#2a5f93"], ["#e8dff5", "#62499b"],
  ];
  const BANDEAUX = ["#c9b3ec", "#f4a894", "#abd0f0", "#fbbf80"];
  const PATTE = `<svg viewBox="0 0 40 40" aria-hidden="true"><g fill="currentColor"><ellipse cx="20" cy="26" rx="9" ry="7.5"/><ellipse cx="9.5" cy="16" rx="3.6" ry="4.6"/><ellipse cx="16.5" cy="10.5" rx="3.6" ry="4.8"/><ellipse cx="23.5" cy="10.5" rx="3.6" ry="4.8"/><ellipse cx="30.5" cy="16" rx="3.6" ry="4.6"/></g></svg>`;

  let decalage = 0;
  let traces = null;

  // Une petite série de pattes qui traverse l'écran, en diagonale.
  function marcher(o, sens) {
    if (!traces) return;
    const n = 6;
    for (let k = 0; k < n; k++) {
      const p = document.createElement("span");
      p.className = "pa-trace";
      p.innerHTML = PATTE;
      const t = k / (n - 1);
      const x = sens > 0 ? 6 + t * 74 : 80 - t * 74;
      const y = 86 - t * 70 + (k % 2 ? 4 : -4);
      p.style.left = `${x}cqw`;
      p.style.top = `${y}cqh`;
      const angle = sens > 0 ? 38 : -38;
      traces.append(p);
      const a = o.animer(p, [
        { opacity: 0, transform: `rotate(${angle}deg) scale(.2)` },
        { opacity: 0.85, transform: `rotate(${angle}deg) scale(1.15)`, offset: 0.25 },
        { opacity: 0.75, transform: `rotate(${angle}deg) scale(1)`, offset: 0.45 },
        { opacity: 0, transform: `rotate(${angle}deg) scale(1)` },
      ], { duration: 900, delay: k * 75, easing: "ease-out" });
      const retirer = () => p.remove();
      a.finished.then(retirer, retirer);
    }
  }

  const pop = (o, el, delay, depuis = 0.55) => el && o.animer(el, [
    { opacity: 0, transform: `scale(${depuis})` },
    { opacity: 1, transform: "scale(1.08)", offset: 0.55 },
    { transform: "scale(.97)", offset: 0.78 },
    { opacity: 1, transform: "none" },
  ], { duration: 540, delay, easing: "ease-out" });

  RS.enregistrer("pattes", {
    accents: BANDEAUX,

    installer(decor, o) {
      decalage = Math.floor(o.hasard() * PAIRES.length);
      traces = document.createElement("div");
      traces.className = "pa-traces";
      o.scene.append(traces);
    },

    preparer(ecran, infos, o, i) {
      const [fond, texte] = PAIRES[(i + decalage) % PAIRES.length];
      ecran.style.setProperty("--pa-fond", fond);
      ecran.style.setProperty("--pa-texte", texte);
      ecran.style.setProperty("--pa-bandeau", BANDEAUX[(i + decalage) % BANDEAUX.length]);
    },

    passer(ancien, nouveau, sens, o) {
      marcher(o, sens);
      o.animer(ancien, [{ opacity: 1, transform: "none" }, { opacity: 0, transform: `translateY(${-sens * 5}cqh) scale(.9)` }], { duration: 300, easing: "ease-in" });
      o.animer(nouveau.querySelector(".rs-ecran-contenu"), [
        { transform: `translateY(${sens * 24}cqh) scale(.8, 1.14)` },
        { transform: "translateY(-1.6cqh) scale(1.07, .93)", offset: 0.55 },
        { transform: "translateY(0) scale(.98, 1.02)", offset: 0.8 },
        { transform: "none" },
      ], { duration: 640, delay: 90, easing: "cubic-bezier(.3,.7,.3,1)" });
      const a = o.animer(nouveau, [{ opacity: 0 }, { opacity: 1 }], { duration: 220, delay: 90 });
      return a.finished.catch(() => {});
    },

    entrer(ecran, o) {
      const q = (s) => ecran.querySelector(s);
      pop(o, q(".rs-entete"), 120);
      let d = 260;
      for (const el of ecran.querySelectorAll(".rs-corps > [data-rs]")) {
        if (el.matches(".rs-tampon")) continue;
        if (el.matches(".rs-liste, .rs-duo, .rs-photos, .rs-semaine, .rs-meteo")) {
          [...el.children].forEach((li, k) => pop(o, li, d + k * 85, 0.7));
          d += el.children.length * 85;
        } else {
          pop(o, el, d, 0.7);
          d += 110;
        }
      }
      o.remplir(ecran, { delai: 450, duree: 1000, easing: "cubic-bezier(.34,1.56,.64,1)" });
      const chiffre = q(".rs-chiffre");
      o.compter(ecran, { delai: 380, duree: 1150 }).then(() => {
        if (chiffre && !o.enPause()) o.animer(chiffre, [
          { transform: "scale(1)" }, { transform: "scale(1.12, .9)" }, { transform: "scale(.95, 1.06)" }, { transform: "scale(1)" },
        ], { duration: 420, easing: "ease-out", fill: "none" });
      });
      const tampon = q(".rs-tampon");
      if (tampon) o.animer(tampon, [
        { opacity: 0, transform: "rotate(-7deg) scale(2.3)" },
        { opacity: 1, transform: "rotate(-7deg) scale(.9)", offset: 0.7 },
        { opacity: 1, transform: "rotate(-7deg) scale(1)" },
      ], { duration: 420, delay: chiffre ? 1650 : d + 200, easing: "cubic-bezier(.5,0,.75,0)" });

      o.animer(q(".rs-mimi"), [
        { transform: "translateY(75%) rotate(10deg)" },
        { transform: "translateY(-7%) rotate(-3deg)", offset: 0.6 },
        { transform: "none" },
      ], { duration: 720, delay: 160, easing: "cubic-bezier(.3,.7,.3,1)" });
      o.animer(q(".rs-bulle"), [
        { opacity: 0, transform: "scale(.3)" },
        { opacity: 1, transform: "scale(1.06)", offset: 0.7 },
        { opacity: 1, transform: "none" },
      ], { duration: 460, delay: 560, easing: "ease-out" });
    },

    quitter() { traces = null; },
  });
})();
