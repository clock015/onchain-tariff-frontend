import { type Address } from "viem";
import { useReadContracts } from "wagmi";
import {
  MARKET_ADDRESS,
  RIGHTS_DECIMALS,
  marketAbi,
  proportionalElectionAbi,
} from "./config";
import {
  formatTokenAmount,
  hasRealAddress,
  readAddress,
  readBigInt,
} from "./utils";
import {
  type RightsReadPlan,
  type RightsTokenData,
  type UseRightsDataParams,
} from "./rightsTypes";

const emptyRightsTokenData: RightsTokenData = {
  currentRoundId: 0n,
  clock: 0n,
  genesisTime: 0n,
  votes: "0",
  rounds: [],
};

export function useRightsTokenAddresses() {
  const enabled = hasRealAddress(MARKET_ADDRESS);

  const { data, isLoading, isError, error, refetch } = useReadContracts({
    contracts: enabled
      ? [
          {
            address: MARKET_ADDRESS,
            abi: marketAbi,
            functionName: "buyerRights",
          },
          {
            address: MARKET_ADDRESS,
            abi: marketAbi,
            functionName: "sellerRights",
          },
        ]
      : [],
    query: { enabled },
  });

  return {
    data: {
      buyerRightsAddress: readAddress(data?.[0]?.result),
      sellerRightsAddress: readAddress(data?.[1]?.result),
    },
    isLoading,
    isError,
    error,
    refetch,
  };
}

function buildRightsContracts({
  address,
  account,
  electionRoundIds,
  activeRangeTimepoint,
}: UseRightsDataParams & { address?: Address }) {
  if (!hasRealAddress(address)) {
    return {
      contracts: [],
      plan: {
        address,
        staticLength: 0,
        activeRangeLength: 0,
        accountLength: 0,
        roundLength: 0,
      },
    };
  }

  const rightsAddress = address as Address;
  const staticContracts = [
    {
      address: rightsAddress,
      abi: proportionalElectionAbi,
      functionName: "currentRoundId",
    },
    {
      address: rightsAddress,
      abi: proportionalElectionAbi,
      functionName: "clock",
    },
    {
      address: rightsAddress,
      abi: proportionalElectionAbi,
      functionName: "genesisTime",
    },
  ];

  const activeRangeContracts =
    activeRangeTimepoint === undefined
      ? []
      : [
          {
            address: rightsAddress,
            abi: proportionalElectionAbi,
            functionName: "getActiveRange",
            args: [activeRangeTimepoint],
          },
        ];

  const accountContracts = account
    ? [
        {
          address: rightsAddress,
          abi: proportionalElectionAbi,
          functionName: "getVotes",
          args: [account],
        },
      ]
    : [];

  const roundContracts = (electionRoundIds ?? []).map((roundId) => ({
    address: rightsAddress,
    abi: proportionalElectionAbi,
    functionName: "rounds",
    args: [roundId],
  }));

  return {
    contracts: [
      ...staticContracts,
      ...activeRangeContracts,
      ...accountContracts,
      ...roundContracts,
    ],
    plan: {
      address: rightsAddress,
      staticLength: staticContracts.length,
      activeRangeLength: activeRangeContracts.length,
      accountLength: accountContracts.length,
      roundLength: roundContracts.length,
    },
  };
}

function parseRightsTokenData({
  data,
  offset,
  plan,
  account,
  electionRoundIds,
}: {
  data: readonly { result?: unknown }[] | undefined;
  offset: number;
  plan: RightsReadPlan;
  account?: Address;
  electionRoundIds: bigint[];
}) {
  if (!hasRealAddress(plan.address)) {
    return emptyRightsTokenData;
  }

  const activeRangeOffset = offset + plan.staticLength;
  const accountOffset = activeRangeOffset + plan.activeRangeLength;
  const roundOffset = accountOffset + plan.accountLength;

  const activeRange =
    plan.activeRangeLength > 0 ? data?.[activeRangeOffset]?.result : undefined;
  const [activeRangeStartId, activeRangeEndId] = Array.isArray(activeRange)
    ? activeRange
    : [undefined, undefined];

  const rounds = electionRoundIds.map((roundId, index) => {
    const round = data?.[roundOffset + index]?.result;
    const [seatToken, initialized] = Array.isArray(round)
      ? round
      : [undefined, false];

    return {
      id: roundId,
      seatToken: readAddress(seatToken),
      initialized: Boolean(initialized),
    };
  });

  return {
    address: plan.address,
    currentRoundId: readBigInt(data?.[offset]?.result),
    clock: readBigInt(data?.[offset + 1]?.result),
    genesisTime: readBigInt(data?.[offset + 2]?.result),
    votes: account
      ? formatTokenAmount(data?.[accountOffset]?.result, RIGHTS_DECIMALS)
      : "0",
    activeRange:
      activeRangeStartId === undefined || activeRangeEndId === undefined
        ? undefined
        : {
            startId: readBigInt(activeRangeStartId),
            endId: readBigInt(activeRangeEndId),
          },
    rounds,
  };
}

export function useRightsData({
  account,
  electionRoundIds = [],
  activeRangeTimepoint,
}: UseRightsDataParams = {}) {
  const rightsAddresses = useRightsTokenAddresses();
  const { buyerRightsAddress, sellerRightsAddress } = rightsAddresses.data;

  const buyerRead = buildRightsContracts({
    address: buyerRightsAddress,
    account,
    electionRoundIds,
    activeRangeTimepoint,
  });
  const sellerRead = buildRightsContracts({
    address: sellerRightsAddress,
    account,
    electionRoundIds,
    activeRangeTimepoint,
  });

  const contracts = [...buyerRead.contracts, ...sellerRead.contracts];

  const { data, isLoading, isError, error, refetch } = useReadContracts({
    contracts,
    query: {
      enabled: contracts.length > 0,
    },
  });

  const buyerRights = parseRightsTokenData({
    data,
    offset: 0,
    plan: buyerRead.plan,
    account,
    electionRoundIds,
  });
  const sellerRights = parseRightsTokenData({
    data,
    offset: buyerRead.contracts.length,
    plan: sellerRead.plan,
    account,
    electionRoundIds,
  });

  return {
    data: {
      buyerRights,
      sellerRights,
      buyerRightsAddress,
      sellerRightsAddress,
    },
    isLoading: rightsAddresses.isLoading || isLoading,
    isError: rightsAddresses.isError || isError,
    error: rightsAddresses.error ?? error,
    refetch: () => {
      void rightsAddresses.refetch();
      void refetch();
    },
  };
}

export const useElectionData = useRightsData;
