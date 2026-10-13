"use client";

import { useMemo } from "react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";

const COLORS = [
  "#f472b6", // Neo Pink
  "#60a5fa", // Neo Blue
  "#4ade80", // Neo Green
  "#facc15", // Neo Yellow
  "#a78bfa", // Purple
  "#fb923c", // Orange
  "#111111", // Black
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

interface Receipt {
  id: bigint;
  from: string;
  to: string;
  amount: bigint;
  category: number;
}

interface Props {
  receipts: Receipt[];
  currentAddress: string | undefined;
}

function formatUsdc(amount: bigint): string {
  const val = Number(amount) / 1000000;
  return val.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

export default function AnalyticsDashboard({ receipts, currentAddress }: Props) {
  const stats = useMemo(() => {
    if (!currentAddress || receipts.length === 0) return null;

    const addrLower = currentAddress.toLowerCase();
    let totalSent = BigInt(0);
    let totalReceived = BigInt(0);
    const categoryMap: Record<string, number> = {};

    receipts.forEach((r) => {
      const isSent = r.from.toLowerCase() === addrLower;

      if (isSent) {
        totalSent += r.amount;
        const catName = categoryLabels[r.category] || "Unknown";
        const val = Number(r.amount) / 1000000;
        categoryMap[catName] = (categoryMap[catName] || 0) + val;
      } else {
        totalReceived += r.amount;
      }
    });

    const chartData = Object.entries(categoryMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    return { totalSent, totalReceived, chartData };
  }, [receipts, currentAddress]);

  if (!stats) return null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
      {/* Cards: Summary */}
      <div className="lg:col-span-1 flex flex-col gap-4">
        <div className="neo-box p-5 bg-[#dcfce7] border-4 border-[#111111] shadow-[6px_6px_0px_#111111]">
          <span className="neo-badge neo-badge-green text-[10px] mb-2">INCOMING FUNDS</span>
          <div className="text-3xl font-black text-[#111111] tracking-tight">
            + {formatUsdc(stats.totalReceived)}{" "}
            <span className="text-sm font-black text-[#111111]">USDC</span>
          </div>
        </div>

        <div className="neo-box p-5 bg-[#ffe4e6] border-4 border-[#111111] shadow-[6px_6px_0px_#111111]">
          <span className="neo-badge neo-badge-pink text-[10px] mb-2">OUTGOING DISBURSEMENTS</span>
          <div className="text-3xl font-black text-[#111111] tracking-tight">
            - {formatUsdc(stats.totalSent)}{" "}
            <span className="text-sm font-black text-[#111111]">USDC</span>
          </div>
        </div>
      </div>

      {/* Chart: Spending by Category */}
      <div className="lg:col-span-2 neo-box bg-white border-4 border-[#111111] shadow-[6px_6px_0px_#111111] p-5 flex flex-col">
        <div className="flex items-center justify-between pb-3 border-b-2 border-[#111111] mb-2">
          <h3 className="text-xs font-black uppercase text-[#111111] tracking-wider">
            SPENDING BREAKDOWN BY CATEGORY
          </h3>
          <span className="neo-badge neo-badge-black text-[10px]">ANALYSIS</span>
        </div>

        {stats.chartData.length > 0 ? (
          <div className="flex-1 w-full h-[180px] text-xs">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats.chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={70}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="#111111"
                  strokeWidth={2}
                >
                  {stats.chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#ffffff",
                    border: "3px solid #111111",
                    boxShadow: "3px 3px 0px #111111",
                    color: "#111111",
                    fontWeight: "bold",
                  }}
                  formatter={(value: any) => [`${Number(value || 0).toFixed(2)} USDC`, "Amount"]}
                />
                <Legend
                  layout="vertical"
                  verticalAlign="middle"
                  align="right"
                  wrapperStyle={{ fontSize: "11px", fontWeight: "bold", color: "#111111" }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-[#666666] text-xs font-bold uppercase italic py-8">
            No spending disbursements recorded for this wallet yet.
          </div>
        )}
      </div>
    </div>
  );
}