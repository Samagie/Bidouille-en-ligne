"""Télécharge l'historique long (cryptos Binance, Bourse Yahoo) dans etude/donnees/ (non versionné)."""
import json, time, urllib.request, urllib.parse, sys
from pathlib import Path
D = Path(__file__).resolve().parent / 'donnees'
D.mkdir(exist_ok=True)
CRYPTOS = ['BTC','ETH','SOL','XRP','DOGE','ADA','BNB','LINK','AVAX','LTC','PAXG','EUR']
def binance(sym, iv, n):
    out, fin = [], None
    while len(out) < n:
        lim = min(1000, n - len(out))
        u = f'https://data-api.binance.vision/api/v3/klines?symbol={sym}&interval={iv}&limit={lim}' + (f'&endTime={fin}' if fin else '')
        lot = json.load(urllib.request.urlopen(u, timeout=30))
        out = lot + out
        if len(lot) < lim: break
        fin = lot[0][0] - 1
    return [[k[0]//1000, float(k[1]), float(k[2]), float(k[3]), float(k[4])] for k in out]
for iv, n in [('1h', 2*8760), ('15m', 180*96), ('4h', 2*2190), ('1d', 5*365)]:
    for c in CRYPTOS:
        f = D / f'{c}_{iv}.json'
        if f.exists(): continue
        b = binance(c + 'USDT', iv, n)
        b = b[:-1]  # bougie en cours
        f.write_text(json.dumps(b)); print(c, iv, len(b), flush=True)
STOCKS = ['AAPL','MSFT','NVDA','TSLA','AMZN','GOOGL','META','MC.PA','TTE.PA','AIR.PA','OR.PA','^FCHI','^GSPC']
for iv, rg in [('1h', '2y'), ('1d', '10y')]:
    for s in STOCKS:
        f = D / f"{s.replace('^','')}_{iv}.json"
        if f.exists(): continue
        u = f'https://query1.finance.yahoo.com/v8/finance/chart/{urllib.parse.quote(s)}?interval={iv}&range={rg}'
        r = json.load(urllib.request.urlopen(urllib.request.Request(u, headers={'User-Agent':'Mozilla/5.0'}), timeout=30))['chart']['result'][0]
        q = r['indicators']['quote'][0]
        b = [[t, q['open'][i], q['high'][i], q['low'][i], q['close'][i]] for i, t in enumerate(r['timestamp']) if None not in (q['open'][i], q['high'][i], q['low'][i], q['close'][i])]
        f.write_text(json.dumps(b)); print(s, iv, len(b), flush=True); time.sleep(0.5)
