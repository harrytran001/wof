## Wheel of Fortune (in-person host) — React + localStorage

This is a lightweight **Wheel of Fortune helper app** for in-person play:

- **Players**: add by name, set active player, add/deduct points
- **Word bank (Admin)**: add phrases before the game, mark used/unused
- **Round + Guess**: pick a puzzle, players guess the **full phrase** (matching ignores case/punctuation)
- **Storage**: everything persists in **localStorage** (also includes export/import JSON backup)

### Local development

```bash
npm install
npm run dev
```

### Deploy to GitHub Pages

1. Push this repo to GitHub (default branch: `main`)
2. In GitHub: **Settings → Pages**
3. Under **Build and deployment**, choose **GitHub Actions**
4. Push to `main` and the workflow will publish automatically.

Notes:
- Vite’s base path is set via `BASE_PATH` in `.github/workflows/deploy.yml`.


