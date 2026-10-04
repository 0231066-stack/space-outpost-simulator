# Base44 Dev Environment

## Project type
Static web app (vanilla HTML/CSS/JS) — no build step, no backend, no database, no external secrets.

## Known quirk
The original commit had file contents swapped: `script.js` contained CSS and `style.css` contained HTML, with no `index.html`. This was corrected — `index.html` holds the markup, `style.css` holds the styles, `script.js` holds the game logic.

## Running the app
```bash
docker compose -f docker-compose.base44.yml up -d --build
```
Uses `node:22-slim` with `npx vite` as a live-reload dev server on port 3000. Vite serves the static `index.html` at the repo root with HMR for CSS/JS edits.

## Verifying
- `docker compose ps` — web service should be `healthy`
- `curl -s localhost:3000` — returns the HTML page
- The preview shows the Space Outpost Simulator game with mission picker, resource bars, systems, actions, and log
