import { type Address } from "viem";
import {
  type RightsTokenData,
  type UseRightsDataParams,
} from "./types";

export type RightsReadPlan = {
  address?: Address;
  staticLength: number;
  activeRangeLength: number;
  accountLength: number;
  roundLength: number;
};

export type { RightsTokenData, UseRightsDataParams };
