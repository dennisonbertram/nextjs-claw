export type ToolName =
  | 'Read'
  | 'Write'
  | 'Edit'
  | 'Glob'
  | 'Grep'
  | 'Bash'
  | 'WebFetch'
  | 'WebSearch'
  | 'TodoWrite'
  | 'Task'
  | (string & {}); // fall through for anything Claude adds later

export type AgentEvent =
  | { type: 'session'; sessionId: string }
  | { type: 'text_delta'; content: string }
  | { type: 'tool_use'; id: string; name: ToolName; input: Record<string, unknown>; target?: string }
  | { type: 'tool_result'; id: string; ok: boolean; summary?: string }
  | { type: 'message_end' }
  | {
      type: 'result';
      ok: boolean;
      turns?: number;
      durationMs?: number;
      costUsd?: number;
      sessionId?: string;
    }
  | { type: 'error'; message: string };

/** Derive a short human label from a tool call's input. Used by the UI chip. */
export function summarizeToolInput(name: ToolName, input: Record<string, unknown>): string {
  const s = (k: string) => (typeof input[k] === 'string' ? (input[k] as string) : undefined);
  switch (name) {
    case 'Read':
    case 'Write':
    case 'Edit':
      return s('file_path') ?? s('path') ?? '';
    case 'Glob':
      return s('pattern') ?? '';
    case 'Grep':
      return s('pattern') ?? '';
    case 'Bash': {
      const cmd = s('command') ?? '';
      return cmd.length > 60 ? cmd.slice(0, 57) + '…' : cmd;
    }
    case 'WebFetch':
      return s('url') ?? '';
    case 'WebSearch':
      return s('query') ?? '';
    case 'TodoWrite':
      return `${(input.todos as unknown[] | undefined)?.length ?? 0} todos`;
    case 'Task':
      return s('description') ?? '';
    default:
      return '';
  }
}
