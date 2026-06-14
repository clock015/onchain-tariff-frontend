import { type Address } from "viem";
import { useReadContract, useReadContracts } from "wagmi";
import {
  MARKET_ADDRESS,
  TOKEN_DECIMALS,
  ZERO_ADDRESS_TYPED,
  marketAbi,
} from "./config";
import {
  formatTokenAmount,
  hasRealAddress,
  parseTokenAmount,
  readAddress,
  readBigInt,
} from "./utils";

export function useAccountPoints(account?: Address) {
  const enabled = Boolean(account) && hasRealAddress(MARKET_ADDRESS);

  const { data, isLoading, isError, error, refetch } = useReadContracts({
    contracts:
      enabled && account
        ? [
            {
              address: MARKET_ADDRESS,
              abi: marketAbi,
              functionName: "buyerPoints",
              args: [account],
            },
            {
              address: MARKET_ADDRESS,
              abi: marketAbi,
              functionName: "sellerPoints",
              args: [account],
            },
          ]
        : [],
    query: { enabled },
  });

  return {
    data: {
      buyerPoints: formatTokenAmount(data?.[0]?.result, TOKEN_DECIMALS),
      sellerPoints: formatTokenAmount(data?.[1]?.result, TOKEN_DECIMALS),
    },
    isLoading,
    isError,
    error,
    refetch,
  };
}

export function useClaimedAmount(account?: Address) {
  const enabled = Boolean(account) && hasRealAddress(MARKET_ADDRESS);

  const { data, isLoading, isError, error, refetch } = useReadContracts({
    contracts:
      enabled && account
        ? [
            {
              address: MARKET_ADDRESS,
              abi: marketAbi,
              functionName: "claimed",
              args: [account],
            },
          ]
        : [],
    query: { enabled },
  });

  return {
    data: formatTokenAmount(data?.[0]?.result, TOKEN_DECIMALS),
    isLoading,
    isError,
    error,
    refetch,
  };
}

export function useMerchants(merchantAddresses: Address[] = []) {
  const enabled = merchantAddresses.length > 0 && hasRealAddress(MARKET_ADDRESS);

  const { data, isLoading, isError, error, refetch } = useReadContracts({
    contracts: enabled
      ? merchantAddresses.map((merchantAddress) => ({
          address: MARKET_ADDRESS,
          abi: marketAbi,
          functionName: "merchants",
          args: [merchantAddress],
        }))
      : [],
    query: { enabled },
  });

  const merchants = merchantAddresses.map((merchantAddress, index) => {
    const merchant = data?.[index]?.result;
    const [deposit, isActive, interactionTarget, receivedFunds] = Array.isArray(merchant)
      ? merchant
      : [0n, false, undefined, 0n];

    return {
      id: index + 1,
      address: merchantAddress,
      interactionTarget: readAddress(interactionTarget) ?? ZERO_ADDRESS_TYPED,
      deposit: formatTokenAmount(deposit, TOKEN_DECIMALS),
      receivedFunds: formatTokenAmount(receivedFunds, TOKEN_DECIMALS),
      active: Boolean(isActive),
    };
  });

  return {
    data: merchants,
    isLoading,
    isError,
    error,
    refetch,
  };
}

export function useTradeQuote({
  merchant,
  amount,
}: {
  merchant?: Address;
  amount: string;
}) {
  const parsedAmount = parseTokenAmount(amount);
  const enabled =
    Boolean(merchant) && parsedAmount > 0n && hasRealAddress(MARKET_ADDRESS);

  const { data, isLoading, isError, error, refetch } = useReadContract({
    address: MARKET_ADDRESS,
    abi: marketAbi,
    functionName: "calculateAMM",
    args: merchant ? [merchant, parsedAmount] : undefined,
    query: { enabled },
  });

  const [deltaW, deltaS] = Array.isArray(data) ? data : [0n, 0n];
  const rawDeltaW = readBigInt(deltaW);
  const rawDeltaS = readBigInt(deltaS);

  return {
    data: {
      deltaW: formatTokenAmount(rawDeltaW, TOKEN_DECIMALS),
      deltaS: formatTokenAmount(rawDeltaS, TOKEN_DECIMALS),
      rawDeltaW,
      rawDeltaS,
    },
    parsedAmount,
    isLoading,
    isError,
    error,
    refetch,
  };
}
