import marketAbiJson from "../../abis/Market.json";
import { MARKET_ADDRESS, TOKEN_DECIMALS } from "@/hooks/useContractData";
import { type Abi, type Address, type Hex, parseUnits } from "viem";
import {
  useReadContract,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import { useEffect, useMemo } from "react";

const marketAbi = marketAbiJson as Abi;

const erc20Abi = [
  {
    type: "function",
    name: "allowance",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "approve",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
] as const;

type UseTradeTransactionParams = {
  account?: Address;
  amount: string;
};

type SendTradeParams = {
  buyer: Address;
  merchant: Address;
  data?: Hex;
};

const parseTokenAmount = (amount: string) => {
  try {
    return parseUnits(amount || "0", TOKEN_DECIMALS);
  } catch {
    return 0n;
  }
};

// 交易分两步：
// 1. 从 Market.underlying() 读取 ERC20 地址，并检查用户给 Market 的 allowance。
// 2. allowance 不足时先 approve；足够后再调用 Market.trade。
export function useTradeTransaction({
  account,
  amount,
}: UseTradeTransactionParams) {
  const requiredAmount = useMemo(() => parseTokenAmount(amount), [amount]);

  const underlying = useReadContract({
    address: MARKET_ADDRESS,
    abi: marketAbi,
    functionName: "underlying",
  });

  const underlyingAddress =
    typeof underlying.data === "string"
      ? (underlying.data as Address)
      : undefined;

  const allowance = useReadContract({
    address: underlyingAddress,
    abi: erc20Abi,
    functionName: "allowance",
    args: account ? [account, MARKET_ADDRESS] : undefined,
    query: {
      enabled: Boolean(account && underlyingAddress && requiredAmount > 0n),
    },
  });

  const {
    data: approveHash,
    error: approveWriteError,
    isPending: isApproveWriting,
    writeContract: writeApprove,
  } = useWriteContract();

  const {
    isLoading: isApproveConfirming,
    isSuccess: isApproveSuccess,
    error: approveReceiptError,
  } = useWaitForTransactionReceipt({
    hash: approveHash,
  });

  const {
    data: tradeHash,
    error: tradeWriteError,
    isPending: isTradeWriting,
    writeContract: writeTrade,
  } = useWriteContract();

  const {
    isLoading: isTradeConfirming,
    isSuccess: isTradeSuccess,
    error: tradeReceiptError,
  } = useWaitForTransactionReceipt({
    hash: tradeHash,
  });

  useEffect(() => {
    if (isApproveSuccess) {
      void allowance.refetch();
    }
  }, [allowance, isApproveSuccess]);

  const currentAllowance =
    typeof allowance.data === "bigint" ? allowance.data : 0n;
  const needsApproval =
    Boolean(account && underlyingAddress) &&
    requiredAmount > 0n &&
    currentAllowance < requiredAmount;

  const approve = () => {
    if (!underlyingAddress || requiredAmount <= 0n) {
      return;
    }

    writeApprove({
      address: underlyingAddress,
      abi: erc20Abi,
      functionName: "approve",
      args: [MARKET_ADDRESS, requiredAmount],
    });
  };

  const sendTrade = ({ buyer, merchant, data = "0x" }: SendTradeParams) => {
    if (requiredAmount <= 0n) {
      return;
    }

    writeTrade({
      address: MARKET_ADDRESS,
      abi: marketAbi,
      functionName: "trade",
      args: [buyer, merchant, requiredAmount, data],
    });
  };

  return {
    underlyingAddress,
    requiredAmount,
    allowance: currentAllowance,
    needsApproval,
    approve,
    sendTrade,
    approveHash,
    tradeHash,
    isReadingAllowance: underlying.isLoading || allowance.isLoading,
    isApproving: isApproveWriting || isApproveConfirming,
    isTrading: isTradeWriting || isTradeConfirming,
    isPending:
      isApproveWriting ||
      isApproveConfirming ||
      isTradeWriting ||
      isTradeConfirming,
    isApproveSuccess,
    isTradeSuccess,
    error:
      underlying.error ??
      allowance.error ??
      approveWriteError ??
      approveReceiptError ??
      tradeWriteError ??
      tradeReceiptError,
  };
}
