"""Cherche le « meilleur robot » sur une période, puis le teste sur la suivante (walk-forward)."""
import json, sys, itertools
import numpy as np
from pathlib import Path

FRAIS = 0.001
D = Path(__file__).resolve().parent / 'donnees'

def charger(nom):
    a = np.array(json.loads((D / f'{nom}.json').read_text()), dtype=float)
    return a[:, 0], a[:, 2], a[:, 3], a[:, 4]  # t, high, low, close

def sma(x, n):
    c = np.cumsum(np.insert(x, 0, 0.0)); out = np.full(len(x), np.nan)
    out[n - 1:] = (c[n:] - c[:-n]) / n; return out

def rsi(x, n):
    d = np.diff(x, prepend=x[0]); g = np.where(d > 0, d, 0); p = np.where(d < 0, -d, 0)
    sg, sp = sma(g, n), sma(p, n); tot = sg + sp
    return np.where(tot > 0, 100 * sg / np.where(tot > 0, tot, 1), 50)

def roll_max_prev(x, n):
    from numpy.lib.stride_tricks import sliding_window_view as sw
    out = np.full(len(x), np.nan); out[n:] = sw(x, n).max(axis=1)[:-1]; return out
def roll_min_prev(x, n):
    from numpy.lib.stride_tricks import sliding_window_view as sw
    out = np.full(len(x), np.nan); out[n:] = sw(x, n).min(axis=1)[:-1]; return out

def etat_depuis_evenements(achat, vente):
    ev = np.where(achat, 1, np.where(vente, -1, 0))
    idx = np.where(ev != 0, np.arange(len(ev)), 0); idx = np.maximum.accumulate(idx)
    return (ev[idx] > 0)

# ---- familles de robots : position (True = investi) décidée à la clôture de chaque bougie ----
def familles(h, l, c):
    cfg = {}
    for f, s in itertools.product([5, 10, 20, 30, 50], [20, 50, 100, 150, 200, 300]):
        if f < s: cfg[f'tendance {f}/{s}'] = lambda f=f, s=s: sma(c, f) > sma(c, s)
    for n in [10, 20, 50, 100, 150, 200, 300]:
        cfg[f'au-dessus moyenne {n}'] = lambda n=n: c > sma(c, n)
    for n in [6, 12, 24, 48, 96, 168, 336]:
        cfg[f'élan {n}'] = lambda n=n: c > np.concatenate([np.full(n, np.inf), c[:-n]])
    for p, lo, hi in itertools.product([7, 14, 28], [20, 25, 30, 35, 40], [55, 60, 65, 70, 75, 80]):
        cfg[f'creux rsi{p} {lo}/{hi}'] = lambda p=p, lo=lo, hi=hi: etat_depuis_evenements(rsi(c, p) < lo, rsi(c, p) > hi)
    for a, b in itertools.product([10, 20, 50, 100, 200], [5, 10, 20, 50, 100]):
        cfg[f'records {a}/{b}'] = lambda a=a, b=b: etat_depuis_evenements(c > roll_max_prev(h, a), c < roll_min_prev(l, b))
    return cfg

def perf(pos, c, i0, i1):
    """Rendement de la position entre les clôtures i0 et i1 (décision à i0 incluse), frais compris."""
    p = pos[i0:i1].astype(float)               # position tenue pendant la bougie suivante
    r = c[i0 + 1:i1 + 1] / c[i0:i1] - 1
    changements = np.abs(np.diff(np.insert(p, 0, 0.0))).sum()
    return float(np.prod(1 + p * r) * (1 - FRAIS) ** changements - 1)

def hasard(c, i0, i1, graines=30):
    res = []
    for g in range(graines):
        rng = np.random.default_rng(g); u = rng.random(len(c))
        pos = etat_depuis_evenements(u < 0.04, (u > 0.5) & (u < 0.54))
        res.append(perf(pos, c, i0, i1))
    return float(np.mean(res))

def etude(actifs, suffixe, train, test, pas, unite):
    series = {a: charger(f'{a}_{suffixe}') for a in actifs}
    n = min(len(v[3]) for v in series.values())
    series = {a: tuple(x[-n:] for x in v) for a, v in series.items()}
    positions = {}
    for a, (t, h, l, c) in series.items():
        positions[a] = {k: f() for k, f in familles(h, l, c).items()}
    noms = list(next(iter(positions.values())).keys())
    debut = 340
    plis = []
    i = debut
    while i + train + test < n:
        tr, te = (i, i + train), (i + train, i + train + test)
        m_tr = np.array([[perf(positions[a][k], series[a][3], *tr) for k in noms] for a in actifs])  # actifs x configs
        m_te = np.array([[perf(positions[a][k], series[a][3], *te) for k in noms] for a in actifs])
        moy_tr = m_tr.mean(axis=0); k_best = int(np.argmax(moy_tr))
        sur_mesure_tr = m_tr.max(axis=1).mean(); sur_mesure_te = m_te[np.arange(len(actifs)), m_tr.argmax(axis=1)].mean()
        bh = np.mean([series[a][3][te[1]] / series[a][3][te[0]] * (1 - FRAIS) - 1 for a in actifs])
        bh_tr = np.mean([series[a][3][tr[1]] / series[a][3][tr[0]] * (1 - FRAIS) - 1 for a in actifs])
        rnd = np.mean([hasard(series[a][3], *te) for a in actifs])
        ref = {k: m_te[:, noms.index(k)].mean() for k in ['tendance 10/20' if 'tendance 10/20' in noms else noms[0], 'creux rsi14 30/70', 'records 20/10']}
        plis.append(dict(
            periode=(series[actifs[0]][0][te[0]], series[actifs[0]][0][te[1]]),
            choisi=noms[k_best], choisi_tr=moy_tr[k_best], choisi_te=m_te[:, k_best].mean(),
            bh_tr=bh_tr, bh=bh, hasard=rnd, sur_mesure_tr=sur_mesure_tr, sur_mesure_te=sur_mesure_te,
            oracle_te=m_te.mean(axis=0).max(), oracle_nom=noms[int(np.argmax(m_te.mean(axis=0)))],
            gagne_bh=float((m_te[:, k_best] > np.array([series[a][3][te[1]] / series[a][3][te[0]] * (1 - FRAIS) - 1 for a in actifs])).mean()),
        ))
        i += pas
    return plis, noms

def pc(x): return f'{x*100:+6.1f} %'

if __name__ == '__main__':
    import datetime as dt
    jeux = {
        'crypto15m': (['BTC','ETH','SOL','XRP','DOGE','ADA','BNB','LINK','AVAX','LTC'], '15m', 60*96, 30*96, 30*96, 'jours'),
        'crypto1h': (['BTC','ETH','SOL','XRP','DOGE','ADA','BNB','LINK','AVAX','LTC'], '1h', 180*24, 90*24, 90*24, ''),
        'crypto4h': (['BTC','ETH','SOL','XRP','DOGE','ADA','BNB','LINK','AVAX','LTC'], '4h', 180*6, 90*6, 90*6, ''),
        'crypto1d': (['BTC','ETH','SOL','XRP','DOGE','ADA','BNB','LINK','AVAX','LTC'], '1d', 365, 182, 182, ''),
        'bourse1h': (['AAPL','MSFT','NVDA','TSLA','AMZN','GOOGL','META','MC.PA','TTE.PA','AIR.PA','OR.PA','FCHI','GSPC'], '1h', 126*7, 63*7, 63*7, ''),
        'bourse1d': (['AAPL','MSFT','NVDA','TSLA','AMZN','GOOGL','META','MC.PA','TTE.PA','AIR.PA','OR.PA','FCHI','GSPC'], '1d', 504, 252, 252, ''),
    }
    for nom in sys.argv[1:]:
        actifs, suf, tr, te, pas, _ = jeux[nom]
        plis, noms = etude(actifs, suf, tr, te, pas, None)
        print(f'\n===== {nom} : {len(noms)} robots essayés, {len(plis)} périodes de test =====')
        for p in plis:
            d0, d1 = (dt.datetime.utcfromtimestamp(x).strftime('%Y-%m-%d') for x in p['periode'])
            print(f"{d0}→{d1} | choisi « {p['choisi']} » passé {pc(p['choisi_tr'])} → suite {pc(p['choisi_te'])} | attendre passé {pc(p['bh_tr'])} suite {pc(p['bh'])} | hasard {pc(p['hasard'])} | sur-mesure passé {pc(p['sur_mesure_tr'])} → suite {pc(p['sur_mesure_te'])} | meilleur a posteriori « {p['oracle_nom']} » {pc(p['oracle_te'])} | bat attendre sur {p['gagne_bh']*100:.0f} % des actifs")
        moy = lambda k: np.mean([p[k] for p in plis])
        print(f"MOYENNE : robot choisi passé {pc(moy('choisi_tr'))} → suite {pc(moy('choisi_te'))} | attendre {pc(moy('bh'))} | hasard {pc(moy('hasard'))} | sur-mesure passé {pc(moy('sur_mesure_tr'))} → suite {pc(moy('sur_mesure_te'))} | bat attendre : {sum(p['choisi_te'] > p['bh'] for p in plis)}/{len(plis)} périodes")
