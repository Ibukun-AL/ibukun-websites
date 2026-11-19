# Ibukun Aluko: fixed-price websites

A one-page site for selling three fixed-scope Next.js website packages on Upwork and Fiverr. Built with the taste-skill kit (`assets/`), static HTML plus one serverless function.

## What is on the page
Hero with a short film, the work (three builds), questions, three packages with prices, a brief form, and a footer. The brief form posts to `api/brief.js`, which emails it through Resend.

## Run it
```bash
python3 -m http.server 8080   # the page; the form needs the Vercel function below
npm test                      # 5 tests for the brief endpoint
```

## Deploy (Vercel)
Set these in the project's environment variables, server side only: `RESEND_API_KEY`, `CONTACT_FROM`, `CONTACT_TO`.

## Open facts to confirm before launch
- Prices and delivery days are proposals: `$180 / 3 days`, `$450 / 7 days`, `$950 / 14 days`. Every one carries `data-assumed` in `index.html`.
- Terms stated in the FAQ (two rounds of changes, code handed over on GitHub, deploy to the client's Vercel) are proposals too.
- The canonical domain is not set (a commented `<link rel="canonical">` is in the head).
- Add the Upwork and Fiverr profile links when they exist.
