/*
 * Le chasseur de bonnes affaires : recherches toutes prêtes, analyse d'une
 * annonce collée, guide des pannes faciles et carnet de trouvailles.
 * Rien ne quitte le navigateur : pas de serveur, pas de clé.
 */
(function () {
  "use strict";

  const APPAREILS = window.APPAREILS;
  const AUTRE = window.APPAREIL_AUTRE;
  const NIVEAUX = window.NIVEAUX;
  const ORDRE_NIVEAUX = ["facile", "moyen", "difficile", "inconnu", "piege"];
  const CLE_TROUVAILLES = "chasseur-trouvailles-v1";
  const CLE_REGLAGES = "chasseur-reglages-v1";

  const $ = (sel, racine = document) => racine.querySelector(sel);
  const $$ = (sel, racine = document) => Array.from(racine.querySelectorAll(sel));

  function echapper(texte) {
    return String(texte).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  }
  const euros = (n) => `${Math.round(n)}\u00a0€`;
  const fourchette = (a, b) => (Math.round(a) === Math.round(b) ? euros(a) : `${Math.round(a)}\u00a0à\u00a0${euros(b)}`);
  const arrondi5 = (n) => Math.floor(n / 5) * 5;

  /* ---------- Stockage (sur l'appareil seulement) ---------- */

  function lire(cle, defaut) {
    try { return JSON.parse(localStorage.getItem(cle)) ?? defaut; } catch { return defaut; }
  }
  function ecrire(cle, valeur) {
    try { localStorage.setItem(cle, JSON.stringify(valeur)); } catch { /* navigation privée */ }
  }
  const reglages = Object.assign({ appareil: "switch", budget: "", autre: "" }, lire(CLE_REGLAGES, {}));
  const sauverReglages = () => ecrire(CLE_REGLAGES, reglages);

  /* ---------- Lecture du texte ---------- */

  /* Minuscules, sans accents ; la ponctuation devient « | » (une frontière). */
  function normaliser(texte) {
    return texte.toLowerCase()
      .normalize("NFD").replace(/[̀-ͯ]/g, "")
      .replace(/œ/g, "oe").replace(/æ/g, "ae")
      .replace(/[.,;:!?\n\r()[\]/…"«»]+/g, " | ")
      .replace(/[^a-z0-9%|]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }
  function preparerMot(mot) {
    return mot.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9%*]+/g, " ").trim();
  }
  const cacheRegex = new Map();
  function regexMot(mot) {
    let re = cacheRegex.get(mot);
    if (!re) {
      const corps = preparerMot(mot).replace(/\*/g, "[a-z0-9%]*");
      re = new RegExp("(?:^| )(" + corps + ")(?= |$)", "g");
      cacheRegex.set(mot, re);
    }
    re.lastIndex = 0;
    return re;
  }

  /* « jamais tombé dans l'eau », « iCloud déconnecté » : le mot ne compte pas. */
  function estAnnule(texte, debut, fin, annule) {
    const avant = texte.slice(0, debut).trim().split(" ").filter(Boolean);
    for (let i = avant.length - 1, vus = 0; i >= 0 && vus < 2; i--) {
      if (avant[i] === "|") break;
      vus++;
      if (window.NEGATIONS.includes(avant[i])) return true;
    }
    if (annule && annule.length) {
      const avant3 = avant.filter((m) => m !== "|").slice(-3);
      const apres3 = texte.slice(fin).trim().split(" ").filter((m) => m && m !== "|").slice(0, 3);
      if (avant3.concat(apres3).some((m) => annule.includes(m))) return true;
    }
    return false;
  }

  /* Renvoie le premier mot-clé trouvé (et pas annulé), sinon null. */
  function chercherMots(texte, mots, annule) {
    for (const mot of mots) {
      const re = regexMot(mot);
      let m;
      while ((m = re.exec(texte))) {
        const debut = m.index + (m[0].startsWith(" ") ? 1 : 0);
        if (!estAnnule(texte, debut, debut + m[1].length, annule)) return mot;
      }
    }
    return null;
  }

  function detecterFamille(texte) {
    let meilleure = null, meilleurNombre = 0, meilleureLongueur = 0;
    for (const f of APPAREILS) {
      let nombre = 0, longueur = 0;
      for (const mot of f.detecte) {
        if (regexMot(mot).test(texte)) { nombre++; longueur += preparerMot(mot).length; }
      }
      if (nombre > meilleurNombre || (nombre === meilleurNombre && nombre > 0 && longueur > meilleureLongueur)) {
        meilleure = f; meilleurNombre = nombre; meilleureLongueur = longueur;
      }
    }
    return meilleure || AUTRE;
  }

  function detecterModele(famille, titre, texte) {
    for (const zone of [titre, texte]) {
      for (const m of famille.modeles) {
        if (m.seul && (zone !== titre || (m.garde && m.garde.test(titre)))) continue;
        if (m.motif.test(zone)) return m;
      }
    }
    return null;
  }

  /* Le dernier prix écrit dans le texte (« 90 € », « 35 euros »). */
  function prixDansTexte(brut) {
    const trouves = [...brut.matchAll(/(\d{1,5}(?:[.,]\d{1,2})?)\s?(?:€|euros?\b|eur\b)/gi)];
    if (!trouves.length) return null;
    return Math.round(parseFloat(trouves[trouves.length - 1][1].replace(",", ".")));
  }
  function lienDansTexte(brut) {
    const m = brut.match(/https?:\/\/[^\s"<>]*(?:leboncoin|vinted|ebay)[^\s"<>]*/i);
    return m ? m[0] : null;
  }

  /* ---------- L'analyse ---------- */

  function analyser(brut, prix, reventeSaisie, familleForcee) {
    const lignes = brut.trim().split(/\n+/);
    const titreN = normaliser(lignes[0] || "");
    const texteN = normaliser(brut);
    const famille = familleForcee || detecterFamille(texteN);
    const modele = detecterModele(famille, titreN, texteN);

    const idsFamille = new Set(famille.pannes.map((p) => p.id));
    const candidates = famille.pannes.concat(window.PANNES_COMMUNES.filter((p) => !idsFamille.has(p.id)));
    let pannes = [];
    for (const p of candidates) {
      const mot = chercherMots(texteN, p.mots, p.annule);
      if (mot) pannes.push(Object.assign({}, p, { mot }));
    }
    /* « Batterie à 78 % » : batterie usée. */
    const pct = brut.match(/batterie[^0-9\n]{0,25}?(\d{2,3})\s?%/i);
    if (pct && +pct[1] < 85 && !pannes.some((p) => p.id === "batterie")) {
      const pb = famille.pannes.find((p) => p.id === "batterie");
      if (pb) pannes.push(Object.assign({}, pb, { mot: `batterie à ${pct[1]} %` }));
    }
    if (pannes.some((p) => !p.vague)) pannes = pannes.filter((p) => !p.vague);
    pannes.sort((a, b) => ORDRE_NIVEAUX.indexOf(b.niveau) - ORDRE_NIVEAUX.indexOf(a.niveau));

    const signes = window.SIGNES.filter((s) => chercherMots(texteN, s.mots, s.annule));
    const leResteMarche = signes.includes(window.SIGNES[0]);

    const estime = modele ? modele.revente : famille.revente;
    const revente = reventeSaisie != null ? reventeSaisie : estime;
    const avecPiece = pannes.filter((p) => p.piece && p.niveau !== "piege");
    const piecesMin = avecPiece.reduce((s, p) => s + p.piece[0], 0);
    const piecesMax = avecPiece.reduce((s, p) => s + p.piece[1], 0);

    let gainMin = null, gainMax = null;
    if (revente != null && prix != null) {
      gainMin = revente - prix - piecesMax;
      gainMax = revente - prix - piecesMin;
    }

    const pieges = pannes.filter((p) => p.niveau === "piege");
    const difficiles = pannes.filter((p) => p.niveau === "difficile");
    const mysteres = pannes.filter((p) => p.niveau === "inconnu");
    const reparables = pannes.filter((p) => p.niveau === "facile" || p.niveau === "moyen");

    let verdict;
    if (pieges.length) {
      verdict = { ton: "rouge", emoji: "✋", titre: "À fuir", raison: `${pieges[0].nom}. Même pas cher, passe ton chemin.` };
    } else if (gainMax != null && gainMax < 0) {
      verdict = { ton: "rouge", emoji: "💸", titre: "Trop cher", raison: avecPiece.length
        ? "Même réparé, il vaudrait moins que ce qu'il t'aurait coûté."
        : "Il est plus cher que ce que vaut d'habitude le même modèle en état de marche." };
    } else if (difficiles.length) {
      verdict = { ton: "orange", emoji: "🧯", titre: "Risqué", raison: `${difficiles[0].nom} : c'est une réparation de spécialiste.` };
    } else if (!pannes.length && !leResteMarche) {
      verdict = { ton: "orange", emoji: "🤔", titre: "Panne mystère", raison: "Je ne reconnais aucune panne dans le texte. Pose la question au vendeur." };
    } else if (mysteres.length) {
      verdict = { ton: "orange", emoji: "🤔", titre: "Un pari", raison: `${mysteres[0].nom} : ${mysteres[0].conseil}` };
    } else if (gainMin == null) {
      verdict = { ton: "neutre", emoji: "🧮", titre: reparables.length ? "Réparable" : "À estimer",
        raison: revente == null
          ? "Indique le prix demandé et ce qu'il vaut en état de marche, pour savoir si c'est une affaire."
          : "Indique le prix demandé pour savoir si c'est une affaire." };
    } else {
      /* Une affaire : au moins 25 % du prix payé, et 20 € (moins pour les petits objets). */
      const seuil = Math.max(0.25 * prix, Math.min(20, 0.3 * revente));
      const sansPanne = !reparables.length;
      if (gainMin >= seuil) {
        verdict = { ton: "vert", emoji: "🎯", titre: sansPanne ? "Prix intéressant" : "Bonne affaire",
          raison: sansPanne ? `Il marche, d'après l'annonce, et coûte au moins ${euros(gainMin)} de moins que d'habitude.`
                            : `Panne ${reparables.some((p) => p.niveau === "moyen") ? "à la portée d'un bricoleur" : "facile"}, et au moins ${euros(gainMin)} d'économie une fois réparé.` };
      } else if (gainMin >= 0) {
        verdict = { ton: "orange", emoji: "👌", titre: "Petite marge", raison: "Ça se tente, surtout en négociant un peu." };
      } else {
        verdict = { ton: "orange", emoji: "⚖️", titre: "Tout juste", raison: "Tout dépend du prix réel des pièces : négocie avant d'acheter." };
      }
    }

    /* Le prix à proposer : 70 % de sa valeur, moins les pièces. */
    let offre = revente != null ? arrondi5(revente * 0.7 - piecesMax) : null;
    if (offre != null && offre < 5) offre = null;

    return { brut, famille, modele, pannes, signes, revente, estime, prix, piecesMin, piecesMax, gainMin, gainMax, verdict, offre, pieges };
  }

  function messageVendeur(a) {
    const titre = (a.brut || "").trim().split("\n")[0].replace(/https?:\/\/\S+/g, "").trim();
    const nom = titre ? `« ${titre.length > 60 ? titre.slice(0, 57) + "…" : titre} »` : "";
    const questions = [];
    for (const p of a.pannes) if (p.question && !questions.includes(p.question)) questions.push(p.question);
    for (const q of a.famille.questions) if (!questions.includes(q)) questions.push(q);
    const choix = questions.slice(0, 3);
    let fin;
    if (a.offre != null && a.prix != null && a.offre < a.prix) fin = `Si tout est bon, je vous propose ${a.offre} €, et je peux passer rapidement.`;
    else fin = "Si tout est bon, je prends au prix indiqué.";
    return `Bonjour,\nVotre annonce ${nom} m'intéresse. Est-elle toujours d'actualité ?\n` +
      (choix.length ? `Quelques questions avant de me décider :\n${choix.map((q) => "- " + q).join("\n")}\n` : "") +
      `${fin}\nMerci et bonne journée !`;
  }

  /* ---------- Les liens de recherche ---------- */

  function lienLeboncoin(q, max) {
    return "https://www.leboncoin.fr/recherche?text=" + encodeURIComponent(q) + "&sort=time&order=desc" + (max ? "&price=min-" + max : "");
  }
  function lienVinted(q, max) {
    return "https://www.vinted.fr/catalog?search_text=" + encodeURIComponent(q) + "&order=newest_first" + (max ? "&price_to=" + max + "&currency=EUR" : "");
  }
  /* eBay a son propre filtre « pour pièces » : inutile de l'écrire dans la recherche. */
  function lienEbay(q, max) {
    const nettoye = q.replace(/\b(pour pi[eè]ces?|hs|à réparer|en panne|ne marche plus)\b/gi, " ").replace(/\s+/g, " ").trim() || q;
    return "https://www.ebay.fr/sch/i.html?_nkw=" + encodeURIComponent(nettoye) + "&_sop=10&LH_ItemCondition=7000" + (max ? "&_udhi=" + max : "");
  }
  const lienTuto = (q) => "https://www.youtube.com/results?search_query=" + encodeURIComponent("tuto " + q);
  const lienPiece = (q) => "https://www.amazon.fr/s?k=" + encodeURIComponent(q);

  function boutonsSites(q, max) {
    return `<div class="sites">
      <a class="site site-lbc" href="${echapper(lienLeboncoin(q, max))}" target="_blank" rel="noopener">Leboncoin</a>
      <a class="site site-vinted" href="${echapper(lienVinted(q, max))}" target="_blank" rel="noopener">Vinted</a>
      <a class="site site-ebay" href="${echapper(lienEbay(q, max))}" target="_blank" rel="noopener">eBay</a>
    </div>`;
  }

  /* ---------- Onglet « Chercher » ---------- */

  function famillePar(id) {
    return APPAREILS.find((f) => f.id === id) || null;
  }

  function dessinerChoix() {
    const puces = APPAREILS.map((f) =>
      `<button type="button" class="puce" data-appareil="${f.id}" aria-pressed="${reglages.appareil === f.id}">
        <span class="puce-emoji" aria-hidden="true">${f.emoji}</span><span>${echapper(f.nom.split(" (")[0])}</span></button>`).join("");
    $("#choix-appareil").innerHTML = puces +
      `<button type="button" class="puce" data-appareil="autre" aria-pressed="${reglages.appareil === "autre"}">
        <span class="puce-emoji" aria-hidden="true">✏️</span><span>Autre chose</span></button>`;
  }

  function dessinerRecherches() {
    const max = parseInt(reglages.budget, 10) || null;
    const famille = famillePar(reglages.appareil);
    $("#autre-champ").hidden = reglages.appareil !== "autre";
    let recherches;
    if (famille) {
      recherches = famille.recherches;
    } else {
      const base = reglages.autre.trim();
      if (!base) {
        $("#liste-recherches").innerHTML = `<p class="vide">Écris le nom de l'appareil (par exemple « GoPro Hero 9 » ou « machine à pain ») et les recherches apparaissent ici.</p>`;
        return;
      }
      recherches = window.MOTS_PANNE.map((m) => ({ libelle: m.libelle, texte: `${base} ${m.suffixe}` }));
    }
    const faciles = famille ? famille.pannes.filter((p) => p.niveau === "facile").slice(0, 3) : [];
    const enTete = famille
      ? `<p class="rappel">${famille.emoji} <strong>Les pannes faciles à viser :</strong> ${faciles.map((p) => echapper(p.nom.split(" (")[0].toLowerCase())).join(" · ")}.
           <button type="button" class="lien-bouton" data-voir-guide="${famille.id}">Voir le guide</button></p>`
      : "";
    $("#liste-recherches").innerHTML = enTete + recherches.map((r) => `
      <article class="recherche">
        <div class="recherche-tete">
          <h3>${echapper(r.libelle)}</h3>
          <code>${echapper(r.texte)}</code>
        </div>
        ${boutonsSites(r.texte, max)}
      </article>`).join("") +
      `<p class="petit">Triées des plus récentes aux plus anciennes${max ? `, jusqu'à ${max} €` : ""}. La zone géographique se règle ensuite sur le site.</p>`;
  }

  /* ---------- Onglet « Analyser » ---------- */

  let reventeTouchee = false;
  let derniereAnalyse = null;

  function remplirSelectFamilles() {
    $("#famille").innerHTML = `<option value="">🔍 Je devine tout seul</option>` +
      APPAREILS.map((f) => `<option value="${f.id}">${f.emoji} ${echapper(f.nom)}</option>`).join("") +
      `<option value="autre">📦 Autre appareil</option>`;
  }

  function lireNombre(champ) {
    const v = champ.value.trim();
    if (v === "") return null;
    const n = parseFloat(v.replace(",", "."));
    return Number.isFinite(n) && n >= 0 ? n : null;
  }

  function dessinerAnalyse() {
    const brut = $("#annonce").value;
    const zone = $("#resultat");
    if (!brut.trim()) {
      zone.innerHTML = `<p class="vide">Colle une annonce (ou touche un exemple au-dessus) : le verdict s'affiche ici, en direct.</p>`;
      $("#detecte").textContent = "";
      derniereAnalyse = null;
      return;
    }
    let prix = lireNombre($("#prix"));
    const prixAuto = prix == null ? prixDansTexte(brut) : null;
    if (prixAuto != null) prix = prixAuto;
    $("#prix").placeholder = prixAuto != null ? `${prixAuto} (lu dans le texte)` : "ex. 60";

    const choix = $("#famille").value;
    const forcee = choix === "autre" ? AUTRE : famillePar(choix);
    const revSaisie = reventeTouchee ? lireNombre($("#revente")) : null;
    const a = analyser(brut, prix, revSaisie, forcee);
    derniereAnalyse = a;

    if (!reventeTouchee) {
      $("#revente").value = "";
      $("#revente").placeholder = a.estime != null ? `≈ ${a.estime} (estimé)` : "à chercher";
    }
    $("#detecte").textContent = a.famille.id === "autre"
      ? "Appareil pas reconnu : choisis-le dans la liste, ou indique sa valeur toi-même."
      : `Reconnu : ${a.famille.emoji} ${a.modele ? a.modele.nom : a.famille.nom}`;

    const v = a.verdict;
    const nomPrixMarche = a.modele ? a.modele.nom : (a.famille.id === "autre" ? (brut.trim().split("\n")[0].slice(0, 40)) : a.famille.nom.split(" (")[0]);

    const pannesHtml = a.pannes.length ? `
      <h3>Ce que j'ai repéré</h3>
      <ul class="pannes">${a.pannes.map(panneHtml).join("")}</ul>` : "";

    const signesHtml = a.signes.length ? `
      <ul class="signes">${a.signes.map((s) => `<li class="signe-${s.ton}">${s.ton === "bon" ? "👍" : "ℹ️"} ${echapper(s.texte)}</li>`).join("")}</ul>` : "";

    const noteModele = a.modele && a.modele.note ? `<p class="note">⚠️ ${echapper(a.modele.note)}</p>` : "";

    let calcul = "";
    if (a.revente != null && a.prix != null && !a.pieges.length) {
      calcul = `
        <h3>Le calcul</h3>
        <table class="calcul">
          <tr><td>Il vaut, en état de marche</td><td>${euros(a.revente)}</td></tr>
          <tr><td>− Prix demandé</td><td>${euros(a.prix)}</td></tr>
          <tr><td>− Pièces</td><td>${a.piecesMax ? fourchette(a.piecesMin, a.piecesMax) : "0 €"}</td></tr>
          <tr class="total ${a.gainMin >= 0 ? "positif" : "negatif"}"><td>= Ce que tu économises (ou gagnes en revendant)</td><td>${fourchette(a.gainMin, a.gainMax)}</td></tr>
        </table>
        ${a.offre != null && a.prix != null ? (a.offre >= a.prix
          ? `<p class="offre">✅ Le prix demandé est déjà bon&nbsp;: ne traîne pas&nbsp;!</p>`
          : `<p class="offre">💬 Prix à proposer : <strong>${a.offre} €</strong> <span class="petit">(70 % de sa valeur, moins les pièces)</span></p>`) : ""}`;
    }

    const verifPrix = !a.pieges.length && nomPrixMarche
      ? `<p class="petit">📈 Sa valeur est une estimation. Pour vérifier, regarde les ${echapper(nomPrixMarche)} qui marchent :
          <a href="${echapper("https://www.leboncoin.fr/recherche?text=" + encodeURIComponent(nomPrixMarche))}" target="_blank" rel="noopener">sur Leboncoin</a> ·
          <a href="${echapper("https://www.vinted.fr/catalog?search_text=" + encodeURIComponent(nomPrixMarche))}" target="_blank" rel="noopener">sur Vinted</a></p>`
      : "";

    const message = a.pieges.length ? "" : `
      <h3>Le message au vendeur</h3>
      <textarea id="message" class="message" rows="10" aria-label="Message au vendeur">${echapper(messageVendeur(a))}</textarea>
      <button type="button" class="bouton" data-copier="#message">📋 Copier le message</button>`;

    zone.innerHTML = `
      <div class="verdict verdict-${v.ton}" role="status">
        <span class="verdict-emoji" aria-hidden="true">${v.emoji}</span>
        <div><strong class="verdict-titre">${echapper(v.titre)}</strong><p>${echapper(v.raison)}</p></div>
      </div>
      ${noteModele}
      ${pannesHtml}
      ${signesHtml}
      ${calcul}
      ${verifPrix}
      ${message}
      <div class="actions">
        <button type="button" class="bouton bouton-plein" id="garder">📒 Garder dans mes trouvailles</button>
      </div>`;
  }

  function panneHtml(p) {
    const n = NIVEAUX[p.niveau];
    const prix = p.piece && p.niveau !== "piege" ? (p.piece[1] ? `pièce : ${fourchette(p.piece[0], p.piece[1])}` : "aucune pièce à acheter") : "";
    const liens = [
      p.tuto ? `<a href="${echapper(lienTuto(p.tuto))}" target="_blank" rel="noopener">🎥 Tuto vidéo</a>` : "",
      p.achat ? `<a href="${echapper(lienPiece(p.achat))}" target="_blank" rel="noopener">🔩 La pièce</a>` : "",
    ].filter(Boolean).join(" ");
    return `<li class="panne niveau-${p.niveau}">
      <div class="panne-tete"><span class="badge badge-${p.niveau}" title="${echapper(n.aide)}">${n.emoji} ${n.libelle}</span>
        <strong>${echapper(p.nom)}</strong></div>
      <p>${echapper(p.conseil)}</p>
      ${prix || liens || p.mot ? `<p class="panne-pied">${p.mot ? `<span class="mot">repéré : « ${echapper(p.mot.replace(/\*/g, "…"))} »</span>` : ""}${prix ? `<span>${prix}</span>` : ""}${liens}</p>` : ""}
    </li>`;
  }

  function chargerExemple(i) {
    const ex = window.EXEMPLES[i];
    if (!ex) return;
    $("#annonce").value = ex.texte;
    $("#prix").value = ex.prix;
    $("#famille").value = "";
    reventeTouchee = false;
    dessinerAnalyse();
  }

  /* ---------- Trouvailles ---------- */

  function trouvailles() { return lire(CLE_TROUVAILLES, []); }

  function garderAnalyse() {
    const a = derniereAnalyse;
    if (!a) return;
    const liste = trouvailles();
    const titre = a.brut.trim().split("\n")[0].replace(/https?:\/\/\S+/g, "").trim().slice(0, 80) || "Annonce sans titre";
    liste.unshift({
      id: Date.now(),
      date: new Date().toISOString().slice(0, 10),
      titre,
      emoji: a.verdict.emoji, verdict: a.verdict.titre, ton: a.verdict.ton,
      prix: a.prix, gainMin: a.gainMin, gainMax: a.gainMax,
      lien: lienDansTexte(a.brut),
      texte: a.brut.slice(0, 4000),
      revente: reventeTouchee ? a.revente : null,
    });
    ecrire(CLE_TROUVAILLES, liste.slice(0, 100));
    compterTrouvailles();
    const bouton = $("#garder");
    if (bouton) { bouton.textContent = "✅ Gardée !"; bouton.disabled = true; }
  }

  function compterTrouvailles() {
    const n = trouvailles().length;
    $("#compte-trouvailles").textContent = n ? String(n) : "";
  }

  function dessinerTrouvailles() {
    const liste = trouvailles();
    const zone = $("#liste-trouvailles");
    if (!liste.length) {
      zone.innerHTML = `<p class="vide">Rien pour l'instant. Analyse une annonce, puis touche « 📒 Garder dans mes trouvailles ».
        Elles restent sur cet appareil.</p>`;
      return;
    }
    zone.innerHTML = liste.map((t) => `
      <article class="trouvaille ton-${t.ton}">
        <div class="trouvaille-tete">
          <span class="trouvaille-emoji" aria-hidden="true">${t.emoji}</span>
          <div>
            <strong>${echapper(t.titre)}</strong>
            <p class="petit">${echapper(t.verdict)}${t.prix != null ? ` · ${euros(t.prix)}` : ""}${t.gainMin != null ? ` · gain ${fourchette(t.gainMin, t.gainMax)}` : ""} · ${echapper(t.date)}</p>
          </div>
        </div>
        <div class="trouvaille-actions">
          ${t.lien ? `<a class="bouton" href="${echapper(t.lien)}" target="_blank" rel="noopener">Ouvrir l'annonce</a>` : ""}
          <button type="button" class="bouton" data-revoir="${t.id}">Revoir l'analyse</button>
          <button type="button" class="bouton bouton-discret" data-retirer="${t.id}">Retirer</button>
        </div>
      </article>`).join("");
  }

  /* ---------- Guide des pannes ---------- */

  function dessinerGuide() {
    const familles = APPAREILS.map((f) => {
      const pannes = f.pannes.slice().sort((a, b) => ORDRE_NIVEAUX.indexOf(a.niveau) - ORDRE_NIVEAUX.indexOf(b.niveau));
      const nbFaciles = pannes.filter((p) => p.niveau === "facile").length;
      return `<details class="guide" id="guide-${f.id}">
        <summary><span aria-hidden="true">${f.emoji}</span> ${echapper(f.nom)}
          <span class="guide-compte">${nbFaciles} panne${nbFaciles > 1 ? "s" : ""} facile${nbFaciles > 1 ? "s" : ""}</span></summary>
        <p class="petit">Vaut environ <strong>${euros(f.revente)}</strong> en état de marche (selon le modèle).</p>
        <ul class="pannes">${pannes.map((p) => panneHtml(Object.assign({}, p, { mot: null }))).join("")}</ul>
        <p class="petit">À demander au vendeur : ${f.questions.map(echapper).join(" ")}</p>
      </details>`;
    }).join("");
    const pieges = window.PANNES_COMMUNES.filter((p) => p.niveau === "piege" || p.niveau === "difficile");
    $("#guide").innerHTML = familles + `
      <details class="guide guide-pieges" open>
        <summary><span aria-hidden="true">⛔</span> Les pièges, pour tous les appareils</summary>
        <ul class="pannes">${pieges.map((p) => panneHtml(Object.assign({}, p, { mot: null }))).join("")}</ul>
      </details>`;
  }

  /* ---------- Onglets et événements ---------- */

  function montrerOnglet(nom) {
    for (const b of $$(".onglets button")) b.setAttribute("aria-selected", String(b.dataset.onglet === nom));
    for (const s of $$(".onglet")) s.hidden = s.id !== "onglet-" + nom;
    if (nom === "trouvailles") dessinerTrouvailles();
  }

  async function copier(selecteur, bouton) {
    const champ = $(selecteur);
    if (!champ) return;
    try {
      await navigator.clipboard.writeText(champ.value);
    } catch {
      champ.select();
      document.execCommand("copy");
    }
    const avant = bouton.textContent;
    bouton.textContent = "✅ Copié !";
    setTimeout(() => { bouton.textContent = avant; }, 1600);
  }

  function brancher() {
    $(".onglets").addEventListener("click", (e) => {
      const b = e.target.closest("button[data-onglet]");
      if (b) montrerOnglet(b.dataset.onglet);
    });

    $("#choix-appareil").addEventListener("click", (e) => {
      const b = e.target.closest("[data-appareil]");
      if (!b) return;
      reglages.appareil = b.dataset.appareil;
      sauverReglages();
      for (const p of $$("#choix-appareil .puce")) p.setAttribute("aria-pressed", String(p === b));
      dessinerRecherches();
      if (reglages.appareil === "autre") $("#autre-texte").focus();
    });
    $("#budget").addEventListener("input", (e) => { reglages.budget = e.target.value; sauverReglages(); dessinerRecherches(); });
    $("#autre-texte").addEventListener("input", (e) => { reglages.autre = e.target.value; sauverReglages(); dessinerRecherches(); });

    $("#annonce").addEventListener("input", () => { dessinerAnalyse(); });
    $("#prix").addEventListener("input", dessinerAnalyse);
    $("#revente").addEventListener("input", (e) => { reventeTouchee = e.target.value.trim() !== ""; dessinerAnalyse(); });
    $("#famille").addEventListener("change", () => { reventeTouchee = false; dessinerAnalyse(); });
    $("#exemples").addEventListener("click", (e) => {
      const b = e.target.closest("[data-exemple]");
      if (b) chargerExemple(+b.dataset.exemple);
    });
    $("#effacer").addEventListener("click", () => {
      $("#annonce").value = ""; $("#prix").value = ""; $("#revente").value = ""; $("#famille").value = "";
      reventeTouchee = false;
      dessinerAnalyse();
      $("#annonce").focus();
    });

    document.addEventListener("click", (e) => {
      const copie = e.target.closest("[data-copier]");
      if (copie) copier(copie.dataset.copier, copie);
      if (e.target.closest("#garder")) garderAnalyse();
      const guide = e.target.closest("[data-voir-guide]");
      if (guide) {
        montrerOnglet("guide");
        const d = $("#guide-" + guide.dataset.voirGuide);
        if (d) { d.open = true; d.scrollIntoView({ behavior: "smooth", block: "start" }); }
      }
      const revoir = e.target.closest("[data-revoir]");
      if (revoir) {
        const t = trouvailles().find((x) => String(x.id) === revoir.dataset.revoir);
        if (t) {
          $("#annonce").value = t.texte;
          $("#prix").value = t.prix != null ? t.prix : "";
          $("#famille").value = "";
          reventeTouchee = t.revente != null;
          $("#revente").value = t.revente != null ? t.revente : "";
          montrerOnglet("analyser");
          dessinerAnalyse();
          window.scrollTo({ top: 0, behavior: "smooth" });
        }
      }
      const retirer = e.target.closest("[data-retirer]");
      if (retirer) {
        ecrire(CLE_TROUVAILLES, trouvailles().filter((x) => String(x.id) !== retirer.dataset.retirer));
        compterTrouvailles();
        dessinerTrouvailles();
      }
    });
  }

  function demarrer() {
    dessinerChoix();
    $("#budget").value = reglages.budget;
    $("#autre-texte").value = reglages.autre;
    dessinerRecherches();
    remplirSelectFamilles();
    $("#exemples").innerHTML = window.EXEMPLES.map((ex, i) =>
      `<button type="button" class="puce puce-petite" data-exemple="${i}">${echapper(ex.libelle)}</button>`).join("");
    dessinerGuide();
    compterTrouvailles();
    brancher();

    /* Raccourcis dans l'adresse : ?onglet=analyser&exemple=0&appareil=pc */
    const params = new URLSearchParams(location.search);
    if (params.get("appareil")) {
      reglages.appareil = params.get("appareil");
      dessinerChoix();
      dessinerRecherches();
    }
    if (params.has("exemple")) chargerExemple(+params.get("exemple"));
    else dessinerAnalyse();
    montrerOnglet(params.get("onglet") || (params.has("exemple") ? "analyser" : "chercher"));
  }

  /* Pour les tests automatiques. */
  window.Chasseur = { analyser, normaliser, detecterFamille, messageVendeur, lienLeboncoin, lienVinted, lienEbay };

  demarrer();
})();
