import { getDb } from "../../../config/database-better-sqlite3.js";
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
  createSession(userId: string, title?: string): SessionRecord {
    const db = getDb();
    const id = `session_${Date.now()}_${crypto.randomUUID().substring(0, 9)}`;
    const now = new Date().toISOString();
    db.prepare(
      `INSERT INTO agent_sessions (id, user_id, title, message_count, last_active_at, created_at)
       VALUES (?, ?, ?, 0, ?, ?)`
    ).run(id, userId, title || "", now, now);
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

  getSession(sessionId: string): SessionRecord | null {
    const db = getDb();
    return (
      (db
        .prepare("SELECT * FROM agent_sessions WHERE id = ?")
        .get(sessionId) as SessionRecord) || null
    );
  }

  getSessionsByUser(userId: string): SessionRecord[] {
    const db = getDb();
    return db
      .prepare(
        "SELECT * FROM agent_sessions WHERE user_id = ? ORDER BY last_active_at DESC LIMIT 50"
      )
      .all(userId) as SessionRecord[];
  }

  updateSessionActivity(
    sessionId: string,
    intent?: string
  ): void {
    const db = getDb();
    const now = new Date().toISOString();
    if (intent) {
      db.prepare(
        "UPDATE agent_sessions SET last_active_at = ?, last_intent = ?, message_count = message_count + 1 WHERE id = ?"
      ).run(now, intent, sessionId);
    } else {
      db.prepare(
        "UPDATE agent_sessions SET last_active_at = ?, message_count = message_count + 1 WHERE id = ?"
      ).run(now, sessionId);
    }
  }

  updateSessionTitle(sessionId: string, title: string): void {
    const db = getDb();
    db.prepare("UPDATE agent_sessions SET title = ? WHERE id = ?").run(
      title,
      sessionId
    );
  }

  deleteSession(sessionId: string): boolean {
    const db = getDb();
    const result = db.prepare("DELETE FROM agent_sessions WHERE id = ?").run(
      sessionId
    );
    return result.changes > 0;
  }

  addMessage(
    sessionId: string,
    role: MessageRecord["role"],
    content: string,
    options?: {
      intent?: string;
      toolCalls?: any[];
      toolResults?: any[];
      displayType?: string;
      metadata?: any;
    }
  ): MessageRecord {
    const db = getDb();
    const id = `msg_${Date.now()}_${crypto.randomUUID().substring(0, 9)}`;
    const now = new Date().toISOString();
    db.prepare(
      `INSERT INTO agent_messages (id, session_id, role, content, intent, tool_calls, tool_results, display_type, metadata, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      id,
      sessionId,
      role,
      content,
      options?.intent || null,
      options?.toolCalls ? JSON.stringify(options.toolCalls) : null,
      options?.toolResults ? JSON.stringify(options.toolResults) : null,
      options?.displayType || null,
      options?.metadata ? JSON.stringify(options.metadata) : null,
      now
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

  getMessages(
    sessionId: string,
    limit: number = 40
  ): MessageRecord[] {
    const db = getDb();
    return db
      .prepare(
        "SELECT * FROM agent_messages WHERE session_id = ? ORDER BY created_at ASC LIMIT ?"
      )
      .all(sessionId, limit) as MessageRecord[];
  }

  getRecentMessages(
    sessionId: string,
    count: number = 20
  ): MessageRecord[] {
    const db = getDb();
    const total = (
      db
        .prepare("SELECT COUNT(*) as cnt FROM agent_messages WHERE session_id = ?")
        .get(sessionId) as any
    ).cnt;
    const offset = Math.max(0, total - count);
    return db
      .prepare(
        "SELECT * FROM agent_messages WHERE session_id = ? ORDER BY created_at ASC LIMIT ? OFFSET ?"
      )
      .all(sessionId, count, offset) as MessageRecord[];
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
