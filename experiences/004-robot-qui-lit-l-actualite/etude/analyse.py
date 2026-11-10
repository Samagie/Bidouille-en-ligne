"""L'humeur du marché aide-t-elle à prédire ? Test sur des périodes jamais vues (walk-forward).

Chaque jour, à la clôture, un modèle prédit le rendement des jours suivants à partir de signaux connus
à ce moment-là. On l'entraîne sur les 2 années précédentes, on le teste sur les 6 mois suivants,
et on recommence en avançant. Trois versions : cours seuls, humeur seule, cours + humeur.
Résultat écrit dans ../resultats.json (lu par la page).
"""
import json, datetime as dt
import numpy as np
from pathlib import Path

D = Path(__file__).resolve().parent / 'donnees'
FRAIS = 0.001
ACTIFS = ['BTC', 'ETH', 'XRP', 'LTC', 'ADA', 'BNB', 'DOGE', 'LINK', 'SOL', 'AVAX']
J0 = dt.date(2018, 1, 1)
N = (dt.datetime.now(dt.timezone.utc).date() - J0).days
jour = lambda s: (dt.date(int(s[:4]), int(s[4:6]), int(s[6:8])) - J0).days

def lire(nom):
    p = D / f'{nom}.json'
    return json.loads(p.read_text()) if p.exists() else None

def serie(paires, bouche=0):
    x = np.full(N, np.nan)
    for j, v in paires:
        if 0 <= j < N and v is not None: x[j] = v
    for i in range(1, N):          # un jour manquant reprend la dernière valeur connue (au plus `bouche` jours)
        if np.isnan(x[i]) and bouche:
            k = i - 1
            while k >= 0 and i - k <= bouche and np.isnan(x[k]): k -= 1
            if k >= 0 and i - k <= bouche and not np.isnan(x[k]): x[i] = x[k]
    return x

def moy(x, n):   # moyenne glissante qui tolère les trous
    out = np.full(len(x), np.nan)
    for i in range(n - 1, len(x)):
        w = x[i - n + 1:i + 1]; ok = ~np.isnan(w)
        if ok.sum() >= n * 0.6: out[i] = w[ok].mean()
    return out
def ecart(x, n):
    out = np.full(len(x), np.nan)
    for i in range(n - 1, len(x)):
        w = x[i - n + 1:i + 1]; ok = ~np.isnan(w)
        if ok.sum() >= n * 0.6: out[i] = w[ok].std()
    return out
def z(x, n=90): return (x - moy(x, n)) / np.where(ecart(x, n) > 0, ecart(x, n), np.nan)
def decale(x, k): return np.concatenate([np.full(k, np.nan), x[:-k]])

peur_brut = lire('peur')
peur = serie([((dt.datetime.fromtimestamp(t, dt.timezone.utc).date() - J0).days, v) for t, v in peur_brut], 7) if peur_brut else None

SOURCES = {'peur': peur is not None, 'presse': True, 'wiki': True}
donnees = {}
for a in ACTIFS:
    cours = lire(f'cours_{a}')
    if not cours: continue
    c = serie([((dt.datetime.fromtimestamp(t, dt.timezone.utc).date() - J0).days, v) for t, v in cours])
    r = c / decale(c, 1) - 1
    # --- signaux tirés des cours ---
    hausses = moy(np.where(r > 0, r, 0), 14); baisses = moy(np.where(r < 0, -r, 0), 14)
    F = {
        'cours: variation 1 j': r, 'cours: variation 7 j': c / decale(c, 7) - 1, 'cours: variation 30 j': c / decale(c, 30) - 1,
        'cours: écart à la moyenne 50 j': c / moy(c, 50) - 1, 'cours: jauge RSI': hausses / (hausses + baisses), 'cours: agitation 30 j': ecart(r, 30),
    }
    # --- signaux d'humeur (tous connus à la clôture du jour) ---
    if peur is not None:
        F['humeur: peur et avidité'] = peur / 100; F['humeur: peur, variation 7 j'] = (peur - decale(peur, 7)) / 100
    ton, art, wk = lire(f'ton_{a}'), lire(f'articles_{a}'), lire(f'wiki_{a}')
    if ton:
        t = serie([(jour(d), v) for d, v, _ in ton], 7)
        F['humeur: ton de la presse'] = z(t); F['humeur: ton, 7 j contre 30 j'] = moy(t, 7) - moy(t, 30)
    else: SOURCES['presse'] = False
    if art:
        v = serie([(jour(d), (x / n if n else None)) for d, x, n in art], 7); v = np.log(np.where(v > 0, v, np.nan))
        F['humeur: nombre d\'articles'] = z(v); F['humeur: articles, 7 j contre 30 j'] = moy(v, 7) - moy(v, 30)
    if wk:
        w = decale(np.log(serie([(jour(d), max(x, 1)) for d, x in wk], 7)), 1)   # publié avec un jour de retard
        F['humeur: curiosité Wikipédia'] = z(w); F['humeur: Wikipédia, 7 j contre 30 j'] = moy(w, 7) - moy(w, 30)
    else: SOURCES['wiki'] = False
    donnees[a] = dict(c=c, r=r, F=F)

NOMS = [k for k in next(iter(donnees.values()))['F'] if all(k in d['F'] for d in donnees.values())]
COURS = [k for k in NOMS if k.startswith('cours')]; HUMEUR = [k for k in NOMS if k.startswith('humeur')]
VERSIONS = {'cours': COURS, 'humeur': HUMEUR, 'tout': COURS + HUMEUR}

def cible(c, h):   # rendement des h jours suivants
    return np.concatenate([c[h:], np.full(h, np.nan)]) / c - 1

def ridge(X, y, lam):
    return np.linalg.solve(X.T @ X + lam * np.eye(X.shape[1]), X.T @ y)

def predire(cols, h, tr0, tr1, te1):
    """Entraîne sur [tr0, tr1) (tous actifs mélangés), renvoie la prédiction par actif sur [tr1, te1)."""
    Xs, ys = [], []
    for d in donnees.values():
        X = np.column_stack([d['F'][k] for k in cols])[tr0:tr1 - h]; y = cible(d['c'], h)[tr0:tr1 - h]
        ok = ~np.isnan(X).any(axis=1) & ~np.isnan(y); Xs.append(X[ok]); ys.append(y[ok])
    X, y = np.vstack(Xs), np.concatenate(ys)
    mu, sd = X.mean(0), X.std(0) + 1e-12; X = (X - mu) / sd; ym = y.mean()
    # force du lissage choisie sur le dernier quart de la période d'apprentissage
    k = int(len(X) * 0.75); best, lam_ok = -9, 100.0
    for lam in [10.0, 100.0, 1000.0, 10000.0]:
        w = ridge(X[:k], y[:k] - ym, lam); p = X[k:] @ w
        s = np.corrcoef(p, y[k:])[0, 1] if p.std() > 0 else -9
        if s > best: best, lam_ok = s, lam
    w = ridge(X, y - ym, lam_ok)
    out = {}
    for a, d in donnees.items():
        Xt = (np.column_stack([d['F'][k] for k in cols])[tr1:te1] - mu) / sd
        out[a] = np.where(np.isnan(Xt).any(axis=1), np.nan, Xt @ w + ym)
    return out

def jouer(pos, r):
    """Valeur jour par jour d'un portefeuille qui suit la position décidée la veille."""
    v, prec, out = 1.0, 0, []
    for p, x in zip(pos, r):
        if p != prec: v *= 1 - FRAIS; prec = p
        if p: v *= 1 + x
        out.append(v)
    return np.array(out)

def etude(h, entrainement=730, test=182):
    debut = 150
    plis, courbes = [], {k: [] for k in ['cours', 'humeur', 'tout', 'attendre', 'hasard']}
    dates = []
    i = debut + entrainement
    while i + 30 < N - 1:
        te1 = min(i + test, N - 1)
        preds = {v: predire(cols, h, i - entrainement, i, te1) for v, cols in VERSIONS.items()}
        res = {k: [] for k in courbes}; seg = {k: [] for k in courbes}
        for a, d in donnees.items():
            r_suiv = d['r'][i + 1:te1 + 1]          # rendement du lendemain de chaque décision
            if np.isnan(r_suiv).any() or np.isnan(preds['tout'][a]).mean() > 0.2: continue
            for v in VERSIONS:
                pos, s = [], 0
                for x in preds[v][a]:
                    s = s if np.isnan(x) else int(x > 0); pos.append(s)
                e = jouer(pos, r_suiv); res[v].append(e[-1] - 1); seg[v].append(e)
            e = jouer(np.ones(len(r_suiv), int), r_suiv); res['attendre'].append(e[-1] - 1); seg['attendre'].append(e)
            hs = []
            for g in range(30):
                u = np.random.default_rng(1000 * i + g).random(len(r_suiv)); p, s = [], 0
                for x in u:
                    s = 1 if x < 0.04 else 0 if 0.5 < x < 0.54 else s; p.append(s)
                hs.append(jouer(p, r_suiv))
            e = np.mean(hs, axis=0); res['hasard'].append(e[-1] - 1); seg['hasard'].append(e)
        if res['tout']:
            plis.append(dict(debut=str(J0 + dt.timedelta(i + 1)), fin=str(J0 + dt.timedelta(te1)), actifs=len(res['tout']), **{k: float(np.mean(v)) for k, v in res.items()}))
            for k in courbes: courbes[k].append(np.mean(seg[k], axis=0))
            dates += [str(J0 + dt.timedelta(j)) for j in range(i + 1, te1 + 1)]
        i += test
    # courbe enchaînée : 10 000 € répartis également, remis à plat à chaque période
    chaines = {}
    for k, segs in courbes.items():
        v, out = 1.0, []
        for s in segs: out += list(v * s); v = out[-1]
        chaines[k] = out
    def pire_chute(x):
        x = np.array(x); return float((x / np.maximum.accumulate(x) - 1).min())
    bilan = {k: dict(final=float(c[-1] - 1), pire_chute=pire_chute(c)) for k, c in chaines.items()}
    pas = max(1, len(dates) // 400)
    return dict(horizon=h, plis=plis, bilan=bilan, dates=dates[::pas], courbes={k: [round(float(x), 4) for x in c[::pas]] for k, c in chaines.items()})

def liens(h=7):
    """Lien entre chaque signal et le rendement des h jours suivants (corrélation de rangs), par moitié d'historique."""
    out = []
    for k in NOMS:
        par_moitie = []
        for lo, hi in [(150, N // 2), (N // 2, N)]:
            cs = []
            for d in donnees.values():
                x, y = d['F'][k][lo:hi], cible(d['c'], h)[lo:hi]; ok = ~np.isnan(x) & ~np.isnan(y)
                if ok.sum() > 200:
                    rx, ry = np.argsort(np.argsort(x[ok])), np.argsort(np.argsort(y[ok])); cs.append(np.corrcoef(rx, ry)[0, 1])
            par_moitie.append(float(np.mean(cs)) if cs else None)
        out.append(dict(signal=k, avant=par_moitie[0], apres=par_moitie[1]))
    return out

if __name__ == '__main__':
    res = dict(
        date=str(dt.datetime.now(dt.timezone.utc).date()), actifs=list(donnees), sources=SOURCES, signaux=NOMS,
        etudes=[etude(1), etude(7)], liens=liens(7), milieu=str(J0 + dt.timedelta(N // 2)),
    )
    (Path(__file__).resolve().parent.parent / 'resultats.json').write_text(json.dumps(res, ensure_ascii=False, separators=(',', ':')))
    pc = lambda x: f'{x*100:+7.1f} %'
    print('sources', SOURCES, '| signaux', len(NOMS), '| actifs', list(donnees))
    for e in res['etudes']:
        print(f"\n== prédiction à {e['horizon']} jour(s) : {len(e['plis'])} périodes de test ==")
        for p in e['plis']:
            print(p['debut'], '→', p['fin'], f"({p['actifs']} actifs)", ' | '.join(f"{k} {pc(p[k])}" for k in ['cours', 'humeur', 'tout', 'attendre', 'hasard']))
        n = len(e['plis'])
        print('humeur+cours bat cours seuls :', sum(p['tout'] > p['cours'] for p in e['plis']), '/', n, '| bat attendre :', sum(p['tout'] > p['attendre'] for p in e['plis']), '/', n)
        print('BILAN', {k: (pc(v['final']), 'pire chute', pc(v['pire_chute'])) for k, v in e['bilan'].items()})
    print('\nliens avec les 7 jours suivants (avant / après', res['milieu'], ')')
    for l in res['liens']: print(f"  {l['signal']:38s} {l['avant']:+.3f}  {l['apres']:+.3f}")
