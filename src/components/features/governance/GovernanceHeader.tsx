import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { parseBigIntInput } from "./utils";
import { useEffect, useMemo, useState } from "react";

type GovernanceHeaderProps = {
  selectedProposalId: bigint;
  onQueryProposal: (proposalId: bigint) => void;
};

export function GovernanceHeader({
  selectedProposalId,
  onQueryProposal,
}: GovernanceHeaderProps) {
  const [proposalIdInput, setProposalIdInput] = useState(
    selectedProposalId.toString(),
  );
  const proposalIdToQuery = useMemo(
    () => parseBigIntInput(proposalIdInput),
    [proposalIdInput],
  );

  useEffect(() => {
    setProposalIdInput(selectedProposalId.toString());
  }, [selectedProposalId]);

  return (
    <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <h1 className="text-4xl font-bold tracking-tight">议会治理</h1>
        <p className="mt-2 text-zinc-400">
          查询链上提案、发起新提案、投票，并通过 Timelock
          排队和执行已通过的提案。
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
          onClick={() => {
            if (proposalIdToQuery !== undefined && proposalIdToQuery >= 0n) {
              onQueryProposal(proposalIdToQuery);
            }
          }}
          disabled={proposalIdToQuery === undefined}
        >
          查询提案
        </Button>
      </div>
    </div>
  );
}
