import { AgentMode } from '@hashgraph/hedera-agent-kit';
import { coreConsensusPlugin } from '@hashgraph/hedera-agent-kit/plugins';
import { getHederaClient } from './client';

/**
 * Hard constraint: HCS is public and permanent. This type is the only
 * shape allowed onto the topic. No intention text, no artifact content,
 * no coaching messages, no identity links, ever.
 */
export type SessionRecord = {
  sessionId: string;
  commitmentHash: string;
  verdict: boolean;
  amountTinybar: number;
  timestamp: number;
};

function consensusTool(name: string) {
  const context = {
    accountId: process.env.HEDERA_ACCOUNT_ID,
    mode: AgentMode.AUTONOMOUS,
  };
  const tool = coreConsensusPlugin.tools(context).find((t) => t.name === name);
  if (!tool) throw new Error(`Consensus tool "${name}" not found in coreConsensusPlugin`);
  return { tool, context };
}

// BaseTool.execute() never throws: a failed transaction returns
// { raw: { error }, humanMessage } instead. Every call site must check
// raw.error explicitly rather than relying on try/catch.
type ToolResult = { raw: Record<string, unknown> & { error?: string }; humanMessage: string };

function assertToolSucceeded(result: ToolResult, action: string): void {
  if (result.raw.error) {
    throw new Error(`${action} failed: ${result.raw.error}`);
  }
}

/** Run once. Persist the returned topic ID as HEDERA_HCS_TOPIC_ID. */
export async function createSessionTopic(): Promise<string> {
  const client = getHederaClient();
  const { tool, context } = consensusTool('Create Topic');
  const result = (await tool.execute(client, context, {
    topicMemo: 'doomtax session records: hash, verdict, amount, timestamp only',
  })) as ToolResult;
  assertToolSucceeded(result, 'createSessionTopic');
  return result.raw.topicId as string;
}

export async function submitSessionRecord(record: SessionRecord): Promise<string> {
  const topicId = process.env.HEDERA_HCS_TOPIC_ID;
  if (!topicId) throw new Error('HEDERA_HCS_TOPIC_ID is not set');

  const client = getHederaClient();
  const { tool, context } = consensusTool('Submit Topic Message');
  const result = (await tool.execute(client, context, {
    topicId,
    message: JSON.stringify(record),
  })) as ToolResult;
  assertToolSucceeded(result, 'submitSessionRecord');
  return result.raw.transactionId as string;
}
