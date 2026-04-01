# Card Assets

We use the public-domain English pattern deck sheet and slice it into 52 PNGs.

Expected file:

- `client/public/cards/english_deck.svg` (this is a PNG sheet in our repo)

To (re)generate the 52 card images:

```bash
python3 scripts/slice_cards.py
```

Generated cards are placed in:

- `client/public/cards/generated/AS.png`
- `client/public/cards/generated/10D.png`

If you replace the sheet, rerun the script.
