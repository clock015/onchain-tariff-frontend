import finalGovernorAbiJson from "../../../abis/FinalGovernor.json";
import marketAbiJson from "../../../abis/Market.json";
import proportionalElectionAbiJson from "../../../abis/ProportionalElection.json";
import { type Abi, type Address } from "viem";

export const MARKET_ADDRESS =
  "0xA51c1fc2f0D1a1b8494Ed1FE312d7C3a78Ed91C0" as Address;
export const GOVERNOR_ADDRESS =
  "0x68B1D87F95878fE05B998F19b66F4baba5De1aed" as Address;
export const TIMELOCK_ADDRESS =
  "0x610178dA211FEF7D417bC0e6FeD39F05609AD788" as Address;

export const TOKEN_DECIMALS = 6;
export const RIGHTS_DECIMALS = 18;

export const marketAbi = marketAbiJson as Abi;
export const finalGovernorAbi = finalGovernorAbiJson as Abi;
export const proportionalElectionAbi = proportionalElectionAbiJson as Abi;

export const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
export const ZERO_ADDRESS_TYPED = ZERO_ADDRESS as Address;

export const PROPOSAL_STATES = [
  "Pending",
  "Active",
  "Canceled",
  "Defeated",
  "Succeeded",
  "Queued",
  "Expired",
  "Executed",
] as const;
