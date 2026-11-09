'use strict';
// Robot de trading fictif : argent imaginaire, vrais cours (Binance, Coinbase en secours).
// Tout tourne dans le navigateur, sans clé ni serveur.

(() => {
  const $ = (s) => document.querySelector(s);

  // ---------- Constantes ----------
  const CAPITAL = 10000;
  const FRAIS = 0.001; // 0,1 % par achat et par vente
  const MAX_BOUGIES = 1500;
  const FENETRE = 24 * 3600e3; // la course se joue sur les dernières 24 h
  const MAX_OPS = 500;
  const DEBUT_COURSE = 25; // bougies d'échauffement pour les indicateurs
  const CLE = 'robot-trading-fictif-v1';

  const BINANCE_REST = 'https://data-api.binance.vision/api/v3/klines';
  const BINANCE_WS = 'wss://data-stream.binance.vision/ws/';
  const COINBASE_REST = 'https://api.exchange.coinbase.com/products/';

  const CRYPTOS = {
    BTC: 'Bitcoin',
    ETH: 'Ethereum',
    SOL: 'Solana',
    XRP: 'XRP',
    DOGE: 'Dogecoin',
    ADA: 'Cardano',
  };
  const DUREES = {
    '1m': { libelle: '1 minute', rythme: 'chaque minute', ms: 60000 },
    '5m': { libelle: '5 minutes', rythme: 'toutes les 5 minutes', ms: 300000 },
    '15m': { libelle: '15 minutes', rythme: 'tous les quarts d\'heure', ms: 900000 },
  };
  // La grande course : cours en dollars, bien plus échangés que les cours en euros, donc plus fiables.
  const ACTIFS = [
    { code: 'BTC', nom: 'Bitcoin', groupe: 'crypto' },
    { code: 'ETH', nom: 'Ethereum', groupe: 'crypto' },
    { code: 'SOL', nom: 'Solana', groupe: 'crypto' },
    { code: 'XRP', nom: 'XRP', groupe: 'crypto' },
    { code: 'DOGE', nom: 'Dogecoin', groupe: 'crypto' },
    { code: 'ADA', nom: 'Cardano', groupe: 'crypto' },
    { code: 'BNB', nom: 'BNB', groupe: 'crypto' },
    { code: 'LINK', nom: 'Chainlink', groupe: 'crypto' },
    { code: 'AVAX', nom: 'Avalanche', groupe: 'crypto' },
    { code: 'LTC', nom: 'Litecoin', groupe: 'crypto' },
    { code: 'PAXG', nom: '🥇 Or', detail: "jeton adossé à l'or", groupe: 'autre' },
    { code: 'EUR', nom: '💶 Euro', detail: 'face au dollar', groupe: 'autre' },
  ];
  const STOPS = { 0: 'aucun', 0.01: 'revend à −1 %', 0.02: 'revend à −2 %', 0.05: 'revend à −5 %' };
  const COULEURS = { vert: '#22c55e', rouge: '#f04f4f', orange: '#f59e0b', bleu: '#60a5fa', violet: '#a78bfa', doux: '#8e98b3', grille: '#1e2741', accent: '#38bdf8' };

  // ---------- Indicateurs ----------
  function moyenne(b, i, n) {
    if (i < n - 1 || i >= b.length) return null;
    let s = 0;
    for (let k = i - n + 1; k <= i; k++) s += b[k].c;
    return s / n;
  }
  // Jauge de 0 à 100 : beaucoup baissé (< 30) ou beaucoup monté (> 70) sur n bougies.
  function rsi(b, i, n = 14) {
    if (i < n || i >= b.length) return null;
    let hausses = 0, baisses = 0;
    for (let k = i - n + 1; k <= i; k++) {
      const d = b[k].c - b[k - 1].c;
      if (d > 0) hausses += d; else baisses -= d;
    }
    if (hausses + baisses === 0) return 50;
    return (100 * hausses) / (hausses + baisses);
  }
  // Record (plus haut) et plus bas des n bougies AVANT la bougie i.
  function plusHaut(b, i, n) {
    if (i < n || i >= b.length) return null;
    let m = -Infinity;
    for (let k = i - n; k < i; k++) m = Math.max(m, b[k].h);
    return m;
  }
  function plusBas(b, i, n) {
    if (i < n || i >= b.length) return null;
    let m = Infinity;
    for (let k = i - n; k < i; k++) m = Math.min(m, b[k].l);
    return m;
  }
  // Dé reproductible : la même bougie donne toujours le même tirage.
  function de(t, sel) {
    let x = (Math.floor(t / 1000) ^ (sel * 0x9e3779b1)) | 0;
    x = Math.imul(x ^ (x >>> 16), 0x45d9f3b);
    x = Math.imul(x ^ (x >>> 16), 0x45d9f3b);
    x ^= x >>> 16;
    return (x >>> 0) / 4294967296;
  }

  // ---------- Méthodes du robot ----------
  const STRATEGIES = {
    tendance: {
      nom: 'Suivre la tendance',
      emoji: '📈',
      regle: "Il suit deux moyennes du prix : une rapide (les 9 dernières bougies, en orange) et une lente (les 21 dernières, en bleu). Quand l'orange passe au-dessus de la bleue, il achète. Quand elle repasse en dessous, il revend.",
      decider(b, i, tient) {
        const r = moyenne(b, i, 9), l = moyenne(b, i, 21);
        const r0 = moyenne(b, i - 1, 9), l0 = moyenne(b, i - 1, 21);
        if (l0 === null || l === null) return null;
        if (!tient && r0 <= l0 && r > l) return { action: 'achat', raison: 'La moyenne rapide passe au-dessus de la lente : ça monte.' };
        if (tient && r0 >= l0 && r < l) return { action: 'vente', raison: 'La moyenne rapide repasse sous la lente : ça redescend.' };
        return null;
      },
      pensee(b, i, tient) {
        const r = moyenne(b, i, 9), l = moyenne(b, i, 21);
        if (l === null) return 'Je regarde les premières bougies…';
        const e = pct((r - l) / l);
        if (tient) return `Je garde tant que l'orange reste au-dessus de la bleue (écart : ${e}).`;
        if (r > l) return "Ça monte déjà, mais j'ai raté le départ : j'attends le prochain croisement.";
        return `J'attends que l'orange passe au-dessus de la bleue (écart : ${e}).`;
      },
      courbes: [
        { nom: 'moyenne rapide (9 bougies)', couleur: COULEURS.orange, f: (b, i) => moyenne(b, i, 9) },
        { nom: 'moyenne lente (21 bougies)', couleur: COULEURS.bleu, f: (b, i) => moyenne(b, i, 21) },
      ],
    },
    creux: {
      nom: 'Acheter les creux',
      emoji: '🔄',
      regle: "Une jauge de 0 à 100 (en bas du graphique) mesure si le prix a beaucoup baissé ou beaucoup monté sur les 14 dernières bougies. Sous 30, ça a beaucoup baissé : il achète en pariant sur un rebond. Au-dessus de 70, ça a beaucoup monté : il revend.",
      decider(b, i, tient) {
        const v = rsi(b, i);
        if (v === null) return null;
        if (!tient && v < 30) return { action: 'achat', raison: `La jauge tombe à ${Math.floor(v)} : le prix a beaucoup baissé, je parie sur un rebond.` };
        if (tient && v > 70) return { action: 'vente', raison: `La jauge monte à ${Math.ceil(v)} : le prix a beaucoup monté, j'encaisse.` };
        return null;
      },
      pensee(b, i, tient) {
        const v = rsi(b, i);
        if (v === null) return 'Je regarde les premières bougies…';
        return tient
          ? `La jauge est à ${Math.round(v)}. Je revends quand elle dépasse 70.`
          : `La jauge est à ${Math.round(v)}. J'achète quand elle passe sous 30.`;
      },
      courbes: [],
      jauge: true,
    },
    cassure: {
      nom: 'Sauter sur les records',
      emoji: '🚀',
      regle: "Il achète dès que le prix bat le record des 20 dernières bougies (ligne verte), en pariant que l'élan va continuer. Il revend si le prix passe sous le plus bas des 10 dernières (ligne rouge).",
      decider(b, i, tient) {
        const h = plusHaut(b, i, 20), l = plusBas(b, i, 10);
        if (h === null) return null;
        const c = b[i].c;
        if (!tient && c > h) return { action: 'achat', raison: `Nouveau record : le prix dépasse ${eur(h)}.` };
        if (tient && c < l) return { action: 'vente', raison: `Le prix passe sous ${eur(l)}, le plus bas récent.` };
        return null;
      },
      pensee(b, i, tient) {
        const h = plusHaut(b, i, 20), l = plusBas(b, i, 10);
        if (h === null) return 'Je regarde les premières bougies…';
        const c = b[i].c;
        if (tient) return `Je garde. Je revends si le prix passe sous ${eur(l)} (encore ${pct((c - l) / c, false)} de marge).`;
        if (c > h) return 'Record battu ! Je confirme à la fin de la bougie…';
        return `J'achète si le prix dépasse ${eur(h)}, le record des 20 dernières bougies (il manque ${pct((h - c) / c, false)}).`;
      },
      courbes: [
        { nom: 'record des 20 dernières', couleur: COULEURS.vert, tirets: true, f: (b, i) => plusHaut(b, i, 20) },
        { nom: 'plus bas des 10 dernières', couleur: COULEURS.rouge, tirets: true, f: (b, i) => plusBas(b, i, 10) },
      ],
    },
    hasard: {
      nom: 'Au hasard (le témoin)',
      emoji: '🎲',
      regle: "Il lance un dé à chaque bougie : une chance sur 25 d'acheter, puis une chance sur 25 de revendre. C'est le témoin : un robot qui ne fait pas mieux que lui n'est pas plus malin que la chance.",
      decider(b, i, tient) {
        if (de(b[i].t, tient ? 7 : 3) >= 0.04) return null;
        return tient
          ? { action: 'vente', raison: 'Le dé a parlé : je revends.' }
          : { action: 'achat', raison: "Le dé a parlé : j'achète." };
      },
      pensee(b, i, tient) {
        return tient
          ? "Je garde… jusqu'à ce que le dé me dise de revendre (1 chance sur 25 par bougie)."
          : "Je lance le dé à chaque bougie : 1 chance sur 25 d'acheter.";
      },
      courbes: [],
    },
  };

  // ---------- Formats ----------
  function decimales(p) { return p >= 10000 ? 0 : p >= 10 ? 2 : p >= 1 ? 3 : 5; }
  function eur(v, d) {
    const n = d ?? decimales(Math.abs(v));
    return v.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: n, maximumFractionDigits: n });
  }
  const argent = (v) => eur(v, 2);
  const argentSigne = (v) => (v > 0 ? '+' : '') + argent(v);
  function pct(x, signe = true) {
    if (Math.abs(x) < 0.00005) x = 0;
    const s = (x * 100).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return (signe && x > 0 ? '+' : '') + s + '\u00a0%';
  }
  const classe = (x) => (x > 0 ? 'pos' : x < 0 ? 'neg' : '');
  const quantite = (q) => q.toLocaleString('fr-FR', { maximumSignificantDigits: 5 });
  function duree(ms) {
    const min = Math.round(ms / 60000);
    if (min < 1) return "moins d'une minute";
    if (min < 60) return `${min} min`;
    const h = Math.floor(min / 60);
    if (h < 48) return `${h} h ${String(min % 60).padStart(2, '0')}`;
    return `${Math.round(h / 24)} jours`;
  }
  function heure(t) {
    const d = new Date(t);
    const memeJour = d.toDateString() === new Date().toDateString();
    return d.toLocaleString('fr-FR', memeJour ? { hour: '2-digit', minute: '2-digit' } : { weekday: 'short', hour: '2-digit', minute: '2-digit' });
  }
  const echapper = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  // ---------- Portefeuille et décisions ----------
  const nouveauPortefeuille = () => ({ cash: CAPITAL, qte: 0, prixAchat: 0, mise: 0, ops: [] });
  const valeur = (p, prix) => p.cash + p.qte * prix;

  function executer(p, d, t, prix) {
    if (d.action === 'achat' && p.qte === 0 && p.cash > 0) {
      const frais = p.cash * FRAIS;
      const qte = (p.cash - frais) / prix;
      const op = { t, action: 'achat', prix, qte, montant: p.cash, frais, raison: d.raison };
      p.mise = p.cash; p.cash = 0; p.qte = qte; p.prixAchat = prix;
      p.ops.push(op);
      return op;
    }
    if (d.action === 'vente' && p.qte > 0) {
      const brut = p.qte * prix, frais = brut * FRAIS, net = brut - frais;
      const op = { t, action: 'vente', prix, qte: p.qte, montant: net, frais, gain: net - p.mise, raison: d.raison };
      p.cash = net; p.qte = 0; p.prixAchat = 0; p.mise = 0;
      p.ops.push(op);
      return op;
    }
    return null;
  }

  // Une décision, à la clôture de la bougie i, au prix de clôture.
  function etape(p, b, i, strat, stop) {
    const tient = p.qte > 0, prix = b[i].c;
    let d = null;
    if (tient && stop > 0 && prix <= p.prixAchat * (1 - stop)) {
      d = { action: 'vente', raison: `Filet de sécurité : la perte dépasse ${pct(stop, false).replace(',00', '')}.` };
    } else {
      d = strat.decider(b, i, tient);
    }
    return d ? executer(p, d, b[i].t, prix) : null;
  }

  // ---------- État (gardé dans le navigateur) ----------
  const DEFAUT = { crypto: 'BTC', strat: 'tendance', duree: '1m', stop: 0.02 };
  const nouvelEtat = (r) => ({ crypto: r.crypto, strat: r.strat, duree: r.duree, stop: r.stop, marche: true, p: nouveauPortefeuille(), depart: null, dernierT: 0 });
  function charger() {
    try {
      const e = JSON.parse(localStorage.getItem(CLE));
      if (e && CRYPTOS[e.crypto] && STRATEGIES[e.strat] && DUREES[e.duree] && e.p && e.p.ops) return e;
    } catch (_) { /* rien */ }
    return null;
  }
  function sauver() {
    if (etat.p.ops.length > MAX_OPS) etat.p.ops.splice(0, etat.p.ops.length - MAX_OPS);
    try { localStorage.setItem(CLE, JSON.stringify(etat)); } catch (_) { /* rien */ }
  }

  let etat = charger() || nouvelEtat(DEFAUT);
  let bougies = [];
  let source = null;
  let ws = null;
  let generation = 0;
  let dernierMessage = 0;
  let minuterie = null;
  let course = null;
  let dernierePerf = null;

  const strat = () => STRATEGIES[etat.strat];
  const msBougie = () => DUREES[etat.duree].ms;
  const prixActuel = () => (bougies.length ? bougies[bougies.length - 1].c : 0);
  function indexDerniereFermee() {
    for (let i = bougies.length - 1; i >= 0; i--) if (bougies[i].ferme) return i;
    return -1;
  }

  // ---------- Lecture des cours ----------
  const versBougieBinance = (k) => ({ t: k[0], o: +k[1], h: +k[2], l: +k[3], c: +k[4], ferme: k[6] < Date.now() });
  function versBougieCoinbase(k) {
    const t = k[0] * 1000;
    return { t, l: k[1], h: k[2], o: k[3], c: k[4], ferme: t + msBougie() <= Date.now() };
  }

  // Lit n bougies en remontant le temps (Binance en donne 1 000 au plus par demande).
  async function lireKlines(symbole, intervalle, n) {
    let toutes = [], avant = null;
    while (toutes.length < n) {
      const limite = Math.min(1000, n - toutes.length);
      const r = await fetch(`${BINANCE_REST}?symbol=${symbole}&interval=${intervalle}&limit=${limite}${avant ? `&endTime=${avant}` : ''}`);
      if (!r.ok) throw new Error('Binance ' + r.status);
      const lot = (await r.json()).map(versBougieBinance);
      toutes = lot.concat(toutes);
      if (lot.length < limite) break;
      avant = lot[0].t - 1;
    }
    return toutes;
  }
  const lireBinance = (limite) => lireKlines(`${etat.crypto}EUR`, etat.duree, limite);
  // 24 h de bougies + l'échauffement des indicateurs.
  const bougies24h = (duree) => Math.ceil(FENETRE / DUREES[duree].ms) + DEBUT_COURSE + 5;
  async function lireCoinbase() {
    const r = await fetch(`${COINBASE_REST}${etat.crypto}-EUR/candles?granularity=${msBougie() / 1000}`);
    if (!r.ok) throw new Error('Coinbase ' + r.status);
    return (await r.json()).map(versBougieCoinbase).sort((a, b) => a.t - b.t);
  }

  async function demarrer() {
    const gen = ++generation;
    arreterDirect();
    bougies = [];
    course = null;
    statut('chargement');
    majReglages();
    majTout();
    let hist;
    try {
      hist = await lireBinance(Math.max(1000, bougies24h(etat.duree)));
      source = 'binance';
    } catch (_) {
      try {
        hist = await lireCoinbase();
        source = 'coinbase';
      } catch (__) {
        if (gen !== generation) return;
        statut('erreur');
        setTimeout(() => gen === generation && demarrer(), 10000);
        return;
      }
    }
    if (gen !== generation) return;
    bougies = hist;
    preparerDepart();
    calculerCourse();
    majTout();
    if (source === 'binance') connecterDirect(gen);
    else statut('sondage');
    minuterie = setInterval(() => sonder(gen), 5000);
  }

  function connecterDirect(gen) {
    if (gen !== generation || typeof WebSocket === 'undefined') return;
    let ouvert = false;
    const s = new WebSocket(`${BINANCE_WS}${etat.crypto.toLowerCase()}eur@kline_${etat.duree}`);
    ws = s;
    s.onopen = () => { ouvert = true; };
    s.onmessage = (e) => {
      if (gen !== generation) return;
      const k = JSON.parse(e.data).k;
      if (!k) return;
      dernierMessage = Date.now();
      statut('direct');
      integrer([{ t: k.t, o: +k.o, h: +k.h, l: +k.l, c: +k.c, ferme: k.x }]);
    };
    s.onclose = () => {
      if (gen !== generation || ws !== s) return;
      ws = null;
      statut(ouvert ? 'reconnexion' : 'sondage');
      setTimeout(() => connecterDirect(gen), ouvert ? 3000 : 30000);
    };
  }

  function arreterDirect() {
    if (ws) { const s = ws; ws = null; s.close(); }
    if (minuterie) { clearInterval(minuterie); minuterie = null; }
  }

  // Secours : si le direct se tait, on relit les cours toutes les 5 secondes.
  async function sonder(gen) {
    if (gen !== generation) return;
    if (source === 'binance' && Date.now() - dernierMessage < 10000) return;
    try {
      const nouvelles = source === 'binance' ? await lireBinance(3) : (await lireCoinbase()).slice(-3);
      if (gen !== generation) return;
      if (source === 'binance' && Date.now() - dernierMessage < 10000) return;
      statut('sondage');
      integrer(nouvelles);
    } catch (_) {
      if (gen === generation) statut('reconnexion');
    }
  }

  function integrer(nouvelles) {
    for (const nb of nouvelles) {
      const der = bougies[bougies.length - 1];
      if (!der || nb.t > der.t) {
        if (der) der.ferme = true;
        bougies.push(nb);
      } else if (nb.t === der.t) {
        bougies[bougies.length - 1] = { ...nb, ferme: nb.ferme || der.ferme };
      } else {
        const i = bougies.findIndex((x) => x.t === nb.t);
        if (i >= 0) bougies[i] = { ...nb, ferme: true };
      }
    }
    if (bougies.length > MAX_BOUGIES) bougies.splice(0, bougies.length - MAX_BOUGIES);
    if (traiterFermees(true)) { calculerCourse(); majJournal(); majCourse(); }
    planifierAffichage();
  }

  // Le robot décide sur chaque bougie terminée qu'il n'a pas encore vue.
  function traiterFermees(annoncer) {
    let vues = 0;
    for (let i = 0; i < bougies.length; i++) {
      const b = bougies[i];
      if (!b.ferme || b.t <= etat.dernierT) continue;
      if (etat.marche) {
        const op = etape(etat.p, bougies, i, strat(), etat.stop);
        if (op && annoncer) annoncerOp(op);
      }
      etat.dernierT = b.t;
      vues++;
    }
    if (vues) sauver();
    return vues;
  }

  function preparerDepart() {
    const i = indexDerniereFermee();
    if (i < 0) return;
    if (!etat.depart) {
      etat.depart = { t: Date.now(), prix: prixActuel() };
      etat.dernierT = bougies[i].t;
      sauver();
      return;
    }
    // Rattrapage de ce qui s'est passé pendant l'absence.
    const trou = etat.dernierT < bougies[0].t - msBougie();
    const avant = etat.p.ops.length;
    const vues = traiterFermees(false);
    const faites = etat.p.ops.length - avant;
    if (!etat.marche || vues < 2) return;
    if (faites) toast(`🕰️ Pendant ton absence, le robot a fait <b>${faites} opération${faites > 1 ? 's' : ''}</b> sur les vrais cours. Elles sont dans le journal.`);
    else toast("🕰️ Pendant ton absence, le robot n'a trouvé aucune occasion.");
    if (trou) toast(`Tu es parti longtemps : il n'a pu rattraper que les ${duree(bougies[bougies.length - 1].t - bougies[0].t)} précédentes.`);
  }

  // ---------- La course des robots (rejouée sur les mêmes cours) ----------
  // Rejoue chaque méthode sur les dernières 24 h (ou moins si l'historique est plus court).
  function courseSur(b, stop, ms, depuisT) {
    let fin = b.length - 1;
    while (fin >= 0 && !b[fin].ferme) fin--;
    if (fin < 0) return null;
    const limite = depuisT ?? b[fin].t + ms - FENETRE;
    let debut = DEBUT_COURSE;
    while (debut < fin && b[debut].t < limite) debut++;
    if (fin - debut < 30) return null;
    const prixDebut = b[debut].c, prixFin = b[fin].c;
    const lignes = Object.entries(STRATEGIES).map(([cle, s]) => {
      const p = nouveauPortefeuille();
      for (let i = debut; i <= fin; i++) etape(p, b, i, s, stop);
      return { cle, nom: s.nom, emoji: s.emoji, perf: valeur(p, prixFin) / CAPITAL - 1, ops: p.ops };
    });
    lignes.push({ cle: null, nom: 'Acheter et attendre', emoji: '😴', perf: (1 - FRAIS) * (prixFin / prixDebut) - 1, ops: [{}] });
    lignes.sort((a, c) => c.perf - a.perf);
    return { lignes, debut: b[debut].t, fin: b[fin].t + ms };
  }
  function calculerCourse() { course = courseSur(bougies, etat.stop, msBougie()); }

  // ---------- La grande course : les mêmes robots sur 12 actifs ----------
  const COLONNES = [
    { cle: null, emoji: '😴', nom: 'Acheter et attendre' },
    ...Object.entries(STRATEGIES).map(([cle, s]) => ({ cle, emoji: s.emoji, nom: s.nom })),
  ];
  let grande = null;
  let genGrande = 0;

  async function lancerGrandeCourse() {
    const g = ++genGrande;
    const duree = etat.duree, stop = etat.stop, ms = DUREES[duree].ms;
    grande = { duree, stop, resultats: new Map(), calculeA: null };
    majGrandeCourse();
    const file = ACTIFS.slice();
    const ouvrier = async () => {
      while (file.length) {
        const a = file.shift();
        let res;
        try {
          res = courseSur(await lireKlines(`${a.code}USDT`, duree, bougies24h(duree)), stop, ms) || 'erreur';
        } catch (_) {
          res = 'erreur';
        }
        if (g !== genGrande) return;
        grande.resultats.set(a.code, res);
        majGrandeCourse();
      }
    };
    await Promise.all([ouvrier(), ouvrier(), ouvrier()]);
    if (g !== genGrande) return;
    grande.calculeA = Date.now();
    majGrandeCourse();
  }

  // Tableau commun : une ligne par actif, une colonne par robot (+ « acheter et attendre »).
  function tableauCourse(lignes, groupes) {
    const perfDe = (res, cle) => res.lignes.find((l) => l.cle === cle);
    const tete = `<thead><tr><th>Actif</th>${COLONNES.map((c) => `<th title="${c.nom}">${c.emoji}<span class="col-nom">${c.nom.replace(' (le témoin)', '')}</span></th>`).join('')}</tr></thead>`;
    const valides = [];
    let corps = '';
    for (const [groupe, titre] of groupes) {
      const membres = lignes.filter((x) => x.actif.groupe === groupe);
      if (!membres.length) continue;
      corps += `<tr class="groupe"><td colspan="${COLONNES.length + 1}">${titre}</td></tr>`;
      for (const { actif: a, res } of membres) {
        const jouable = !!CRYPTOS[a.code];
        const nomActif = `<b>${echapper(a.nom)}</b><span class="actif-detail">${echapper(a.detail || a.code)}</span>`;
        let cellules;
        if (res === undefined) cellules = COLONNES.map(() => '<td class="attente">…</td>').join('');
        else if (res === 'erreur') cellules = COLONNES.map(() => '<td class="attente">—</td>').join('');
        else {
          valides.push(res);
          const perfs = COLONNES.map((c) => perfDe(res, c.cle).perf);
          const meilleur = Math.max(...perfs);
          cellules = COLONNES.map((c, j) => {
            const titreCase = c.cle === null ? 'un seul achat au début' : `${perfDe(res, c.cle).ops.length} opérations`;
            return `<td class="${classe(perfs[j])}${perfs[j] === meilleur ? ' meilleur' : ''}" title="${titreCase}">${pct(perfs[j])}</td>`;
          }).join('');
        }
        corps += `<tr${jouable ? ` class="jouable" data-crypto="${a.code}" title="Lancer ton robot sur ${a.nom}"` : ''}><td>${nomActif}</td>${cellules}</tr>`;
      }
    }

    let pied = '';
    let verdict = '';
    if (valides.length) {
      const moyennes = COLONNES.map((c) => valides.reduce((s, r) => s + perfDe(r, c.cle).perf, 0) / valides.length);
      const victoires = COLONNES.map((c) => valides.filter((r) => r.lignes[0].cle === c.cle).length);
      const meilleureMoy = Math.max(...moyennes);
      pied = `<tfoot>
        <tr><td>Moyenne</td>${moyennes.map((m) => `<td class="${classe(m)}${m === meilleureMoy ? ' meilleur' : ''}">${pct(m)}</td>`).join('')}</tr>
        <tr class="victoires"><td>Fois 1<sup>er</sup></td>${victoires.map((v) => `<td>${v}</td>`).join('')}</tr>
      </tfoot>`;
      const iMeilleur = moyennes.indexOf(meilleureMoy);
      const iHasard = COLONNES.findIndex((c) => c.cle === 'hasard');
      const battus = COLONNES.filter((c, j) => c.cle && c.cle !== 'hasard' && moyennes[j] < moyennes[iHasard]).length;
      verdict = `🏆 En moyenne, le meilleur est <strong>${COLONNES[iMeilleur].emoji} ${COLONNES[iMeilleur].nom}</strong> (${pct(meilleureMoy)}). ` +
        `😴 « Acheter et attendre » arrive premier sur <strong>${victoires[0]} actif${victoires[0] > 1 ? 's' : ''} sur ${valides.length}</strong>. ` +
        (battus === 3 ? '🎲 Le hasard fait mieux, en moyenne, que <strong>les 3 robots « malins »</strong>.'
          : battus ? `🎲 Le hasard fait mieux, en moyenne, que <strong>${battus} des 3 robots « malins »</strong>.`
          : '🎲 Les 3 robots « malins » font tous mieux que le hasard, en moyenne.');
    }
    return { html: tete + `<tbody>${corps}</tbody>` + pied, verdict };
  }

  function majGrandeCourse() {
    if (!grande) return;
    const nbFinis = grande.resultats.size;
    $('#grande-intro').innerHTML = `Chaque robot repart de ${argent(CAPITAL)} fictifs sur chaque actif et rejoue <strong>les dernières 24 h</strong>, avec des bougies de ${DUREES[grande.duree].libelle} et le filet « ${STOPS[grande.stop]} ». ` +
      (grande.calculeA ? `Calculé à ${heure(grande.calculeA)}.` : `<strong>Chargement… ${nbFinis}/${ACTIFS.length}</strong>`);
    const t = tableauCourse(ACTIFS.map((a) => ({ actif: a, res: grande.resultats.get(a.code) })), [['crypto', 'Cryptomonnaies'], ['autre', 'Autres actifs']]);
    $('#grande-course').innerHTML = t.html;
    $('#grande-verdict').innerHTML = grande.calculeA ? t.verdict : '';
  }

  // ---------- La course en Bourse (historique enregistré dans bourse.json) ----------
  let bourse = null;
  async function chargerBourse() {
    try {
      const r = await fetch('bourse.json');
      if (!r.ok) throw new Error(r.status);
      bourse = await r.json();
      majBourse();
    } catch (_) {
      $('#bourse-intro').textContent = "Impossible de lire l'historique de la Bourse (bourse.json). Ouvre la page depuis le site du labo.";
    }
  }
  function periode(jours) {
    const f = (j, o) => new Date(j + 'T12:00:00').toLocaleDateString('fr-FR', o);
    return `du ${f(jours[0], { weekday: 'long', day: 'numeric' })} au ${f(jours[jours.length - 1], { weekday: 'long', day: 'numeric', month: 'long' })}`;
  }
  function majBourse() {
    if (!bourse) return;
    const ms = 300000;
    const lignes = bourse.valeurs.map((v) => {
      const b = v.bougies.map(([t, o, h, l, c]) => ({ t: t * 1000, o, h, l, c, ferme: true }));
      return { actif: v, res: courseSur(b, etat.stop, ms, v.debut * 1000) || 'erreur' };
    });
    const places = [['USD', 'New York'], ['EUR', 'Paris']]
      .map(([devise, ville]) => {
        const v = bourse.valeurs.find((x) => x.devise === devise);
        return v ? `${ville} ${periode(v.seances)}` : null;
      }).filter(Boolean).join(' ; ');
    $('#bourse-intro').innerHTML = `Chaque robot repart de ${argent(CAPITAL)} fictifs sur chaque valeur et rejoue <strong>les 5 dernières séances complètes</strong> (${places}), avec des bougies de 5 minutes et le filet « ${STOPS[etat.stop]} ».`;
    const t = tableauCourse(lignes, [['us', 'Actions américaines'], ['fr', 'Actions françaises'], ['indice', 'Indices (le marché entier)']]);
    $('#bourse-course').innerHTML = t.html;
    $('#bourse-verdict').innerHTML = t.verdict;
    const maj = new Date(bourse.maj);
    $('#bourse-maj').textContent = `Cours ${bourse.source}, enregistrés dans le labo le ${maj.toLocaleString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}.`;
  }

  // ---------- Le robot « parfait » : réglé sur le passé, testé sur la suite ----------
  // Bougies de 4 h : 6 mois ≈ 1 095 bougies, 3 mois ≈ 547.
  const OPTIM = { duree: '4h', entrainement: 1095, test: 547, echauffement: 340, periodes: 4 };
  let optim = null;

  function serieSma(c, n) {
    const out = new Float64Array(c.length).fill(NaN);
    let s = 0;
    for (let i = 0; i < c.length; i++) {
      s += c[i];
      if (i >= n) s -= c[i - n];
      if (i >= n - 1) out[i] = s / n;
    }
    return out;
  }
  function serieRsi(c, n) {
    const out = new Float64Array(c.length).fill(NaN);
    let g = 0, p = 0;
    for (let i = 1; i < c.length; i++) {
      const d = c[i] - c[i - 1];
      if (d > 0) g += d; else p -= d;
      if (i > n) { const d0 = c[i - n] - c[i - n - 1]; if (d0 > 0) g -= d0; else p += d0; }
      if (i >= n) out[i] = g + p > 0 ? (100 * g) / (g + p) : 50;
    }
    return out;
  }
  function serieExtremePrec(x, n, plusGrand) {
    const out = new Float64Array(x.length).fill(NaN);
    for (let i = n; i < x.length; i++) {
      let m = x[i - n];
      for (let k = i - n + 1; k < i; k++) m = plusGrand ? Math.max(m, x[k]) : Math.min(m, x[k]);
      out[i] = m;
    }
    return out;
  }
  // Durée lisible pour k bougies de 4 h.
  const b4 = (k) => (k * 4 < 48 ? `${k * 4} h` : `${Math.round(k / 6)} jours`);

  // Les 155 robots essayés (mêmes familles que l'étude faite en Python).
  function robotsOptim(h, l, c) {
    const n = c.length, cache = new Map();
    const memo = (cle, f) => { if (!cache.has(cle)) cache.set(cle, f()); return cache.get(cle); };
    const sma = (k) => memo('s' + k, () => serieSma(c, k));
    const rsiS = (k) => memo('r' + k, () => serieRsi(c, k));
    const haut = (k) => memo('h' + k, () => serieExtremePrec(h, k, true));
    const bas = (k) => memo('b' + k, () => serieExtremePrec(l, k, false));
    const etat = (f) => { const p = new Uint8Array(n); for (let i = 0; i < n; i++) p[i] = f(i) ? 1 : 0; return p; };
    const evenements = (achat, vente) => {
      const p = new Uint8Array(n);
      let e = 0;
      for (let i = 0; i < n; i++) { if (achat(i)) e = 1; else if (vente(i)) e = 0; p[i] = e; }
      return p;
    };
    const liste = [];
    for (const f of [5, 10, 20, 30, 50]) for (const s2 of [20, 50, 100, 150, 200, 300]) {
      if (f < s2) liste.push({ nom: `📈 Tendance ${b4(f)} contre ${b4(s2)}`, texte: `investi quand le prix moyen sur ${b4(f)} dépasse le prix moyen sur ${b4(s2)}`, pos: () => { const a = sma(f), b = sma(s2); return etat((i) => a[i] > b[i]); } });
    }
    for (const k of [10, 20, 50, 100, 150, 200, 300]) {
      liste.push({ nom: `📈 Au-dessus de la moyenne ${b4(k)}`, texte: `investi quand le prix dépasse sa moyenne sur ${b4(k)}`, pos: () => { const a = sma(k); return etat((i) => c[i] > a[i]); } });
    }
    for (const k of [6, 12, 24, 48, 96, 168, 336]) {
      liste.push({ nom: `🚀 Élan ${b4(k)}`, texte: `investi quand le prix est plus haut qu'il y a ${b4(k)}`, pos: () => etat((i) => i >= k && c[i] > c[i - k]) });
    }
    for (const p of [7, 14, 28]) for (const lo of [20, 25, 30, 35, 40]) for (const hi of [55, 60, 65, 70, 75, 80]) {
      liste.push({ nom: `🔄 Creux ${b4(p)} (${lo}/${hi})`, texte: `jauge calculée sur ${b4(p)} : achète sous ${lo}, revend au-dessus de ${hi}`, pos: () => { const r = rsiS(p); return evenements((i) => r[i] < lo, (i) => r[i] > hi); } });
    }
    for (const a of [10, 20, 50, 100, 200]) for (const b of [5, 10, 20, 50, 100]) {
      liste.push({ nom: `🚀 Records ${b4(a)} / ${b4(b)}`, texte: `achète quand le prix bat son record sur ${b4(a)}, revend sous son plus bas sur ${b4(b)}`, pos: () => { const H = haut(a), L = bas(b); return evenements((i) => c[i] > H[i], (i) => c[i] < L[i]); } });
    }
    return liste;
  }

  // Rendement d'une position entre les clôtures i0 et i1, frais compris.
  function perfPos(pos, c, i0, i1) {
    let v = 1, prec = 0, chg = 0;
    for (let i = i0; i < i1; i++) {
      if (pos[i] !== prec) { chg++; prec = pos[i]; }
      if (pos[i]) v *= c[i + 1] / c[i];
    }
    return v * Math.pow(1 - FRAIS, chg) - 1;
  }
  function courbePos(pos, c, i0, i1) {
    const out = [0];
    let v = 1, prec = 0;
    for (let i = i0; i < i1; i++) {
      if (pos[i] !== prec) { v *= 1 - FRAIS; prec = pos[i]; }
      if (pos[i]) v *= c[i + 1] / c[i];
      out.push(v - 1);
    }
    return out;
  }
  function aleatoire(graine) {
    let a = graine >>> 0;
    return () => {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  async function chargerOptim() {
    const bouton = $('#bouton-optim');
    bouton.disabled = true;
    const n = OPTIM.echauffement + OPTIM.entrainement + OPTIM.test * OPTIM.periodes + 5;
    const actifs = ACTIFS.filter((a) => a.groupe === 'crypto');
    const series = [];
    let faits = 0;
    $('#optim-etat').textContent = `Téléchargement de 18 mois de cours… 0/${actifs.length}`;
    const file = actifs.slice();
    const ouvrier = async () => {
      while (file.length) {
        const a = file.shift();
        const b = (await lireKlines(`${a.code}USDT`, OPTIM.duree, n)).filter((x) => x.ferme);
        series.push({ actif: a, t: b.map((x) => x.t), h: Float64Array.from(b, (x) => x.h), l: Float64Array.from(b, (x) => x.l), c: Float64Array.from(b, (x) => x.c) });
        $('#optim-etat').textContent = `Téléchargement de 18 mois de cours… ${++faits}/${actifs.length}`;
      }
    };
    try {
      await Promise.all([ouvrier(), ouvrier(), ouvrier()]);
    } catch (_) {
      $('#optim-etat').textContent = 'Impossible de lire les cours. Réessaie dans un moment.';
      bouton.disabled = false;
      return;
    }
    $('#optim-etat').textContent = 'Essai des 155 robots sur chaque crypto…';
    await new Promise((r) => setTimeout(r, 30));
    // Mêmes dates pour tout le monde : on garde la fin commune.
    const L = Math.min(...series.map((x) => x.c.length));
    for (const x of series) for (const k of ['t', 'h', 'l', 'c']) x[k] = x[k].slice(x[k].length - L);
    series.sort((a, b) => ACTIFS.indexOf(a.actif) - ACTIFS.indexOf(b.actif));
    for (const x of series) {
      const robots = robotsOptim(x.h, x.l, x.c);
      x.positions = robots.map((r) => r.pos());
      x.hasard = Array.from({ length: 20 }, (_, g) => {
        const rnd = aleatoire(1000 * series.indexOf(x) + g + 1);
        const p = new Uint8Array(L);
        let e = 0;
        for (let i = 0; i < L; i++) { const u = rnd(); if (u < 0.04) e = 1; else if (u > 0.5 && u < 0.54) e = 0; p[i] = e; }
        return p;
      });
      if (!optim) optim = { robots };
    }
    optim.series = series;
    optim.L = L;
    optim.periode = 0;
    bouton.textContent = '🔎 Relancer la recherche';
    bouton.disabled = false;
    $('#optim-periodes').hidden = false;
    calculerOptim();
  }

  function calculerOptim() {
    const { series, robots, L } = optim;
    const fin = L - 1 - optim.periode * OPTIM.test;
    const te0 = fin - OPTIM.test, tr0 = te0 - OPTIM.entrainement;
    const moyenne2 = (f) => series.reduce((s, x) => s + f(x), 0) / series.length;
    const passe = robots.map((_, k) => moyenne2((x) => perfPos(x.positions[k], x.c, tr0, te0)));
    const suite = robots.map((_, k) => moyenne2((x) => perfPos(x.positions[k], x.c, te0, fin)));
    const choisi = passe.indexOf(Math.max(...passe));
    const oracle = suite.indexOf(Math.max(...suite));
    const attendre = (x, i0, i1) => (1 - FRAIS) * (x.c[i1] / x.c[i0]) - 1;
    const surMesure = series.map((x) => {
      const p = robots.map((_, k) => perfPos(x.positions[k], x.c, tr0, te0));
      const k = p.indexOf(Math.max(...p));
      return { x, k, passe: p[k], suite: perfPos(x.positions[k], x.c, te0, fin), attendre: attendre(x, te0, fin) };
    });
    const courbes = series.map((x) => ({ robot: courbePos(x.positions[choisi], x.c, tr0, fin), attendre: courbePos(new Uint8Array(L).fill(1), x.c, tr0, fin) }));
    const moyCourbe = (cle) => courbes[0][cle].map((_, i) => courbes.reduce((s, c) => s + c[cle][i], 0) / courbes.length);
    optim.res = {
      tr0, te0, fin, choisi, oracle,
      passe: passe[choisi], suite: suite[choisi], oracleSuite: suite[oracle],
      attendrePasse: moyenne2((x) => attendre(x, tr0, te0)),
      attendreSuite: moyenne2((x) => attendre(x, te0, fin)),
      hasardSuite: moyenne2((x) => x.hasard.reduce((s, p) => s + perfPos(p, x.c, te0, fin), 0) / x.hasard.length),
      surMesure,
      surMesurePasse: surMesure.reduce((s, r) => s + r.passe, 0) / surMesure.length,
      surMesureSuite: surMesure.reduce((s, r) => s + r.suite, 0) / surMesure.length,
      courbeRobot: moyCourbe('robot'), courbeAttendre: moyCourbe('attendre'),
    };
    majOptim();
  }

  function majOptim() {
    const r = optim.res, t = optim.series[0].t, R = optim.robots;
    const jour = (i) => new Date(t[i]).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
    $('#optim-etat').textContent = '';
    document.querySelectorAll('#optim-periodes button').forEach((b) => b.classList.toggle('actif', Number(b.dataset.periode) === optim.periode));
    const tient = r.suite > r.attendreSuite && r.suite > r.hasardSuite;
    const verdict = tient
      ? `Cette fois, il fait mieux qu'attendre et que le hasard sur la suite. Mais il est passé de <strong>${pct(r.passe)}</strong> à <strong>${pct(r.suite)}</strong> : ses promesses ne tenaient qu'en partie. Essaie les autres périodes.`
      : `Sur le passé, il promettait <strong>${pct(r.passe)}</strong>. Sur la suite, qu'il n'avait jamais vue : <strong>${pct(r.suite)}</strong>, ${r.suite <= r.attendreSuite ? 'moins bien qu\'attendre' : 'moins bien que le hasard'}. Il avait appris le passé par cœur, pas la recette pour gagner.`;
    $('#optim-resultat').innerHTML = `
      <div class="optim-cartes">
        <div class="carte-optim">
          <div class="etiquette">📚 Sur le passé, là où il a été choisi (${jour(r.tr0)} → ${jour(r.te0)})</div>
          <div class="valeur moyenne ${classe(r.passe)}">${pct(r.passe)}</div>
          <div class="detail">le meilleur des ${R.length} robots · attendre : <span class="${classe(r.attendrePasse)}">${pct(r.attendrePasse)}</span></div>
        </div>
        <div class="carte-optim suite">
          <div class="etiquette">🔮 Le même robot sur la suite, jamais vue (${jour(r.te0)} → ${jour(r.fin)})</div>
          <div class="valeur moyenne ${classe(r.suite)}">${pct(r.suite)}</div>
          <div class="detail">attendre : <span class="${classe(r.attendreSuite)}">${pct(r.attendreSuite)}</span> · hasard : <span class="${classe(r.hasardSuite)}">${pct(r.hasardSuite)}</span></div>
        </div>
      </div>
      <p class="verdict">${verdict}</p>
      <p class="detail">🤖 Le robot choisi : <strong>${R[r.choisi].nom}</strong> (${R[r.choisi].texte}). Moyenne des 10 cryptos, avec des frais de 0,1 % par opération.<br>
      🎯 Sur la suite, le meilleur aurait été <strong>${R[r.oracle].nom}</strong> (${pct(r.oracleSuite)}), mais personne ne pouvait le savoir à l'avance.</p>
      <details class="sur-mesure">
        <summary>🧵 Et avec un robot réglé sur mesure pour chaque crypto ? Passé ${pct(r.surMesurePasse)} → suite ${pct(r.surMesureSuite)}</summary>
        <div class="tableau-defile"><table class="grande">
          <thead><tr><th>Crypto</th><th>Son meilleur robot sur le passé</th><th>Passé</th><th>Suite</th><th>Attendre (suite)</th></tr></thead>
          <tbody>${r.surMesure.map((m) => `<tr><td><b>${m.x.actif.nom}</b></td><td class="texte">${R[m.k].nom}</td><td class="${classe(m.passe)}">${pct(m.passe)}</td><td class="${classe(m.suite)}${m.suite > m.attendre ? ' meilleur' : ''}">${pct(m.suite)}</td><td class="${classe(m.attendre)}">${pct(m.attendre)}</td></tr>`).join('')}</tbody>
        </table></div>
      </details>`;
    dessinerOptim();
  }

  function dessinerOptim() {
    const cv = $('#optim-graphique'), ctx = cv.getContext('2d');
    if (!optim || !optim.res) return;
    cv.hidden = false;
    const r = optim.res, t = optim.series[0].t;
    const dpr = window.devicePixelRatio || 1, W = cv.clientWidth, H = cv.clientHeight;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const M = { g: 8, d: 54, h: 26, b: 22 };
    const n = r.courbeRobot.length;
    const tous = r.courbeRobot.concat(r.courbeAttendre);
    let min = Math.min(0, ...tous), max = Math.max(0, ...tous);
    const marge = (max - min) * 0.08 || 0.01; min -= marge; max += marge;
    const X = (i) => M.g + (i / (n - 1)) * (W - M.g - M.d);
    const Y = (v) => M.h + ((max - v) / (max - min)) * (H - M.h - M.b);
    const xSep = X(r.te0 - r.tr0);
    ctx.fillStyle = '#121a30';
    ctx.fillRect(M.g, M.h, xSep - M.g, H - M.h - M.b);
    ctx.font = '12px system-ui, sans-serif';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = COULEURS.doux;
    ctx.textAlign = 'center';
    ctx.fillText('📚 passé : il est choisi ici', (M.g + xSep) / 2, M.h - 8);
    ctx.fillText('🔮 suite : jamais vue', (xSep + W - M.d) / 2, M.h - 8);
    // Grille en %.
    const pas = joliPas((max - min) / 5);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.font = '11px system-ui, sans-serif';
    for (let v = Math.ceil(min / pas) * pas; v <= max; v += pas) {
      const y = Math.round(Y(v)) + 0.5;
      ctx.strokeStyle = Math.abs(v) < pas / 2 ? '#3a4566' : COULEURS.grille;
      ctx.beginPath(); ctx.moveTo(M.g, y); ctx.lineTo(W - M.d, y); ctx.stroke();
      ctx.fillStyle = COULEURS.doux;
      ctx.fillText(pct(v).replace(',00', ''), W - M.d + 6, y);
    }
    ctx.save();
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = COULEURS.accent;
    ctx.beginPath(); ctx.moveTo(xSep, M.h); ctx.lineTo(xSep, H - M.b); ctx.stroke();
    ctx.restore();
    // Dates en bas.
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = COULEURS.doux;
    for (const i of [0, r.te0 - r.tr0, n - 1]) {
      const d = new Date(t[r.tr0 + i]).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
      ctx.textAlign = i === 0 ? 'left' : i === n - 1 ? 'right' : 'center';
      ctx.fillText(d, X(i), H - 6);
    }
    const ligne = (serie, couleur, epaisseur) => {
      ctx.strokeStyle = couleur;
      ctx.lineWidth = epaisseur;
      ctx.beginPath();
      serie.forEach((v, i) => (i ? ctx.lineTo(X(i), Y(v)) : ctx.moveTo(X(i), Y(v))));
      ctx.stroke();
      ctx.lineWidth = 1;
    };
    ligne(r.courbeAttendre, COULEURS.doux, 1.5);
    ligne(r.courbeRobot, COULEURS.orange, 2.2);
  }

  // ---------- Affichage ----------
  let affichagePrevu = false;
  function planifierAffichage() {
    if (affichagePrevu) return;
    affichagePrevu = true;
    requestAnimationFrame(() => { affichagePrevu = false; majCartes(); majRobot(); dessiner(); });
  }
  function majTout() { majCartes(); majRobot(); dessiner(); majLegende(); majJournal(); majCourse(); }

  function majReglages() {
    const remplir = (sel, options, choisi) => {
      sel.innerHTML = options.map(([v, t]) => `<option value="${v}"${String(v) === String(choisi) ? ' selected' : ''}>${t}</option>`).join('');
    };
    remplir($('#choix-crypto'), Object.entries(CRYPTOS).map(([k, n]) => [k, `${n} (${k})`]), etat.crypto);
    remplir($('#choix-strat'), Object.entries(STRATEGIES).map(([k, s]) => [k, `${s.emoji} ${s.nom}`]), etat.strat);
    remplir($('#choix-duree'), Object.entries(DUREES).map(([k, d]) => [k, d.libelle]), etat.duree);
    remplir($('#choix-stop'), Object.entries(STOPS), etat.stop);
  }

  function statut(s) {
    const el = $('#statut');
    const textes = {
      chargement: 'Chargement des cours…',
      direct: 'En direct (Binance)',
      sondage: `Mis à jour toutes les 5 s (${source === 'coinbase' ? 'Coinbase' : 'Binance'})`,
      reconnexion: 'Reconnexion…',
      erreur: 'Cours injoignables, nouvel essai dans 10 s',
    };
    if (el.dataset.etat === s) return;
    el.dataset.etat = s;
    el.className = 'statut ' + s;
    el.textContent = textes[s];
  }

  function majCartes() {
    $('#etiquette-prix').textContent = `🪙 ${CRYPTOS[etat.crypto]} en ce moment`;
    if (!bougies.length || !etat.depart) {
      $('#valeur').textContent = '…';
      return;
    }
    const prix = prixActuel();
    const v = valeur(etat.p, prix), perf = v / CAPITAL - 1;
    const hold = (CAPITAL * (1 - FRAIS) * prix) / etat.depart.prix;
    $('#valeur').textContent = argent(v);
    $('#perf').innerHTML = `<strong class="${classe(perf)}">${pct(perf)} (${argentSigne(v - CAPITAL)})</strong> depuis le départ il y a ${duree(Date.now() - etat.depart.t)}, avec ${argent(CAPITAL)}`;
    $('#hold').textContent = argent(hold);
    const ecart = v - hold;
    $('#hold-detail').innerHTML = `<strong class="${classe(hold - CAPITAL)}">${pct(hold / CAPITAL - 1)}</strong> · ` +
      (Math.abs(ecart) < 0.01 ? 'pareil que le robot' : ecart > 0 ? `🏆 le robot fait mieux de ${argent(ecart)}` : `le robot fait moins bien de ${argent(-ecart)}`);
    $('#prix').textContent = eur(prix);
    const var0 = prix / etat.depart.prix - 1;
    $('#prix-detail').innerHTML = `<span class="${classe(var0)}">${pct(var0)}</span> depuis le départ du robot`;
    document.title = `${pct(perf)} · Robot de trading fictif`;
    // Petit éclair quand le portefeuille bouge à la fin d'une opération.
    if (dernierePerf !== null && etat.p.ops.length !== dernierePerf.ops) {
      const c = $('.principale');
      c.classList.remove('flash-pos', 'flash-neg');
      void c.offsetWidth;
      c.classList.add(perf >= dernierePerf.perf ? 'flash-pos' : 'flash-neg');
    }
    dernierePerf = { perf, ops: etat.p.ops.length };
  }

  function majRobot() {
    const s = strat(), p = etat.p, tient = p.qte > 0, prix = prixActuel();
    const tete = $('#robot-tete');
    tete.classList.toggle('dort', !etat.marche);
    let texte;
    if (!bougies.length) texte = '⏳ Le robot lit les cours…';
    else if (!etat.marche) texte = '⏸️ En pause : le robot regarde mais ne touche à rien.';
    else if (tient) {
      const g = prix / p.prixAchat - 1;
      texte = `🪙 Il possède ${quantite(p.qte)} ${etat.crypto}, achetés à ${eur(p.prixAchat)} : <span class="${classe(g)}">${pct(g)}</span>`;
      if (etat.stop > 0) texte += ` <span class="detail">· filet à ${eur(p.prixAchat * (1 - etat.stop))}</span>`;
    } else texte = `💶 Il a tout en euros (${argent(p.cash)}) et attend une occasion.`;
    $('#etat-robot').innerHTML = texte;
    const i = bougies.length - 1;
    $('#pensee').textContent = i >= 0 ? `💭 « ${s.pensee(bougies, i, tient)} »` : '💭 « Je lis les cours… »';
    $('#regle').textContent = `📏 Sa règle (${s.emoji} ${s.nom}) : ${s.regle} Il décide à la fin de chaque bougie, soit ${DUREES[etat.duree].rythme}.`;
    $('#bouton-pause').textContent = etat.marche ? '⏸️ Pause' : '▶️ Relancer';
  }

  function majLegende() {
    const s = strat();
    const morceaux = s.courbes.map((c) => `<span style="color:${c.couleur}"><i class="${c.tirets ? 'tirets' : ''}"></i><span style="color:var(--doux)">${c.nom}</span></span>`);
    if (s.jauge) morceaux.push(`<span style="color:${COULEURS.violet}"><i></i><span style="color:var(--doux)">jauge (RSI) : sous 30 = beaucoup baissé, au-dessus de 70 = beaucoup monté</span></span>`);
    morceaux.push('<span><span class="pos">▲</span> achat · <span class="neg">▼</span> vente du robot</span>');
    morceaux.push('<span>△ ▽ en contour : ce qu\'il aurait fait avant ton arrivée</span>');
    $('#legende').innerHTML = morceaux.join('');
    $('#graphique').classList.toggle('avec-jauge', !!s.jauge);
  }

  function majJournal() {
    const ops = etat.p.ops;
    const ventes = ops.filter((o) => o.action === 'vente');
    const gagnants = ventes.filter((o) => o.gain > 0).length;
    const fraisTotal = ops.reduce((s, o) => s + o.frais, 0);
    $('#resume-ops').innerHTML = ops.length
      ? `${ops.length} opération${ops.length > 1 ? 's' : ''} · ${ventes.length} aller-retour : <span class="pos">${gagnants} gagnant${gagnants > 1 ? 's' : ''}</span>, <span class="neg">${ventes.length - gagnants} perdant${ventes.length - gagnants > 1 ? 's' : ''}</span> · frais payés : ${argent(fraisTotal)}`
      : '';
    if (!ops.length) {
      $('#journal').innerHTML = `<p class="vide">Pas encore d'opération. Le robot attend le bon moment… Il décide à la fin de chaque bougie (${DUREES[etat.duree].rythme}).</p>`;
      return;
    }
    const recentes = ops.slice(-40).reverse();
    $('#journal').innerHTML = recentes.map((o) => {
      const achat = o.action === 'achat';
      const resultat = achat ? `<span class="detail">${argent(o.montant)}</span>` : `<span class="${classe(o.gain)}">${argentSigne(o.gain)}</span>`;
      return `<div class="op">
        <div><div class="op-type ${o.action}">${achat ? '▲ Achat' : '▼ Vente'}</div><div class="op-heure">${heure(o.t + msBougie())}</div></div>
        <div>${quantite(o.qte)} ${etat.crypto} à ${eur(o.prix)}</div>
        <div class="op-resultat">${resultat}</div>
        <div class="op-raison">${echapper(o.raison)}</div>
      </div>`;
    }).join('') + (ops.length > 40 ? `<p class="plus-ops">… et ${ops.length - 40} opérations plus anciennes.</p>` : '');
  }

  function majCourse() {
    if (!course) {
      $('#course-intro').textContent = 'Il faut encore quelques bougies pour lancer la course…';
      $('#course').innerHTML = '';
      return;
    }
    const d = new Date(course.debut);
    $('#course-intro').innerHTML = `Chaque robot repart de ${argent(CAPITAL)} et rejoue <strong>les ${duree(course.fin - course.debut)} précédentes</strong> (depuis ${d.toLocaleString('fr-FR', { weekday: 'long', hour: '2-digit', minute: '2-digit' })}), sur les mêmes vrais cours du ${CRYPTOS[etat.crypto]}, avec des bougies de ${DUREES[etat.duree].libelle} et le filet « ${STOPS[etat.stop]} ».`;
    const maxAbs = Math.max(0.001, ...course.lignes.map((l) => Math.abs(l.perf)));
    $('#course').innerHTML = course.lignes.map((l, rang) => {
      const largeur = (Math.abs(l.perf) / maxAbs) * 50;
      const medaille = ['🥇', '🥈', '🥉'][rang] || '　';
      const action = l.cle === null ? '<span></span>'
        : l.cle === etat.strat ? '<span class="tien">← ton robot</span>'
        : `<button type="button" data-strat="${l.cle}">Essayer</button>`;
      return `<div class="course-ligne${l.cle === etat.strat ? ' actuelle' : ''}">
        <div class="course-nom">${medaille} ${l.emoji} ${l.nom}</div>
        <div class="barre"><span class="${l.perf >= 0 ? 'pos' : 'neg'}" style="width:${largeur.toFixed(1)}%"></span></div>
        <div class="course-perf ${classe(l.perf)}">${pct(l.perf)}</div>
        <div class="course-ops">${l.cle === null ? '1 achat' : `${l.ops.length} op.`}</div>
        ${action}
      </div>`;
    }).join('');
  }

  // ---------- Graphique ----------
  function joliPas(x) {
    const p = Math.pow(10, Math.floor(Math.log10(x)));
    const r = x / p;
    return (r < 1.5 ? 1 : r < 3.5 ? 2 : r < 7.5 ? 5 : 10) * p;
  }

  function dessiner() {
    const cv = $('#graphique'), ctx = cv.getContext('2d');
    const dpr = window.devicePixelRatio || 1, W = cv.clientWidth, H = cv.clientHeight;
    if (cv.width !== Math.round(W * dpr) || cv.height !== Math.round(H * dpr)) {
      cv.width = Math.round(W * dpr);
      cv.height = Math.round(H * dpr);
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.font = '11px system-ui, sans-serif';
    if (!bougies.length) {
      ctx.fillStyle = COULEURS.doux;
      ctx.textAlign = 'center';
      ctx.fillText('Chargement des cours…', W / 2, H / 2);
      return;
    }

    const s = strat();
    const M = { g: 6, d: 74, h: 14, b: 22 };
    const zone = H - M.h - M.b;
    const hPrix = s.jauge ? zone * 0.72 : zone;
    const hJauge = s.jauge ? zone - hPrix - 16 : 0;
    const larg = W - M.g - M.d;
    const n = Math.max(30, Math.min(180, Math.floor(larg / 7)));
    const debut = Math.max(0, bougies.length - n);
    const pas = larg / n;
    const X = (i) => M.g + (i - debut + 0.5) * pas;

    // Échelle des prix.
    const courbes = s.courbes.map((c) => ({ ...c, v: [] }));
    let min = Infinity, max = -Infinity;
    for (let i = debut; i < bougies.length; i++) {
      min = Math.min(min, bougies[i].l);
      max = Math.max(max, bougies[i].h);
      for (const c of courbes) {
        const v = c.f(bougies, i);
        c.v.push(v);
        if (v !== null) { min = Math.min(min, v); max = Math.max(max, v); }
      }
    }
    const marge = (max - min) * 0.1 || max * 0.001;
    min -= marge; max += marge;
    const Y = (v) => M.h + ((max - v) / (max - min)) * hPrix;

    // Grille et prix à droite.
    const pasPrix = joliPas((max - min) / 5);
    const yPrix = Y(bougies[bougies.length - 1].c);
    const dec = Math.max(0, -Math.floor(Math.log10(pasPrix)));
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    for (let v = Math.ceil(min / pasPrix) * pasPrix; v <= max; v += pasPrix) {
      const y = Math.round(Y(v)) + 0.5;
      ctx.strokeStyle = COULEURS.grille;
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(M.g, y); ctx.lineTo(W - M.d, y); ctx.stroke();
      if (Math.abs(y - yPrix) < 14) continue;
      ctx.fillStyle = COULEURS.doux;
      ctx.fillText(v.toLocaleString('fr-FR', { minimumFractionDigits: dec, maximumFractionDigits: dec }) + ' €', W - M.d + 6, y);
    }

    // Heures en bas.
    const ms = msBougie();
    const tous = Math.max(1, Math.ceil(70 / pas));
    const paliers = [1, 2, 5, 10, 15, 30, 60, 120, 240];
    const k = paliers.find((p) => p >= tous) || tous;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    for (let i = debut; i < bougies.length; i++) {
      if (Math.round(bougies[i].t / ms) % k !== 0) continue;
      const x = Math.round(X(i)) + 0.5;
      ctx.strokeStyle = COULEURS.grille;
      ctx.beginPath(); ctx.moveTo(x, M.h); ctx.lineTo(x, H - M.b); ctx.stroke();
      const d = new Date(bougies[i].t);
      const txt = d.getHours() === 0 && d.getMinutes() === 0
        ? d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
        : d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
      ctx.fillStyle = COULEURS.doux;
      ctx.fillText(txt, x, H - 6);
    }

    // Départ du robot.
    if (etat.depart) {
      const iDep = bougies.findIndex((b) => b.t <= etat.depart.t && etat.depart.t < b.t + ms);
      if (iDep >= debut) {
        const x = Math.round(X(iDep)) + 0.5;
        ctx.save();
        ctx.setLineDash([3, 4]);
        ctx.strokeStyle = COULEURS.accent;
        ctx.beginPath(); ctx.moveTo(x, M.h); ctx.lineTo(x, M.h + hPrix); ctx.stroke();
        ctx.restore();
        ctx.fillStyle = COULEURS.accent;
        ctx.textAlign = x > W - M.d - 90 ? 'right' : 'left';
        ctx.fillText(' départ du robot ', x, M.h - 2);
      }
    }

    // Bougies.
    const corps = Math.max(1, pas * 0.62);
    for (let i = debut; i < bougies.length; i++) {
      const b = bougies[i], x = X(i);
      ctx.strokeStyle = ctx.fillStyle = b.c >= b.o ? COULEURS.vert : COULEURS.rouge;
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(Math.round(x) + 0.5, Y(b.h)); ctx.lineTo(Math.round(x) + 0.5, Y(b.l)); ctx.stroke();
      const y1 = Y(Math.max(b.o, b.c)), y2 = Y(Math.min(b.o, b.c));
      ctx.fillRect(x - corps / 2, y1, corps, Math.max(1, y2 - y1));
    }

    // Courbes de la méthode.
    for (const c of courbes) {
      ctx.save();
      ctx.strokeStyle = c.couleur;
      ctx.lineWidth = 1.6;
      if (c.tirets) ctx.setLineDash([5, 4]);
      ctx.beginPath();
      let enCours = false;
      c.v.forEach((v, j) => {
        if (v === null) { enCours = false; return; }
        const x = X(debut + j), y = Y(v);
        if (enCours) ctx.lineTo(x, y); else ctx.moveTo(x, y);
        enCours = true;
      });
      ctx.stroke();
      ctx.restore();
    }

    // Prix d'achat et filet de sécurité.
    const p = etat.p;
    const ligneH = (v, couleur, texte, tirets) => {
      if (v < min || v > max) return;
      const y = Math.round(Y(v)) + 0.5;
      ctx.save();
      ctx.setLineDash(tirets);
      ctx.strokeStyle = couleur;
      ctx.beginPath(); ctx.moveTo(M.g, y); ctx.lineTo(W - M.d, y); ctx.stroke();
      ctx.restore();
      ctx.fillStyle = couleur;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'bottom';
      ctx.fillText(texte, M.g + 4, y - 2);
    };
    if (p.qte > 0) {
      ligneH(p.prixAchat, COULEURS.bleu, `prix d'achat ${eur(p.prixAchat)}`, [6, 3]);
      if (etat.stop > 0) ligneH(p.prixAchat * (1 - etat.stop), COULEURS.rouge, 'filet de sécurité', [2, 3]);
    }

    // Achats et ventes : pleins = réels, en contour = avant ton arrivée.
    const index = new Map();
    for (let i = debut; i < bougies.length; i++) index.set(bougies[i].t, i);
    const marqueur = (op, plein) => {
      const i = index.get(op.t);
      if (i === undefined) return;
      const b = bougies[i], x = X(i), t = Math.max(4.5, Math.min(7, pas * 0.9));
      const achat = op.action === 'achat';
      const y = achat ? Y(b.l) + 5 : Y(b.h) - 5;
      const dy = achat ? t * 1.6 : -t * 1.6;
      ctx.beginPath();
      ctx.moveTo(x, y); ctx.lineTo(x - t, y + dy); ctx.lineTo(x + t, y + dy); ctx.closePath();
      const couleur = achat ? COULEURS.vert : COULEURS.rouge;
      if (plein) {
        ctx.fillStyle = couleur; ctx.fill();
        ctx.strokeStyle = '#0b1020'; ctx.lineWidth = 1; ctx.stroke();
      } else {
        ctx.strokeStyle = couleur; ctx.lineWidth = 1.4; ctx.stroke();
      }
    };
    if (course && etat.depart) {
      const l = course.lignes.find((x) => x.cle === etat.strat);
      if (l) l.ops.filter((o) => o.t + ms <= etat.depart.t).forEach((o) => marqueur(o, false));
    }
    p.ops.forEach((o) => marqueur(o, true));

    // Prix actuel.
    const der = bougies[bougies.length - 1];
    const yp = Math.round(Y(der.c)) + 0.5;
    const couleurPrix = der.c >= der.o ? COULEURS.vert : COULEURS.rouge;
    ctx.save();
    ctx.setLineDash([2, 3]);
    ctx.strokeStyle = couleurPrix;
    ctx.beginPath(); ctx.moveTo(M.g, yp); ctx.lineTo(W - M.d, yp); ctx.stroke();
    ctx.restore();
    ctx.fillStyle = couleurPrix;
    ctx.fillRect(W - M.d + 1, yp - 9, M.d - 2, 18);
    ctx.fillStyle = '#05140b';
    ctx.font = 'bold 11px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(eur(der.c), W - M.d + 5, yp);
    ctx.font = '11px system-ui, sans-serif';

    // Jauge (méthode « Acheter les creux »).
    if (s.jauge) {
      const haut = M.h + hPrix + 16;
      const Yj = (v) => haut + ((100 - v) / 100) * hJauge;
      ctx.fillStyle = '#121a30';
      ctx.fillRect(M.g, Yj(70), larg, Yj(30) - Yj(70));
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'left';
      for (const [v, c] of [[70, COULEURS.rouge], [30, COULEURS.vert]]) {
        ctx.save();
        ctx.setLineDash([4, 4]);
        ctx.strokeStyle = c;
        ctx.beginPath(); ctx.moveTo(M.g, Yj(v)); ctx.lineTo(W - M.d, Yj(v)); ctx.stroke();
        ctx.restore();
        ctx.fillStyle = c;
        ctx.fillText(String(v), W - M.d + 6, Yj(v));
      }
      ctx.fillStyle = COULEURS.doux;
      ctx.fillText('jauge', W - M.d + 6, haut + 6);
      ctx.strokeStyle = COULEURS.violet;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      let enCours = false;
      for (let i = debut; i < bougies.length; i++) {
        const v = rsi(bougies, i);
        if (v === null) { enCours = false; continue; }
        if (enCours) ctx.lineTo(X(i), Yj(v)); else ctx.moveTo(X(i), Yj(v));
        enCours = true;
      }
      ctx.stroke();
    }
  }

  // ---------- Annonces ----------
  function toast(html, type = '') {
    const d = document.createElement('div');
    d.className = 'toast ' + type;
    d.innerHTML = html;
    $('#toasts').append(d);
    setTimeout(() => d.classList.add('part'), 7000);
    setTimeout(() => d.remove(), 7600);
  }
  function annoncerOp(op) {
    const achat = op.action === 'achat';
    const fin = achat ? '' : ` · <b class="${classe(op.gain)}">${argentSigne(op.gain)}</b>`;
    toast(`🤖 <b>${achat ? 'Achat' : 'Vente'}</b> de ${quantite(op.qte)} ${etat.crypto} à ${eur(op.prix)}${fin}<br><small>${echapper(op.raison)}</small>`, op.action);
    const tete = $('#robot-tete');
    tete.classList.remove('saute');
    void tete.offsetWidth;
    tete.classList.add('saute');
  }

  // ---------- Boutons et réglages ----------
  function nouvellePartie(reglages) {
    const memesCours = reglages.crypto === etat.crypto && reglages.duree === etat.duree && bougies.length > 0;
    etat = nouvelEtat(reglages);
    dernierePerf = null;
    sauver();
    if (memesCours) {
      preparerDepart();
      calculerCourse();
      majReglages();
      majTout();
    } else {
      demarrer();
    }
    if (!grande || grande.duree !== etat.duree || grande.stop !== etat.stop) lancerGrandeCourse();
    majBourse();
  }
  function changer(cle, valeur) {
    if (etat.p.ops.length && !confirm(`Changer ce réglage lance une nouvelle partie avec ${argent(CAPITAL)} (le journal actuel sera effacé). On y va ?`)) {
      majReglages();
      return;
    }
    nouvellePartie({ crypto: etat.crypto, strat: etat.strat, duree: etat.duree, stop: etat.stop, [cle]: valeur });
  }

  $('#choix-crypto').addEventListener('change', (e) => changer('crypto', e.target.value));
  $('#choix-strat').addEventListener('change', (e) => changer('strat', e.target.value));
  $('#choix-duree').addEventListener('change', (e) => changer('duree', e.target.value));
  $('#choix-stop').addEventListener('change', (e) => changer('stop', Number(e.target.value)));
  $('#course').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-strat]');
    if (b) changer('strat', b.dataset.strat);
  });
  $('#grande-course').addEventListener('click', (e) => {
    const ligne = e.target.closest('tr[data-crypto]');
    if (!ligne || ligne.dataset.crypto === etat.crypto) return;
    changer('crypto', ligne.dataset.crypto);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
  $('#relancer-grande').addEventListener('click', lancerGrandeCourse);
  $('#bouton-optim').addEventListener('click', chargerOptim);
  $('#optim-periodes').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-periode]');
    if (!b || !optim || !optim.series) return;
    optim.periode = Number(b.dataset.periode);
    calculerOptim();
  });
  $('#bouton-pause').addEventListener('click', () => {
    etat.marche = !etat.marche;
    sauver();
    majRobot();
  });
  $('#bouton-zero').addEventListener('click', () => {
    if (etat.p.ops.length && !confirm(`Recommencer avec ${argent(CAPITAL)} ? Le journal actuel sera effacé.`)) return;
    nouvellePartie(etat);
  });
  window.addEventListener('resize', () => { planifierAffichage(); dessinerOptim(); });
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) sonder(generation);
  });
  // Le temps passe même quand le prix ne bouge pas (« depuis 12 min »).
  setInterval(planifierAffichage, 15000);

  majReglages();
  majLegende();
  demarrer();
  lancerGrandeCourse();
  chargerBourse();
})();
