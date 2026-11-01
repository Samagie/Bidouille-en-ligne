/* Rappel de la semaine : le moteur de story.
   - fabrique les écrans à partir des données de la semaine (format : semaine-exemple.json) ;
   - choisit le modèle de la semaine et tire les variantes (phrases, couleur, ordre) ;
   - gère la lecture : toucher, appui long, clavier, minuterie, barres de progression.
   Les modèles s'enregistrent avec RS.enregistrer(id, définition). */
(() => {
  "use strict";

  const RS = (window.RS = window.RS || {});
  RS.modeles = RS.modeles || {};
  RS.enregistrer = (id, def) => { RS.modeles[id] = def; };

  const ORDRE = ["pattes", "carnet", "pixel", "toits", "album"];
  const INFOS = {
    pattes: { nom: "Pattes de chat", emoji: "🐾" },
    carnet: { nom: "Carnet papier", emoji: "📰" },
    pixel: { nom: "Rétro pixel", emoji: "🕹️" },
    toits: { nom: "Les toits de Paris", emoji: "🌙" },
    album: { nom: "L'album", emoji: "📸" },
    saison: { nom: "Saison", emoji: "🎉" },
  };
  RS.ORDRE = ORDRE;
  RS.INFOS = INFOS;
  // Le modèle tourne chaque semaine, parmi « mes modèles » (Paramètres) s'ils sont précisés.
  RS.modeleDeLaSemaine = (numero, mesModeles = ORDRE) => {
    const liste = ORDRE.filter((m) => mesModeles.includes(m));
    const l = liste.length ? liste : ORDRE;
    return l[((numero % l.length) + l.length) % l.length];
  };
  RS.RUBRIQUES = [
    ["argent", "💶 Argent"], ["sport", "🏃 Sport"], ["cuisine", "🍳 Cuisine"], ["maison", "🧹 Maison"],
    ["soins", "🩺 Soins de Mimi"], ["cinema", "🎬 Cinéma"], ["dj", "🎧 DJ Mimi"], ["photos", "📸 Photos"], ["tribunal", "⚖️ Tribunal des bêtises"],
  ];
  RS.RYTHMES = { calme: 1.3, normal: 1, rapide: 0.7 };

  // ---------------------------------------------------------------------------
  // Hasard reproductible : la même semaine donne toujours le même rappel.
  // ---------------------------------------------------------------------------
  function graine(...morceaux) {
    let h = 2166136261;
    for (const c of morceaux.join("|")) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  function hasard(seed) {
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const choisir = (h, liste) => liste[Math.floor(h() * liste.length)];
  function melanger(h, liste) {
    const l = [...liste];
    for (let i = l.length - 1; i > 0; i--) { const j = Math.floor(h() * (i + 1)); [l[i], l[j]] = [l[j], l[i]]; }
    return l;
  }
  RS.hasard = hasard;
  RS.graine = graine;

  // ---------------------------------------------------------------------------
  // Formats
  // ---------------------------------------------------------------------------
  const fmtEuros = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });
  const fmtEntier = new Intl.NumberFormat("fr-FR");
  const euros = (n) => fmtEuros.format(n);
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const dateDe = (iso) => new Date(`${iso}T12:00:00`);
  const versIso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const ajouterJours = (iso, n) => { const d = dateDe(iso); d.setDate(d.getDate() + n); return versIso(d); };
  const jourCourt = (iso) => ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"][dateDe(iso).getDay()];
  const jourLong = (iso) => dateDe(iso).toLocaleDateString("fr-FR", { weekday: "long" });
  const majuscule = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  function periode(debut, fin) {
    const d = dateDe(debut), f = dateDe(fin);
    const mois = (x) => x.toLocaleDateString("fr-FR", { month: "long" });
    return d.getMonth() === f.getMonth()
      ? `du ${d.getDate()} au ${f.getDate()} ${mois(f)}`
      : `du ${d.getDate()} ${mois(d)} au ${f.getDate()} ${mois(f)}`;
  }
  const heure = (h) => (h ? h.replace(/^0/, "").replace(":00", " h").replace(":", " h ") : "");
  const pluriel = (n, un, plusieurs) => `${fmtEntier.format(n)} ${n > 1 ? plusieurs : un}`;
  const remplir = (phrase, v) => phrase.replace(/\{(\w+)\}/g, (_, k) => (k in v ? v[k] : `{${k}}`));

  // ---------------------------------------------------------------------------
  // Ce que dit Mimi
  // ---------------------------------------------------------------------------
  const PHRASES = {
    ouverture: [
      "C'est dimanche soir. Installez-vous, je vous raconte votre semaine.",
      "Miaou ! Votre semaine est prête. J'ai tout noté, évidemment.",
      "Bonsoir les humains. Un petit bilan avant ma sieste ?",
    ],
    noteHaute: ["Je suis presque impressionné.", "Même moi, je n'aurais pas fait mieux. Enfin… presque.", "Ronronnement d'approbation."],
    noteMoyenne: ["Pas mal. Peut mieux faire, comme moi au saut du canapé.", "Correct. Je garde mon avis pour la gamelle.", "Une semaine honnête. Comme mes siestes."],
    noteBasse: ["On en reparle autour d'une gamelle ?", "Une semaine à oublier. Sauf mes repas.", "Courage. Moi, je vous soutiens (depuis le canapé)."],
    argent: ["J'ai compté chaque centime. Et chaque croquette.", "{depense} dépensés. Dont pas assez pour moi.", "Le banquier a parlé : on souffle, mais on surveille."],
    sport: ["{seances} séances ! Moi, j'ai fait 14 siestes. C'est du sport aussi.", "Encore {reste} pour l'objectif. Je vous regarde.", "Bravo les athlètes. Je m'étire : c'est ma séance."],
    sportFini: ["Objectif atteint ! Je vous accorde une ronronnade.", "Champions ! Je vous tends la patte."],
    cuisine: ["Le {star} ? J'en veux. Pour la science.", "{cuisines} repas maison. Le chef est fier.", "Il manque du {stock}. Je dis ça, je dis rien."],
    maison: ["{faites} tâches faites. La maison brille, mon carton aussi.", "Encore {retard} en retard. Je les surveille pour vous.", "Le majordome salue l'équipe de ménage."],
    soins: ["{repas} repas servis à l'heure. Service impeccable.", "{serie} jours de câlins d'affilée. On continue ?", "Bilan de santé : je suis parfait. Comme d'habitude."],
    cinema: ["{film} : {etoiles} sur 5. Il manquait un chat.", "Le critique a vu {nb}. Verdict : trop peu de chats.", "Popcorn pour vous, coussin pour moi."],
    dj: ["Le tube de la semaine : {titre}. Je danse (intérieurement).", "{morceaux} morceaux partagés. Mes oreilles approuvent.", "Montez le son ! Enfin, pas trop."],
    photos: ["{nombre} photos cette semaine. Je suis sur combien ?", "Clic-clac ! Mon meilleur profil ? Les deux.", "Les paparazzis, c'est moi."],
    tribunal: ["L'accusé plaide la curiosité.", "Je n'ai aucun souvenir de ces faits.", "Objection ! La plante était sur mon chemin."],
    transition: ["Je m'étire, et on regarde la suite.", "Place à la semaine prochaine !"],
    agenda: ["Voici le programme. Je serai à la fenêtre.", "Une semaine chargée. Pensez à ma gamelle entre deux.", "Notez bien. Moi, j'ai déjà tout retenu."],
    anniversaires: ["Des bougies à souffler ! Attention à mes moustaches.", "N'oubliez pas les anniversaires. Moi, jamais (c'est faux)."],
    meteoPluie: ["De la pluie en vue. J'ai sorti mon ciré.", "Il va pleuvoir. Journée canapé confirmée."],
    meteoBeau: ["Du soleil cette semaine. Rebord de fenêtre réservé.", "Beau temps prévu. Je bronze, vous sortez."],
    fin: ["Bonne semaine !", "À dimanche prochain !", "Bonne semaine, les humains !"],
    noteMieux: ["{ecart} de mieux que la semaine dernière ! Je ronronne.", "En progrès : {ecart} de plus que la semaine dernière."],
    noteMoins: ["{ecart} de moins que la semaine dernière. On se reprend ?", "Un peu moins bien que la semaine dernière. Je garde confiance."],
    compareMieux: ["Mieux que la semaine dernière. Je note, je note.", "En progrès ! Je vous accorde une caresse."],
    compareMoins: ["Un peu moins que la semaine dernière. Je ne juge pas. Enfin, un peu.", "Moins que la semaine dernière. La prochaine sera la bonne."],
    argentMoins: ["{pct} % de dépenses en moins que la semaine dernière. Le banquier est ravi."],
    argentPlus: ["{pct} % de dépenses en plus que la semaine dernière. Le banquier fronce les moustaches."],
  };

  // ---------------------------------------------------------------------------
  // Les semaines spéciales : le modèle « Saison » remplace la rotation.
  // ---------------------------------------------------------------------------
  const SAISONS = {
    anniversaire: {
      nom: "Anniversaire de Mimi", emoji: "🎂", titre: "Spécial anniversaire",
      ouverture: ["C'est MA semaine : j'ai un an de plus ! Installez-vous.", "Joyeux anniversaire… à moi ! Voici votre semaine."],
      fin: ["Merci pour la fête ! Où sont mes cadeaux ?", "Un an de plus, et toujours aussi beau. Bonne semaine !"],
    },
    noel: {
      nom: "Noël", emoji: "🎄", titre: "Spécial Noël",
      ouverture: ["Joyeux Noël les humains ! Le journal est sous le sapin.", "Ho ho ho ! J'ai mis mon bonnet pour votre semaine."],
      fin: ["Joyeux Noël ! Je garde le papier cadeau, c'est pour moi.", "Bonnes fêtes ! Et pensez à ma gamelle du réveillon."],
    },
    halloween: {
      nom: "Halloween", emoji: "🎃", titre: "Spécial Halloween",
      ouverture: ["Bouh ! C'est la semaine d'Halloween. Même pas peur ?", "Un journal ensorcelé vous attend… Miaouhahaha."],
      fin: ["Des bonbons ou une caresse ! Bonne semaine.", "Les fantômes sont partis. Bonne semaine, les humains !"],
    },
    ete: {
      nom: "L'été", emoji: "☀️", titre: "Spécial été",
      ouverture: ["C'est l'été ! J'ai sorti mes lunettes de soleil.", "Premier jour de l'été : rebord de fenêtre réservé."],
      fin: ["Bon été ! Je retourne à ma sieste au soleil.", "Pensez à l'eau fraîche (pour moi). Bonne semaine !"],
    },
  };
  RS.SAISONS = SAISONS;
  // Une semaine est spéciale si l'un de ses jours tombe sur une date de fête (« MM-JJ »).
  RS.saisonDe = (debut, anniversaireChat) => {
    const jours = Array.from({ length: 7 }, (_, i) => ajouterJours(debut, i).slice(5));
    if (anniversaireChat && jours.includes(anniversaireChat)) return "anniversaire";
    if (jours.includes("12-24") || jours.includes("12-25")) return "noel";
    if (jours.includes("10-31")) return "halloween";
    if (jours.includes("06-21")) return "ete";
    return null;
  };

  // ---------------------------------------------------------------------------
  // Comparé à la semaine dernière. sens : 1 = plus c'est mieux, -1 = moins c'est mieux, 0 = neutre.
  // ---------------------------------------------------------------------------
  const COMPARAISONS = {
    note: { actuel: (d) => d.note?.valeur, avant: (p) => p.note, mot: ["point", "points"], sens: 1 },
    argent: { actuel: (d) => d.bilan.argent?.depense, avant: (p) => p.argent?.depense, pourcent: true, sens: -1 },
    sport: { actuel: (d) => d.bilan.sport?.seances, avant: (p) => p.sport?.seances, sens: 1 },
    cuisine: { actuel: (d) => d.bilan.cuisine?.cuisines, avant: (p) => p.cuisine?.cuisines, sens: 1 },
    maison: { actuel: (d) => d.bilan.maison?.faites, avant: (p) => p.maison?.faites, sens: 1 },
    soins: { actuel: (d) => d.bilan.soins?.repas, avant: (p) => p.soins?.repas, sens: 0 },
    cinema: { actuel: (d) => d.bilan.cinema?.films.length, avant: (p) => p.cinema?.films, sens: 0 },
    dj: { actuel: (d) => d.bilan.dj?.morceaux, avant: (p) => p.dj?.morceaux, sens: 0 },
    photos: { actuel: (d) => d.bilan.photos?.nombre, avant: (p) => p.photos?.nombre, sens: 0 },
  };

  function evolution(regle, actuel, avant) {
    if (actuel == null || avant == null) return null;
    let ecart, signe, texte;
    if (regle.pourcent) {
      if (!avant) return null;
      const pct = Math.round(((actuel - avant) / avant) * 100);
      signe = Math.sign(pct);
      ecart = Math.abs(pct);
      texte = `${ecart} % de ${signe > 0 ? "plus" : "moins"}`;
    } else {
      const d = Math.round((actuel - avant) * 10) / 10;
      signe = Math.sign(d);
      ecart = Math.abs(d);
      texte = `${fmtEntier.format(ecart)}${regle.mot ? ` ${ecart > 1 ? regle.mot[1] : regle.mot[0]}` : ""} de ${signe > 0 ? "plus" : "moins"}`;
    }
    texte = signe === 0 ? "= comme la semaine dernière" : `${signe > 0 ? "↑" : "↓"} ${texte} que la semaine dernière`;
    const qualite = signe === 0 ? "pareil" : regle.sens === 0 ? "neutre" : signe === regle.sens ? "mieux" : "moins-bien";
    const relatif = avant ? Math.abs(actuel - avant) / Math.abs(avant) : 1;
    return { texte, qualite, signe, ecart, relatif };
  }

  // Ajoute l'étiquette sous le grand chiffre, et fait commenter Mimi.
  function comparer(ecrans, donnees, h, dire) {
    const p = donnees.precedente;
    if (!p) return;
    const candidats = [];
    for (const e of ecrans) {
      const regle = COMPARAISONS[e.type];
      const ev = regle && evolution(regle, regle.actuel(donnees), regle.avant(p));
      if (!ev) continue;
      const etiquette = `<p class="rs-evolution rs-evo-${ev.qualite}" data-rs="evolution">${ev.texte}</p>`;
      const i = e.corps.indexOf("</p>", e.corps.indexOf('class="rs-chiffre'));
      e.corps = i < 0 ? etiquette + e.corps : e.corps.slice(0, i + 4) + etiquette + e.corps.slice(i + 4);
      if (e.type === "note") {
        if (ev.signe !== 0) e.phrase = dire(ev.signe > 0 ? "noteMieux" : "noteMoins", { ecart: `${ev.ecart} point${ev.ecart > 1 ? "s" : ""}` });
      } else if (ev.signe !== 0) candidats.push({ e, ev });
    }
    // Mimi commente une ou deux rubriques qui ont le plus bougé, pas toutes.
    candidats.sort((x, y) => y.ev.relatif - x.ev.relatif).slice(0, 2).forEach(({ e, ev }) => {
      if (h() < 0.3) return;
      if (e.type === "argent") e.phrase = dire(ev.signe < 0 ? "argentMoins" : "argentPlus", { pct: ev.ecart });
      else if (ev.qualite === "mieux") e.phrase = dire("compareMieux");
      else if (ev.qualite === "moins-bien") e.phrase = dire("compareMoins");
    });
  }

  const REACTIONS = ["❤️", "😂", "😾"];
  const REACTIFS = ["argent", "sport", "cuisine", "maison", "soins", "cinema", "dj", "photos", "tribunal"];

  const VERDICTS = [
    [17, "Semaine de rêve"],
    [14, "Belle semaine"],
    [11, "Semaine correcte"],
    [0, "Semaine compliquée"],
  ];

  const METEO = { soleil: "☀️", eclaircies: "🌤️", nuages: "☁️", pluie: "🌧️", orage: "⛈️", neige: "❄️" };
  const PHOTOS = [[/soleil|sieste/i, "😴"], [/carton/i, "📦"], [/gratin|plat|repas/i, "🥘"], [/parc|balade/i, "🌳"], [/ruban|jeu/i, "🎀"], [/pluie/i, "🌧️"]];
  const TEINTES = ["#f9d9d4", "#fbdcc4", "#fbeac0", "#cfeadf", "#dde9d4", "#d7e8f5", "#e8dff5"];

  // ---------------------------------------------------------------------------
  // Simuler une autre semaine : on décale les dates et on fait varier la note.
  // ---------------------------------------------------------------------------
  function semaineSimulee(base, numero) {
    const d = structuredClone(base);
    const k = numero - base.semaine.numero;
    if (k === 0) return d;
    const decaler = (iso) => (iso ? ajouterJours(iso, 7 * k) : iso);
    d.semaine.numero = numero;
    d.semaine.debut = decaler(d.semaine.debut);
    d.semaine.fin = decaler(d.semaine.fin);
    for (const liste of [d.aVenir.agenda, d.aVenir.anniversaires, d.aVenir.meteo]) for (const x of liste) x.jour = decaler(x.jour);
    const h = hasard(graine("note", numero));
    d.note.valeur = Math.max(8, Math.min(19, base.note.valeur + Math.round((h() - 0.5) * 8)));
    d.note.verdict = VERDICTS.find(([min]) => d.note.valeur >= min)[1];
    return d;
  }

  // ---------------------------------------------------------------------------
  // Les écrans
  // ---------------------------------------------------------------------------
  function compte(valeur, format = "entier") {
    return `<span class="rs-compte" data-rs-compte="${valeur}" data-format="${format}">${format === "euros" ? euros(valeur) : fmtEntier.format(valeur)}</span>`;
  }

  function fabriquerEcrans(donnees, { quiFaitQuoi, h, masquees = [], saison = null }) {
    const prenom = (id) => donnees.foyer.personnes.find((p) => p.id === id)?.prenom ?? "";
    const duo = (parPersonne, unite) => {
      if (!quiFaitQuoi || !parPersonne) return "";
      return `<ul class="rs-duo" data-rs="liste">${donnees.foyer.personnes
        .map((p) => `<li><b>${fmtEntier.format(parPersonne[p.id] ?? 0)}</b>${esc(p.prenom)} · ${unite}</li>`)
        .join("")}</ul>`;
    };
    const dire = (cle, vars = {}) => remplir(choisir(h, PHRASES[cle]), vars);
    const b = donnees.bilan;
    const ecrans = [];
    const { debut, fin, numero } = donnees.semaine;

    ecrans.push({
      type: "ouverture", picto: "📰", titre: "Le journal de la semaine", role: "hote", humeur: "content", duree: 4800,
      corps: `<p class="rs-sur-titre" data-rs="sur-titre">${saison ? `${SAISONS[saison].emoji} ${SAISONS[saison].titre} · ` : ""}Semaine ${numero}</p><p class="rs-grand-titre" data-rs="grand-titre">${esc(majuscule(periode(debut, fin)))}</p>`,
      phrase: saison ? choisir(h, SAISONS[saison].ouverture) : dire("ouverture"),
    });

    const n = donnees.note;
    const cleNote = n.valeur >= 15 ? "noteHaute" : n.valeur >= 11 ? "noteMoyenne" : "noteBasse";
    ecrans.push({
      type: "note", picto: "⭐", titre: "La note de la semaine", role: "hote",
      humeur: n.valeur >= 15 ? "content" : n.valeur >= 11 ? "normal" : "surpris", duree: 7200,
      corps: `<p class="rs-chiffre" data-rs="chiffre">${compte(n.valeur)}<span class="rs-unite">/${n.sur}</span></p>
              <p class="rs-tampon" data-rs="tampon">${esc(n.verdict)}</p>`,
      phrase: dire(cleNote),
    });

    const rubriques = [];

    if (b.argent) {
      const a = b.argent;
      const max = Math.max(...a.categories.map((c) => c.montant));
      const eq = a.equilibre;
      const ligneEq = !eq ? "" : quiFaitQuoi
        ? `${esc(prenom(eq.de))} doit ${euros(eq.montant)} à ${esc(prenom(eq.a))}`
        : `Un rééquilibrage de ${euros(eq.montant)} à prévoir`;
      rubriques.push({
        type: "argent", picto: "💶", titre: "Argent", role: "banquier", duree: 6500,
        corps: `<p class="rs-chiffre rs-moyen" data-rs="chiffre">${compte(a.depense, "euros")}</p>
                <p class="rs-legende" data-rs="legende">dépensés cette semaine</p>
                <ul class="rs-liste rs-barres" data-rs="liste">${a.categories.slice(0, 3).map((c) =>
                  `<li><span>${esc(c.nom)}</span><span class="rs-barre" style="--rs-part:${(c.montant / max).toFixed(3)}"></span><span>${euros(c.montant)}</span></li>`).join("")}</ul>
                ${ligneEq ? `<p class="rs-legende rs-ligne" data-rs="note"><span class="rs-ligne-picto">🤝</span>${ligneEq}</p>` : ""}`,
        phrase: dire("argent", { depense: euros(a.depense) }),
      });
    }

    if (b.sport) {
      const s = b.sport;
      const fini = s.seances >= s.objectif;
      rubriques.push({
        type: "sport", picto: "🏃", titre: "Sport", role: "coach", humeur: fini ? "content" : "normal", duree: 6000,
        corps: `<p class="rs-chiffre" data-rs="chiffre">${compte(s.seances)}<span class="rs-unite">/${s.objectif}</span></p>
                <p class="rs-legende" data-rs="legende">séances sur l'objectif de la semaine</p>
                <div class="rs-jauge" data-rs="jauge" style="--rs-part:${Math.min(1, s.seances / s.objectif).toFixed(3)}"><span></span></div>
                ${duo(s.parPersonne, "séances")}`,
        phrase: fini ? dire("sportFini") : dire("sport", { seances: s.seances, reste: pluriel(s.objectif - s.seances, "séance", "séances") }),
      });
    }

    if (b.cuisine) {
      const c = b.cuisine;
      rubriques.push({
        type: "cuisine", picto: "🍳", titre: "Cuisine", role: "chef", duree: 6000,
        corps: `<p class="rs-chiffre" data-rs="chiffre">${compte(c.cuisines)}<span class="rs-unite">/${c.planifies}</span></p>
                <p class="rs-legende" data-rs="legende">repas faits maison sur ${c.planifies} prévus</p>
                <ul class="rs-liste" data-rs="liste">
                  ${c.star ? `<li class="rs-ligne"><span class="rs-ligne-picto">⭐</span>Le plat star : ${esc(c.star)}</li>` : ""}
                  ${c.stocksBas?.length ? `<li class="rs-ligne"><span class="rs-ligne-picto">🛒</span>À racheter : ${esc(c.stocksBas.join(", "))}</li>` : ""}
                </ul>`,
        phrase: dire("cuisine", { star: (c.star || "plat").toLowerCase(), cuisines: c.cuisines, stock: (c.stocksBas?.[0] || "croquettes").toLowerCase() }),
      });
    }

    if (b.maison) {
      const m = b.maison;
      rubriques.push({
        type: "maison", picto: "🧹", titre: "Maison", role: "majordome", duree: 6000,
        corps: `<p class="rs-chiffre" data-rs="chiffre">${compte(m.faites)}</p>
                <p class="rs-legende" data-rs="legende">tâches faites${m.enRetard ? `, ${pluriel(m.enRetard, "en retard", "en retard")}` : ""}</p>
                ${m.phare ? `<p class="rs-legende rs-ligne" data-rs="note"><span class="rs-ligne-picto">🏆</span>${esc(m.phare)}</p>` : ""}
                ${duo(m.parPersonne, "tâches")}`,
        phrase: dire("maison", { faites: m.faites, retard: m.enRetard }),
      });
    }

    if (b.soins) {
      const s = b.soins;
      rubriques.push({
        type: "soins", picto: "🩺", titre: `Soins de ${esc(donnees.foyer.chat)}`, role: "veto", humeur: "content", duree: 6000,
        corps: `<p class="rs-chiffre" data-rs="chiffre">${compte(s.repas)}</p>
                <p class="rs-legende" data-rs="legende">repas servis</p>
                <ul class="rs-liste" data-rs="liste">
                  <li class="rs-ligne"><span class="rs-ligne-picto">🪮</span>${pluriel(s.brossages, "brossage", "brossages")}</li>
                  <li class="rs-ligne"><span class="rs-ligne-picto">🧶</span>${pluriel(s.jeux, "séance de jeu", "séances de jeu")}</li>
                  <li class="rs-ligne"><span class="rs-ligne-picto">🔥</span>${pluriel(s.serie, "jour", "jours")} de câlins d'affilée</li>
                </ul>
                ${duo(s.parPersonne, "soins")}`,
        phrase: dire("soins", { repas: s.repas, serie: s.serie }),
      });
    }

    if (b.cinema) {
      const c = b.cinema;
      const etoiles = (k) => "★".repeat(k) + "☆".repeat(5 - k);
      const premier = c.films[0];
      rubriques.push({
        type: "cinema", picto: "🎬", titre: "Cinéma", role: "critique", duree: 6000,
        corps: `<p class="rs-chiffre" data-rs="chiffre">${compte(c.films.length)}<span class="rs-unite">${c.films.length > 1 ? "films" : "film"}</span></p>
                <ul class="rs-liste rs-films" data-rs="liste">${c.films.map((f) =>
                  `<li><span class="rs-film-titre">${esc(f.titre)}</span><span class="rs-etoiles" aria-label="${f.note} sur 5">${etoiles(f.note)}</span></li>`).join("")}
                  ${c.series.map((s) => `<li><span class="rs-film-titre">${esc(s.titre)}</span><span class="rs-film-info">${pluriel(s.episodes, "épisode", "épisodes")}</span></li>`).join("")}
                </ul>`,
        phrase: premier ? dire("cinema", { film: esc(premier.titre), etoiles: premier.note, nb: pluriel(c.films.length, "film", "films") }) : choisir(h, PHRASES.cinema.slice(2)),
      });
    }

    if (b.dj) {
      const d = b.dj;
      rubriques.push({
        type: "dj", picto: "🎧", titre: `DJ ${esc(donnees.foyer.chat)}`, role: "dj", humeur: "content", duree: 6000,
        corps: `<div class="rs-morceau" data-rs="morceau"><div class="rs-vinyle" aria-hidden="true"></div>
                  <div><p class="rs-morceau-titre">${esc(d.top.titre)}</p><p class="rs-morceau-artiste">${esc(d.top.artiste)}</p></div></div>
                <p class="rs-chiffre rs-moyen" data-rs="chiffre">${compte(d.morceaux)}<span class="rs-unite">morceaux</span></p>
                <p class="rs-legende" data-rs="legende">partagés cette semaine</p>
                ${duo(d.parPersonne, "partagés")}`,
        phrase: dire("dj", { titre: esc(d.top.titre), morceaux: d.morceaux }),
      });
    }

    if (b.photos) {
      const p = b.photos;
      rubriques.push({
        type: "photos", picto: "📸", titre: "Photos de la semaine", role: "paparazzi", duree: 6500,
        corps: `<ul class="rs-photos" data-rs="liste">${p.legendes.slice(0, 6).map((l, i) => {
                  const dessin = (PHOTOS.find(([re]) => re.test(l)) || [, "📷"])[1];
                  return `<li style="--rs-teinte:${TEINTES[(i * 3) % TEINTES.length]}"><span class="rs-photo-dessin" aria-hidden="true">${dessin}</span><span class="rs-photo-legende">${esc(l)}</span></li>`;
                }).join("")}</ul>`,
        phrase: dire("photos", { nombre: p.nombre }),
      });
    }

    if (b.tribunal?.betises?.length) {
      const t = b.tribunal;
      rubriques.push({
        type: "tribunal", picto: "⚖️", titre: "Le tribunal des bêtises", role: "juge", duree: 6800,
        corps: `<ul class="rs-liste rs-betises" data-rs="liste">${t.betises.map((x) =>
                  `<li><b>${esc(majuscule(x.jour))}</b> ${esc(x.quoi)}</li>`).join("")}</ul>
                <p class="rs-tampon" data-rs="tampon">Coupable</p>
                <p class="rs-legende" data-rs="legende">Peine : ${esc(t.peine)}</p>`,
        phrase: dire("tribunal"),
      });
    }

    ecrans.push(...melanger(h, rubriques).filter((r) => !masquees.includes(r.type)));

    ecrans.push({
      type: "transition", picto: "", titre: "", role: "hote", humeur: "content", duree: 3600,
      corps: `<p class="rs-sur-titre" data-rs="sur-titre">Et maintenant…</p><p class="rs-grand-titre" data-rs="grand-titre">la semaine qui arrive</p>`,
      phrase: dire("transition"),
    });

    const premierJour = ajouterJours(fin, 1);
    const jours = Array.from({ length: 7 }, (_, i) => ajouterJours(premierJour, i));
    const ag = donnees.aVenir.agenda;
    ecrans.push({
      type: "agenda", picto: "📅", titre: "Au programme", role: "majordome", narrateur: "petit", duree: 7800,
      corps: `<ol class="rs-semaine" data-rs="liste">${jours.map((j) => {
                const items = ag.filter((e) => e.jour === j).map((e) =>
                  `${esc(e.quoi)}${e.heure ? ` · ${heure(e.heure)}` : ""}${quiFaitQuoi && e.qui ? ` · ${esc(prenom(e.qui))}` : ""}`);
                return `<li${items.length ? "" : ' class="rs-vide"'}><span class="rs-jour">${jourCourt(j)} ${dateDe(j).getDate()}</span><span>${items.join("<br>") || "Rien de prévu"}</span></li>`;
              }).join("")}</ol>`,
      phrase: dire("agenda"),
    });

    const anniv = donnees.aVenir.anniversaires;
    if (anniv?.length) {
      ecrans.push({
        type: "anniversaires", picto: "🎂", titre: "Anniversaires", role: "hote", humeur: "content", duree: 5200,
        corps: `<ul class="rs-liste rs-anniv" data-rs="liste">${anniv.map((a) =>
                  `<li><b>${esc(majuscule(jourLong(a.jour)))} ${dateDe(a.jour).getDate()}</b><span>${esc(a.qui)}${a.age ? `, ${a.age} ans` : ""}</span></li>`).join("")}</ul>`,
        phrase: dire("anniversaires"),
      });
    }

    const meteo = donnees.aVenir.meteo;
    if (meteo?.length) {
      const pluie = meteo.some((m) => m.temps === "pluie" || m.temps === "orage");
      ecrans.push({
        type: "meteo", picto: "🌦️", titre: "La météo", role: pluie ? "meteo" : "hote", humeur: pluie ? "normal" : "content", narrateur: "petit", duree: 6500,
        corps: `<ol class="rs-meteo" data-rs="liste">${meteo.slice(0, 7).map((m) =>
                  `<li><span>${jourCourt(m.jour)}</span><span class="rs-meteo-icone" aria-label="${esc(m.temps)}">${METEO[m.temps] || "🌡️"}</span><b>${m.max}°</b><span>${m.min}°</span></li>`).join("")}</ol>`,
        phrase: dire(pluie ? "meteoPluie" : "meteoBeau"),
      });
    }

    ecrans.push({
      type: "fin", picto: "🐾", titre: `Le mot de ${esc(donnees.foyer.chat)}`, role: "aucun", humeur: "endormi", duree: null,
      corps: `<p class="rs-citation" data-rs="citation">« ${esc(donnees.motDeMimi)} »</p>
              <div class="rs-boutons" data-rs="boutons"><button type="button" data-action="revoir">Revoir</button><button type="button" data-action="fermer">Fermer</button></div>`,
      phrase: saison ? choisir(h, SAISONS[saison].fin) : dire("fin"),
    });

    comparer(ecrans, donnees, h, dire);
    return ecrans;
  }

  // ---------------------------------------------------------------------------
  // Le lecteur
  // ---------------------------------------------------------------------------
  class Lecteur {
    constructor(scene, { donnees, modeleId, quiFaitQuoi, reduit, vitesse = 1, masquees = [], saison = null }) {
      this.scene = scene;
      this.modeleId = modeleId;
      this.modele = RS.modeles[modeleId] || {};
      this.vitesse = vitesse;
      this.reduit = reduit;
      this.gen = 0;
      this.index = -1;
      this.pauseManuelle = false;
      this.pauseSysteme = false;
      this.animations = new Set();

      const numero = donnees.semaine.numero;
      this.donnees = donnees;
      this.quiFaitQuoi = quiFaitQuoi;
      this.saison = modeleId === "saison" ? saison || "anniversaire" : null;
      [this.moi, this.autre] = donnees.foyer.personnes;
      this.cleReactions = `rs-reactions-${numero}`;
      this.h = hasard(graine("variante", numero, modeleId));
      this.ecrans = fabriquerEcrans(donnees, { quiFaitQuoi, masquees, saison: this.saison, h: hasard(graine("contenu", numero)) });
      this.accent = this.modele.accents ? choisir(this.h, this.modele.accents) : "#f4a894";

      scene.replaceChildren();
      scene.dataset.mode = "story";
      scene.dataset.modele = modeleId;
      if (this.saison) scene.dataset.saison = this.saison;
      else delete scene.dataset.saison;
      scene.style.setProperty("--rs-accent", this.accent);
      scene.classList.toggle("rs-reduit", reduit);
      scene.classList.remove("rs-en-pause");

      this.decor = Object.assign(document.createElement("div"), { className: "rs-decor" });
      this.conteneur = Object.assign(document.createElement("div"), { className: "rs-ecrans" });
      this.progression = Object.assign(document.createElement("div"), { className: "rs-progression" });
      this.progression.innerHTML = this.ecrans.map(() => "<span><i></i></span>").join("");
      const signe = Object.assign(document.createElement("div"), { className: "rs-pause-signe", textContent: "Pause" });
      scene.append(this.decor, this.conteneur, this.progression, signe);

      this.outils = this.fabriquerOutils();
      this.modele.installer?.(this.decor, this.outils);
      this.brancher();
      this.aller(0, 1);
    }

    fabriquerOutils() {
      const lecteur = this;
      return {
        hasard: this.h,
        reduit: this.reduit,
        saison: this.saison,
        accent: this.accent,
        scene: this.scene,
        decor: this.decor,
        animer(el, images, options) {
          if (!el) return null;
          const a = el.animate(images, { fill: "both", easing: "ease-out", ...options });
          lecteur.animations.add(a);
          a.finished.then(() => lecteur.animations.delete(a), () => lecteur.animations.delete(a));
          if (lecteur.estEnPause()) a.pause();
          return a;
        },
        compter: (racine, opts) => this.compter(racine, opts),
        mimi: (o) => RS.mimi({ couleurs: this.modele.couleursMimi, costume: this.saison, ...o }),
        enPause: () => this.estEnPause(),
        // Barres et jauges qui se remplissent jusqu'à leur valeur (--rs-part).
        remplir(ecran, { duree = 900, delai = 0, easing = "cubic-bezier(.2,.8,.2,1)", ecart = 120 } = {}) {
          [...ecran.querySelectorAll(".rs-barre, .rs-jauge > span")].forEach((el, k) => {
            const part = parseFloat(getComputedStyle(el).getPropertyValue("--rs-part")) || 0;
            this.animer(el, [{ transform: "scaleX(0)" }, { transform: `scaleX(${part})` }], { duration: duree, delay: delai + k * ecart, easing });
          });
        },
      };
    }

    estEnPause() { return this.pauseManuelle || this.pauseSysteme; }

    // Chiffres qui défilent : continus, ou par paliers (opts.paliers) pour l'effet « score ».
    compter(racine, { duree = 1100, delai = 0, paliers = 0, ecrire: ecrireTexte } = {}) {
      const gen = this.gen;
      const cibles = [...(racine.matches?.("[data-rs-compte]") ? [racine] : []), ...racine.querySelectorAll("[data-rs-compte]")];
      const ecrire = (el, v) => {
        const texte = el.dataset.format === "euros" ? euros(v) : fmtEntier.format(Math.round(v));
        if (ecrireTexte) ecrireTexte(el, texte);
        else el.textContent = texte;
      };
      if (this.reduit) { cibles.forEach((el) => ecrire(el, Number(el.dataset.rsCompte))); return Promise.resolve(); }
      return Promise.all(cibles.map((el) => new Promise((fin) => {
        const cible = Number(el.dataset.rsCompte);
        let ecoule = -delai;
        let avant = performance.now();
        ecrire(el, 0);
        const pas = (t) => {
          if (gen !== this.gen) return fin();
          if (!this.estEnPause()) ecoule += t - avant;
          avant = t;
          let p = Math.min(1, Math.max(0, ecoule / duree));
          if (paliers) p = Math.floor(p * paliers) / paliers;
          const ease = 1 - Math.pow(1 - p, 3);
          const v = cible * ease;
          ecrire(el, el.dataset.format === "euros" ? Math.round(v * 100) / 100 : v);
          if (ecoule < duree) requestAnimationFrame(pas);
          else { ecrire(el, cible); fin(); }
        };
        requestAnimationFrame(pas);
      })));
    }

    lireReactions() {
      try { return JSON.parse(localStorage.getItem(this.cleReactions) || "{}"); } catch (_) { return {}; }
    }

    ecrireReactions(r) {
      try { localStorage.setItem(this.cleReactions, JSON.stringify(r)); } catch (_) { /* navigation privée */ }
    }

    htmlReactions(type) {
      const mien = this.lireReactions()[type];
      const sienne = this.donnees.reactions?.[this.autre?.id]?.[type];
      const nom = this.quiFaitQuoi && this.autre ? esc(this.autre.prenom) : "L'autre";
      return `<div class="rs-reactions" role="group" aria-label="Réagir à cet écran">
        ${REACTIONS.map((r) => `<button type="button" class="rs-reaction" data-reaction="${r}" aria-pressed="${mien === r}" aria-label="Réagir : ${r}">${r}</button>`).join("")}
        ${sienne ? `<span class="rs-reaction-autre">${nom} : ${sienne}</span>` : ""}
      </div>`;
    }

    // Une petite gerbe d'emojis s'envole du bouton touché.
    gerbe(bouton, emoji) {
      bouton.animate([{ transform: "scale(1)" }, { transform: "scale(1.35)" }, { transform: "scale(1)" }], { duration: 320, easing: "ease-out" });
      if (this.reduit) return;
      const s = this.scene.getBoundingClientRect();
      const b = bouton.getBoundingClientRect();
      for (let k = 0; k < 7; k++) {
        const p = document.createElement("span");
        p.className = "rs-gerbe";
        p.textContent = emoji;
        p.style.left = `${b.left - s.left + b.width / 2}px`;
        p.style.top = `${b.top - s.top}px`;
        this.scene.append(p);
        const dx = ((Math.random() * 2 - 1) * 14).toFixed(1);
        const dy = (12 + Math.random() * 16).toFixed(1);
        const r = ((Math.random() * 2 - 1) * 40).toFixed(0);
        const a = p.animate([
          { transform: "translate(-50%, 0) scale(.6)", opacity: 1 },
          { transform: `translate(calc(-50% + ${dx}cqw), -${dy}cqh) rotate(${r}deg) scale(1.3)`, opacity: 0 },
        ], { duration: 900 + Math.random() * 400, easing: "cubic-bezier(.2,.7,.3,1)" });
        const fin = () => p.remove();
        a.finished.then(fin, fin);
      }
    }

    creerEcran(i) {
      const e = this.ecrans[i];
      const reactif = e.type === "note" || REACTIFS.includes(e.type);
      let corps = e.corps;
      if (e.type === "fin") {
        const compte = {};
        for (const r of Object.values(this.lireReactions())) compte[r] = (compte[r] || 0) + 1;
        const resume = REACTIONS.filter((r) => compte[r]).map((r) => `${r} ×${compte[r]}`).join("  ");
        if (resume) corps = corps.replace('<div class="rs-boutons"', `<p class="rs-bilan-reactions" data-rs="bilan-reactions">Tes réactions de la semaine : ${resume}</p><div class="rs-boutons"`);
      }
      const section = document.createElement("section");
      section.className = `rs-ecran rs-e-${e.type}`;
      section.dataset.type = e.type;
      if (e.narrateur) section.dataset.narrateur = e.narrateur;
      section.setAttribute("aria-label", e.titre || e.type);
      section.innerHTML = `
        <div class="rs-ecran-fond" aria-hidden="true"></div>
        <div class="rs-ecran-contenu">
          ${e.titre ? `<header class="rs-entete" data-rs="entete">${e.picto ? `<span class="rs-picto" aria-hidden="true">${e.picto}</span>` : ""}<h2 class="rs-titre" data-rs="titre">${e.titre}</h2></header>` : ""}
          <div class="rs-corps">${corps}</div>
        </div>
        <div class="rs-narrateur" data-rs="narrateur">
          <p class="rs-bulle" data-rs="bulle">${e.phrase}</p>
          <div class="rs-mimi" data-rs="mimi">${this.outils.mimi({ role: e.role, humeur: e.humeur || "normal", anime: !this.reduit })}</div>
          ${reactif ? this.htmlReactions(e.type) : ""}
        </div>`;
      return section;
    }

    finirAnimations() {
      for (const a of [...this.animations]) { try { a.finish(); } catch (_) { a.cancel(); } }
      this.animations.clear();
    }

    async aller(i, sens) {
      if (i < 0 || i >= this.ecrans.length) return;
      // Changer d'écran relance la lecture (comme une story) : sinon la transition resterait figée.
      if (this.pauseManuelle) this.mettreEnPause("manuelle", false);
      const gen = ++this.gen;
      this.finirAnimations();
      for (const e of [...this.conteneur.children]) if (e !== this.courant) e.remove();
      const ancien = this.courant;
      const nouveau = this.creerEcran(i);
      this.courant = nouveau;
      this.index = i;
      this.conteneur.append(nouveau);
      this.modele.preparer?.(nouveau, this.ecrans[i], this.outils, i);
      this.majProgression();

      if (ancien) {
        if (this.reduit || !this.modele.passer) {
          await this.fondu(ancien, nouveau);
        } else {
          await (this.modele.passer(ancien, nouveau, sens, this.outils) || Promise.resolve());
        }
        if (gen !== this.gen) return;
        ancien.remove();
      }
      // En mode réduit, rien ne bouge : les chiffres sont déjà écrits à leur valeur finale.
      if (this.reduit) { /* rien */ }
      else if (this.modele.entrer) this.modele.entrer(nouveau, this.outils, this.ecrans[i]);
      else this.entreeParDefaut(nouveau);
      if (!this.reduit) this.outils.animer(nouveau.querySelector(".rs-reactions"), [
        { opacity: 0, transform: "translateY(1.5cqh)" }, { opacity: 1, transform: "none" },
      ], { duration: 420, delay: 950 });
      this.lancerMinuterie(gen);
    }

    fondu(ancien, nouveau) {
      const o = this.outils;
      o.animer(nouveau, [{ opacity: 0 }, { opacity: 1 }], { duration: this.reduit ? 160 : 280 });
      const a = o.animer(ancien, [{ opacity: 1 }, { opacity: 0 }], { duration: this.reduit ? 160 : 280 });
      return a.finished.catch(() => {});
    }

    entreeParDefaut(ecran) {
      const o = this.outils;
      [...ecran.querySelectorAll("[data-rs]")].forEach((el, k) =>
        o.animer(el, [{ opacity: 0, transform: "translateY(12px)" }, { opacity: 1, transform: "none" }], { duration: 420, delay: 80 * k }));
      this.compter(ecran, { delai: 300 });
    }

    majProgression() {
      [...this.progression.children].forEach((s, k) => {
        const i = s.firstElementChild;
        i.getAnimations().forEach((a) => a.cancel());
        i.style.transform = k < this.index ? "scaleX(1)" : "scaleX(0)";
      });
    }

    lancerMinuterie(gen) {
      const barre = this.progression.children[this.index]?.firstElementChild;
      const ecran = this.ecrans[this.index];
      if (!barre) return;
      if (!ecran.duree) { barre.style.transform = "scaleX(1)"; return; }
      const a = barre.animate([{ transform: "scaleX(0)" }, { transform: "scaleX(1)" }], { duration: ecran.duree * this.vitesse, fill: "forwards", easing: "linear" });
      if (this.estEnPause()) a.pause();
      a.finished.then(() => { if (gen === this.gen) this.suivant(); }, () => {});
    }

    suivant() { if (this.index < this.ecrans.length - 1) this.aller(this.index + 1, 1); }
    precedent() { this.aller(Math.max(0, this.index - 1), -1); }

    mettreEnPause(cause, oui) {
      if (cause === "manuelle") this.pauseManuelle = oui;
      else this.pauseSysteme = oui;
      const pause = this.estEnPause();
      this.scene.classList.toggle("rs-en-pause", pause);
      for (const a of this.scene.getAnimations({ subtree: true })) {
        if (pause && a.playState === "running") a.pause();
        else if (!pause && a.playState === "paused") a.play();
      }
    }

    brancher() {
      const s = this.scene;
      this.ecouteurs = [];
      const ecouter = (cible, type, f, o) => { cible.addEventListener(type, f, o); this.ecouteurs.push([cible, type, f, o]); };
      let appui = null;

      ecouter(s, "pointerdown", (e) => {
        if (e.button > 0 || e.target.closest("button, a")) return;
        appui = { x: e.clientX, tenu: false, minuterie: setTimeout(() => { appui.tenu = true; this.mettreEnPause("manuelle", true); }, 230) };
      });
      const relacher = (e, annule) => {
        if (!appui) return;
        clearTimeout(appui.minuterie);
        if (appui.tenu) this.mettreEnPause("manuelle", false);
        else if (!annule) {
          const r = s.getBoundingClientRect();
          (e.clientX - r.left) / r.width < 0.33 ? this.precedent() : this.suivant();
        }
        appui = null;
      };
      ecouter(s, "pointerup", (e) => relacher(e, false));
      ecouter(s, "pointercancel", (e) => relacher(e, true));
      ecouter(s, "pointerleave", (e) => relacher(e, true));
      ecouter(s, "contextmenu", (e) => e.preventDefault());
      ecouter(s, "click", (e) => {
        const reaction = e.target.closest("[data-reaction]");
        if (reaction) {
          const type = this.ecrans[this.index].type;
          const toutes = this.lireReactions();
          const choix = reaction.dataset.reaction;
          if (toutes[type] === choix) delete toutes[type];
          else toutes[type] = choix;
          this.ecrireReactions(toutes);
          reaction.parentElement.querySelectorAll("[data-reaction]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.reaction === toutes[type])));
          if (toutes[type] === choix) this.gerbe(reaction, choix);
          return;
        }
        const bouton = e.target.closest("[data-action]");
        if (!bouton) return;
        if (bouton.dataset.action === "revoir") this.aller(0, -1);
        if (bouton.dataset.action === "fermer") this.fermer();
      });
      ecouter(document, "keydown", (e) => {
        if (e.target.closest?.(".rs-reglages") || e.target.matches?.("input, button, select, textarea")) return;
        if (e.key === "ArrowRight") { e.preventDefault(); this.suivant(); }
        if (e.key === "ArrowLeft") { e.preventDefault(); this.precedent(); }
        if (e.key === " ") { e.preventDefault(); this.mettreEnPause("manuelle", !this.pauseManuelle); }
      });
      ecouter(document, "visibilitychange", () => this.mettreEnPause("systeme", document.hidden));
    }

    fermer() {
      this.mettreEnPause("manuelle", true);
      const f = document.createElement("div");
      f.className = "rs-fermee";
      f.innerHTML = `<p>📰 Le journal de la semaine est rangé.</p><button type="button">Le rouvrir</button>`;
      f.querySelector("button").addEventListener("click", () => { f.remove(); this.mettreEnPause("manuelle", false); this.aller(0, -1); });
      this.scene.append(f);
    }

    detruire() {
      this.gen++;
      this.finirAnimations();
      for (const [cible, type, f, o] of this.ecouteurs || []) cible.removeEventListener(type, f, o);
      this.modele.quitter?.(this.decor, this.outils);
      this.scene.getAnimations({ subtree: true }).forEach((a) => a.cancel());
    }
  }

  // ---------------------------------------------------------------------------
  // Chargement des modèles : un seul téléchargé à la fois, à la demande.
  // ---------------------------------------------------------------------------
  const charges = {};
  RS.chargerModele = (id) => {
    if (!charges[id]) {
      const css = new Promise((ok, ko) => {
        const l = Object.assign(document.createElement("link"), { rel: "stylesheet", href: `modeles/${id}.css` });
        l.onload = ok; l.onerror = () => ko(new Error(`modeles/${id}.css`));
        document.head.append(l);
      });
      const js = new Promise((ok, ko) => {
        const s = Object.assign(document.createElement("script"), { src: `modeles/${id}.js` });
        s.onload = ok; s.onerror = () => ko(new Error(`modeles/${id}.js`));
        document.head.append(s);
      });
      charges[id] = Promise.all([css, js]);
    }
    return charges[id];
  };

  RS.Lecteur = Lecteur;
  RS.semaineSimulee = semaineSimulee;
  RS.outilsTexte = { esc, euros, jourCourt, ajouterJours, periode, dateDe };
})();
