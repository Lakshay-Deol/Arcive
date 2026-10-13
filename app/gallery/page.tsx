"use client";

import { useEffect, useState } from "react";
import { useAccount, usePublicClient } from "wagmi";
import Link from "next/link";
import {
  ARCIVE_NFT_ADDRESS,
  ARCIVE_NFT_ABI,
} from "../../lib/arciveNftContract";
import {
  ARC_RECEIPTS_ADDRESS,
  ARC_RECEIPTS_ABI,
} from "../../lib/arcReceiptsContract";

interface NFTReceiptItem {
  tokenId: bigint;
  owner?: string;
  payer: string;
  payee: string;
  amount: bigint;
  category: string;
  note: string;
  timestamp: bigint;
  svgDataUri?: string;
  tokenName?: string;
}

function formatUsdc(amount: bigint): string {
  const val = Number(amount) / 1000000;
  return val.toFixed(2);
}

const categoryLabels: Record<number, string> = {
  0: "Salary",
  1: "Invoice",
  2: "Donation",
  3: "Subscription",
  4: "Test Purchase",
  5: "Loan repayment",
  6: "Other",
};

export default function GalleryPage() {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();

  const [nfts, setNfts] = useState<NFTReceiptItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterMode, setFilterMode] = useState<"all" | "mine">("mine");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const explorerUrl =
    process.env.NEXT_PUBLIC_EXPLORER_URL || "https://explorer.arc.io";
  const contractAddress = ARCIVE_NFT_ADDRESS || ARC_RECEIPTS_ADDRESS;

  useEffect(() => {
    if (!publicClient || !contractAddress) return;

    async function fetchNFTs() {
      setLoading(true);
      try {
        let total = 0;
        let isNftStandard = true;

        // Try reading totalReceipts from ArciveNFT
        try {
          const totalBig = (await publicClient!.readContract({
            address: contractAddress,
            abi: ARCIVE_NFT_ABI,
            functionName: "totalReceipts",
          })) as bigint;
          total = Number(totalBig);
        } catch {
          isNftStandard = false;
          // Fallback to nextReceiptId from legacy contract only if different
          if (contractAddress && contractAddress !== ARCIVE_NFT_ADDRESS) {
            try {
              const nextId = (await publicClient!.readContract({
                address: contractAddress,
                abi: ARC_RECEIPTS_ABI,
                functionName: "nextReceiptId",
              })) as bigint;
              total = Math.max(0, Number(nextId) - 1);
            } catch {
              total = 0;
            }
          } else {
            total = 0;
          }
        }

        if (total <= 0) {
          setNfts([]);
          setLoading(false);
          return;
        }

        const items: NFTReceiptItem[] = [];

        // Query receipt data and NFT metadata
        for (let i = 0; i < total; i++) {
          const tokenId = BigInt(i);
          let receiptData: any = null;
          let ownerAddress: string | undefined = undefined;
          let svgDataUri: string | undefined = undefined;
          let tokenName: string | undefined = undefined;

          // 1. Query Receipt
          try {
            receiptData = await publicClient!.readContract({
              address: contractAddress,
              abi: isNftStandard ? ARCIVE_NFT_ABI : ARC_RECEIPTS_ABI,
              functionName: "getReceipt",
              args: [tokenId],
            });
          } catch (e) {
            console.warn(`Receipt #${i} lookup fallback`, e);
          }

          // 2. Query ERC-721 ownerOf & tokenURI if supported
          if (isNftStandard) {
            try {
              ownerAddress = (await publicClient!.readContract({
                address: contractAddress,
                abi: ARCIVE_NFT_ABI,
                functionName: "ownerOf",
                args: [tokenId],
              })) as string;
            } catch {
              // Not yet minted or different contract
            }

            try {
              const uri = (await publicClient!.readContract({
                address: contractAddress,
                abi: ARCIVE_NFT_ABI,
                functionName: "tokenURI",
                args: [tokenId],
              })) as string;

              if (uri && uri.startsWith("data:application/json;base64,")) {
                const base64Content = uri.replace("data:application/json;base64,", "");
                const jsonStr = decodeURIComponent(escape(atob(base64Content)));
                const parsedMeta = JSON.parse(jsonStr);
                tokenName = parsedMeta.name;
                if (parsedMeta.image_data) {
                  svgDataUri = `data:image/svg+xml;utf8,${encodeURIComponent(parsedMeta.image_data)}`;
                }
              }
            } catch {
              // TokenURI optional
            }
          }

          if (receiptData) {
            const meta = receiptData.meta || receiptData[5];
            const catNumber =
              typeof meta !== "undefined"
                ? typeof meta.category !== "undefined"
                  ? Number(meta.category)
                  : Number(meta[0])
                : undefined;

            const categoryText =
              typeof receiptData.category === "string"
                ? receiptData.category
                : typeof catNumber !== "undefined"
                ? categoryLabels[catNumber] || "Payment"
                : "Payment";

            const noteText =
              typeof receiptData.note === "string"
                ? receiptData.note
                : meta?.reason ?? meta?.[1] ?? "Proof of payment";

            items.push({
              tokenId,
              owner: ownerAddress || (receiptData.payer ?? receiptData[0]),
              payer: receiptData.payer ?? receiptData.from ?? receiptData[0] ?? receiptData[1],
              payee: receiptData.payee ?? receiptData.to ?? receiptData[1] ?? receiptData[2],
              amount: receiptData.amount ?? receiptData[2] ?? receiptData[4] ?? BigInt(0),
              category: categoryText,
              note: noteText,
              timestamp: receiptData.timestamp ?? receiptData[5] ?? receiptData[6] ?? BigInt(0),
              svgDataUri,
              tokenName: tokenName || `Receipt #${tokenId.toString()}`,
            });
          }
        }

        items.reverse();
        setNfts(items);
      } catch (err) {
        console.error("Failed to load NFT proofs", err);
      } finally {
        setLoading(false);
      }
    }

    fetchNFTs();
  }, [publicClient, contractAddress]);

  async function handleAddToWallet(tokenId: bigint) {
    if (typeof window !== "undefined" && (window as any).ethereum) {
      try {
        await (window as any).ethereum.request({
          method: "wallet_watchAsset",
          params: {
            type: "ERC721",
            options: {
              address: contractAddress,
              tokenId: tokenId.toString(),
            },
          },
        });
        showToast(`Token #${tokenId} watch request sent to wallet!`);
      } catch (err: any) {
        console.error("Failed to add NFT to wallet", err);
        showToast("Wallet request was dismissed or unsupported.");
      }
    } else {
      showToast("Web3 wallet not detected on this browser.");
    }
  }

  function showToast(msg: string) {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  }

  const userLower = address?.toLowerCase();
  const displayedNfts = nfts.filter((nft) => {
    if (filterMode === "mine" && userLower) {
      return (
        nft.payer?.toLowerCase() === userLower ||
        nft.payee?.toLowerCase() === userLower ||
        nft.owner?.toLowerCase() === userLower
      );
    }
    return true;
  });

  return (
    <div className="space-y-8 pb-12">
      {/* TOAST NOTIFICATION */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#111111] text-[#f8ef88] border-3 border-[#111111] shadow-[5px_5px_0px_#111111] px-5 py-3 text-xs font-black uppercase flex items-center gap-3 animate-bounce">
          <span>🔔</span>
          <span>{toastMessage}</span>
          <button
            onClick={() => setToastMessage(null)}
            className="text-white hover:text-red-400 ml-2"
          >
            ✕
          </button>
        </div>
      )}

      {/* HEADER */}
      <header className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 border-b-4 border-[#111111] pb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="neo-badge neo-badge-black">ON-CHAIN CERTIFICATES</span>
            <span className="neo-badge neo-badge-green">ERC-721 STANDARD</span>
            <span className="neo-badge bg-[#c026d3] text-white">ON-CHAIN SVG</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-[#111111] uppercase tracking-tight">
            NFT PROOF GALLERY
          </h1>
          <p className="text-sm font-bold text-[#333333] mt-2 max-w-xl">
            Immutable, cryptographically verifiable proof-of-payment certificates minted for every Arcive payment. Each token holds permanent metadata and deterministic SVG graphics directly in EVM storage.
          </p>
        </div>

        <Link
          href="/create"
          className="neo-btn px-6 py-3.5 text-xs flex items-center gap-2"
        >
          <span>＋ MINT NEW PROOF</span>
        </Link>
      </header>

      {/* MAINNET DEPLOYMENT PENDING BANNER */}
      {!contractAddress && (
        <div className="neo-box p-8 bg-[#fef08a] border-4 border-[#111111] shadow-[8px_8px_0px_#111111] text-center space-y-4">
          <div className="flex items-center justify-center gap-2">
            <span className="neo-badge bg-[#f59e0b] text-[#111111]">ARC MAINNET (CHAIN ID 5042)</span>
            <span className="neo-badge neo-badge-black">STANDBY</span>
          </div>
          <h2 className="text-2xl font-black uppercase text-[#111111]">
            Awaiting Real Mainnet Contract Deployment
          </h2>
          <p className="text-sm font-bold text-[#333333] max-w-xl mx-auto">
            Arcive is primed for Arc Mainnet. Run the deployment script below in your shell to broadcast <code>ArciveNFT.sol</code> and populate live verified NFT proofs:
          </p>
          <div className="bg-white border-3 border-[#111111] p-3 text-xs font-mono font-black max-w-lg mx-auto shadow-[3px_3px_0px_#111111] text-left">
            <code>$env:DEPLOYER_PRIVATE_KEY="0x..." ; npm run deploy:mainnet</code>
          </div>
        </div>
      )}

      {/* FILTER BAR */}
      <div className="neo-box p-4 bg-white border-4 border-[#111111] shadow-[6px_6px_0px_#111111] flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilterMode("mine")}
            className={`px-4 py-2 border-2 border-[#111111] text-xs font-black uppercase transition-all ${
              filterMode === "mine"
                ? "bg-[#111111] text-[#f8ef88] shadow-[3px_3px_0px_#111111]"
                : "bg-white text-[#111111] hover:bg-[#f8ef88]"
            }`}
          >
            MY NFT PROOFS
          </button>
          <button
            onClick={() => setFilterMode("all")}
            className={`px-4 py-2 border-2 border-[#111111] text-xs font-black uppercase transition-all ${
              filterMode === "all"
                ? "bg-[#111111] text-[#f8ef88] shadow-[3px_3px_0px_#111111]"
                : "bg-white text-[#111111] hover:bg-[#f8ef88]"
            }`}
          >
            ALL VERIFIED MINTS ({nfts.length})
          </button>
        </div>

        <div className="flex items-center gap-2 text-[10px] font-black uppercase">
          <span className="neo-badge neo-badge-black">
            CONTRACT: {contractAddress.slice(0, 6)}...{contractAddress.slice(-4)}
          </span>
          <a
            href={`${explorerUrl}/address/${contractAddress}`}
            target="_blank"
            rel="noreferrer"
            className="neo-btn px-3 py-1 text-[10px]"
          >
            VIEW CONTRACT ↗
          </a>
        </div>
      </div>

      {/* GRID */}
      {loading ? (
        <div className="neo-box p-12 bg-white border-4 border-[#111111] shadow-[8px_8px_0px_#111111] text-center space-y-3">
          <div className="w-8 h-8 border-4 border-[#111111] border-t-transparent rounded-full animate-spin mx-auto" />
          <h3 className="text-sm font-black uppercase text-[#111111]">
            QUERYING ON-CHAIN NFT CERTIFICATES & SVG METADATA...
          </h3>
        </div>
      ) : displayedNfts.length === 0 ? (
        <div className="neo-box p-12 bg-white border-4 border-[#111111] shadow-[8px_8px_0px_#111111] text-center space-y-3">
          <span className="neo-badge neo-badge-pink">NO PROOFS FOUND</span>
          <h3 className="text-xl font-black uppercase text-[#111111]">
            {filterMode === "mine"
              ? "YOU HAVE NOT MINTED ANY NFT RECEIPTS YET"
              : "NO ON-CHAIN PROOFS REGISTERED"}
          </h3>
          <p className="text-xs font-bold text-[#666666] max-w-md mx-auto">
            Every USDC payment made via Arcive automatically registers a deterministic on-chain voucher certificate.
          </p>
          <Link
            href="/create"
            className="neo-btn inline-flex items-center gap-2 px-6 py-3 text-xs mt-2"
          >
            SEND FIRST PAYMENT & MINT →
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayedNfts.map((nft) => (
            <div
              key={nft.tokenId.toString()}
              className="neo-box bg-white border-4 border-[#111111] shadow-[8px_8px_0px_#111111] p-6 space-y-4 hover:bg-[#fef9c3] transition-all flex flex-col justify-between"
            >
              <div className="space-y-4">
                {/* Badge & ID */}
                <div className="flex items-center justify-between pb-3 border-b-3 border-[#111111]">
                  <div className="flex items-center gap-2">
                    <span className="neo-badge neo-badge-black text-xs">
                      TOKEN #{nft.tokenId.toString()}
                    </span>
                    <span className="text-[10px] font-black uppercase text-[#666666]">
                      ERC-721
                    </span>
                  </div>
                  <span className="neo-badge neo-badge-green text-[10px]">
                    VERIFIED
                  </span>
                </div>

                {/* Graphic Voucher or On-Chain SVG */}
                {nft.svgDataUri ? (
                  <div className="border-3 border-[#111111] shadow-[4px_4px_0px_#111111] overflow-hidden bg-[#f8ef88] p-2">
                    <img
                      src={nft.svgDataUri}
                      alt={nft.tokenName || `Receipt #${nft.tokenId}`}
                      className="w-full h-auto border-2 border-[#111111]"
                    />
                  </div>
                ) : (
                  <div className="neo-box bg-[#f8ef88] border-3 border-[#111111] p-6 text-center space-y-2">
                    <div className="w-12 h-12 bg-[#111111] text-[#f8ef88] font-black text-xl flex items-center justify-center border-2 border-[#111111] shadow-[3px_3px_0px_#111111] mx-auto">
                      📜
                    </div>
                    <div className="text-3xl font-black text-[#111111]">
                      ${formatUsdc(nft.amount)}{" "}
                      <span className="text-sm font-black text-[#111111]">USDC</span>
                    </div>
                    <span className="neo-badge neo-badge-pink text-[10px] inline-block">
                      {nft.category}
                    </span>
                  </div>
                )}

                {/* Details */}
                <div className="space-y-2 text-xs font-bold text-[#111111]">
                  <div className="p-2 bg-white border-2 border-[#111111]">
                    <span className="text-[9px] font-black uppercase text-[#666666] block">
                      PURPOSE / NOTE
                    </span>
                    <span className="text-xs truncate block font-black">
                      "{nft.note}"
                    </span>
                  </div>

                  <div className="p-2 bg-white border-2 border-[#111111] font-mono text-[11px] space-y-1">
                    <div className="flex justify-between items-center text-[10px]">
                      <span className="text-gray-500 font-sans font-bold">OWNER:</span>
                      <span className="font-bold text-emerald-800">
                        {nft.owner ? `${nft.owner.substring(0, 6)}...${nft.owner.substring(38)}` : "—"}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-[10px]">
                      <span className="text-gray-500 font-sans font-bold">PAYER:</span>
                      <span className="font-bold">{nft.payer.substring(0, 6)}...{nft.payer.substring(38)}</span>
                    </div>
                    <div className="flex justify-between items-center text-[10px]">
                      <span className="text-gray-500 font-sans font-bold">PAYEE:</span>
                      <span className="font-bold">{nft.payee.substring(0, 6)}...{nft.payee.substring(38)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t-2 border-[#111111] flex flex-wrap items-center justify-between gap-2">
                <Link
                  href={`/receipt/${nft.tokenId.toString()}`}
                  className="neo-btn px-3 py-1.5 text-xs flex items-center gap-1"
                >
                  <span>VIEW VOUCHER</span>
                  <span>↗</span>
                </Link>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleAddToWallet(nft.tokenId)}
                    className="bg-[#111111] text-[#f8ef88] border-2 border-[#111111] px-2.5 py-1 text-[11px] font-black uppercase shadow-[2px_2px_0px_#111111] hover:bg-[#333333] transition-all"
                    title="Import NFT token directly into MetaMask / Rainbow wallet"
                  >
                    + WALLET
                  </button>

                  <a
                    href={`${explorerUrl}/address/${contractAddress}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] font-black uppercase text-blue-700 underline hover:text-blue-900"
                  >
                    EXPLORER ↗
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
