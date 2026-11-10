"""Télécharge les cours et les signaux d'humeur dans etude/donnees/ (non versionné).

Sources, toutes gratuites et sans clé :
- cours journaliers : Binance (cryptos) ;
- indice « peur et avidité » : alternative.me ;
- presse mondiale : GDELT (ton moyen et nombre d'articles par jour) ;
- curiosité du public : pages vues sur Wikipédia.
"""
import json, time, urllib.parse, urllib.request
from pathlib import Path

D = Path(__file__).resolve().parent / 'donnees'
D.mkdir(exist_ok=True)
UA = {'User-Agent': 'labo-bidouille-en-ligne/1.0 (https://github.com/Samagie/Bidouille-en-ligne)'}
# code : (page Wikipédia, recherche GDELT)
ACTIFS = {
    'BTC': ('Bitcoin', 'bitcoin'), 'ETH': ('Ethereum', 'ethereum'), 'XRP': ('XRP_Ledger', 'ripple xrp'),
    'LTC': ('Litecoin', 'litecoin'), 'ADA': ('Cardano_(blockchain_platform)', 'cardano'), 'BNB': ('Binance', 'binance'),
    'DOGE': ('Dogecoin', 'dogecoin'), 'LINK': ('Chainlink_(blockchain)', 'chainlink'), 'SOL': ('Solana_(blockchain_platform)', 'solana'),
    'AVAX': ('Avalanche_(blockchain_platform)', 'avalanche crypto'),
}
DEBUT, FIN = '20180101', time.strftime('%Y%m%d', time.gmtime())

def lire(url, essais=6, attente=8):
    for k in range(essais):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=60) as r:
                return json.loads(r.read().decode('utf-8', 'replace'))
        except Exception as e:
            print('   …nouvel essai', k + 1, str(e)[:60], flush=True)
            time.sleep(attente * (k + 1))
    return None

def garder(nom, f):
    p = D / f'{nom}.json'
    if p.exists(): return
    d = f()
    if d: p.write_text(json.dumps(d)); print('✅', nom, len(d), flush=True)
    else: print('⚠️', nom, 'indisponible', flush=True)

def binance(code):
    out, fin = [], None
    while True:
        u = f'https://data-api.binance.vision/api/v3/klines?symbol={code}USDT&interval=1d&limit=1000' + (f'&endTime={fin}' if fin else '')
        lot = lire(u)
        if not lot: break
        out = lot + out
        if len(lot) < 1000 or lot[0][0] < 1514764800000: break
        fin = lot[0][0] - 1
    return [[k[0] // 1000, float(k[4])] for k in out][:-1]

def peur():
    d = lire('https://api.alternative.me/fng/?limit=0&format=json')
    return sorted([int(x['timestamp']), int(x['value'])] for x in d['data']) if d else None

def gdelt(requete, mode):
    q = urllib.parse.quote(requete)
    d = lire(f'https://api.gdeltproject.org/api/v2/doc/doc?query={q}&mode={mode}&format=json&startdatetime={DEBUT}000000&enddatetime={FIN}000000')
    time.sleep(6)
    if not d or 'timeline' not in d: return None
    s = d['timeline'][0]['data']
    return [[x['date'][:8], x['value'], x.get('norm')] for x in s]

def wiki(page):
    d = lire(f'https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/en.wikipedia/all-access/user/{urllib.parse.quote(page, safe="")}/daily/{DEBUT}/{FIN}', attente=20)
    time.sleep(3)
    return [[x['timestamp'][:8], x['views']] for x in d['items']] if d and 'items' in d else None

garder('peur', peur)
for code in ACTIFS: garder(f'cours_{code}', lambda: binance(code))
for code, (page, requete) in ACTIFS.items():
    garder(f'ton_{code}', lambda: gdelt(requete, 'timelinetone'))
    garder(f'articles_{code}', lambda: gdelt(requete, 'timelinevolraw'))
for code, (page, requete) in ACTIFS.items(): garder(f'wiki_{code}', lambda: wiki(page))
print('fini')
