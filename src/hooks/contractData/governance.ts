import { useReadContract, useReadContracts } from "wagmi";
import {
  GOVERNOR_ADDRESS,
  PROPOSAL_STATES,
  RIGHTS_DECIMALS,
  finalGovernorAbi,
} from "./config";
import { formatTokenAmount, hasRealAddress, readAddress, readBigInt } from "./utils";

export function useProposals(proposalIds: bigint[] = []) {
  const enabled = proposalIds.length > 0 && hasRealAddress(GOVERNOR_ADDRESS);

  const { data, isLoading, isError, error, refetch } = useReadContracts({
    contracts: enabled
      ? proposalIds.flatMap((proposalId) => [
          {
            address: GOVERNOR_ADDRESS,
            abi: finalGovernorAbi,
            functionName: "state",
            args: [proposalId],
          },
          {
            address: GOVERNOR_ADDRESS,
            abi: finalGovernorAbi,
            functionName: "proposalVotes",
            args: [proposalId],
          },
          {
            address: GOVERNOR_ADDRESS,
            abi: finalGovernorAbi,
            functionName: "proposalSnapshot",
            args: [proposalId],
          },
          {
            address: GOVERNOR_ADDRESS,
            abi: finalGovernorAbi,
            functionName: "proposalDeadline",
            args: [proposalId],
          },
          {
            address: GOVERNOR_ADDRESS,
            abi: finalGovernorAbi,
            functionName: "proposalProposer",
            args: [proposalId],
          },
        ])
      : [],
    query: { enabled },
  });

  const proposals = proposalIds.map((proposalId, index) => {
    const baseIndex = index * 5;
    const proposalResults = data?.slice(baseIndex, baseIndex + 5);
    const hasAllResults =
      proposalResults?.length === 5 &&
      proposalResults.every((item) => item?.status === "success");
    const stateIndex = hasAllResults
      ? Number(readBigInt(data?.[baseIndex]?.result))
      : -1;
    const votes = data?.[baseIndex + 1]?.result;
    const [againstVotes, forVotes, abstainVotes] = Array.isArray(votes)
      ? votes
      : [0n, 0n, 0n];

    return {
      id: proposalId,
      exists: Boolean(hasAllResults),
      status: PROPOSAL_STATES[stateIndex] ?? "Unknown",
      againstVotes: formatTokenAmount(againstVotes, RIGHTS_DECIMALS),
      forVotes: formatTokenAmount(forVotes, RIGHTS_DECIMALS),
      abstainVotes: formatTokenAmount(abstainVotes, RIGHTS_DECIMALS),
      snapshot: readBigInt(data?.[baseIndex + 2]?.result),
      deadline: readBigInt(data?.[baseIndex + 3]?.result),
      proposer: readAddress(data?.[baseIndex + 4]?.result),
    };
  });

  return {
    data: proposals,
    isLoading,
    isError,
    error,
    refetch,
  };
}

export function useGovernorClock() {
  const enabled = hasRealAddress(GOVERNOR_ADDRESS);

  const clock = useReadContract({
    address: GOVERNOR_ADDRESS,
    abi: finalGovernorAbi,
    functionName: "clock",
    query: { enabled },
  });
  const clockMode = useReadContract({
    address: GOVERNOR_ADDRESS,
    abi: finalGovernorAbi,
    functionName: "CLOCK_MODE",
    query: { enabled },
  });
  const votingDelay = useReadContract({
    address: GOVERNOR_ADDRESS,
    abi: finalGovernorAbi,
    functionName: "votingDelay",
    query: { enabled },
  });
  const votingPeriod = useReadContract({
    address: GOVERNOR_ADDRESS,
    abi: finalGovernorAbi,
    functionName: "votingPeriod",
    query: { enabled },
  });

  return {
    data: {
      clock: readBigInt(clock.data),
      clockMode: typeof clockMode.data === "string" ? clockMode.data : "",
      votingDelay: readBigInt(votingDelay.data),
      votingPeriod: readBigInt(votingPeriod.data),
    },
    isLoading:
      clock.isLoading ||
      clockMode.isLoading ||
      votingDelay.isLoading ||
      votingPeriod.isLoading,
    isError:
      clock.isError ||
      clockMode.isError ||
      votingDelay.isError ||
      votingPeriod.isError,
    error:
      clock.error ?? clockMode.error ?? votingDelay.error ?? votingPeriod.error,
    refetch: () => {
      void clock.refetch();
      void clockMode.refetch();
      void votingDelay.refetch();
      void votingPeriod.refetch();
    },
  };
}
