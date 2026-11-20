# Ibukun Aluko: fixed-price websites

A one-page site for selling three fixed-scope Next.js website packages on Upwork and Fiverr. Built with the taste-skill kit (`assets/`), static HTML plus one serverless function.

## What is on the page
Hero, the work (three builds), how I build, questions, three packages (scope and delivery time, no prices), a brief form, and a footer. The brief form posts to `api/brief.js`, which emails it through Resend.

## Run it
```bash
python3 -m http.server 8080   # the page; the form needs the Vercel function below
npm test                      # 5 tests for the brief endpoint
```

## Deploy (Vercel)
Set these in the project's environment variables, server side only: `RESEND_API_KEY`, `CONTACT_FROM`, `CONTACT_TO`.

## Open facts to confirm before launch
- Delivery days (3, 7 and 14) are proposals and carry `data-assumed` in `index.html`. Prices are deliberately not on the page: they are quoted when a brief arrives.
- Terms stated in the FAQ (two rounds of changes, code handed over on GitHub, deploy to the client's Vercel) are proposals too.
- The canonical domain is not set (a commented `<link rel="canonical">` is in the head).
- Add the Upwork and Fiverr profile links when they exist.
