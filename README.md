# Arcive 📜

> **Permanent, verifiable on-chain receipts and NFT proofs for every USDC payment on Arc Mainnet.**

🔗 **Live Production dApp**: [https://arc-receipts-main.vercel.app](https://arc-receipts-main.vercel.app)  
📜 **Verified Arc Mainnet Contract**: [`0x4664cf917157735081c3ba095733a85ade5beb0f`](https://explorer.arc.io/address/0x4664cf917157735081c3ba095733a85ade5beb0f)

Arcive gives every USDC transaction on Arc Mainnet a permanent on-chain receipt (amount, counterparty, category, reference note), an interactive filterable history ledger, mintable on-chain SVG NFT certificates, and an accountant-ready CSV export in one click.

---

## ⚡ How It Uses Arc Network
- **Native USDC Gas & Payment:** Arcive leverages Arc's native USDC architecture—users pay for transactions and gas seamlessly in USDC without needing a secondary token.
- **Single-Transaction Execution:** In `ArciveNFT.sol`, payments, on-chain receipt recordings, and ERC-721 certificate minting happen atomically in a single transaction via `pay()`.
- **Verifiable Proof of Payment:** Each receipt is queryable on-chain, verifiable via ArcScan explorer, and inspectable as on-chain SVG image data.

---

## 🚀 Features

- **Dashboard & Quick Send:** Instant balance overview, recent payment feed, and interactive payment creator.
- **Structured Payment Metadata:** Record counterparty, category (Invoice, Salary, Test Purchase, Subscription, Loan repayment, etc.), and reference notes up to 140 characters.
- **Permanent Receipts (`/receipt/[id]`):** Immutable receipt page with direct transaction explorer verification and image export.
- **Filterable History (`/history`):** Filter by direction (Sent / Received), category, and date range.
- **Accountant-Ready CSV Export:**
  - One-click export with ISO timestamps and 6-decimal USDC precision.
  - Full defense against formula injection (`=`, `+`, `-`, `@` safely escaped).
  - Excel-compatible UTF-8 BOM encoding.
- **NFT Receipts Gallery (`/gallery`):**
  - Mintable proof-of-payment ERC-721 certificates on Arc Mainnet.
  - On-chain SVG graphics rendered directly from `tokenURI` base64 metadata.
  - "Add to Wallet" EIP-747 integration for MetaMask and Rainbow.
  - Direct ArcScan Explorer contract and token inspection.

---

## 📦 Smart Contract Architecture

### `ArciveNFT.sol` (ERC-721 Proof of Payment)
- `pay(address payee, uint256 amount, string category, string note)`: transfers USDC, records receipt, and mints an ERC-721 token directly to payer.
- `tokenURI(uint256 tokenId)`: returns full JSON metadata with embedded on-chain SVG graphic.
- `ownerOf(uint256 tokenId)`: returns current NFT owner address.
- `getReceipt(uint256 id)`: returns `Receipt(payer, payee, amount, category, note, timestamp)`.
- `idsByPayer(address a)` / `idsByPayee(address a)`: instant indexer arrays for counterparties.
- `totalReceipts()`: returns total receipts counter.

---

## 🌐 Arc Mainnet Network Parameters & Deployed Contract

| Parameter | Specification |
| :--- | :--- |
| **Chain ID** | `5042` |
| **Network Name** | Arc Mainnet |
| **RPC Endpoint** | `https://rpc.mainnet.arc.io` |
| **Native Gas Currency** | `USDC` (18 decimals) |
| **Official USDC Token** | `0x3600000000000000000000000000000000000000` |
| **ArciveNFT Deployed Contract** | [`0x4664cf917157735081c3ba095733a85ade5beb0f`](https://explorer.arc.io/address/0x4664cf917157735081c3ba095733a85ade5beb0f) |
| **Deployment Transaction** | [`0x988bec746bdbe268c304461c91a324fcd19b0942bb3e7517f0c0093119c0c992`](https://explorer.arc.io/tx/0x988bec746bdbe268c304461c91a324fcd19b0942bb3e7517f0c0093119c0c992) |
| **Block Explorer** | [https://explorer.arc.io](https://explorer.arc.io) |

---

## 🛠️ Local Development & Deployment

### 1. Prerequisites
- Node.js 18+
- npm or pnpm

### 2. Setup
```bash
git clone https://github.com/Lakshay-Deol/Arcive.git
cd Arcive
npm install
```

### 3. Compile Contracts
Compile contracts using the standalone solc dependency resolver:
```bash
npm run compile
```

### 4. Deploy to Arc Mainnet (Zero-Secret Policy)
To deploy without ever saving or exposing private keys:

```powershell
$env:DEPLOYER_PRIVATE_KEY="0xYOUR_MAINNET_PRIVATE_KEY"
npm run deploy:mainnet
```

*The deployment script will automatically broadcast the contract, check balance, verify receipt, and update `.env.local`.*

### 5. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the application.

### 6. Production Build
```bash
npm run build
```

---

## 🚀 Vercel Production Deployment Environment

Set the following environment variables in your Vercel project settings:

```env
NEXT_PUBLIC_CHAIN_ID=5042
NEXT_PUBLIC_RPC_URL=https://rpc.mainnet.arc.io
NEXT_PUBLIC_ARCIVE_NFT_CONTRACT=<YOUR_DEPLOYED_MAINNET_CONTRACT_ADDRESS>
NEXT_PUBLIC_ARCIVE_CONTRACT=<YOUR_DEPLOYED_MAINNET_CONTRACT_ADDRESS>
NEXT_PUBLIC_USDC_ADDRESS=0x3600000000000000000000000000000000000000
NEXT_PUBLIC_EXPLORER_URL=https://explorer.arc.io
```

---

## 🗺️ Roadmap
- [x] Atomically recorded receipts via `ArciveNFT.sol`
- [x] Formula-safe CSV export for bookkeeping
- [x] Arc Mainnet viem/wagmi integration (Chain ID 5042)
- [x] NFT Receipt badges & Gallery with on-chain SVG rendering
- [x] Wallet watch asset integration (EIP-747)
- [ ] Off-chain encrypted notes for confidential payroll
- [ ] Payer-initiated payment request / invoicing links

---

## 📄 License
MIT
