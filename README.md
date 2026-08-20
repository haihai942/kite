# Khmer Living Archive — starter

This is the starting point for your ICT 340 capstone: a community archive that preserves a piece of Khmer culture. Right now it's one page. By December it will browse, search, take contributions, and publish reviewed entries. Same skeleton for everyone; the collection is yours.

## Lab 1: get this live

Follow the Lab 1 guide on Canvas. The short version:

1. Click **Use this template** (top right) → **Create a new repository**. Name it after your archive.
2. Go to [vercel.com](https://vercel.com), sign in with GitHub, **Add New → Project**, import your new repository, and click **Deploy**.
3. Clone your repo, open it in VS Code, edit `collection.config.js` (the only file you touch today), then commit and push:

   ```bash
   git clone https://github.com/YOUR-USERNAME/YOUR-REPO-NAME.git
   cd YOUR-REPO-NAME
   code .
   # edit collection.config.js, then:
   git add .
   git commit -m "make it mine"
   git push
   ```

4. Watch Vercel redeploy on its own, then submit your live URL to the Lab 1 assignment on Canvas.

## Running it locally (optional today, needed from week 2)

```bash
npm install
npm run dev
```

Then open http://localhost:3000.

## Rules of the road

You own what you ship. Every line that lands in this repository is yours to explain, whoever or whatever wrote it.
