# Arcive 📜

> **Permanent, verifiable on-chain receipts for every USDC payment on Arc.**

Arcive gives every USDC transaction on Arc a permanent on-chain receipt (amount, counterparty, category, note), an interactive filterable history ledger, and an accountant-ready CSV export in one click.

---

## ⚡ How It Uses Arc Network
- **Native USDC Gas & Payment:** Arcive leverages Arc's native USDC architecture—users pay for transactions and gas seamlessly in USDC without needing a secondary token.
- **Single-Transaction Execution:** In `Arcive.sol`, payments and on-chain receipt recordings happen atomically in a single transaction via `pay()`.
- **Verifiable Proof of Payment:** Each receipt is queryable on-chain and directly viewable via ArcScan explorer.

---

## 🚀 Features

- **Dashboard & Quick Send:** Instant balance overview, recent payment feed, and interactive payment creator.
- **Structured Payment Metadata:** Record counterparty, category (Invoice, Salary, Test Purchase, Subscription, etc.), and reference notes up to 140 characters.
- **Permanent Receipts (`/receipt/[id]`):** Immutable receipt page with direct transaction explorer verification and image export.
- **Filterable History (`/history`):** Filter by direction (Sent / Received), category, and date range.
- **Accountant-Ready CSV Export:**
  - One-click export with ISO timestamps and 6-decimal USDC precision.
  - Full defense against formula injection (`=`, `+`, `-`, `@` safely escaped).
  - Excel-compatible UTF-8 BOM encoding.
- **NFT Receipts Gallery (Stretch Feature):** Mintable proof-of-payment ERC-721 certificates.

---

## 📦 Smart Contract Architecture

The core contract is `Arcive.sol`:
- `pay(address payee, uint256 amount, string category, string note)`
- `getReceipt(uint256 id)`
- `idsByPayer(address a)`
- `idsByPayee(address a)`
- `totalReceipts()`

---

## 🛠️ Local Development

### 1. Prerequisites
- Node.js 18+
- npm or pnpm

### 2. Setup
```bash
git clone https://github.com/Lakshay-Deol/Arcive.git
cd Arcive
npm install
```

### 3. Environment Variables
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```

### 4. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the app.

### 5. Compile Contracts
```bash
node scripts/compile-arcive.js
```

---

## 🗺️ Roadmap
- [x] Atomically recorded receipts via `Arcive.sol`
- [x] Formula-safe CSV export for bookkeeping
- [x] Arc Testnet & Mainnet viem/wagmi integration
- [x] NFT Receipt badges & Gallery
- [ ] Off-chain encrypted notes for confidential payroll
- [ ] Payer-initiated payment request / invoicing links

---

## 📄 License
MIT
