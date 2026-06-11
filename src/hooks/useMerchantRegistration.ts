import marketAbiJson from "../../abis/Market.json";
import { MARKET_ADDRESS, TOKEN_DECIMALS } from "@/hooks/useContractData";
import { type Abi, type Address, parseUnits } from "viem";
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

type UseMerchantRegistrationParams = {
  account?: Address;
  depositAmount: string;
};

const parseTokenAmount = (amount: string) => {
  try {
    return parseUnits(amount || "0", TOKEN_DECIMALS);
  } catch {
    return 0n;
  }
};

// 注册商家需要先给 Market 授权押金，再调用 registerMerchant(amount, interactionTarget)。
export function useMerchantRegistration({
  account,
  depositAmount,
}: UseMerchantRegistrationParams) {
  const requiredAmount = useMemo(
    () => parseTokenAmount(depositAmount),
    [depositAmount],
  );

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
    data: registerHash,
    error: registerWriteError,
    isPending: isRegisterWriting,
    writeContract: writeRegister,
  } = useWriteContract();

  const {
    isLoading: isRegisterConfirming,
    isSuccess: isRegisterSuccess,
    error: registerReceiptError,
  } = useWaitForTransactionReceipt({
    hash: registerHash,
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

  const registerMerchant = (interactionTarget: Address) => {
    if (requiredAmount <= 0n) {
      return;
    }

    writeRegister({
      address: MARKET_ADDRESS,
      abi: marketAbi,
      functionName: "registerMerchant",
      args: [requiredAmount, interactionTarget],
    });
  };

  return {
    underlyingAddress,
    requiredAmount,
    allowance: currentAllowance,
    needsApproval,
    approve,
    registerMerchant,
    approveHash,
    registerHash,
    isReadingAllowance: underlying.isLoading || allowance.isLoading,
    isApproving: isApproveWriting || isApproveConfirming,
    isRegistering: isRegisterWriting || isRegisterConfirming,
    isPending:
      isApproveWriting ||
      isApproveConfirming ||
      isRegisterWriting ||
      isRegisterConfirming,
    isApproveSuccess,
    isRegisterSuccess,
    error:
      underlying.error ??
      allowance.error ??
      approveWriteError ??
      approveReceiptError ??
      registerWriteError ??
      registerReceiptError,
  };
}
