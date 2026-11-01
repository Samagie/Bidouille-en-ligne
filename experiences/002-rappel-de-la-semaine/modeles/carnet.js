/* Modèle « Carnet papier » : les pages tournent, les titres se tapent à la machine,
   les verdicts tombent en coup de tampon. */
(() => {
  "use strict";

  const EDITIONS = ["Édition du dimanche", "Édition du soir", "Tirage spécial", "Édition de la sieste"];
  let edition = EDITIONS[0];

  // Machine à écrire : les mots apparaissent un à un, au rythme de leurs lettres.
  function taper(o, el, delai, vitesse) {
    const mots = [];
    const parcourir = (noeud) => {
      for (const enfant of [...noeud.childNodes]) {
        if (enfant.nodeType === Node.TEXT_NODE) {
          const frag = document.createDocumentFragment();
          for (const morceau of enfant.textContent.split(/(\s+)/)) {
            if (!morceau) continue;
            if (/^\s+$/.test(morceau)) { frag.append(morceau); continue; }
            const s = document.createElement("span");
            s.textContent = morceau;
            mots.push(s);
            frag.append(s);
          }
          enfant.replaceWith(frag);
        } else if (enfant.nodeType === Node.ELEMENT_NODE) parcourir(enfant);
      }
    };
    parcourir(el);
    let t = delai;
    for (const m of mots) {
      o.animer(m, [{ opacity: 0 }, { opacity: 1 }], { duration: 1, delay: t, easing: "linear" });
      t += (m.textContent.length + 1) * vitesse;
    }
    return t - delai;
  }

  // Révèle un texte : frappé à la machine, ou tracé d'un trait de crayon.
  function reveler(o, el, { delai = 0, machine = false, vitesse = 34 } = {}) {
    if (!el) return 0;
    if (machine) return taper(o, el, delai, vitesse);
    o.animer(el, [{ clipPath: "inset(-10% 100% -10% 0)" }, { clipPath: "inset(-10% 0 -10% 0)" }], {
      duration: 520, delay: delai, easing: "cubic-bezier(.5,0,.3,1)",
    });
    return 520;
  }

  RS.enregistrer("carnet", {
    accents: ["#c8372d", "#2f5d8a", "#2b2a33"],
    couleursMimi: {
      pelage: "#c4b394", rayures: "#86735a", ventre: "#f4ecdc", trait: "#2b2a33",
      nez: "#c98f86", oreille: "#e3c2b5", joues: "#e0a993", accent: "#c8372d",
    },

    installer(decor, o) {
      edition = EDITIONS[Math.floor(o.hasard() * EDITIONS.length)];
    },

    preparer(ecran) {
      const une = document.createElement("div");
      une.className = "ca-une";
      une.innerHTML = `<b>Le Journal de Mimi</b><span>${edition}</span>`;
      ecran.querySelector(".rs-ecran-contenu").prepend(une);
    },

    passer(ancien, nouveau, sens, o) {
      // La page tourne autour de sa reliure, à gauche.
      const tourne = sens >= 0 ? ancien : nouveau;
      ancien.style.zIndex = sens >= 0 ? 2 : 1;
      nouveau.style.zIndex = sens >= 0 ? 1 : 2;
      const images = [
        { transform: "perspective(170cqw) rotateY(0deg)", filter: "brightness(1)" },
        { transform: "perspective(170cqw) rotateY(-40deg)", filter: "brightness(.92)", offset: 0.45 },
        { transform: "perspective(170cqw) rotateY(-100deg)", filter: "brightness(.65)" },
      ];
      const a = o.animer(tourne, sens >= 0 ? images : [...images].reverse(), { duration: 760, easing: "cubic-bezier(.55,.05,.35,1)" });
      return a.finished.catch(() => {});
    },

    entrer(ecran, o) {
      const q = (s) => ecran.querySelector(s);
      ecran.style.zIndex = "";
      o.animer(q(".ca-une"), [{ opacity: 0 }, { opacity: 1 }], { duration: 300 });
      o.animer(q(".rs-picto"), [{ opacity: 0, transform: "scale(.6) rotate(-20deg)" }, { opacity: 1, transform: "none" }], { duration: 360, delay: 100 });
      let d = 150 + reveler(o, q(".rs-titre"), { delai: 150, machine: true });
      d = Math.max(d, 150 + reveler(o, q(".rs-sur-titre"), { delai: 150, machine: true }));
      d += reveler(o, q(".rs-grand-titre"), { delai: d, machine: true, vitesse: 30 });

      for (const el of ecran.querySelectorAll(".rs-corps > [data-rs]")) {
        if (el.matches(".rs-tampon, .rs-sur-titre, .rs-grand-titre")) continue;
        if (el.matches(".rs-liste, .rs-semaine, .rs-duo, .rs-meteo, .rs-photos")) {
          [...el.children].forEach((li, k) => reveler(o, li, { delai: d + k * 140 }));
          d += el.children.length * 140;
        } else if (el.matches(".rs-chiffre, .rs-morceau, .rs-jauge, .rs-boutons")) {
          o.animer(el, [{ opacity: 0 }, { opacity: 1 }], { duration: 300, delay: d });
          d += 120;
        } else {
          reveler(o, el, { delai: d, machine: el.matches(".rs-citation") });
          d += 160;
        }
      }
      o.remplir(ecran, { delai: d - 200, duree: 1100, easing: "steps(12, end)" });
      o.compter(ecran, { delai: 420, duree: 1000 });

      const tampon = q(".rs-tampon");
      if (tampon) {
        const t = Math.max(1600, d + 150);
        o.animer(tampon, [
          { opacity: 0, transform: "rotate(-16deg) scale(2.6)" },
          { opacity: 0.95, transform: "rotate(-7deg) scale(.94)", offset: 0.75 },
          { opacity: 0.9, transform: "rotate(-7deg) scale(1)" },
        ], { duration: 260, delay: t, easing: "cubic-bezier(.6,0,.9,.4)" });
        // La page encaisse le coup.
        o.animer(q(".rs-ecran-contenu"), [
          { transform: "none" }, { transform: "translate(.5cqw, .4cqw)" }, { transform: "translate(-.3cqw, -.2cqw)" }, { transform: "none" },
        ], { duration: 180, delay: t + 200, fill: "none" });
      }

      o.animer(q(".rs-mimi"), [{ opacity: 0, transform: "rotate(-6deg) scale(.9)" }, { opacity: 1, transform: "none" }], { duration: 500, delay: 250 });
      reveler(o, q(".rs-bulle"), { delai: 500 });
    },
  });
})();
