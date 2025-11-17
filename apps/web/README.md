# Web (Next.js)

- Dev: `pnpm --filter @collectible/web dev`
- Env:
  - `NEXT_PUBLIC_API_URL` (default http://localhost:4000)

Pages:
- `/` Home
- `/collection` Enter wallet to view NFTs (calls GET /nfts)
- `/claim` Form to mint (calls POST /claim)
