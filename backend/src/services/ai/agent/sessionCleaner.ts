import { getDb } from "../../../config/database-better-sqlite3.js";

export class SessionCleaner {
  private intervalId: ReturnType<typeof setInterval> | null = null;

  start(): void {
    this.intervalId = setInterval(() => this.clean(), 3600000);
    this.clean();
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  clean(): void {
    try {
      const db = getDb();

      const sessionCutoff = new Date(
        Date.now() - 7 * 24 * 3600000,
      ).toISOString();
      const expiredSessions = db
        .prepare(
          "SELECT id FROM agent_sessions WHERE last_active_at < ?",
        )
        .all(sessionCutoff) as Array<{ id: string }>;

      let cleanedMessages = 0;
      let cleanedConfirmations = 0;
      let cleanedForms = 0;

      for (const session of expiredSessions) {
        const msgResult = db
          .prepare("DELETE FROM agent_messages WHERE session_id = ?")
          .run(session.id);
        cleanedMessages += msgResult.changes;

        const confResult = db
          .prepare(
            "DELETE FROM agent_pending_confirmations WHERE session_id = ?",
          )
          .run(session.id);
        cleanedConfirmations += confResult.changes;

        const formResult = db
          .prepare("DELETE FROM agent_pending_forms WHERE session_id = ?")
          .run(session.id);
        cleanedForms += formResult.changes;
      }

      const sessionResult = db
        .prepare(
          "DELETE FROM agent_sessions WHERE last_active_at < ?",
        )
        .run(sessionCutoff);

      const formCutoff = new Date(
        Date.now() - 3600000,
      ).toISOString();
      const staleConfirmations = db
        .prepare(
          "DELETE FROM agent_pending_confirmations WHERE created_at < ?",
        )
        .run(formCutoff);
      cleanedConfirmations += staleConfirmations.changes;

      const staleForms = db
        .prepare("DELETE FROM agent_pending_forms WHERE created_at < ?")
        .run(formCutoff);
      cleanedForms += staleForms.changes;

      db.prepare(
        "UPDATE agent_provider_health SET circuit_open = 0, circuit_open_until = NULL WHERE circuit_open = 1 AND circuit_open_until < datetime('now')",
      ).run();

      const totalCleaned = sessionResult.changes;
      if (totalCleaned > 0 || cleanedConfirmations > 0 || cleanedForms > 0) {
        try {
          db.prepare(
            "INSERT INTO agent_session_cleanup_log (cleaned_sessions, cleaned_messages, cleaned_confirmations, cleaned_forms) VALUES (?, ?, ?, ?)",
          ).run(
            totalCleaned,
            cleanedMessages,
            cleanedConfirmations,
            cleanedForms,
          );
        } catch {}

        console.log(
          `[SessionCleaner] 清理完成: ${totalCleaned}个过期会话, ${cleanedMessages}条消息, ${cleanedConfirmations}条确认, ${cleanedForms}条表单`,
        );
      }
    } catch (error) {
      console.error("[SessionCleaner] 清理失败:", error);
    }
  }
}

export const sessionCleaner = new SessionCleaner();
