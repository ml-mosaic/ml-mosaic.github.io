# Mosaic website

The static site for Mosaic (m1 sprites, v1 animated scenes), served by GitHub Pages at
[ml-mosaic.github.io](https://ml-mosaic.github.io). Everything live (accounts, the Studio, generation, plans) comes
from the Mosaic backend, which the pages call over HTTPS (`config.js` → `MOSAIC.backend`).

## Develop locally

```bash
python3 -m http.server 3000                                                    # this folder
cd ../website_backend && HOME_URL=http://localhost:3000 uvicorn app:app --port 8000
```

On `localhost` the site talks to the backend at `http://localhost:8000` automatically.

## Pages

- `index.html`: the home page. A pixel world where m1 draws live and finished sprites join a parade; the two models
  (v1's card plays its latest real training samples, refreshed every checkpoint); the plans; the wish machine; the
  sticker book; the API.
- `studio/`: Mosaic Studio. The community gallery (likes, follows, profiles) and your own creations, with a composer
  for m1 and v1. Artisan and Atelier get the **pro Studio** (exact creativity, fixed seeds, batches, a look themed to
  the plan) and more download formats; plan badges show next to names.
- `pricing/`: Free, Artisan ($5/month, free trial) and Atelier ($15/month), each with its mascot. Plan buttons adapt
  to the signed-in user's plan (start a trial, upgrade, downgrade, cancel).
- `join/`: a direct link to the subscribe popup (`?tier=artisan|atelier&mode=join|upgrade|downgrade|cancel`).
- `license/`: what you can do with what you make (personal vs commercial use).
- `login/`: sign in / create account, with a random 8-bit scene whose animal watches the cursor.
- `settings/`: profile (name, bio, website, banner, picture), plan and today's allowance, linking Patreon, the
  Studio look (pro or classic), two-step sign-in.
- `portal/`, `portal/keys/`: the API: account, keys, today's allowance, a playground and the reference.
- `status/`: live checks of the API, the image workers, m1, v1, accounts and the Studio every 30 s, plus the incident
  history in `assets/status/incidents.json`.
- `blog/`: posts. Keep posts about what the models do, never how they work inside (closed source).

## Shared pieces

- `assets/kit.js` / `kit.css`: the top bar, pixel avatars, badges, critters whose eyes follow the cursor, toasts and
  pixel dialogs (the site never uses the browser's own).
- `assets/session.js`: keeps the sign-in session and calls the backend with it.
- `assets/subscribe.js`: the subscribe popup (a cat at a cash register) that every plan button opens, and the
  plan-aware buttons.
- Pages load `kit.css`, `kit.js` and `subscribe.js` with a `?v=` version: bump it when they change so browsers
  pick up the new copy.

## Art

```bash
python3 tools/draw_scenes.py      # the 8-bit scenes and animals, plan mascots, nameplates, the cash register
```

The m1 sprites in `assets/m1/` come from a private tool outside this folder (`assets/m1/showcase.json` lists their
prompts). `assets/v1/samples/` and `samples.json` are updated automatically from v1's training (real output from
prompts it never trained on).
