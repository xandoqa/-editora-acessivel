"""
Capas de demonstração da Livrin: composições geométricas originais.

Sem texto de propósito — o card do catálogo já escreve título e autoria por
cima da imagem, e repetir ali deixaria tudo duplicado. O que a capa precisa
fazer é dar cor e caráter a cada obra, no mesmo vocabulário editorial do
site: campo de cor chapada, uma forma grande, um filete.

Desenhadas em 4x e reduzidas: é assim que se consegue borda suave sem
antisserrilhado de verdade na PIL.
"""
from PIL import Image, ImageDraw
import math, sys, os

L, A, S = 1024, 558, 4   # largura, altura, supersample

def rgb(h): return tuple(int(h[i:i+2], 16) for i in (1, 3, 5))

# Pares de cartaz: fundo + traço. Saturados, mas de tinta, não de néon.
PALETAS = {
    'indigo':   ('#1b2a6b', '#f2d49b'),
    'tijolo':   ('#8f3a24', '#f4e3c8'),
    'oliva':    ('#2f4a2c', '#e8d9a8'),
    'ameixa':   ('#4a2545', '#efc7a0'),
    'petroleo': ('#14484f', '#e9d7b6'),
    'mostarda': ('#9a6708', '#1d1b20'),
    'carvao':   ('#1f1d24', '#d9643a'),
    'vinho':    ('#5e1f2e', '#e7cfa6'),
    'musgo':    ('#3b4a24', '#f0dfa8'),
    'azulejo':  ('#20466e', '#e4d2ae'),
    'ferrugem': ('#7b3f10', '#eadcc0'),
    'noite':    ('#232a3d', '#c9a227'),
}

def arcos(d, f, t):
    """Arcos concêntricos saindo de um canto."""
    cx, cy = L*S*0.18, A*S*1.05
    for i in range(7):
        r = (A*S*0.30) + i*(A*S*0.17)
        d.arc([cx-r, cy-r, cx+r, cy+r], 200, 340, fill=t, width=int(9*S))

def bandas(d, f, t):
    """Faixas horizontais e um disco deslocado."""
    for i in range(5):
        y = int(A*S*(0.16 + i*0.15))
        d.rectangle([0, y, L*S, y+int(6*S)], fill=t)
    r = A*S*0.30
    cx, cy = L*S*0.74, A*S*0.46
    d.ellipse([cx-r, cy-r, cx+r, cy+r], fill=f, outline=t, width=int(8*S))

def disco(d, f, t):
    """Um disco enorme cortado pela borda, com filete."""
    r = A*S*0.52
    cx, cy = L*S*0.76, A*S*0.50
    d.ellipse([cx-r, cy-r, cx+r, cy+r], fill=t)
    d.rectangle([0, int(A*S*0.80), L*S, int(A*S*0.80)+int(5*S)], fill=t)

def diagonais(d, f, t):
    """Chuva diagonal."""
    passo = int(L*S*0.055)
    for x in range(-A*S, L*S + A*S, passo):
        d.line([(x, 0), (x + A*S, A*S)], fill=t, width=int(7*S))
    d.rectangle([int(L*S*0.08), int(A*S*0.30), int(L*S*0.42), int(A*S*0.70)], fill=f)

def montanhas(d, f, t):
    """Silhueta de serra e um sol."""
    r = A*S*0.17
    cx, cy = L*S*0.72, A*S*0.30
    d.ellipse([cx-r, cy-r, cx+r, cy+r], fill=t)
    base = A*S
    pts = [(0, base), (L*S*0.22, A*S*0.52), (L*S*0.40, A*S*0.74),
           (L*S*0.60, A*S*0.40), (L*S*0.82, A*S*0.70), (L*S, A*S*0.50), (L*S, base)]
    d.polygon(pts, fill=t)

def ondas(d, f, t):
    """Ondas senoidais — para o mar e para a poesia."""
    for i in range(6):
        y0 = A*S*(0.22 + i*0.12)
        pts = [(x, y0 + math.sin(x/(L*S)*math.pi*4 + i*0.6) * A*S*0.055)
               for x in range(0, L*S+1, int(L*S/120))]
        d.line(pts, fill=t, width=int(7*S), joint='curve')

def raios(d, f, t):
    """Leque de raios a partir da base."""
    cx, cy = L*S*0.5, A*S*1.15
    for i in range(19):
        ang = math.radians(188 + i*9.1)
        d.line([(cx, cy), (cx + math.cos(ang)*L*S, cy + math.sin(ang)*L*S)], fill=t, width=int(6*S))
    d.ellipse([cx-A*S*0.20, cy-A*S*0.20, cx+A*S*0.20, cy+A*S*0.20], fill=f, outline=t, width=int(8*S))

def blocos(d, f, t):
    """Retângulos vazados que se cruzam."""
    d.rectangle([int(L*S*0.08), int(A*S*0.14), int(L*S*0.56), int(A*S*0.78)], outline=t, width=int(10*S))
    d.rectangle([int(L*S*0.38), int(A*S*0.30), int(L*S*0.90), int(A*S*0.92)], outline=t, width=int(10*S))
    d.rectangle([int(L*S*0.46), int(A*S*0.38), int(L*S*0.70), int(A*S*0.62)], fill=t)

def pontos(d, f, t):
    """Trama de pontos com uma lua vazada."""
    passo = int(L*S*0.045)
    r = int(passo*0.17)
    for y in range(passo, A*S, passo):
        for x in range(passo, L*S, passo):
            d.ellipse([x-r, y-r, x+r, y+r], fill=t)
    R = A*S*0.33
    cx, cy = L*S*0.70, A*S*0.48
    d.ellipse([cx-R, cy-R, cx+R, cy+R], fill=f)
    d.ellipse([cx-R, cy-R, cx+R, cy+R], outline=t, width=int(9*S))

FORMAS = [arcos, bandas, disco, diagonais, montanhas, ondas, raios, blocos, pontos]

# obra → (forma, paleta)
CAPAS = {
    'alem-das-estrelas':    (raios,      'indigo'),
    'chamas-de-agosto':     (montanhas,  'ferrugem'),
    'cosmic-fusion':        (raios,      'ameixa'),
    'cronicas-urbanas':     (blocos,     'carvao'),
    'ecos-de-la-marea':     (ondas,      'azulejo'),
    'meu-livro-incrivel':   (disco,      'tijolo'),
    'o-ultimo-mapa':        (arcos,      'noite'),
    'raizes':               (montanhas,  'musgo'),
    'rimas-becquer':        (pontos,     'vinho'),
    'terra-nova':           (diagonais,  'oliva'),
    'vozes-do-mar':         (arcos,      'petroleo'),
    'zine-tatil-3':         (blocos,     'mostarda'),
    'o-alfabeto-das-coisas-pequenas': (bandas, 'oliva'),
}

destino = sys.argv[1]
os.makedirs(destino, exist_ok=True)
for nome, (forma, pal) in CAPAS.items():
    fundo, traco = (rgb(c) for c in PALETAS[pal])
    im = Image.new('RGB', (L*S, A*S), fundo)
    d = ImageDraw.Draw(im)
    forma(d, fundo, traco)
    # Moldura vazada fina: o enquadramento das referências editoriais.
    m = int(L*S*0.022)
    d.rectangle([m, m, L*S-m, A*S-m], outline=traco, width=int(2.5*S))
    im = im.resize((L, A), Image.LANCZOS)
    im.save(os.path.join(destino, f'{nome}.webp'), 'WEBP', quality=90, method=6)
    print(f'{nome}.webp  {forma.__name__}/{pal}')
