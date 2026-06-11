import { type Address } from "viem";
import { type PROPOSAL_STATES } from "./config";

export type ProposalState = (typeof PROPOSAL_STATES)[number] | "Unknown";

export type AccountPoints = {
  buyerPoints: string;
  sellerPoints: string;
};

export type RightsTokenAddresses = {
  buyerRightsAddress?: Address;
  sellerRightsAddress?: Address;
};

export type ContractMerchant = {
  id: number;
  address: Address;
  interactionTarget: Address;
  deposit: string;
  k: string;
  active: boolean;
};

export type TradeQuote = {
  deltaW: string;
  deltaS: string;
  rawDeltaW: bigint;
  rawDeltaS: bigint;
};

export type ContractProposal = {
  id: bigint;
  exists: boolean;
  status: ProposalState;
  againstVotes: string;
  forVotes: string;
  abstainVotes: string;
  snapshot: bigint;
  deadline: bigint;
  proposer?: Address;
};

export type ContractElectionRound = {
  id: bigint;
  seatToken?: Address;
  initialized: boolean;
};

export type RightsTokenData = {
  address?: Address;
  currentRoundId: bigint;
  clock: bigint;
  genesisTime: bigint;
  votes: string;
  activeRange?: {
    startId: bigint;
    endId: bigint;
  };
  rounds: ContractElectionRound[];
};

export type DualRightsData = {
  buyerRights: RightsTokenData;
  sellerRights: RightsTokenData;
};

export type ContractProtocolData = AccountPoints & {
  merchants: ContractMerchant[];
  proposals: ContractProposal[];
  rights?: DualRightsData;
};

export type GovernorClockData = {
  clock: bigint;
  clockMode: string;
  votingDelay: bigint;
  votingPeriod: bigint;
};

export type UseRightsDataParams = {
  account?: Address;
  electionRoundIds?: bigint[];
  activeRangeTimepoint?: bigint;
};

export type UseContractTradeDataParams = UseRightsDataParams & {
  merchantAddresses?: Address[];
  proposalIds?: bigint[];
};
