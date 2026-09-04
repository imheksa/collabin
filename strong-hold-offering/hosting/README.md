# Firebase Hosting — Strong Commitment Protocol prototype

Static deploy of the interactive prototype (mock data only, no backend). The whole
app is one file: `public/index.html`, loading React/ReactDOM/Babel from cdnjs and
compiling JSX in the browser — no build step needed.

## Deploy (first time)

```bash
npm install -g firebase-tools     # Firebase CLI
cd strong-hold-offering/hosting
firebase login                    # opens a browser for Google OAuth
firebase projects:create          # or use an existing project
```

Put the project ID into `.firebaserc` (replace `YOUR_FIREBASE_PROJECT_ID`), then:

```bash
firebase deploy --only hosting
```

You'll get a live URL at `https://<project-id>.web.app` (and `.firebaseapp.com`).

## Redeploy after editing the prototype

Regenerate `public/index.html` from the source artifact file, then:

```bash
firebase deploy --only hosting
```

## Pointing your own domain at it later

Firebase Console → Hosting → **Add custom domain** → follow the DNS verification
steps (a TXT record, then an A/CNAME record). SSL is provisioned automatically.

## Notes

- Routing is client-side (`#/sho`, `#/sso`, ...) via the URL hash, so a single
  `index.html` serves every route — no server-side rewrites are configured or needed.
- This mirrors what's published as a Claude Artifact; update both if you keep them
  in sync, or drop the Artifact copy once this is the canonical live version.
