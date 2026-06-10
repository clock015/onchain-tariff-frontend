import marketAbiJson from "../../abis/Market.json";
import { MARKET_ADDRESS } from "@/hooks/useContractData";
import { type Abi, type Address } from "viem";
import { useWaitForTransactionReceipt, useWriteContract } from "wagmi";

const marketAbi = marketAbiJson as Abi;

// 发送 Market.claimTaxRefund(account) 交易。
export function useTaxRefundTransaction() {
  const {
    data: hash,
    error: writeError,
    isPending: isWriting,
    writeContract,
  } = useWriteContract();

  const {
    isLoading: isConfirming,
    isSuccess,
    error: receiptError,
  } = useWaitForTransactionReceipt({
    hash,
  });

  const claimTaxRefund = (account: Address) => {
    writeContract({
      address: MARKET_ADDRESS,
      abi: marketAbi,
      functionName: "claimTaxRefund",
      args: [account],
    });
  };

  return {
    hash,
    claimTaxRefund,
    isPending: isWriting || isConfirming,
    isWriting,
    isConfirming,
    isSuccess,
    error: writeError ?? receiptError,
  };
}
