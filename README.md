# Mosaic website

Static site for m1, ready for GitHub Pages.
Accounts and image generation come from the backend in `../website_backend`.

## Develop locally

```bash
python3 -m http.server 3000                                                    # this folder
cd ../website_backend && HOME_URL=http://localhost:3000 uvicorn app:app --port 8000
```

On `localhost` the site talks to the backend at `http://localhost:8000` automatically.

## Publish on GitHub Pages

1. Put the backend somewhere reachable over **HTTPS** (see its README) and set `production` in `config.js` to that
   address.
2. Push this folder's contents to a repo (or a `docs/` folder) and turn on Pages in the repo settings
   (Settings → Pages → deploy from branch). All links are relative, so it works at `you.github.io/<repo>/`.
   `.nojekyll` makes Pages serve every file as-is.
3. Start the backend with `HOME_URL=https://you.github.io/<repo>` and `CORS_ORIGINS=https://you.github.io`.

## Pages

- `index.html`: the home page: a pixel world where m1 draws live (real denoising frames) and finished sprites join a
  parade; a training-progress HUD; the wish machine (8 prompts × 3 weirdness levels × 4 seeds, all real); how it
  works; the sticker book (48 prompts, first take each); the API.
- `login/`: sign in / create account, with a random 8-bit scene per visit whose animal watches the cursor.
- `studio/`: Mosaic Studio, where sign-in lands. Explore (community gallery: enlarge, like, follow, profiles) and
  Your stuff, with a composer pinned to the bottom: prompt, model menu (hover m1 for its autumn nameplate),
  Strict / Classic / Wild. **Dummy data for now** (see the backend README).
- `status/`: server status. Checks the backend from the browser every 30 s (API, model, accounts, studio); no answer
  = outage. The 90-day bars and past incidents come from `assets/status/incidents.json`, which is **sample data**.
  The site manager (a very tired cat in a hard hat) naps while things are fine.
- `portal/`: account, keys and today's allowance, a live playground and the API reference. Needs sign-in.
- `portal/keys/`: make, rename and revoke API keys (each shown in full once).
- `settings/`: your public profile: display name, bio, website, banner, and a picture (upload, have m1 draw it, or the
  pixel pattern), with a live preview.
- `blog/`: posts; `blog/introducing-m1/` is the launch post. Keep posts about what m1 does, never how it works inside (closed source).
- `assets/kit.js` / `kit.css`: the shared top bar, pixel avatars, critters whose eyes follow the cursor, toasts, and
  `Kit.confirm` / `Kit.alert` (pixel dialogs with an animal peeking over; the site never uses the browser's own).
- `assets/session.js`: keeps the sign-in session (localStorage with "remember me", else sessionStorage) and calls the
  backend with it.

## Refreshing the art

```bash
python3 tools/draw_scenes.py                   # the hand-drawn 8-bit scenes and animals
```

The m1 sprites in `assets/m1/` are made by a private tool outside this folder (m1 is closed source; nothing here
touches the model). `assets/m1/showcase.json` lists their prompts, seeds and creativity values.
