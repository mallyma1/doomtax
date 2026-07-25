/**
 * Long-memory coach — M3 / paid tier via 0G Storage.
 * Stub only for now. Free tier returns a verdict; paid tier persists
 * session history for pattern-aware coaching.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function saveSessionMemory(_sessionId: string, _verdict: 'kept' | 'slipped'): Promise<void> {
  // no-op until 0G Storage integration lands
}
