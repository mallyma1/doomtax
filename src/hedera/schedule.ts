import { AgentMode } from '@hashgraph/hedera-agent-kit';
import { coreAccountPlugin } from '@hashgraph/hedera-agent-kit/plugins';
import { PENDING } from '../lib/charity';
import { getHederaClient } from './client';

// Same result shape as consensus.ts: BaseTool.execute() never throws, a
// failed call returns { raw: { error }, humanMessage } instead.
type ToolResult = { raw: Record<string, unknown> & { error?: string }; humanMessage: string };

function accountTool(name: string) {
  const context = {
    accountId: process.env.HEDERA_ACCOUNT_ID,
    mode: AgentMode.AUTONOMOUS,
  };
  const tool = coreAccountPlugin.tools(context).find((t) => t.name === name);
  if (!tool) throw new Error(`Account tool "${name}" not found in coreAccountPlugin`);
  return { tool, context };
}

function assertToolSucceeded(result: ToolResult, action: string): void {
  if (result.raw.error) {
    throw new Error(`${action} failed: ${result.raw.error}`);
  }
}

export type ArmForfeitInput = {
  sourceAccountId: string;
  amountHbar: number;
  /** ISO 8601. HIP-423's scheduled-transaction window maxes out at two months from now. */
  expirationTime: string;
  sessionId: string;
};

/**
 * Pre-arms the forfeit at session start: a scheduled HBAR transfer to the
 * pending account that executes only at expirationTime (waitForExpiry),
 * never on signature collection, which is the HIP-423 trap the handover
 * calls out. adminKey is set to the operator so disarmForfeit can delete
 * it before it fires. Finishing a session before expiry means calling
 * disarmForfeit; this function alone does not move any funds.
 */
export async function armForfeit(input: ArmForfeitInput): Promise<string> {
  const client = getHederaClient();
  const { tool, context } = accountTool('Transfer HBAR');

  const result = (await tool.execute(client, context, {
    transfers: [{ accountId: PENDING.accountId, amount: input.amountHbar }],
    sourceAccountId: input.sourceAccountId,
    transactionMemo: `doomtax:${input.sessionId}:armed`,
    schedulingParams: {
      isScheduled: true,
      waitForExpiry: true,
      adminKey: true,
      expirationTime: input.expirationTime,
    },
  })) as ToolResult;
  assertToolSucceeded(result, 'armForfeit');

  const scheduleId = result.raw.scheduleId;
  if (!scheduleId) {
    throw new Error('armForfeit: transfer succeeded but no scheduleId was returned');
  }
  return scheduleId.toString();
}

/** Disarms a session before settlement: deletes the pre-armed schedule so it never fires. */
export async function disarmForfeit(scheduleId: string): Promise<void> {
  const client = getHederaClient();
  const { tool, context } = accountTool('Delete Scheduled Transaction');
  const result = (await tool.execute(client, context, { scheduleId })) as ToolResult;
  assertToolSucceeded(result, 'disarmForfeit');
}
