import finalGovernorAbiJson from "../../abis/FinalGovernor.json";
import Layout from "@/components/Layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  GOVERNOR_ADDRESS,
  TIMELOCK_ADDRESS,
  type ContractProposal,
  useGovernorClock,
  useProposals,
} from "@/hooks/useContractData";
import { useGovernanceTransaction } from "@/hooks/useGovernanceTransaction";
import {
  type Abi,
  type Address,
  type Hex,
  isAddress,
  isHex,
  keccak256,
  stringToHex,
} from "viem";
import { useEffect, useMemo, useState } from "react";
import { useReadContract } from "wagmi";

const finalGovernorAbi = finalGovernorAbiJson as Abi;

type ProposalActionArgs = {
  target: Address;
  value: bigint;
  calldata: Hex;
  descriptionHash: Hex;
};

const toNumber = (value: string) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatAmount = (value: string) =>
  new Intl.NumberFormat("zh-CN", {
    maximumFractionDigits: 6,
  }).format(toNumber(value));

const parseBigIntInput = (value: string) => {
  try {
    return BigInt(value || "0");
  } catch {
    return undefined;
  }
};

const shortenAddress = (address?: string) =>
  address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "-";

const shortenId = (value: bigint) => {
  const text = value.toString();
  return text.length > 18 ? `${text.slice(0, 10)}...${text.slice(-8)}` : text;
};

const statusClassName = (status: string) => {
  if (status === "Active") return "bg-blue-500/10 text-blue-400 border-blue-500/20";
  if (status === "Succeeded" || status === "Executed") {
    return "bg-green-500/10 text-green-400 border-green-500/20";
  }
  if (status === "Queued") return "bg-purple-500/10 text-purple-300 border-purple-500/20";
  if (status === "Defeated" || status === "Canceled" || status === "Expired") {
    return "bg-red-500/10 text-red-300 border-red-500/20";
  }
  return "bg-zinc-800 text-zinc-300 border-zinc-700";
};

export default function GovPage() {
  const [proposalIdInput, setProposalIdInput] = useState("1");
  const [selectedProposalId, setSelectedProposalId] = useState(1n);
  const [targetInput, setTargetInput] = useState("");
  const [valueInput, setValueInput] = useState("0");
  const [calldataInput, setCalldataInput] = useState("0x");
  const [description, setDescription] = useState("");
  const [copiedProposalId, setCopiedProposalId] = useState(false);
  const [pendingCreatedProposalId, setPendingCreatedProposalId] = useState<
    bigint | undefined
  >();
  const governance = useGovernanceTransaction();

  const proposalQuery = useProposals([selectedProposalId]);
  const governorClock = useGovernorClock();
  const proposal = proposalQuery.data[0];

  const target = useMemo(() => {
    const value = targetInput.trim();
    return isAddress(value) ? (value as Address) : undefined;
  }, [targetInput]);
  const proposalValue = useMemo(
    () => parseBigIntInput(valueInput),
    [valueInput],
  );
  const calldata = useMemo(() => {
    const value = calldataInput.trim();
    return isHex(value) ? (value as Hex) : undefined;
  }, [calldataInput]);
  const trimmedDescription = description.trim();
  const descriptionHash = trimmedDescription
    ? keccak256(stringToHex(trimmedDescription))
    : undefined;
  const actionArgs = useMemo<ProposalActionArgs | undefined>(() => {
    if (!target || proposalValue === undefined || !calldata || !descriptionHash) {
      return undefined;
    }

    return {
      target,
      value: proposalValue,
      calldata,
      descriptionHash,
    };
  }, [calldata, descriptionHash, proposalValue, target]);
  const proposalIdToQuery = useMemo(
    () => parseBigIntInput(proposalIdInput),
    [proposalIdInput],
  );

  const proposalIdPreview = useReadContract({
    address: GOVERNOR_ADDRESS,
    abi: finalGovernorAbi,
    functionName: "getProposalId",
    args: actionArgs
      ? [[actionArgs.target], [actionArgs.value], [actionArgs.calldata], actionArgs.descriptionHash]
      : undefined,
    query: {
      enabled: Boolean(actionArgs),
    },
  });

  const previewProposalId =
    typeof proposalIdPreview.data === "bigint"
      ? proposalIdPreview.data
      : undefined;

  useEffect(() => {
    if (!governance.isSuccess || pendingCreatedProposalId === undefined) {
      return;
    }

    setSelectedProposalId(pendingCreatedProposalId);
    setProposalIdInput(pendingCreatedProposalId.toString());
    void proposalQuery.refetch();
    setPendingCreatedProposalId(undefined);
  }, [governance.isSuccess, pendingCreatedProposalId, proposalQuery]);

  const totalVotes =
    toNumber(proposal?.forVotes ?? "0") +
    toNumber(proposal?.againstVotes ?? "0") +
    toNumber(proposal?.abstainVotes ?? "0");
  const forPercent =
    totalVotes > 0 ? (toNumber(proposal?.forVotes ?? "0") / totalVotes) * 100 : 0;
  const againstPercent =
    totalVotes > 0
      ? (toNumber(proposal?.againstVotes ?? "0") / totalVotes) * 100
      : 0;
  const abstainPercent =
    totalVotes > 0
      ? (toNumber(proposal?.abstainVotes ?? "0") / totalVotes) * 100
      : 0;

  const handleQueryProposal = () => {
    if (proposalIdToQuery === undefined || proposalIdToQuery < 0n) return;
    setSelectedProposalId(proposalIdToQuery);
  };

  const handleUsePreviewId = () => {
    if (previewProposalId === undefined) return;
    setSelectedProposalId(previewProposalId);
    setProposalIdInput(previewProposalId.toString());
  };

  const handlePropose = () => {
    if (!target || proposalValue === undefined || !calldata || !trimmedDescription) {
      return;
    }

    setPendingCreatedProposalId(previewProposalId);
    governance.propose({
      target,
      value: proposalValue,
      calldata,
      description: trimmedDescription,
    });
  };

  const handleQueue = () => {
    if (!actionArgs) return;
    governance.queueProposal(actionArgs);
  };

  const handleExecute = () => {
    if (!actionArgs) return;
    governance.executeProposal(actionArgs);
  };

  const handleVote = (support: 0 | 1 | 2) => {
    governance.castVote({
      proposalId: selectedProposalId,
      support,
    });
  };

  const handleCopyProposalId = async () => {
    await navigator.clipboard.writeText(selectedProposalId.toString());
    setCopiedProposalId(true);
    window.setTimeout(() => setCopiedProposalId(false), 1500);
  };

  const canPropose =
    Boolean(target) &&
    proposalValue !== undefined &&
    Boolean(calldata) &&
    Boolean(trimmedDescription) &&
    !governance.isPending;

  return (
    <Layout>
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">议会治理</h1>
          <p className="mt-2 text-zinc-400">
            查询链上提案、发起提案、投票，并通过 Timelock 排队和执行通过的提案。
          </p>
        </div>

        <div className="flex w-full flex-col gap-2 sm:flex-row lg:w-auto">
          <Input
            type="number"
            min="0"
            placeholder="Proposal ID"
            value={proposalIdInput}
            onChange={(event) => setProposalIdInput(event.target.value)}
            className="bg-zinc-950 border-zinc-800 lg:w-72"
          />
          <Button
            className="bg-blue-600 hover:bg-blue-700"
            onClick={handleQueryProposal}
            disabled={proposalIdToQuery === undefined || proposalQuery.isLoading}
          >
            查询提案
          </Button>
        </div>
      </div>

      {governance.error && (
        <div className="mb-6 rounded-md border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          治理交易失败：{governance.error.message}
        </div>
      )}

      {governance.isSuccess && (
        <div className="mb-6 rounded-md border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-200">
          治理交易已确认。
          {governance.hash && (
            <span className="ml-2 break-all font-mono">{governance.hash}</span>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_420px]">
        <ProposalCard
          proposalId={selectedProposalId}
          proposal={proposal}
          actionArgsReady={Boolean(actionArgs)}
          isLoading={proposalQuery.isLoading}
          isError={proposalQuery.isError}
          forPercent={forPercent}
          againstPercent={againstPercent}
          abstainPercent={abstainPercent}
          copiedProposalId={copiedProposalId}
          governorClock={governorClock.data}
          governorClockLoading={governorClock.isLoading}
          governorClockError={governorClock.error}
          onCopyProposalId={handleCopyProposalId}
          onVote={handleVote}
          onQueue={handleQueue}
          onExecute={handleExecute}
          actionDisabled={governance.isPending || !proposal?.exists}
        />

        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle>提案参数</CardTitle>
            <CardDescription>
              发起、排队、执行必须使用同一组 target / value / calldata / description。
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-md border border-zinc-800 bg-zinc-950 p-3 text-xs text-zinc-400">
              <p>Timelock</p>
              <p className="break-all font-mono text-zinc-200">
                {TIMELOCK_ADDRESS}
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-xs uppercase text-zinc-400">
                Target 地址
              </label>
              <Input
                placeholder="0x..."
                value={targetInput}
                onChange={(event) => setTargetInput(event.target.value)}
                className="bg-zinc-950 border-zinc-800 font-mono"
              />
              {targetInput.trim() && !target && (
                <p className="text-xs text-red-300">Target 地址格式不正确。</p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-xs uppercase text-zinc-400">
                Value (wei)
              </label>
              <Input
                type="number"
                min="0"
                value={valueInput}
                onChange={(event) => setValueInput(event.target.value)}
                className="bg-zinc-950 border-zinc-800"
              />
              {proposalValue === undefined && (
                <p className="text-xs text-red-300">Value 必须是整数。</p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-xs uppercase text-zinc-400">
                Calldata
              </label>
              <Input
                placeholder="0x"
                value={calldataInput}
                onChange={(event) => setCalldataInput(event.target.value)}
                className="bg-zinc-950 border-zinc-800 font-mono"
              />
              {calldataInput.trim() && !calldata && (
                <p className="text-xs text-red-300">
                  Calldata 必须是 hex bytes，例如 0x 或 0x1234。
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-xs uppercase text-zinc-400">
                Description
              </label>
              <Input
                placeholder="提案描述"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                className="bg-zinc-950 border-zinc-800"
              />
            </div>

            <div className="rounded-md border border-zinc-800 bg-zinc-950 p-3 text-xs text-zinc-400">
              <p className="mb-1">预计算 Proposal ID</p>
              <p className="break-all font-mono text-zinc-200">
                {proposalIdPreview.isLoading
                  ? "计算中..."
                  : previewProposalId?.toString() ?? "表单完整后显示"}
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={handleUsePreviewId}
                disabled={previewProposalId === undefined}
              >
                用这个 ID 查询
              </Button>
            </div>
          </CardContent>
          <CardFooter>
            <Button
              className="w-full bg-blue-600 hover:bg-blue-700"
              onClick={handlePropose}
              disabled={!canPropose}
            >
              {governance.isPending ? "交易处理中..." : "发起新提案"}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </Layout>
  );
}

type ProposalCardProps = {
  proposalId: bigint;
  proposal: ContractProposal | undefined;
  actionArgsReady: boolean;
  isLoading: boolean;
  isError: boolean;
  forPercent: number;
  againstPercent: number;
  abstainPercent: number;
  copiedProposalId: boolean;
  governorClock: {
    clock: bigint;
    clockMode: string;
    votingDelay: bigint;
    votingPeriod: bigint;
  };
  governorClockLoading: boolean;
  governorClockError: Error | null;
  onCopyProposalId: () => void;
  onVote: (support: 0 | 1 | 2) => void;
  onQueue: () => void;
  onExecute: () => void;
  actionDisabled: boolean;
};

function ProposalCard({
  proposalId,
  proposal,
  actionArgsReady,
  isLoading,
  isError,
  forPercent,
  againstPercent,
  abstainPercent,
  copiedProposalId,
  governorClock,
  governorClockLoading,
  governorClockError,
  onCopyProposalId,
  onVote,
  onQueue,
  onExecute,
  actionDisabled,
}: ProposalCardProps) {
  if (isLoading) {
    return (
      <Card className="bg-zinc-900 border-zinc-800">
        <CardContent className="py-10 text-zinc-400">正在读取提案...</CardContent>
      </Card>
    );
  }

  if (isError || !proposal?.exists) {
    return (
      <Card className="bg-zinc-900 border-zinc-800">
        <CardContent className="space-y-3 py-10 text-red-300">
          <p>没有读到这个 proposalId 的链上提案。</p>
          <p className="break-all font-mono text-xs text-zinc-500">
            当前查询 ID：{proposalId.toString()}
          </p>
          <p className="text-sm text-zinc-400">
            Governor 的 proposalId 是哈希值。请使用右侧预计算出的巨大数字查询。
          </p>
        </CardContent>
      </Card>
    );
  }

  const queueDisabled = actionDisabled || !actionArgsReady;
  const executeDisabled = actionDisabled || !actionArgsReady;
  const isBeforeSnapshot = governorClock.clock < proposal.snapshot;

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <Badge className={statusClassName(proposal.status)}>
            {proposal.status}
          </Badge>
          <div className="flex items-center gap-2">
            <span
              className="font-mono text-xs text-zinc-500"
              title={proposalId.toString()}
            >
              ID: {shortenId(proposalId)}
            </span>
            <Button
              variant="outline"
              size="sm"
              className="h-7 border-zinc-700 px-2 text-xs"
              onClick={onCopyProposalId}
            >
              {copiedProposalId ? "已复制" : "复制"}
            </Button>
          </div>
        </div>
        <CardTitle className="mt-4 text-2xl">
          Proposal #{shortenId(proposalId)}
        </CardTitle>
        <CardDescription>
          Proposer: {shortenAddress(proposal.proposer)}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-md border border-zinc-800 bg-zinc-950 p-3">
            <p className="text-xs text-zinc-500">Snapshot</p>
            <p className="font-mono">{proposal.snapshot.toString()}</p>
          </div>
          <div className="rounded-md border border-zinc-800 bg-zinc-950 p-3">
            <p className="text-xs text-zinc-500">Deadline</p>
            <p className="font-mono">{proposal.deadline.toString()}</p>
          </div>
          <div className="rounded-md border border-zinc-800 bg-zinc-950 p-3">
            <p className="text-xs text-zinc-500">状态</p>
            <p>{proposal.status}</p>
          </div>
        </div>

        <div className="rounded-md border border-zinc-800 bg-zinc-950 p-3 text-sm">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <p className="text-xs text-zinc-500">当前 Governor clock</p>
              <p className="font-mono">
                {governorClockLoading ? "读取中..." : governorClock.clock.toString()}
              </p>
            </div>
            <div>
              <p className="text-xs text-zinc-500">Voting delay</p>
              <p className="font-mono">{governorClock.votingDelay.toString()}</p>
            </div>
            <div>
              <p className="text-xs text-zinc-500">Voting period</p>
              <p className="font-mono">{governorClock.votingPeriod.toString()}</p>
            </div>
          </div>
          {governorClock.clockMode && (
            <p className="mt-2 break-all text-xs text-zinc-500">
              CLOCK_MODE: {governorClock.clockMode}
            </p>
          )}
          {governorClockError && (
            <p className="mt-3 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-200">
              Governor clock 读取失败：{governorClockError.message}
            </p>
          )}
          {proposal.status === "Pending" && isBeforeSnapshot && (
            <p className="mt-3 rounded-md border border-yellow-500/30 bg-yellow-500/10 px-3 py-2 text-xs text-yellow-100">
              当前 clock 还没到 snapshot，所以提案仍然是 Pending。让链上时间或区块前进到 snapshot 之后，再 mine 一块，状态才会变成 Active。
            </p>
          )}
        </div>

        <VoteBar
          label="赞成票"
          value={proposal.forVotes}
          percent={forPercent}
          indicatorClassName="bg-blue-500"
        />
        <VoteBar
          label="反对票"
          value={proposal.againstVotes}
          percent={againstPercent}
          indicatorClassName="bg-red-500"
        />
        <VoteBar
          label="弃权票"
          value={proposal.abstainVotes}
          percent={abstainPercent}
          indicatorClassName="bg-zinc-500"
        />

        {!actionArgsReady && (
          <p className="rounded-md border border-yellow-500/30 bg-yellow-500/10 px-3 py-2 text-xs text-yellow-100">
            排队和执行仍需要原始 target / value / calldata / description。请在右侧填入与该 proposalId 完全一致的参数。
          </p>
        )}
      </CardContent>

      <CardFooter className="grid grid-cols-1 gap-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Button
            className="bg-blue-600 hover:bg-blue-700"
            onClick={() => onVote(1)}
            disabled={actionDisabled}
          >
            投赞成票
          </Button>
          <Button
            variant="outline"
            className="border-zinc-700 hover:bg-red-600/10 hover:text-red-300"
            onClick={() => onVote(0)}
            disabled={actionDisabled}
          >
            投反对票
          </Button>
          <Button
            variant="outline"
            className="border-zinc-700"
            onClick={() => onVote(2)}
            disabled={actionDisabled}
          >
            投弃权票
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Button
            variant="outline"
            className="border-zinc-700"
            onClick={onQueue}
            disabled={queueDisabled}
          >
            排队当前提案
          </Button>
          <Button
            variant="outline"
            className="border-zinc-700"
            onClick={onExecute}
            disabled={executeDisabled}
          >
            执行当前提案
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}

function VoteBar({
  label,
  value,
  percent,
  indicatorClassName,
}: {
  label: string;
  value: string;
  percent: number;
  indicatorClassName: string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span className="text-zinc-400">{label}</span>
        <span className="font-mono">
          {formatAmount(value)} ({percent.toFixed(2)}%)
        </span>
      </div>
      <Progress
        value={percent}
        className="h-2 bg-zinc-800"
        indicatorClassName={indicatorClassName}
      />
    </div>
  );
}
