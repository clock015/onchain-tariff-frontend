import { type AccountPoints, type ContractProtocolData, type UseContractTradeDataParams } from "./types";
import { GOVERNOR_ADDRESS, MARKET_ADDRESS } from "./config";
import { hasRealAddress } from "./utils";
import { useAccountPoints, useMerchants } from "./market";
import { useProposals } from "./governance";
import { useRightsData } from "./rights";

const emptyPoints: AccountPoints = {
  buyerPoints: "0",
  sellerPoints: "0",
};

const emptyProtocolData: ContractProtocolData = {
  ...emptyPoints,
  merchants: [],
  proposals: [],
};

export function useContractTradeData({
  account,
  merchantAddresses = [],
  proposalIds = [],
  electionRoundIds = [],
  activeRangeTimepoint,
}: UseContractTradeDataParams = {}) {
  const accountPoints = useAccountPoints(account);
  const merchants = useMerchants(merchantAddresses);
  const proposals = useProposals(proposalIds);
  const rights = useRightsData({
    account,
    electionRoundIds,
    activeRangeTimepoint,
  });

  return {
    data:
      hasRealAddress(MARKET_ADDRESS) || hasRealAddress(GOVERNOR_ADDRESS)
        ? {
            ...accountPoints.data,
            merchants: merchants.data,
            proposals: proposals.data,
            rights: rights.data,
          }
        : emptyProtocolData,
    isLoading:
      accountPoints.isLoading ||
      merchants.isLoading ||
      proposals.isLoading ||
      rights.isLoading,
    isError:
      accountPoints.isError ||
      merchants.isError ||
      proposals.isError ||
      rights.isError,
    error:
      accountPoints.error ?? merchants.error ?? proposals.error ?? rights.error,
    refetch: () => {
      void accountPoints.refetch();
      void merchants.refetch();
      void proposals.refetch();
      void rights.refetch();
    },
  };
}
