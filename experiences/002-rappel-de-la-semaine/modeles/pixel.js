/* Modèle « Rétro pixel » : police en pixels faite maison (aucun fichier de police),
   Mimi en sprite, compteurs façon score, transition en blocs. */
(() => {
  "use strict";

  // Police 5×7 : chaque glyphe = 7 lignes de 5 bits (16 = pixel de gauche).
  const G = {
    A: [14, 17, 17, 31, 17, 17, 17], B: [30, 17, 17, 30, 17, 17, 30], C: [14, 17, 16, 16, 16, 17, 14],
    D: [30, 17, 17, 17, 17, 17, 30], E: [31, 16, 16, 30, 16, 16, 31], F: [31, 16, 16, 30, 16, 16, 16],
    G: [14, 17, 16, 23, 17, 17, 15], H: [17, 17, 17, 31, 17, 17, 17], I: [14, 4, 4, 4, 4, 4, 14],
    J: [7, 2, 2, 2, 2, 18, 12], K: [17, 18, 20, 24, 20, 18, 17], L: [16, 16, 16, 16, 16, 16, 31],
    M: [17, 27, 21, 21, 17, 17, 17], N: [17, 17, 25, 21, 19, 17, 17], O: [14, 17, 17, 17, 17, 17, 14],
    P: [30, 17, 17, 30, 16, 16, 16], Q: [14, 17, 17, 17, 21, 18, 13], R: [30, 17, 17, 30, 20, 18, 17],
    S: [15, 16, 16, 14, 1, 1, 30], T: [31, 4, 4, 4, 4, 4, 4], U: [17, 17, 17, 17, 17, 17, 14],
    V: [17, 17, 17, 17, 17, 10, 4], W: [17, 17, 17, 21, 21, 21, 10], X: [17, 17, 10, 4, 10, 17, 17],
    Y: [17, 17, 10, 4, 4, 4, 4], Z: [31, 1, 2, 4, 8, 16, 31],
    0: [14, 17, 19, 21, 25, 17, 14], 1: [4, 12, 4, 4, 4, 4, 14], 2: [14, 17, 1, 2, 4, 8, 31],
    3: [31, 2, 4, 2, 1, 17, 14], 4: [2, 6, 10, 18, 31, 2, 2], 5: [31, 16, 30, 1, 1, 17, 14],
    6: [6, 8, 16, 30, 17, 17, 14], 7: [31, 1, 2, 4, 8, 8, 8], 8: [14, 17, 17, 14, 17, 17, 14],
    9: [14, 17, 17, 15, 1, 2, 12], " ": [0, 0, 0, 0, 0, 0, 0], "!": [4, 4, 4, 4, 4, 0, 4],
    "?": [14, 17, 1, 2, 4, 0, 4], ".": [0, 0, 0, 0, 0, 12, 12], ",": [0, 0, 0, 0, 12, 4, 8],
    ":": [0, 12, 12, 0, 12, 12, 0], "'": [4, 4, 8, 0, 0, 0, 0], "-": [0, 0, 0, 31, 0, 0, 0],
    "/": [0, 1, 2, 4, 8, 16, 0], "%": [24, 25, 2, 4, 8, 19, 3], "€": [7, 8, 30, 8, 30, 8, 7],
    "+": [0, 4, 4, 31, 4, 4, 0], "(": [2, 4, 8, 8, 8, 4, 2], ")": [8, 4, 2, 2, 2, 4, 8],
  };
  const normaliser = (t) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[  ]/g, " ").toUpperCase();

  function couperLignes(texte, max) {
    const lignes = [];
    let ligne = "";
    for (const mot of texte.split(" ")) {
      const essai = ligne ? `${ligne} ${mot}` : mot;
      if (essai.length > max && ligne) { lignes.push(ligne); ligne = mot; } else ligne = essai;
    }
    if (ligne) lignes.push(ligne);
    return lignes;
  }

  // Dessine un texte en pixels. « unite » = taille d'un pixel, en cqw.
  function pixelTexte(texte, { unite = 0.8, max = 99 } = {}) {
    const lignes = couperLignes(normaliser(texte), max);
    const largeur = Math.max(...lignes.map((l) => l.length)) * 6 - 1;
    const hauteur = lignes.length * 10 - 3;
    let rects = "";
    lignes.forEach((ligne, li) => {
      [...ligne].forEach((c, ci) => {
        const g = G[c] || G["?"];
        g.forEach((bits, y) => {
          let x = 0;
          while (x < 5) {
            if (bits & (16 >> x)) {
              let w = 1;
              while (x + w < 5 && bits & (16 >> (x + w))) w++;
              rects += `<rect x="${ci * 6 + x}" y="${li * 10 + y}" width="${w}" height="1"/>`;
              x += w;
            } else x++;
          }
        });
      });
    });
    return `<svg class="px-texte" viewBox="0 0 ${largeur} ${hauteur}" style="width:${largeur * unite}cqw" fill="currentColor" aria-hidden="true">${rects}</svg>`;
  }

  // Remplace un texte par sa version en pixels, en gardant le texte pour les lecteurs d'écran.
  function pixeliserTexte(el, opts) {
    if (!el) return;
    const texte = el.textContent.trim();
    el.innerHTML = `<span class="px-cache">${RS.outilsTexte.esc(texte)}</span>${pixelTexte(texte, opts)}`;
  }

  // Un dessin (SVG ou emoji) réduit en quelques pixels, aux bords nets.
  function enSprite(source, largeur, hauteur, dessiner) {
    const c = document.createElement("canvas");
    c.width = largeur;
    c.height = hauteur;
    const ctx = c.getContext("2d");
    dessiner(ctx);
    try {
      const img = ctx.getImageData(0, 0, largeur, hauteur);
      for (let i = 3; i < img.data.length; i += 4) img.data[i] = img.data[i] > 110 ? 255 : 0;
      ctx.putImageData(img, 0, 0);
    } catch (_) { /* certains navigateurs refusent la lecture : on garde les bords adoucis */ }
    return c;
  }

  function mimiEnSprite(conteneur) {
    const svg = conteneur?.querySelector("svg");
    if (!svg) return;
    const image = new Image();
    image.onload = () => {
      const c = enSprite(svg, 48, 53, (ctx) => ctx.drawImage(image, 0, 0, 48, 53));
      c.className = "px-mimi";
      c.setAttribute("role", "img");
      c.setAttribute("aria-label", "Mimi");
      if (svg.isConnected) svg.replaceWith(c);
    };
    image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(new XMLSerializer().serializeToString(svg))}`;
  }

  function emojiEnSprite(el, taille = 16) {
    if (!el) return;
    const texte = el.textContent.trim();
    const c = enSprite(null, taille, taille, (ctx) => {
      ctx.font = `${taille * 0.8}px "Noto Color Emoji", "Apple Color Emoji", "Segoe UI Emoji", sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(texte, taille / 2, taille / 2 + 1);
    });
    c.className = "px-emoji";
    c.setAttribute("aria-hidden", "true");
    el.replaceChildren(c);
  }

  let toile = null;

  // Transition : des blocs couvrent l'écran dans le désordre, puis le découvrent.
  function blocs(o, couleur, milieu) {
    const cols = 10, lignes = 20, n = cols * lignes;
    toile.width = cols;
    toile.height = lignes;
    const ctx = toile.getContext("2d");
    const ordre = [...Array(n).keys()].sort(() => o.hasard() - 0.5);
    const duree = 230;
    return new Promise((fin) => {
      let debut = null;
      let phase = 0;
      const image = (t) => {
        debut ??= t;
        const p = Math.min(1, (t - debut) / duree);
        const k = Math.floor(p * n);
        ctx.clearRect(0, 0, cols, lignes);
        ctx.fillStyle = couleur;
        for (let i = 0; i < n; i++) {
          const couvert = phase === 0 ? i < k : i >= k;
          if (couvert) ctx.fillRect(ordre[i] % cols, Math.floor(ordre[i] / cols), 1, 1);
        }
        if (p < 1) return requestAnimationFrame(image);
        if (phase === 0) { phase = 1; debut = null; milieu(); return requestAnimationFrame(image); }
        ctx.clearRect(0, 0, cols, lignes);
        fin();
      };
      requestAnimationFrame(image);
    });
  }

  const apparaitre = (o, el, delai) => el && o.animer(el, [
    { opacity: 0, transform: "translateX(-3cqw)" }, { opacity: 1, transform: "translateX(-1.5cqw)" }, { opacity: 1, transform: "none" },
  ], { duration: 240, delay: delai, easing: "steps(3, end)" });

  RS.enregistrer("pixel", {
    accents: ["#ff5d8f", "#4ee1a0", "#4cc9f0", "#ff9f43"],

    installer(decor, o) {
      decor.innerHTML = `<div class="px-etoiles"></div><div class="px-etoiles2"></div>`;
      const tube = document.createElement("div");
      tube.className = "px-ecran-tube";
      toile = document.createElement("canvas");
      toile.className = "px-transition";
      o.scene.append(toile, tube);
    },

    preparer(ecran, infos) {
      const q = (s) => ecran.querySelector(s);
      pixeliserTexte(q(".rs-titre"), { unite: 0.78, max: 17 });
      pixeliserTexte(q(".rs-sur-titre"), { unite: 0.75, max: 20 });
      pixeliserTexte(q(".rs-grand-titre"), { unite: 1.25, max: 11 });
      pixeliserTexte(q(".rs-tampon"), { unite: 1, max: 14 });
      ecran.querySelectorAll("[data-rs-compte]").forEach((el) => {
        el.innerHTML = pixelTexte(el.textContent, { unite: el.closest(".rs-moyen") ? 1.55 : 3 });
      });
      emojiEnSprite(q(".rs-picto"));
      ecran.querySelectorAll(".rs-photo-dessin, .rs-meteo-icone").forEach((el) => emojiEnSprite(el));
      ecran.querySelectorAll(".rs-duo li").forEach((li, k) => li.insertAdjacentHTML("afterbegin", `<i class="px-joueur">${k + 1}P</i>`));
      if (infos.type === "fin") {
        q(".rs-ecran-contenu").insertAdjacentHTML("afterbegin", `<div class="px-banniere">${pixelTexte("Semaine terminée !", { unite: 1.05, max: 13 })}</div>`);
      }
      mimiEnSprite(q(".rs-mimi"));
    },

    passer(ancien, nouveau, sens, o) {
      nouveau.style.visibility = "hidden";
      return blocs(o, "#0d0b1e", () => {
        ancien.style.visibility = "hidden";
        nouveau.style.visibility = "";
      });
    },

    entrer(ecran, o) {
      const q = (s) => ecran.querySelector(s);
      const grand = ecran.querySelector(".rs-chiffre");
      const ecrireScore = (el, texte) => {
        el.innerHTML = pixelTexte(texte, { unite: el.closest(".rs-moyen") ? 1.55 : 3 });
      };
      apparaitre(o, q(".rs-entete"), 60);
      apparaitre(o, q(".px-banniere"), 60);
      let d = 200;
      for (const el of ecran.querySelectorAll(".rs-corps > [data-rs]")) {
        if (el.matches(".rs-liste, .rs-duo, .rs-photos, .rs-semaine, .rs-meteo")) {
          [...el.children].forEach((li, k) => apparaitre(o, li, d + k * 110));
          d += el.children.length * 110;
        } else if (!el.matches(".rs-tampon")) {
          apparaitre(o, el, d);
          d += 120;
        }
      }
      o.remplir(ecran, { delai: 350, duree: 900, easing: "steps(10, end)" });
      o.compter(ecran, { delai: 280, duree: 1000, paliers: 14, ecrire: ecrireScore }).then(() => {
        if (grand && !o.enPause()) o.animer(grand, [{ opacity: 1 }, { opacity: 0.2 }, { opacity: 1 }, { opacity: 0.2 }, { opacity: 1 }], { duration: 420, easing: "steps(1, end)", fill: "none" });
      });
      const tampon = q(".rs-tampon");
      if (tampon) apparaitre(o, tampon, grand ? 1450 : d + 150);

      o.animer(q(".rs-mimi"), [
        { transform: "translateY(-60cqh)" }, { transform: "translateY(0)", offset: 0.6 }, { transform: "translateY(-6cqh)", offset: 0.8 }, { transform: "translateY(0)" },
      ], { duration: 640, delay: 100, easing: "steps(8, end)" });
      const bulle = q(".rs-bulle");
      if (bulle) {
        const n = bulle.textContent.length;
        o.animer(bulle, [{ opacity: 0 }, { opacity: 1 }], { duration: 1, delay: 420 });
        o.animer(bulle, [{ clipPath: "inset(-3cqw -3cqw 100% -3cqw)" }, { clipPath: "inset(-3cqw -3cqw -3cqw -3cqw)" }], { duration: Math.min(1400, n * 22), delay: 440, easing: `steps(${Math.max(3, Math.round(n / 14))}, end)` });
      }
    },

    quitter() { toile = null; },
  });
})();
