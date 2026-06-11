import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useUnderlyingToken } from "@/hooks/useUnderlyingToken";
import { Coins } from "lucide-react";
import { useMemo, useState } from "react";
import { useAccount } from "wagmi";

const formatAmount = (value: string) => {
  const parsed = Number(value);
  return new Intl.NumberFormat("zh-CN", {
    maximumFractionDigits: 6,
  }).format(Number.isFinite(parsed) ? parsed : 0);
};

const shortenAddress = (address?: string) =>
  address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "-";

export function UnderlyingTokenWidget() {
  const { address: account, isConnected } = useAccount();
  const [mintAmount, setMintAmount] = useState("1000");
  const underlying = useUnderlyingToken({
    account,
    mintAmount,
  });

  const parsedMintAmount = useMemo(() => {
    const parsed = Number(mintAmount);
    return Number.isFinite(parsed) ? parsed : 0;
  }, [mintAmount]);

  const canMint =
    isConnected &&
    Boolean(account) &&
    Boolean(underlying.underlyingAddress) &&
    parsedMintAmount > 0 &&
    !underlying.isMinting;

  return (
    <div className="flex items-center gap-2 rounded-md border border-zinc-800 bg-zinc-950/80 px-2 py-1.5">
      <div className="flex min-w-0 items-center gap-2">
        <Coins className="h-4 w-4 shrink-0 text-blue-400" aria-hidden="true" />
        <div className="min-w-0">
          <p className="whitespace-nowrap text-xs font-medium text-zinc-100">
            {underlying.isReading
              ? "读取中..."
              : `${formatAmount(underlying.formattedBalance)} ${underlying.symbol}`}
          </p>
          <p
            className="max-w-28 truncate font-mono text-[10px] text-zinc-500"
            title={underlying.underlyingAddress}
          >
            {shortenAddress(underlying.underlyingAddress)}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1">
        <Input
          type="number"
          min="0"
          step="0.000001"
          value={mintAmount}
          onChange={(event) => setMintAmount(event.target.value)}
          className="h-8 w-20 border-zinc-800 bg-zinc-900 px-2 text-xs"
          aria-label="Mint amount"
        />
        <Button
          size="sm"
          variant="outline"
          className="h-8 border-zinc-700 px-2 text-xs"
          onClick={underlying.mint}
          disabled={!canMint}
        >
          {underlying.isMinting ? "Minting" : "Mint"}
        </Button>
      </div>

      {underlying.error && (
        <p className="hidden max-w-40 truncate text-xs text-red-300 lg:block">
          {underlying.error.message}
        </p>
      )}
    </div>
  );
}
