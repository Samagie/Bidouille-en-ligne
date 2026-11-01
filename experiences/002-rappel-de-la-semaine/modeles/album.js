/* Modèle « L'album » : chaque écran est un polaroïd jeté sur le tableau,
   puis balayé pour laisser la place au suivant. */
(() => {
  "use strict";

  const RUBANS = ["#f4a894", "#abd0f0", "#c9b3ec", "#fbbf80", "#9ad1b5"];
  const PHOTOS = ["#f9e3d4", "#e3eef8", "#ece4f7", "#fcefd2", "#dff0e6"];
  let decalage = 0;

  const angleDe = (el) => Number(el?.dataset.alRot || 0);

  RS.enregistrer("album", {
    accents: RUBANS,

    installer(decor, o) {
      decalage = Math.floor(o.hasard() * RUBANS.length);
      decor.innerHTML = `<div class="al-pile" style="transform:rotate(${(-4 - o.hasard() * 4).toFixed(1)}deg)"></div><div class="al-pile" style="transform:rotate(${(3 + o.hasard() * 4).toFixed(1)}deg)"></div>`;
    },

    preparer(ecran, infos, o, i) {
      const contenu = ecran.querySelector(".rs-ecran-contenu");
      const angle = ((o.hasard() * 2 - 1) * 3.2).toFixed(1);
      contenu.dataset.alRot = angle;
      contenu.style.setProperty("--al-rot", `${angle}deg`);
      contenu.style.setProperty("--al-ruban", RUBANS[(i + decalage) % RUBANS.length]);
      contenu.style.setProperty("--al-photo", PHOTOS[(i + decalage) % PHOTOS.length]);
    },

    passer(ancien, nouveau, sens, o) {
      const vieux = ancien.querySelector(".rs-ecran-contenu");
      const neuf = nouveau.querySelector(".rs-ecran-contenu");
      const a0 = angleDe(vieux), a1 = angleDe(neuf);
      o.animer(vieux, [
        { transform: `rotate(${a0}deg)` },
        { transform: `translate(${-sens * 125}cqw, -6cqh) rotate(${a0 - sens * 26}deg)` },
      ], { duration: 520, easing: "cubic-bezier(.5,0,.75,0)" });
      o.animer(ancien.querySelector(".rs-narrateur"), [{ opacity: 1 }, { opacity: 0 }], { duration: 220 });
      o.animer(nouveau.querySelector(".rs-narrateur"), [{ opacity: 0 }, { opacity: 0 }], { duration: 560, fill: "none" });
      const a = o.animer(neuf, [
        { transform: `translateY(-110cqh) rotate(${a1 + 14}deg)` },
        { transform: `translateY(1.6cqh) rotate(${a1 - 2}deg)`, offset: 0.78 },
        { transform: `rotate(${a1}deg)` },
      ], { duration: 720, delay: 120, easing: "cubic-bezier(.2,.7,.3,1)" });
      // Le contenu commence à apparaître pendant que le polaroïd se pose.
      return Promise.race([new Promise((ok) => setTimeout(ok, 560)), a.finished.catch(() => {})]);
    },

    entrer(ecran, o) {
      const q = (s) => ecran.querySelector(s);
      const h = o.hasard;
      // Le mouvement s'ajoute à la rotation propre de l'élément (composite « add ») ;
      // l'apparition, elle, est une animation à part.
      const poser = (el, delai, depuis) => {
        if (!el) return;
        const r = ((h() * 2 - 1) * 8).toFixed(1);
        o.animer(el, [{ opacity: 0 }, { opacity: 1 }], { duration: 200, delay: delai });
        o.animer(el, [
          { transform: depuis || `translateY(4cqh) rotate(${r}deg) scale(.85)` },
          { transform: "translate(0)" },
        ], { duration: depuis ? 560 : 420, delay: delai, easing: "cubic-bezier(.2,.8,.3,1.15)", composite: "add" });
      };
      let d = 120;
      for (const el of ecran.querySelectorAll(".rs-corps > [data-rs]")) {
        if (el.matches(".rs-tampon")) continue;
        if (el.matches(".rs-photos")) {
          // Les petits polaroïds sont distribués un par un.
          [...el.children].forEach((li, k) => poser(li, d + k * 150,
            `translate(${((h() * 2 - 1) * 30).toFixed(1)}cqw, 45cqh) rotate(${((h() * 2 - 1) * 40).toFixed(1)}deg)`));
          d += el.children.length * 150;
        } else if (el.matches(".rs-liste, .rs-duo, .rs-semaine, .rs-meteo")) {
          [...el.children].forEach((li, k) => poser(li, d + k * 90));
          d += el.children.length * 90;
        } else { poser(el, d); d += 110; }
      }
      poser(q(".rs-entete"), d);
      o.remplir(ecran, { delai: 400, duree: 900 });
      o.compter(ecran, { delai: 260, duree: 1000 });
      const tampon = q(".rs-tampon");
      if (tampon) o.animer(tampon, [
        { opacity: 0, transform: "rotate(-60deg) scale(.2)" },
        { opacity: 1, transform: "rotate(-6deg) scale(1.12)", offset: 0.7 },
        { opacity: 1, transform: "rotate(-12deg) scale(1)" },
      ], { duration: 520, delay: q(".rs-chiffre") ? 1400 : d + 150, easing: "ease-out" });

      // Mimi se colle comme un autocollant, puis le post-it est plaqué à côté.
      o.animer(q(".rs-mimi"), [
        { opacity: 0, transform: "scale(.3) rotate(-35deg)" },
        { opacity: 1, transform: "scale(1.1) rotate(4deg)", offset: 0.65 },
        { opacity: 1, transform: "none" },
      ], { duration: 560, delay: 380, easing: "ease-out" });
      o.animer(q(".rs-bulle"), [
        { opacity: 0, transform: "rotate(2deg) scale(1.35) translateY(-3cqh)" },
        { opacity: 1, transform: "rotate(2deg) scale(1)" },
      ], { duration: 320, delay: 700, easing: "cubic-bezier(.5,0,.8,.3)" });
    },
  });
})();
