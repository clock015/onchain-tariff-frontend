import Layout from "@/components/Layout";
import { GovernanceHeader } from "@/components/features/governance/GovernanceHeader";
import { ProposalCard } from "@/components/features/governance/ProposalCard";
import { ProposalParamsPanel } from "@/components/features/governance/ProposalParamsPanel";
import { type ProposalActionArgs } from "@/components/features/governance/utils";
import { useGovernanceTransaction } from "@/hooks/useGovernanceTransaction";
import { type Address, type Hex } from "viem";
import { useEffect, useState } from "react";

export default function GovPage() {
  const [selectedProposalId, setSelectedProposalId] = useState(1n);
  const [actionArgs, setActionArgs] = useState<ProposalActionArgs>();
  const [pendingCreatedProposalId, setPendingCreatedProposalId] = useState<
    bigint | undefined
  >();

  const governance = useGovernanceTransaction();

  useEffect(() => {
    if (!governance.isSuccess || pendingCreatedProposalId === undefined) {
      return;
    }

    setSelectedProposalId(pendingCreatedProposalId);
    setPendingCreatedProposalId(undefined);
  }, [governance.isSuccess, pendingCreatedProposalId]);

  const handleUsePreviewId = (proposalId: bigint) => {
    setSelectedProposalId(proposalId);
  };

  const handlePropose = ({
    target,
    value,
    calldata,
    description,
    previewProposalId,
  }: {
    target: Address;
    value: bigint;
    calldata: Hex;
    description: string;
    previewProposalId?: bigint;
  }) => {
    setPendingCreatedProposalId(previewProposalId);
    governance.propose({
      target,
      value,
      calldata,
      description,
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

  return (
    <Layout>
      <GovernanceHeader
        selectedProposalId={selectedProposalId}
        onQueryProposal={setSelectedProposalId}
      />

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
          actionArgsReady={Boolean(actionArgs)}
          governancePending={governance.isPending}
          onVote={handleVote}
          onQueue={handleQueue}
          onExecute={handleExecute}
        />

        <ProposalParamsPanel
          isGovernancePending={governance.isPending}
          onActionArgsChange={setActionArgs}
          onUsePreviewId={handleUsePreviewId}
          onPropose={handlePropose}
        />
      </div>
    </Layout>
  );
}
