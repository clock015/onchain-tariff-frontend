import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useTradeQuote } from "@/hooks/useContractData";
import { useTradeTransaction } from "@/hooks/useTradeTransaction";
import { type Address, type Hex, isHex } from "viem";
import { useMemo, useState } from "react";
import { formatAmount, shortenAddress, toNumber } from "./utils";

type TradePanelProps = {
  account?: Address;
  isConnected: boolean;
  merchantInput: string;
  merchantAddress?: Address;
  merchantActive: boolean;
  onMerchantInputChange: (value: string) => void;
};

export function TradePanel({
  account,
  isConnected,
  merchantInput,
  merchantAddress,
  merchantActive,
  onMerchantInputChange,
}: TradePanelProps) {
  const [amount, setAmount] = useState("");
  const [tradeDataInput, setTradeDataInput] = useState("");

  const tradeData = useMemo(() => {
    const value = tradeDataInput.trim();
    if (!value) return "0x" as Hex;
    return isHex(value) ? (value as Hex) : undefined;
  }, [tradeDataInput]);

  const trade = useTradeTransaction({ account, amount });
  const tradeQuote = useTradeQuote({ merchant: merchantAddress, amount });

  const parsedAmount = toNumber(amount);
  const governanceRights = parsedAmount * 0.01;
  const dataIsValid = tradeData !== undefined;
  const canAct =
    Boolean(account) &&
    Boolean(merchantAddress) &&
    dataIsValid &&
    parsedAmount > 0 &&
    merchantActive &&
    !trade.isPending &&
    !trade.isReadingAllowance;

  const handlePrimaryAction = () => {
    if (!account || !merchantAddress || !tradeData || parsedAmount <= 0) return;

    if (trade.needsApproval) {
      trade.approve();
      return;
    }

    trade.sendTrade({
      buyer: account,
      merchant: merchantAddress,
      data: tradeData,
    });
  };

  const buttonText = (() => {
    if (trade.isApproving) return "授权确认中...";
    if (trade.isTrading) return "交易处理中...";
    if (trade.isReadingAllowance) return "读取授权额度...";
    if (trade.needsApproval) return "授权 USDC";
    return "执行原子交易";
  })();

  return (
    <div className="sticky top-24">
      <Card className="bg-zinc-900 border-blue-500/30 border-2 shadow-2xl shadow-blue-500/10">
        <CardHeader>
          <CardTitle>发起交易</CardTitle>
          <CardDescription>
            当前钱包：{isConnected ? shortenAddress(account) : "未连接"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs uppercase text-zinc-400">商家地址</label>
            <Input
              placeholder="0x..."
              value={merchantInput}
              onChange={(event) => onMerchantInputChange(event.target.value)}
              className="bg-zinc-950 border-zinc-800 font-mono"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs uppercase text-zinc-400">
              支付金额 (USDC)
            </label>
            <Input
              type="number"
              min="0"
              step="0.000001"
              placeholder="0.00"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              className="bg-zinc-950 border-zinc-800"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs uppercase text-zinc-400">
              可选 data (bytes)
            </label>
            <Input
              placeholder="0x"
              value={tradeDataInput}
              onChange={(event) => setTradeDataInput(event.target.value)}
              className="bg-zinc-950 border-zinc-800 font-mono"
            />
            {!dataIsValid && (
              <p className="text-xs text-red-300">
                data 必须是 hex bytes，例如 0x 或 0x1234。
              </p>
            )}
          </div>

          <div className="space-y-2 rounded-md border border-zinc-800 bg-zinc-950 p-4">
            <div className="flex justify-between text-sm">
              <span className="text-zinc-500">商家收入 deltaW (AMM)</span>
              <span className="font-mono text-green-400">
                +{formatAmount(toNumber(tradeQuote.data.deltaW))} USDC
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-zinc-500">税和积分 deltaS (AMM)</span>
              <span className="font-mono text-blue-400">
                +{formatAmount(toNumber(tradeQuote.data.deltaS))} USDC
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-zinc-500">治理确权 (1%)</span>
              <span className="font-mono text-purple-400">
                +{formatAmount(governanceRights)} USDC
              </span>
            </div>
            {tradeQuote.isLoading && (
              <p className="text-xs text-zinc-500">正在读取 AMM 报价...</p>
            )}
            {tradeQuote.isError && (
              <p className="text-xs text-red-300">
                AMM 报价读取失败：{tradeQuote.error?.message}
              </p>
            )}
          </div>

          <div className="space-y-1 text-xs text-zinc-500">
            <p>Underlying：{shortenAddress(trade.underlyingAddress)}</p>
            <p>
              当前流程：
              {trade.needsApproval ? "需要先授权 USDC" : "授权额度足够"}
            </p>
            <p>发送 data：{tradeData ?? "-"}</p>
          </div>

          {trade.approveHash && (
            <p className="break-all text-xs text-zinc-500">
              授权交易：{trade.approveHash}
            </p>
          )}

          {trade.tradeHash && (
            <p className="break-all text-xs text-zinc-500">
              交易哈希：{trade.tradeHash}
            </p>
          )}

          {trade.error && (
            <p className="text-sm text-red-300">
              操作失败：{trade.error.message}
            </p>
          )}

          {trade.isApproveSuccess && trade.needsApproval && (
            <p className="text-sm text-green-400">
              授权已确认，正在刷新 allowance...
            </p>
          )}

          {trade.isTradeSuccess && (
            <p className="text-sm text-green-400">交易已确认。</p>
          )}
        </CardContent>
        <CardFooter>
          <Button
            className="w-full bg-blue-600 hover:bg-blue-700"
            onClick={handlePrimaryAction}
            disabled={!canAct}
          >
            {buttonText}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
