## Project Overview & Objectives

### Vision

Corduroy Collector offers a new way for fans to engage with art, while also reimagining the onboarding flow and purpose of NFTs within the context of the creative industries.

### User journey

Users can log into the app with email; behind the scenes the app creates a wallet address associated to that account, without the user needing to understand or interact with a traditional crypto wallet. For this use case, we imagine the user at a gallery show. They are instructed by the app to go through the event and look for work by a specific artist.

When they find a work by the artist, they can go to the Collect page, open their camera, and scan the piece of art. The app uses image recognition to understand which image it is looking at, then mints an NFT that represents that piece of work and sends it to the user's abstracted blockchain account.

The user can go to their Collection to view the pieces and find additional information on the work. The app also features bonus content. Once the user collects several pieces, they unlock a new piece of art that they can collect from within the app. Collecting this bonus content also mints an NFT to their abstracted wallet. When they navigate back to their Collections page, they can find the final piece of art they collected, along with companion music that is now unlocked for listening.

### Why NFTs in this context

This process creates a much more organic flow and easy UX for distributing NFTs to fans. The biggest barrier to having fans collect NFTs has been the need to create a wallet, fund that wallet, then navigate to a marketplace and purchase an arbitrary NFT with no real meaning. Even just using the word “NFT” has historically blocked mainstream adoption. Within the context of this app, users are simply collecting digital versions of their favourite works in a gamified manner.

The use of NFTs in this context also differs from what most are used to. The user isn’t collecting an NFT as an asset that will be resold. Instead, it is a datapoint that represents the ways in which they have engaged with the artist, serving a similar function to POAPs. Artists can then use the datagraph their fans have generated to find and reward their biggest supporters with additional perks.

### Future extensions

Although this is a simple proof of concept, there are many ways to expand on the functions and use cases of this app. One example would be to have fans use it to collect digital versions of merch they purchase. A fan might go to a band’s merch table and purchase their record with whatever form of payment they desire (e.g. fiat). They can then scan the record to collect the digital version of it, onboarding them onto Polkadot without having to figure out how to purchase cryptocurrencies, send them to the right account, etc.

Other features that could be added might include geolocking NFT distribution to participants at specific events, or including unlock codes in merchandise so you know they actually bought the piece before it is added to the collection.

Over time, tools like this can shift the culture for fans, helping them realize how important it is to show up and support local artists. They will be incentivized to engage more because they are building out a platform-agnostic digital footprint that could result in rewards down the road.


## Instructions

### 1. Testing the Live Demo (Recommended)

1. **Open the demo site**  
   Visit: https://corduroy-collector-web.vercel.app/

2. **Log in with Web3Auth (email)**  
   - Click the **Login** button in the top-right.  
   - Choose **Email / Social login** and complete the Web3Auth flow.  
   - Once logged in, you’ll be redirected to the **Collection** page.

3. **Claim an artwork using the sample poster**  
   - Open the shared folder with sample art:  
     [https://drive.google.com/drive/folders/10VnQWHqKoQC00s0KHoDMLnuTxG24AwGj?usp=drive_link](url)
   - On the site, go to the **Collect** page.
   - Use your device camera to scan the sample artwork (QR / code / image as instructed on the page).
   - After a successful scan/claim, return to the **Collection** page to see your newly unlocked piece 

4. **Verify blockchain activity**  
   - After collecting a piece of art, you can navigate to the **Wallet Address** entry in the menu.  
   - This would normally be hidden in a production environment, but in this demo it allows you to see what is happening on-chain.

5. **Bonus Content**  
   - The **Bonus Content** page has a counter that keeps track of how much art you have collected.
   - After collecting **3 pieces**, you will unlock a bonus piece of content to collect.
   - Once you unlock and collect the bonus content, you can navigate back to the **Collection** page to view and listen to it.


### 2. Deploying a Test Version (Using Existing Contracts)

This path is for deploying your own copy of the web + API, while still using the existing contracts on Moonbase Alpha testnet.

#### 2.1. Prerequisites

- Node.js (v18+ recommended)
- pnpm (`npm install -g pnpm`)
- GitHub account (for hosting the repo)
- Railway account (for API hosting)  
- Vercel account (for web hosting)

#### 2.2. Clone and Install

```bash
git clone https://github.com/<your-org>/<repo-name>.git
cd <repo-name>
pnpm install
```

#### 2.3. Configure API Environment (Server-side)

Create `apps/api/.env` (do **not** commit this file):

```env
PORT=4000

NFT_CONTRACT_ADDRESS=YOUR_NFT_CONTRACT_ADDRESS   # use the existing hackathon contract
WEB3AUTH_CLIENT_ID=YOUR_WEB3AUTH_CLIENT_ID
PINATA_JWT=YOUR_PINATA_JWT
PINATA_GATEWAY_URL=https://gateway.pinata.cloud/ipfs

RELAYER_PRIVATE_KEY=YOUR_RELAYER_PRIVATE_KEY
MOONBASE_RPC_URL=https://rpc.api.moonbase.moonbeam.network
CHAIN_ID=1287

ADMIN_TOKEN=YOUR_ADMIN_TOKEN
EDITION_LABEL_MAP={"corduroy-demo-001":"1","corduroy-demo-002":"2","corduroy-demo-003":"3"}
```

Run the API locally:

```bash
cd apps/api
pnpm dev
# API runs on http://localhost:4000
```

Or deploy the API to Railway:

- Push the repo to GitHub.
- In Railway:
  - Create a new project from the GitHub repo.
  - Ensure the **Builder** is set to **Railpacks** (or Auto) and that **Railway Config File** is left blank.
  - Keep the **Root directory** as the **repo root** (do not change it to `apps/api`).
  - Set **Build command** to: `pnpm --filter api build`
  - Set **Start command** to: `pnpm --filter api start`
  - Add the same `.env` variables in the **Variables** tab.
- After deployment, note the public API URL, e.g. `https://your-api.up.railway.app`.
- If you deploy a separate frontend (e.g. on Vercel), make sure your API's CORS configuration allows your frontend domain (for example, `https://*.vercel.app`).

#### 2.4. Configure Web Environment (Client-side)

Create `apps/web/.env.local`:

```env
NEXT_PUBLIC_API_URL=https://your-api.up.railway.app
NEXT_PUBLIC_WEB3AUTH_CLIENT_ID=YOUR_WEB3AUTH_CLIENT_ID
NEXT_PUBLIC_RPC_URL=https://rpc.api.moonbase.moonbeam.network
```

Run the web app locally:

```bash
cd apps/web
pnpm dev
# Web runs on http://localhost:3000
```

To deploy the web to Vercel:

- Import the GitHub repo in Vercel.
- Set **Framework** to Next.js and **Root Directory** to `apps/web`.
- Override the defaults so that:
  - **Install Command** is `pnpm install --frozen-lockfile`
  - **Build Command** is `pnpm run build`
- Set environment variables for the project:
  - `NEXT_PUBLIC_API_URL`
  - `NEXT_PUBLIC_WEB3AUTH_CLIENT_ID`
  - `NEXT_PUBLIC_RPC_URL`
- Deploy; Vercel will give you a public URL for the demo.


### 3. Custom Build (New Collection & Training)

This path is for creating your **own collection**, with new artwork and metadata, while reusing the same architecture.

#### 3.1. High-Level Steps

1. Deploy your own ERC‑1155 contract (optional – you can reuse the hackathon contract).
2. Define edition IDs for each piece in the collection.
3. Prepare metadata & audio, and upload to IPFS.
4. Update env mappings so the API knows how to interpret your labels/pins.
5. Redeploy API and web with the new configuration.

#### 3.2. Deploy or Reuse an ERC‑1155 Contract

- Use the existing contract on Moonbase Alpha  
  **or**
- Deploy your own using the provided Hardhat scripts in `packages/contracts`:

```bash
cd packages/contracts
pnpm install
pnpm hardhat run scripts/deploy1155.ts --network moonbase
```

Take note of the new `NFT_CONTRACT_ADDRESS` and set it in `apps/api/.env`.

#### 3.3. Create and Upload Metadata to IPFS

For each artwork (edition):

```json
{
  "name": "Your Artwork Title",
  "description": "Short description of the piece",
  "image": "ipfs://<image-cid>",
  "animation_url": "ipfs://<audio-cid>"
}
```

> Note: The files `edition1.json`, `edition2.json`, `edition3.json`, and `admin-ed2.json` at the repository root are example metadata and admin payloads used during development. You can use them as references when creating or updating your own metadata and when calling the admin endpoint.

Upload:
- Image files (PNG/JPEG)
- Audio files (MP3)
- Metadata JSON

to IPFS (Pinata or similar) and collect the CIDs for each metadata JSON.

Configure your contract’s `uri(id)` to point to the correct metadata:
- via on-chain `setURI` calls using the admin route, or
- via a templated URI that encodes `id` in the path.

#### 3.4. Map Editions to Labels / Pins

In `apps/api/.env`:

```env
EDITION_LABEL_MAP={"your-label-001":"1","your-label-002":"2","your-label-003":"3"}
```

- `EDITION_LABEL_MAP` maps human-friendly labels or codes to numeric ERC‑1155 IDs.
- This is what the claim flow uses to figure out which edition to mint when a user scans/enters a code.

If you use PIN-based claiming, you can also configure:

```env
EDITION_PIN_MAP={"PIN123":"1","PIN456":"2"}
```

#### 3.5. Retrain / Reconfigure “Recognition” (TensorFlow.js Model)

The visual recognition in the **Collect** flow uses a TensorFlow.js image classifier loaded from:

- `apps/web/public/models/v1/model.json`
- `apps/web/public/models/v1/metadata.json`

At runtime, the web app calls:

- `tf.loadLayersModel('/models/v1/model.json')`
- Fetches `/models/v1/metadata.json` and uses `metadata.labels` as the list of classes.

To train a new model for your own collection:

1. **Collect training images**
   - Create a folder per class/edition (e.g. `corduroy-demo-001`, `corduroy-demo-002`, ...).
   - Use photos or scans of each physical artwork from multiple angles and lighting conditions.

2. **Train with Teachable Machine (recommended path)**
   - Go to **Teachable Machine – Image Project**: https://teachablemachine.withgoogle.com/
   - Create a new **Image** project.
   - Add a class for each edition label you plan to use in `EDITION_LABEL_MAP` (e.g. `corduroy-demo-001`).
   - Upload your training images into the corresponding classes.
   - Click **Train Model** and wait for training to finish.

3. **Export as TensorFlow.js**
   - In Teachable Machine, click **Export Model**.
   - Choose **TensorFlow.js** → **Download**.
   - This will give you a folder containing:
     - `model.json`
     - A set of `.bin` weight files
     - `metadata.json` (includes `labels` / `classes` array)

4. **Place the model files into the web app**
   - In this repo, go to: `apps/web/public/models/`.
   - Create a new versioned folder (optional but recommended), e.g. `v2/`.
   - Copy all downloaded files (`model.json`, `metadata.json`, and weight `.bin` files) into:
     - `apps/web/public/models/v2/`

5. **Update the model path in the code (if you change the version)**
   - Open `apps/web/app/claim/page.tsx`.
   - Locate the `ensureTfAndModel` function:
     - It currently does: `tf.loadLayersModel('/models/v1/model.json');`
     - And fetches `/models/v1/metadata.json`.
   - If you created `v2`, update these paths to:
     - `tf.loadLayersModel('/models/v2/model.json');`
     - `fetch('/models/v2/metadata.json', { cache: 'no-store' });`

6. **Align labels with edition IDs**
   - Open your new `metadata.json` in `apps/web/public/models/vX/`.
   - Ensure that the `labels` array matches the labels you use in `EDITION_LABEL_MAP`.
     - Example:
       - `metadata.labels = ["corduroy-demo-001","corduroy-demo-002","corduroy-demo-003"]`
       - `EDITION_LABEL_MAP={"corduroy-demo-001":"1","corduroy-demo-002":"2","corduroy-demo-003":"3"}`
   - The app takes the **top predicted label** from the model and uses it as `artId` when calling the API; the API then translates that label to a numeric edition ID via `EDITION_LABEL_MAP`.

7. **Adjust confidence threshold (optional)**
   - The recognition threshold is controlled by `NEXT_PUBLIC_TF_THRESHOLD` (default `0.8`).
   - To change it, set in `apps/web/.env.local`:
     ```env
     NEXT_PUBLIC_TF_THRESHOLD=0.75
     ```
   - Lower values make the model more likely to accept predictions (more sensitive), higher values require stronger confidence.

8. **Redeploy the web app**
   - Once you have updated the model files and, if needed, the paths in `claim/page.tsx`, rebuild and redeploy the web app.
   - No blockchain or API code changes are required for recognition beyond updating `EDITION_LABEL_MAP` to reflect your labels.

In summary:
- **On-chain**: you map labels → numeric edition IDs via `EDITION_LABEL_MAP` in the API.
- **Off-chain**: you train a TF.js image classifier whose output labels match those same strings.


#### 3.6. Redeploy API and Web

1. Update `apps/api/.env` with:
   - New `NFT_CONTRACT_ADDRESS` (if you deployed a new contract)
   - Updated `EDITION_LABEL_MAP` (and/or `EDITION_PIN_MAP`)
2. Update `apps/web/.env.local` only if:
   - API URL changed
   - Web3Auth config changed
3. Redeploy:
   - API to Railway (or your chosen host)
   - Web to Vercel

Once deployed, your custom build will:
- Recognize your new collection’s labels/codes
- Mint editions from your contract
- Display the new art + audio in the collection UI.


## Dependencies & Technologies Used

**Core stack**
- **Node.js** – runtime for API and tooling
- **pnpm** – monorepo package manager
- **TypeScript** – typed JavaScript for API and contracts

**Frontend**
- **Next.js** (apps/web) – React framework for the web app
- **React** – UI library for components
- **Web3Auth** – passwordless login via email / socials

**Backend / API**
- **Express** (apps/api) – REST API server
- **express-rate-limit** – basic API rate limiting
- **cors** – cross-origin resource sharing configuration
- **dotenv** – environment variable loading

**Blockchain & Web3**
- **Ethers v6** – blockchain RPC, contract interaction
- **Hardhat** (packages/contracts) – contract compilation & deployment
- **Moonbase Alpha** – Moonbeam testnet for deploying the ERC‑1155 contract

**Storage & Media**
- **IPFS** – decentralized storage for metadata and media
- **Pinata** – IPFS pinning and gateway service

**Machine Learning / Recognition**
- **TensorFlow.js** – in‑browser image classification for artwork recognition
- **Teachable Machine** – used to train and export the TF.js image model stored under `apps/web/public/models/vX`

**Monorepo structure**
- `apps/api` – Express API for claiming and editions
- `apps/web` – Next.js frontend (collection, claim flows, audio player)
- `packages/contracts` – Solidity ERC‑1155 contracts + Hardhat setup
- `packages/relayer` – Ethers-based relayer package
- `packages/shared` – Shared types and schemas

