import finalGovernorAbiJson from "../../abis/FinalGovernor.json";
import marketAbiJson from "../../abis/Market.json";
import proportionalElectionAbiJson from "../../abis/ProportionalElection.json";
import { type Abi, type Address, formatUnits } from "viem";
import { useReadContract, useReadContracts } from "wagmi";

// ========= 固定合约配置 =========
// Market 和 Governor 是入口合约。buyer/seller rights token 地址从 Market 合约读取，避免手写错地址。
export const MARKET_ADDRESS =
	"0xA51c1fc2f0D1a1b8494Ed1FE312d7C3a78Ed91C0" as Address;
export const GOVERNOR_ADDRESS =
	"0x68B1D87F95878fE05B998F19b66F4baba5De1aed" as Address;
export const TIMELOCK_ADDRESS =
	"0x610178dA211FEF7D417bC0e6FeD39F05609AD788" as Address;

// 积分/USDC 是 6 位小数，rights token 是 18 位小数，不能混用。
export const TOKEN_DECIMALS = 6;
export const RIGHTS_DECIMALS = 18;

const marketAbi = marketAbiJson as Abi;
const finalGovernorAbi = finalGovernorAbiJson as Abi;
const proportionalElectionAbi = proportionalElectionAbiJson as Abi;

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const ZERO_ADDRESS_TYPED = ZERO_ADDRESS as Address;

const PROPOSAL_STATES = [
	"Pending",
	"Active",
	"Canceled",
	"Defeated",
	"Succeeded",
	"Queued",
	"Expired",
	"Executed",
] as const;

type ProposalState = (typeof PROPOSAL_STATES)[number] | "Unknown";

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
	active: boolean;
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

type UseRightsDataParams = {
	account?: Address;
	electionRoundIds?: bigint[];
	activeRangeTimepoint?: bigint;
};

type UseContractTradeDataParams = UseRightsDataParams & {
	merchantAddresses?: Address[];
	proposalIds?: bigint[];
};

const emptyPoints: AccountPoints = {
	buyerPoints: "0",
	sellerPoints: "0",
};

const emptyRightsTokenData: RightsTokenData = {
	currentRoundId: 0n,
	clock: 0n,
	genesisTime: 0n,
	votes: "0",
	rounds: [],
};

const emptyProtocolData: ContractProtocolData = {
	...emptyPoints,
	merchants: [],
	proposals: [],
};

// ========= 通用解析工具 =========
// 合约读取失败或还没返回时，result 可能是 undefined。这里统一兜底，页面层不用反复判空。
const readBigInt = (value: unknown): bigint => {
  if (typeof value === "bigint") return value;
  if (typeof value === "number" && Number.isFinite(value)) return BigInt(value);
  if (typeof value === "string" && value) {
    try {
      return BigInt(value);
    } catch {
      return 0n;
    }
  }
  return 0n;
};

const readAddress = (value: unknown) =>
	typeof value === "string" && value.startsWith("0x")
		? (value as Address)
		: undefined;

const formatTokenAmount = (value: unknown, decimals: number) =>
	formatUnits(readBigInt(value), decimals);

const hasRealAddress = (address?: Address) =>
	Boolean(address) && address !== ZERO_ADDRESS;

// ========= 查询账户积分 =========
// 只依赖 account。钱包地址变化时，只会重新读取 buyerPoints / sellerPoints。
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
		query: {
			enabled,
		},
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

// ========= 查询商户信息 =========
// 只依赖 merchantAddresses。商户列表变化时，不会影响账户积分、提案或 rights token 查询。
// ========= 查询历史已领取退税 =========
// 对应 Market.claimed(address)，返回某个地址已经 claim 过的累计退税数量。
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
		query: {
			enabled,
		},
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
	const enabled =
		merchantAddresses.length > 0 && hasRealAddress(MARKET_ADDRESS);

	const { data, isLoading, isError, error, refetch } = useReadContracts({
		contracts: enabled
			? merchantAddresses.map((merchantAddress) => ({
				address: MARKET_ADDRESS,
				abi: marketAbi,
				functionName: "merchants",
				args: [merchantAddress],
			}))
			: [],
		query: {
			enabled,
		},
	});

	const merchants = merchantAddresses.map((merchantAddress, index) => {
		const merchant = data?.[index]?.result;
		const [deposit, isActive, interactionTarget] = Array.isArray(merchant)
			? merchant
			: [0n, false, undefined];

		return {
			id: index + 1,
			address: merchantAddress,
			interactionTarget: readAddress(interactionTarget) ?? ZERO_ADDRESS_TYPED,
			deposit: formatTokenAmount(deposit, TOKEN_DECIMALS),
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

// ========= 查询治理提案 =========
// 每个 proposalId 读取 5 个字段：状态、票数、快照、截止时间、提案人。
export function useProposals(proposalIds: bigint[] = []) {
	const enabled =
		proposalIds.length > 0 && hasRealAddress(GOVERNOR_ADDRESS);

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
		query: {
			enabled,
		},
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

// ========= 查询 Rights Token 地址 =========
// buyerRights / sellerRights 由 Market 合约保存，直接链上读取能避免手写 seller 地址导致数据错位。
export function useGovernorClock() {
	const enabled = hasRealAddress(GOVERNOR_ADDRESS);

	const clock = useReadContract({
		address: GOVERNOR_ADDRESS,
		abi: finalGovernorAbi,
		functionName: "clock",
		query: {
			enabled,
		},
	});
	const clockMode = useReadContract({
		address: GOVERNOR_ADDRESS,
		abi: finalGovernorAbi,
		functionName: "CLOCK_MODE",
		query: {
			enabled,
		},
	});
	const votingDelay = useReadContract({
		address: GOVERNOR_ADDRESS,
		abi: finalGovernorAbi,
		functionName: "votingDelay",
		query: {
			enabled,
		},
	});
	const votingPeriod = useReadContract({
		address: GOVERNOR_ADDRESS,
		abi: finalGovernorAbi,
		functionName: "votingPeriod",
		query: {
			enabled,
		},
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
			clock.error ??
			clockMode.error ??
			votingDelay.error ??
			votingPeriod.error,
		refetch: () => {
			void clock.refetch();
			void clockMode.refetch();
			void votingDelay.refetch();
			void votingPeriod.refetch();
		},
	};
}

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
		query: {
			enabled,
		},
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

type RightsReadPlan = {
	address?: Address;
	staticLength: number;
	activeRangeLength: number;
	accountLength: number;
	roundLength: number;
};

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

// ========= 查询买方 / 卖方 Rights Token =========
// 先从 Market 读取两个 rights token 地址，再分别读取 getVotes / currentRoundId / clock 等数据。
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

// 兼容旧名字：之前页面如果用了 useElectionData，不需要立刻全量改名。
export const useElectionData = useRightsData;

// ========= 兼容入口 =========
// 如果页面想一次拿全量数据，可以用这个组合 hook；内部仍然是拆开的独立查询。
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
			accountPoints.error ??
			merchants.error ??
			proposals.error ??
			rights.error,
		refetch: () => {
			void accountPoints.refetch();
			void merchants.refetch();
			void proposals.refetch();
			void rights.refetch();
		},
	};
}
