from PIL import Image
from pathlib import Path

SPRITE_PATH = Path('client/public/cards/english_deck.svg')
OUT_DIR = Path('client/public/cards/generated')

# Grid detected from the uploaded sheet
COL_RANGES = [
    (1,145),(148,293),(296,441),(444,588),(591,736),(739,884),(887,1031),
    (1034,1179),(1182,1327),(1330,1475),(1478,1623),(1626,1771),(1774,1919)
]
ROW_RANGES = [(1,213),(216,427),(430,641),(644,855)]

# Detected order from the uploaded sheet: Clubs, Diamonds, Hearts, Spades
SUITS = ['C','D','H','S']
RANKS = ['A','2','3','4','5','6','7','8','9','10','J','Q','K']

img = Image.open(SPRITE_PATH).convert('RGB')
OUT_DIR.mkdir(parents=True, exist_ok=True)

for row_idx, suit in enumerate(SUITS):
    y1, y2 = ROW_RANGES[row_idx]
    for col_idx, rank in enumerate(RANKS):
        x1, x2 = COL_RANGES[col_idx]
        crop = img.crop((x1, y1, x2 + 1, y2 + 1))
        out = OUT_DIR / f"{rank}{suit}.png"
        crop.save(out)

print(f"Saved cards to {OUT_DIR}")
