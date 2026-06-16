import { query, execute } from "../../../config/database-adapter.js";
import crypto from "node:crypto";

export interface SessionRecord {
  id: string;
  user_id: string;
  title: string;
  message_count: number;
  last_intent: string | null;
  last_active_at: string;
  created_at: string;
}

export interface MessageRecord {
  id: string;
  session_id: string;
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  intent: string | null;
  tool_calls: string | null;
  tool_results: string | null;
  display_type: string | null;
  metadata: string | null;
  created_at: string;
}

export class SessionStore {
  async createSession(userId: string, title?: string): Promise<SessionRecord> {
    const id = `session_${Date.now()}_${crypto.randomUUID().substring(0, 9)}`;
    const now = new Date().toISOString();
    await execute(
      `INSERT INTO agent_sessions (id, user_id, title, message_count, last_active_at, created_at)
       VALUES (?, ?, ?, 0, ?, ?)`,
      [id, userId, title || "", now, now]
    );
    return {
      id,
      user_id: userId,
      title: title || "",
      message_count: 0,
      last_intent: null,
      last_active_at: now,
      created_at: now,
    };
  }

  async getSession(sessionId: string): Promise<SessionRecord | null> {
    const result = await query<SessionRecord[]>(
      "SELECT * FROM agent_sessions WHERE id = ?",
      [sessionId]
    );
    return result.rows[0] || null;
  }

  async getSessionsByUser(userId: string): Promise<SessionRecord[]> {
    const result = await query<SessionRecord[]>(
      "SELECT * FROM agent_sessions WHERE user_id = ? ORDER BY last_active_at DESC LIMIT 50",
      [userId]
    );
    return result.rows;
  }

  async updateSessionActivity(sessionId: string, intent?: string): Promise<void> {
    const now = new Date().toISOString();
    if (intent) {
      await execute(
        "UPDATE agent_sessions SET last_active_at = ?, last_intent = ?, message_count = message_count + 1 WHERE id = ?",
        [now, intent, sessionId]
      );
    } else {
      await execute(
        "UPDATE agent_sessions SET last_active_at = ?, message_count = message_count + 1 WHERE id = ?",
        [now, sessionId]
      );
    }
  }

  async updateSessionTitle(sessionId: string, title: string): Promise<void> {
    await execute("UPDATE agent_sessions SET title = ? WHERE id = ?", [title, sessionId]);
  }

  async deleteSession(sessionId: string): Promise<boolean> {
    await execute("DELETE FROM agent_messages WHERE session_id = ?", [sessionId]);
    await execute("DELETE FROM agent_pending_confirmations WHERE session_id = ?", [sessionId]);
    const result = await execute("DELETE FROM agent_sessions WHERE id = ?", [sessionId]);
    return result.changes > 0;
  }

  async addMessage(
    sessionId: string,
    role: MessageRecord["role"],
    content: string,
    options?: {
      intent?: string;
      toolCalls?: unknown[];
      toolResults?: unknown[];
      displayType?: string;
      metadata?: unknown;
    }
  ): Promise<MessageRecord> {
    const id = `msg_${Date.now()}_${crypto.randomUUID().substring(0, 9)}`;
    const now = new Date().toISOString();
    await execute(
      `INSERT INTO agent_messages (id, session_id, role, content, intent, tool_calls, tool_results, display_type, metadata, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id, sessionId, role, content,
        options?.intent || null,
        options?.toolCalls ? JSON.stringify(options.toolCalls) : null,
        options?.toolResults ? JSON.stringify(options.toolResults) : null,
        options?.displayType || null,
        options?.metadata ? JSON.stringify(options.metadata) : null,
        now,
      ]
    );
    return {
      id,
      session_id: sessionId,
      role,
      content,
      intent: options?.intent || null,
      tool_calls: options?.toolCalls ? JSON.stringify(options.toolCalls) : null,
      tool_results: options?.toolResults ? JSON.stringify(options.toolResults) : null,
      display_type: options?.displayType || null,
      metadata: options?.metadata ? JSON.stringify(options.metadata) : null,
      created_at: now,
    };
  }

  async getMessages(sessionId: string, limit: number = 40): Promise<MessageRecord[]> {
    const result = await query<MessageRecord[]>(
      "SELECT * FROM agent_messages WHERE session_id = ? ORDER BY created_at ASC LIMIT ?",
      [sessionId, limit]
    );
    return result.rows;
  }

  async getRecentMessages(sessionId: string, count: number = 20): Promise<MessageRecord[]> {
    const countResult = await query<Array<{ cnt: number }>>(
      "SELECT COUNT(*) as cnt FROM agent_messages WHERE session_id = ?",
      [sessionId]
    );
    const total = countResult.rows[0]?.cnt || 0;
    const offset = Math.max(0, total - count);
    const result = await query<MessageRecord[]>(
      "SELECT * FROM agent_messages WHERE session_id = ? ORDER BY created_at ASC LIMIT ? OFFSET ?",
      [sessionId, count, offset]
    );
    return result.rows;
  }

  messagesToChatHistory(
    messages: MessageRecord[]
  ): Array<{ role: string; content: string }> {
    return messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));
  }
}

export const sessionStore = new SessionStore();
