import marketAbiJson from "../../abis/Market.json";
import { MARKET_ADDRESS, TOKEN_DECIMALS } from "@/hooks/useContractData";
import { type Abi, type Address, formatUnits, parseUnits } from "viem";
import {
  useReadContract,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import { useEffect, useMemo } from "react";

const marketAbi = marketAbiJson as Abi;

const underlyingTokenAbi = [
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "symbol",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "string" }],
  },
  {
    type: "function",
    name: "decimals",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint8" }],
  },
  {
    type: "function",
    name: "mint",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [],
  },
] as const;

type UseUnderlyingTokenParams = {
  account?: Address;
  mintAmount: string;
};

const readTokenDecimals = (value: unknown) =>
  typeof value === "number" ? value : TOKEN_DECIMALS;

const parseTokenAmount = (amount: string, decimals: number) => {
  try {
    return parseUnits(amount || "0", decimals);
  } catch {
    return 0n;
  }
};

// 读取 Market 绑定的 underlying token，并提供测试币 mint 交互。
export function useUnderlyingToken({
  account,
  mintAmount,
}: UseUnderlyingTokenParams) {
  const underlying = useReadContract({
    address: MARKET_ADDRESS,
    abi: marketAbi,
    functionName: "underlying",
  });

  const underlyingAddress =
    typeof underlying.data === "string"
      ? (underlying.data as Address)
      : undefined;

  const symbol = useReadContract({
    address: underlyingAddress,
    abi: underlyingTokenAbi,
    functionName: "symbol",
    query: {
      enabled: Boolean(underlyingAddress),
    },
  });

  const decimals = useReadContract({
    address: underlyingAddress,
    abi: underlyingTokenAbi,
    functionName: "decimals",
    query: {
      enabled: Boolean(underlyingAddress),
    },
  });

  const tokenDecimals = readTokenDecimals(decimals.data);
  const mintAmountValue = useMemo(
    () => parseTokenAmount(mintAmount, tokenDecimals),
    [mintAmount, tokenDecimals],
  );

  const balance = useReadContract({
    address: underlyingAddress,
    abi: underlyingTokenAbi,
    functionName: "balanceOf",
    args: account ? [account] : undefined,
    query: {
      enabled: Boolean(account && underlyingAddress),
    },
  });

  const {
    data: mintHash,
    error: mintWriteError,
    isPending: isMintWriting,
    writeContract,
  } = useWriteContract();

  const {
    isLoading: isMintConfirming,
    isSuccess: isMintSuccess,
    error: mintReceiptError,
  } = useWaitForTransactionReceipt({
    hash: mintHash,
  });

  useEffect(() => {
    if (isMintSuccess) {
      void balance.refetch();
    }
  }, [balance, isMintSuccess]);

  const rawBalance = typeof balance.data === "bigint" ? balance.data : 0n;
  const displaySymbol =
    typeof symbol.data === "string" && symbol.data ? symbol.data : "USDC";

  const mint = () => {
    if (!account || !underlyingAddress || mintAmountValue <= 0n) {
      return;
    }

    writeContract({
      address: underlyingAddress,
      abi: underlyingTokenAbi,
      functionName: "mint",
      args: [account, mintAmountValue],
    });
  };

  return {
    underlyingAddress,
    symbol: displaySymbol,
    decimals: tokenDecimals,
    balance: rawBalance,
    formattedBalance: formatUnits(rawBalance, tokenDecimals),
    mintAmountValue,
    mint,
    mintHash,
    isReading:
      underlying.isLoading ||
      symbol.isLoading ||
      decimals.isLoading ||
      balance.isLoading,
    isMinting: isMintWriting || isMintConfirming,
    isMintSuccess,
    error:
      underlying.error ??
      symbol.error ??
      decimals.error ??
      balance.error ??
      mintWriteError ??
      mintReceiptError,
  };
}
