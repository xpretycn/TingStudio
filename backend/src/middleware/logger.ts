import { Request, Response, NextFunction } from 'express';

interface LogEntry {
  timestamp: string;
  method: string;
  path: string;
  statusCode?: number;
  duration?: number;
  userId?: string;
  ip?: string;
}

const logEntries: LogEntry[] = [];
const MAX_LOG_ENTRIES = 1000;

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();
  
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    method: req.method,
    path: req.path,
    userId: (req as any)?.user?.userId || 'anonymous',
    ip: req.ip || req.socket.remoteAddress || 'unknown',
  };

  res.on('finish', () => {
    entry.statusCode = res.statusCode;
    entry.duration = Date.now() - start;

    logEntries.push(entry);
    
    if (logEntries.length > MAX_LOG_ENTRIES) {
      logEntries.shift();
    }

    const logLevel = entry.statusCode! >= 400 ? 'WARN' : 'INFO';
    console.log(
      `[${logLevel}] ${entry.timestamp} - ${entry.method} ${entry.path} - ${entry.statusCode} (${entry.duration}ms) - User:${entry.userId}`
    );
  });

  next();
}

export function getRecentLogs(limit: number = 50): LogEntry[] {
  return logEntries.slice(-limit);
}

export function clearLogs(): void {
  logEntries.length = 0;
}
