"use client";

import Link from "next/link";
import { useState, FormEvent, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  useAccount,
  usePublicClient,
  useWriteContract,
  useWaitForTransactionReceipt,
  useReadContract,
} from "wagmi";

import {
  ARC_RECEIPTS_ADDRESS,
  ARC_RECEIPTS_ABI,
} from "../../lib/arcReceiptsContract";
import {
  ARCIVE_NFT_ADDRESS,
  ARCIVE_NFT_ABI,
} from "../../lib/arciveNftContract";
import { ARC_USDC_ADDRESS, ARC_USDC_ABI } from "../../lib/usdcToken";
import { SUPPORTED_TOKENS } from "../../lib/supportedTokens";

const ARC_FX_ROUTER_ADDRESS = "0xAe6147ce9Fc4624B01C79EEeFd7315294CFEE755";

const ARC_FX_ROUTER_ABI = [
  {
    inputs: [
      { name: "tokenIn", type: "address" },
      { name: "tokenOut", type: "address" },
      { name: "amountIn", type: "uint256" },
      { name: "minAmountOut", type: "uint256" },
      { name: "recipient", type: "address" },
      { name: "category", type: "uint8" },
      { name: "reason", type: "string" },
      { name: "sourceCurrency", type: "string" },
      { name: "destinationCurrency", type: "string" },
      { name: "corridor", type: "string" },
    ],
    name: "swapAndPay",
    outputs: [{ name: "amountOut", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

const categories = [
  { label: "Salary", value: 0 },
  { label: "Invoice", value: 1 },
  { label: "Donation", value: 2 },
  { label: "Subscription", value: 3 },
  { label: "Test Purchase", value: 4 },
  { label: "Loan repayment", value: 5 },
  { label: "Other", value: 6 },
];

const categoryLabels: Record<number, string> = {
  0: "Salary",
  1: "Invoice",
  2: "Donation",
  3: "Subscription",
  4: "Test Purchase",
  5: "Loan repayment",
  6: "Other",
};

type Receipt = {
  id: bigint;
  from: string;
  to: string;
  amount: bigint;
  category: number;
  reason: string;
  sourceCurrency: string;
  destinationCurrency: string;
  corridor: string;
  timestamp: bigint;
  token?: string;
};

function parseAmountToBigInt(amount: string): bigint {
  const [whole, frac = ""] = amount.split(".");
  const wholeBig = BigInt(whole || "0");
  const fracPadded = (frac + "000000").slice(0, 6);
  const fracBig = BigInt(fracPadded || "0");
  const DECIMALS = BigInt("1000000");
  return wholeBig * DECIMALS + fracBig;
}

function parseUsdcAmount(input: string): bigint {
  const value = input.trim();
  if (!value) {
    throw new Error("Amount is required.");
  }
  if (!/^\d+(\.\d{0,6})?$/.test(value)) {
    throw new Error("Invalid USDC amount format (max 6 decimals).");
  }
  return parseAmountToBigInt(value);
}

function formatUsdc(amount: bigint): string {
  const DECIMALS = BigInt("1000000");
  const whole = amount / DECIMALS;
  const frac = amount % DECIMALS;
  const fracStr = frac.toString().padStart(6, "0").replace(/0+$/, "");
  return fracStr ? `${whole.toString()}.${fracStr}` : whole.toString();
}

function formatTimestamp(ts: bigint): string {
  const ms = Number(ts) * 1000;
  const d = new Date(ms);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const swapTargetTokens = Object.values(SUPPORTED_TOKENS).filter(t => t.symbol !== "USDC");

function CreateReceiptContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();

  const [paymentMode, setPaymentMode] = useState<"direct" | "swap">("direct");

  const [to, setTo] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<number>(2);
  const [reason, setReason] = useState("");
  const [sourceCurrency, setSourceCurrency] = useState("USDC");
  const [destinationCurrency, setDestinationCurrency] = useState("USDC");
  const [corridor, setCorridor] = useState("USDC-USDC");
  
  const [targetTokenAddress, setTargetTokenAddress] = useState(swapTargetTokens[0]?.address || "");

  const [formError, setFormError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [expectedReceiptId, setExpectedReceiptId] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

  // States for Circle API Quote
  const [isFetchingQuote, setIsFetchingQuote] = useState(false);
  const [quoteDetails, setQuoteDetails] = useState<{rate?: number, id?: string, amountOut?: string} | null>(null);

  useEffect(() => {
    const paramTo = searchParams.get("to");
    const paramAmount = searchParams.get("amount");
    const paramReason = searchParams.get("reason");
    const paramMode = searchParams.get("mode");

    if (paramTo || paramAmount || paramReason) {
      setIsFormOpen(true);
      if (paramTo) setTo(paramTo);
      if (paramAmount) setAmount(paramAmount);
      if (paramReason) setReason(paramReason);
      if (paramMode === "swap") setPaymentMode("swap");
    }
  }, [searchParams]);

  // Reset quote when amount or currency changes
  useEffect(() => {
    setQuoteDetails(null);
  }, [amount, targetTokenAddress]);

  const {
    data: allowanceDirect,
    refetch: refetchAllowanceDirect,
  } = useReadContract({
    address: ARC_USDC_ADDRESS,
    abi: ARC_USDC_ABI,
    functionName: "allowance",
    args: address ? [address, ARCIVE_NFT_ADDRESS] : undefined,
    query: { enabled: !!address },
  } as any);

  const {
    data: allowanceRouter,
    refetch: refetchAllowanceRouter,
  } = useReadContract({
    address: ARC_USDC_ADDRESS,
    abi: ARC_USDC_ABI,
    functionName: "allowance",
    args: address ? [address, ARC_FX_ROUTER_ADDRESS] : undefined,
    query: { enabled: !!address && paymentMode === "swap" },
  } as any);

  const allowanceValue =
    paymentMode === "swap"
      ? ((allowanceRouter as bigint | undefined) ?? BigInt(0))
      : ((allowanceDirect as bigint | undefined) ?? BigInt(0));

  const [lastMyReceipt, setLastMyReceipt] = useState<Receipt | null>(null);
  const [lastMyReceiptLoading, setLastMyReceiptLoading] = useState(false);
  const [lastMyReceiptError, setLastMyReceiptError] = useState<string | null>(null);
  const [actionStep, setActionStep] = useState<string | null>(null);

  useEffect(() => {
    if (!publicClient || !isConnected || !address) {
      setLastMyReceipt(null);
      setLastMyReceiptError(null);
      return;
    }
    const client = publicClient;
    const currentAddress = address;
    let cancelled = false;

    async function loadLastMyReceipt() {
      setLastMyReceiptLoading(true);
      setLastMyReceiptError(null);
      try {
        let found: Receipt | null = null;
        const targetContract = ARCIVE_NFT_ADDRESS || ARC_RECEIPTS_ADDRESS;
        if (!targetContract) {
          if (!cancelled) setLastMyReceipt(null);
          return;
        }

        // 1. Try ArciveNFT standard first (O(1) counterparty indexers)
        try {
          const [payerIds, payeeIds] = await Promise.all([
            client.readContract({
              address: targetContract,
              abi: ARCIVE_NFT_ABI,
              functionName: "idsByPayer",
              args: [currentAddress],
            }) as Promise<bigint[]>,
            client.readContract({
              address: targetContract,
              abi: ARCIVE_NFT_ABI,
              functionName: "idsByPayee",
              args: [currentAddress],
            }) as Promise<bigint[]>,
          ]);

          const allIds = [...payerIds, ...payeeIds].sort((a, b) => (b > a ? 1 : b < a ? -1 : 0));

          if (allIds.length > 0) {
            const latestId = allIds[0];
            const data: any = await client.readContract({
              address: targetContract,
              abi: ARCIVE_NFT_ABI,
              functionName: "getReceipt",
              args: [latestId],
            });

            const categoryVal =
              typeof data.category === "string"
                ? Object.values(categoryLabels).indexOf(data.category) !== -1
                  ? Object.values(categoryLabels).indexOf(data.category)
                  : 6
                : Number(data.category ?? 6);

            found = {
              id: latestId,
              from: data.payer ?? data.from ?? "",
              to: data.payee ?? data.to ?? "",
              amount: data.amount ?? BigInt(0),
              token: "0x3600000000000000000000000000000000000000",
              category: categoryVal,
              reason: data.note ?? data.reason ?? "Arcive Payment",
              sourceCurrency: "USDC",
              destinationCurrency: "USDC",
              corridor: "USDC-USDC",
              timestamp: BigInt(data.timestamp ?? 0),
            };
          }
        } catch {
          // 2. Fallback to legacy ArcReceipts contract if applicable and different
          if (targetContract && targetContract !== ARCIVE_NFT_ADDRESS) {
            try {
              const nextId = (await client.readContract({
                address: targetContract,
                abi: ARC_RECEIPTS_ABI,
                functionName: "nextReceiptId",
                args: [],
              })) as bigint;

            if (nextId > BigInt(1)) {
              const lastId = Number(nextId - BigInt(1));
              const maxToFetch = 30;
              const startId = Math.max(1, lastId - maxToFetch + 1);
              const addrLower = currentAddress.toLowerCase();

              for (let id = lastId; id >= startId; id--) {
                const data: any = await client.readContract({
                  address: targetContract,
                  abi: ARC_RECEIPTS_ABI,
                  functionName: "getReceipt",
                  args: [BigInt(id)],
                });

                const meta = data.meta || data[5];
                const categoryVal = typeof meta.category !== "undefined" ? Number(meta.category) : Number(meta[0]);

                const r: Receipt = {
                  id: data.id ?? data[0],
                  from: data.from ?? data[1],
                  to: data.to ?? data[2],
                  amount: data.amount ?? data[4],
                  token: data.token ?? data[3],
                  category: categoryVal,
                  reason: meta.reason ?? meta[1],
                  sourceCurrency: meta.sourceCurrency ?? meta[2],
                  destinationCurrency: meta.destinationCurrency ?? meta[3],
                  corridor: meta.corridor ?? meta[4],
                  timestamp: data.timestamp ?? data[6],
                };

                const fromLower = r.from.toLowerCase();
                const toLower = r.to.toLowerCase();
                if (fromLower === addrLower || toLower === addrLower) {
                  found = r;
                  break;
                }
              }
            }
          } catch {
            found = null;
          }
        }
      }

        if (!cancelled) setLastMyReceipt(found);
      } catch (e: any) {
        console.warn("Notice: No recent receipts found for wallet:", e);
        if (!cancelled) setLastMyReceipt(null);
      } finally {
        if (!cancelled) setLastMyReceiptLoading(false);
      }
    }
    loadLastMyReceipt();
    return () => { cancelled = true; };
  }, [publicClient, isConnected, address]);

  const {
    data: payTxHash,
    writeContractAsync: writePayAsync,
    isPending: isPayPending,
    error: payError,
  } = useWriteContract();

  const {
    isLoading: isPayConfirming,
    isSuccess: isPayConfirmed,
  } = useWaitForTransactionReceipt({ hash: payTxHash });

  const { writeContractAsync: writeApproveAsync } = useWriteContract();

  useEffect(() => {
    if (isPayConfirmed) {
      setActionStep(null);
      setSuccessMsg("Payment confirmed on Arc Mainnet! Loading receipt...");
      const targetId = expectedReceiptId ?? "0";
      const timer = setTimeout(() => {
        setIsFormOpen(false);
        router.push(`/receipt/${targetId}?tx=${payTxHash}`);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [isPayConfirmed, expectedReceiptId, router, payTxHash]);

  useEffect(() => {
    setCorridor(`${sourceCurrency}-${destinationCurrency}`);
  }, [sourceCurrency, destinationCurrency]);

  useEffect(() => {
    setSourceCurrency("USDC");
    if (paymentMode === "swap") {
      const token = Object.values(SUPPORTED_TOKENS).find(t => t.address === targetTokenAddress);
      setDestinationCurrency(token ? token.symbol : "EURC");
    } else {
      setDestinationCurrency("USDC");
    }
  }, [paymentMode, targetTokenAddress]);

  const handleCopyPaymentLink = () => {
    if (typeof window === "undefined") return;
    const baseUrl = window.location.origin + window.location.pathname;
    const params = new URLSearchParams();
    if (to) params.set("to", to);
    if (amount) params.set("amount", amount);
    if (reason) params.set("reason", reason);
    if (paymentMode === "swap") params.set("mode", "swap");

    const link = `${baseUrl}?${params.toString()}`;
    navigator.clipboard.writeText(link);
    setSuccessMsg("Link copied! Share it to request payment.");
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  // ✅ الدالة الجديدة لجلب التسعيرة من Circle API
  const handleGetQuote = async () => {
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      setFormError("Please enter a valid amount first.");
      return;
    }
    
    setIsFetchingQuote(true);
    setFormError(null);
    setQuoteDetails(null);

    try {
      const token = Object.values(SUPPORTED_TOKENS).find(t => t.address === targetTokenAddress);
      const toCurr = token ? token.symbol : "EURC";

      const res = await fetch('/api/quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: amount,
          fromCurrency: "USDC",
          toCurrency: toCurr
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to fetch quote from Circle");
      }

      setQuoteDetails({
        rate: data.rate,
        id: data.id,
        amountOut: data.to?.amount
      });
      
    } catch (err: any) {
      console.error(err);
      setFormError(err.message);
    } finally {
      setIsFetchingQuote(false);
    }
  };

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    setSuccessMsg(null);

    if (!isConnected || !address) {
      setFormError("Please connect your wallet first.");
      return;
    }

    if (paymentMode === "swap" && !quoteDetails) {
      setFormError("Please get a quote first before paying.");
      return;
    }

    let usdcAmount: bigint;
    try {
      usdcAmount = parseUsdcAmount(amount);
      if (usdcAmount <= BigInt(0)) throw new Error("Amount must be > 0.");
    } catch (err: any) {
      setFormError(err.message || "Invalid amount.");
      return;
    }

    let toAddress: `0x${string}` = address;
    if (to) {
      if (!to.startsWith("0x") || to.length !== 42) {
        setFormError("Please enter a valid recipient address.");
        return;
      }
      toAddress = to as `0x${string}`;
    }

    if (!publicClient) {
      setFormError("Public client is not ready.");
      return;
    }

    if (paymentMode === "direct" && !ARCIVE_NFT_ADDRESS && !ARC_RECEIPTS_ADDRESS) {
      setFormError("Arc Mainnet contract is awaiting deployment. Run 'npm run deploy:mainnet' in your terminal and set NEXT_PUBLIC_ARCIVE_NFT_CONTRACT.");
      return;
    }

    if (paymentMode === "swap") {
      if (!ARC_FX_ROUTER_ADDRESS) {
        setFormError("Router address not configured.");
        return;
      }
    }

    try {
      const spender = paymentMode === "swap" ? ARC_FX_ROUTER_ADDRESS : ARCIVE_NFT_ADDRESS;

      if (allowanceValue < usdcAmount) {
        setActionStep("Step 1/2: Please approve USDC in your wallet...");
        const approveHash = await writeApproveAsync({
          address: ARC_USDC_ADDRESS,
          abi: ARC_USDC_ABI,
          functionName: "approve",
          args: [spender, usdcAmount],
        });
        setActionStep("Step 1/2: Confirming USDC approval on Arc Mainnet...");
        await publicClient.waitForTransactionReceipt({ hash: approveHash as `0x${string}` });

        if (paymentMode === "swap") refetchAllowanceRouter();
        else refetchAllowanceDirect();
      }

      let nextIdVal = "0";
      try {
        const nextId = (await publicClient.readContract({
          address: ARCIVE_NFT_ADDRESS,
          abi: ARCIVE_NFT_ABI,
          functionName: "totalReceipts",
        })) as bigint;
        nextIdVal = nextId.toString();
      } catch {
        nextIdVal = "0";
      }
      setExpectedReceiptId(nextIdVal);

      if (paymentMode === "direct") {
        setActionStep("Step 2/2: Please confirm the payment & receipt minting in your wallet...");
        const categoryName = categories.find((c) => c.value === category)?.label || "Payment";
        await writePayAsync({
          address: ARCIVE_NFT_ADDRESS,
          abi: ARCIVE_NFT_ABI,
          functionName: "pay",
          args: [toAddress, usdcAmount, categoryName, reason || "Arcive Payment"],
        });
        setActionStep("Broadcasting transaction to Arc Mainnet...");
      } else {
        setActionStep("Step 2/2: Confirming swap & payment in your wallet...");
        await writePayAsync({
          address: ARC_FX_ROUTER_ADDRESS,
          abi: ARC_FX_ROUTER_ABI,
          functionName: "swapAndPay",
          args: [
            ARC_USDC_ADDRESS,
            targetTokenAddress as `0x${string}`,
            usdcAmount,
            BigInt(0),
            toAddress,
            category,
            reason,
            sourceCurrency,
            destinationCurrency,
            corridor,
          ],
        });
        setActionStep("Broadcasting swap & pay to Arc Mainnet...");
      }

    } catch (err: any) {
      console.error(err);
      setFormError(err.message || "Transaction failed");
    }
  }

  const isPaySubmitting = isPayPending || isPayConfirming;

  let cardContent = null;
  if (lastMyReceipt) {
    const isSent = address && lastMyReceipt.from.toLowerCase() === address.toLowerCase();
    const isSwap = lastMyReceipt.sourceCurrency !== lastMyReceipt.destinationCurrency;

    cardContent = (
      <Link href={`/receipt/${lastMyReceipt.id.toString()}`}>
        <div className="neo-box bg-white border-4 border-[#111111] shadow-[8px_8px_0px_#111111] p-6 space-y-4 hover:bg-[#fef9c3] transition-all cursor-pointer">
          <div className="flex justify-between items-start pb-3 border-b-3 border-[#111111]">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-[#0d0f17] border-2 border-[#111111] shadow-[2px_2px_0px_#111111] rounded-sm overflow-hidden p-0.5">
                <img src="/arc-logo.png" alt="Arcive" className="w-full h-full object-cover" />
              </div>
              <div>
                <span className="block text-[10px] uppercase tracking-wider text-[#666666] font-black mb-0.5">
                  LATEST RECORD
                </span>
                <span className="text-xl font-black text-[#111111]">
                  #{lastMyReceipt.id.toString()}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`neo-badge text-xs ${
                  isSent ? "neo-badge-pink" : "neo-badge-green"
                }`}
              >
                {isSent ? "SENT OUT" : "RECEIVED"}
              </span>
              <span className="neo-badge neo-badge-black text-[10px]">
                {typeof lastMyReceipt.category === "string" ? lastMyReceipt.category : (categoryLabels[lastMyReceipt.category] || "Payment")}
              </span>
            </div>
          </div>

          <div className="neo-box bg-[#f8ef88] border-3 border-[#111111] p-4 text-center">
            <div className="text-[10px] font-black uppercase text-[#111111] mb-1">
              TOTAL AMOUNT RECORDED
            </div>
            <div className="text-3xl md:text-4xl font-black text-[#111111]">
              ${formatUsdc(lastMyReceipt.amount)}{" "}
              <span className="text-sm font-black text-[#111111]">USDC</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs font-bold text-[#111111]">
            <div className="p-2 bg-white border-2 border-[#111111]">
              <span className="text-[10px] font-black uppercase text-[#666666] block">
                SETTLEMENT ROUTE
              </span>
              <span className="font-mono text-xs font-black text-[#111111]">
                {lastMyReceipt.corridor || "Arc Native USDC"}
              </span>
            </div>
            <div className="p-2 bg-white border-2 border-[#111111]">
              <span className="text-[10px] font-black uppercase text-[#666666] block">
                TIMESTAMP
              </span>
              <span className="text-xs font-bold text-[#111111]">
                {formatTimestamp(lastMyReceipt.timestamp)}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t-2 border-[#111111]">
            <span className="text-xs font-black uppercase text-[#111111]">
              CLICK TO VIEW VERIFIED RECEIPT 📋
            </span>
            <span className="neo-btn px-3 py-1 text-xs">
              OPEN VOUCHER ↗
            </span>
          </div>
        </div>
      </Link>
    );
  }

  return (
    <section className="space-y-8">
      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b-4 border-[#111111] pb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="neo-badge neo-badge-black">SETTLEMENT ENGINE</span>
            <span className="neo-badge neo-badge-green">ARC NETWORK MAINNET (5042)</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-[#111111] uppercase tracking-tight">
            SEND PAYMENT & ISSUE RECEIPT
          </h1>
          <p className="text-sm font-bold text-[#333333] mt-2 max-w-xl">
            Atomic ERC-20 transfer paired with on-chain metadata. One transaction moves USDC and records permanent proof.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsFormOpen((prev) => !prev)}
          className="neo-btn px-6 py-3.5 text-sm flex items-center gap-2"
        >
          <span className="text-xl leading-none">＋</span>
          <span>{isFormOpen ? "CLOSE FORM" : "NEW PAYMENT"}</span>
        </button>
      </header>

      {(!ARCIVE_NFT_ADDRESS && !ARC_RECEIPTS_ADDRESS) && (
        <div className="neo-box p-6 bg-[#fef08a] border-4 border-[#111111] shadow-[6px_6px_0px_#111111] flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="space-y-1 text-left">
            <div className="flex items-center gap-2">
              <span className="neo-badge bg-[#f59e0b] text-[#111111]">ARC MAINNET (5042)</span>
              <span className="neo-badge neo-badge-black">CONTRACT STANDBY</span>
            </div>
            <p className="text-xs font-bold text-[#111111]">
              Awaiting live Arc Mainnet contract deployment. Run <code>npm run deploy:mainnet</code> in your PowerShell shell with your deployer key.
            </p>
          </div>
          <span className="neo-badge neo-badge-black text-[10px] shrink-0">READY FOR DEPLOYMENT</span>
        </div>
      )}

      {isFormOpen && (
        <div className="neo-box bg-white border-4 border-[#111111] shadow-[8px_8px_0px_#111111] p-6 space-y-6">
          <div className="flex items-center justify-between pb-4 border-b-3 border-[#111111]">
            <div>
              <span className="neo-badge neo-badge-pink text-[10px] mb-1">TRANSACTION BUILDER</span>
              <h2 className="text-2xl font-black text-[#111111] uppercase">NEW PAYMENT DETAILS</h2>
            </div>
            <button
              type="button"
              onClick={() => setIsFormOpen(false)}
              className="w-8 h-8 bg-[#111111] text-white font-black flex items-center justify-center hover:bg-red-600 transition-colors"
            >
              ✕
            </button>
          </div>

          <div className="flex bg-[#f8ef88] border-3 border-[#111111] p-1 shadow-[3px_3px_0px_#111111]">
            <button
              type="button"
              onClick={() => setPaymentMode("direct")}
              className={`flex-1 py-2 text-xs font-black uppercase transition-all ${
                paymentMode === "direct"
                  ? "bg-[#111111] text-[#f8ef88] shadow-[2px_2px_0px_#111111]"
                  : "text-[#111111] hover:bg-white/40"
              }`}
            >
              DIRECT (NATIVE USDC)
            </button>
            <button
              type="button"
              onClick={() => setPaymentMode("swap")}
              className={`flex-1 py-2 text-xs font-black uppercase transition-all ${
                paymentMode === "swap"
                  ? "bg-[#111111] text-[#f8ef88] shadow-[2px_2px_0px_#111111]"
                  : "text-[#111111] hover:bg-white/40"
              }`}
            >
              FX CROSS-CURRENCY SWAP
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5 bg-[#f8fafc] border-3 border-[#111111] p-6 shadow-[4px_4px_0px_#111111]">

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-black uppercase text-[#111111] mb-1 flex justify-between items-center">
                  <span>Recipient Address *</span>
                  <button
                    type="button"
                    onClick={handleCopyPaymentLink}
                    className="text-[10px] text-blue-700 underline font-black hover:text-blue-900"
                  >
                    🔗 Copy Request Link
                  </button>
                </label>
                <input
                  className="w-full bg-white border-3 border-[#111111] px-4 py-2.5 text-sm font-bold text-[#111111] placeholder:text-gray-400 focus:outline-none focus:bg-[#fef9c3]"
                  placeholder="0x... (leave empty for self)"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase text-[#111111] mb-1">
                  Amount (USDC) *
                </label>
                <input
                  className="w-full bg-white border-3 border-[#111111] px-4 py-2.5 text-sm font-black text-[#111111] placeholder:text-gray-400 focus:outline-none focus:bg-[#fef9c3]"
                  placeholder="1.0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
                <p className="text-[11px] font-bold text-[#666666] mt-1">
                  Current Allowance: <strong className="text-[#111111]">{allowanceValue ? `${formatUsdc(allowanceValue)} USDC` : "0 USDC"}</strong>
                </p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-black uppercase text-[#111111] mb-1">Category</label>
              <select
                className="w-full md:w-64 bg-white border-3 border-[#111111] px-4 py-2 text-sm font-bold text-[#111111] focus:outline-none focus:bg-[#fef9c3]"
                value={category}
                onChange={(e) => setCategory(Number(e.target.value))}
              >
                {categories.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-black uppercase text-[#111111] mb-1">Note (Up to 140 characters)</label>
              <input
                className="w-full bg-white border-3 border-[#111111] px-4 py-2.5 text-sm font-bold text-[#111111] placeholder:text-gray-400 focus:outline-none focus:bg-[#fef9c3]"
                placeholder="Payment description (permanent on-chain)"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>

            {formError && (
              <div className="text-xs font-black uppercase text-red-900 border-3 border-[#111111] bg-[#fbb6ce] p-3">
                {formError}
              </div>
            )}
            {payError && !formError && (
              <div className="text-xs font-black uppercase text-red-900 border-3 border-[#111111] bg-[#fbb6ce] p-3">
                {payError.message}
              </div>
            )}
            {successMsg && (
              <div className="text-xs font-black uppercase text-emerald-900 border-3 border-[#111111] bg-[#86efac] p-3">
                ✅ {successMsg}
              </div>
            )}

            {actionStep && (
              <div className="text-xs font-black uppercase text-blue-900 border-3 border-[#111111] bg-[#bfdbfe] p-3 flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-[#111111] border-t-transparent rounded-full animate-spin" />
                <span>{actionStep}</span>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={Boolean(actionStep) || isPaySubmitting || !isConnected}
                className="neo-btn px-8 py-3.5 text-sm flex items-center gap-2 disabled:opacity-40"
              >
                {actionStep
                  ? "CONFIRM IN WALLET..."
                  : isPaySubmitting
                  ? "PROCESSING TRANSACTION..."
                  : paymentMode === "swap"
                  ? "APPROVE & SWAP & PAY →"
                  : allowanceValue >= (amount ? parseUsdcAmount(amount) : BigInt(1))
                  ? "CONFIRM PAYMENT & ISSUE RECEIPT →"
                  : "APPROVE & ISSUE RECEIPT →"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* --- Last Receipt Display --- */}
      <div className="neo-box bg-white border-4 border-[#111111] shadow-[8px_8px_0px_#111111] p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b-3 border-[#111111]">
          <div>
            <span className="neo-badge neo-badge-black text-[10px] mb-1">AUDIT SUMMARY</span>
            <h2 className="text-xl font-black text-[#111111] uppercase tracking-tight">
              LAST RECORDED RECEIPT FOR THIS WALLET
            </h2>
          </div>
          <span className="neo-badge neo-badge-green text-[10px]">SYNCED ON-CHAIN</span>
        </div>

        {lastMyReceiptLoading ? (
          <div className="py-8 text-center space-y-2">
            <div className="w-6 h-6 border-3 border-[#111111] border-t-transparent rounded-full animate-spin mx-auto" />
            <div className="text-xs font-black uppercase text-[#111111]">LOADING LAST RECEIPT...</div>
          </div>
        ) : lastMyReceiptError ? (
          <div className="p-4 bg-[#fbb6ce] border-3 border-[#111111] text-xs font-black uppercase text-[#111111]">
            {lastMyReceiptError}
          </div>
        ) : !lastMyReceipt ? (
          <div className="p-8 text-center border-3 border-dashed border-[#111111] space-y-1">
            <p className="text-sm font-black uppercase text-[#111111]">NO RECEIPTS CREATED YET</p>
            <p className="text-xs font-bold text-[#666666]">Click "NEW PAYMENT" above to execute your first transfer on Arc.</p>
          </div>
        ) : (
          cardContent
        )}
      </div>
    </section>
  );
}

export default function CreateReceiptPage() {
  return (
    <Suspense fallback={<div className="p-10 text-center text-slate-500">Loading form...</div>}>
      <CreateReceiptContent />
    </Suspense>
  );
}