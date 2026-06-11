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
import { Progress } from "@/components/ui/progress";
import { useGovernorClock, useProposals } from "@/hooks/useContractData";
import {
  formatAmount,
  shortenAddress,
  shortenId,
  statusClassName,
  toNumber,
} from "./utils";
import { useState } from "react";

type ProposalCardProps = {
  proposalId: bigint;
  actionArgsReady: boolean;
  governancePending: boolean;
  onVote: (support: 0 | 1 | 2) => void;
  onQueue: () => void;
  onExecute: () => void;
};

export function ProposalCard({
  proposalId,
  actionArgsReady,
  governancePending,
  onVote,
  onQueue,
  onExecute,
}: ProposalCardProps) {
  const [copiedProposalId, setCopiedProposalId] = useState(false);
  const proposalQuery = useProposals([proposalId]);
  const governorClock = useGovernorClock();
  const proposal = proposalQuery.data[0];

  if (proposalQuery.isLoading) {
    return (
      <Card className="bg-zinc-900 border-zinc-800">
        <CardContent className="py-10 text-zinc-400">
          正在读取提案...
        </CardContent>
      </Card>
    );
  }

  if (proposalQuery.isError || !proposal?.exists) {
    return (
      <Card className="bg-zinc-900 border-zinc-800">
        <CardContent className="space-y-3 py-10 text-red-300">
          <p>没有读取到这个 proposalId 的链上提案。</p>
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

  const actionDisabled = governancePending || !proposal.exists;
  const queueDisabled = actionDisabled || !actionArgsReady;
  const executeDisabled = actionDisabled || !actionArgsReady;
  const isBeforeSnapshot = governorClock.data.clock < proposal.snapshot;
  const totalVotes =
    toNumber(proposal.forVotes) +
    toNumber(proposal.againstVotes) +
    toNumber(proposal.abstainVotes);
  const forPercent =
    totalVotes > 0 ? (toNumber(proposal.forVotes) / totalVotes) * 100 : 0;
  const againstPercent =
    totalVotes > 0 ? (toNumber(proposal.againstVotes) / totalVotes) * 100 : 0;
  const abstainPercent =
    totalVotes > 0 ? (toNumber(proposal.abstainVotes) / totalVotes) * 100 : 0;

  const handleCopyProposalId = async () => {
    await navigator.clipboard.writeText(proposalId.toString());
    setCopiedProposalId(true);
    window.setTimeout(() => setCopiedProposalId(false), 1500);
  };

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
              onClick={handleCopyProposalId}
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
          <Metric label="Snapshot" value={proposal.snapshot.toString()} />
          <Metric label="Deadline" value={proposal.deadline.toString()} />
          <Metric label="状态" value={proposal.status} />
        </div>

        <div className="rounded-md border border-zinc-800 bg-zinc-950 p-3 text-sm">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <p className="text-xs text-zinc-500">当前 Governor clock</p>
              <p className="font-mono">
                {governorClock.isLoading
                  ? "读取中..."
                  : governorClock.data.clock.toString()}
              </p>
            </div>
            <div>
              <p className="text-xs text-zinc-500">Voting delay</p>
              <p className="font-mono">
                {governorClock.data.votingDelay.toString()}
              </p>
            </div>
            <div>
              <p className="text-xs text-zinc-500">Voting period</p>
              <p className="font-mono">
                {governorClock.data.votingPeriod.toString()}
              </p>
            </div>
          </div>

          {governorClock.data.clockMode && (
            <p className="mt-2 break-all text-xs text-zinc-500">
              CLOCK_MODE: {governorClock.data.clockMode}
            </p>
          )}
          {governorClock.error && (
            <p className="mt-3 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-200">
              Governor clock 读取失败：{governorClock.error.message}
            </p>
          )}
          {proposal.status === "Pending" && isBeforeSnapshot && (
            <p className="mt-3 rounded-md border border-yellow-500/30 bg-yellow-500/10 px-3 py-2 text-xs text-yellow-100">
              当前 clock 还没到 snapshot，所以提案仍然是 Pending。让链上时间或区块前进到
              snapshot 之后，再 mine 一块，状态才会变成 Active。
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
            排队和执行仍需要原始 target / value / calldata /
            description。请在右侧填入与该 proposalId 完全一致的参数。
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

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-zinc-800 bg-zinc-950 p-3">
      <p className="text-xs text-zinc-500">{label}</p>
      <p className="break-all font-mono">{value}</p>
    </div>
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
