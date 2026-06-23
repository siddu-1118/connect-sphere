import { Request, Response, NextFunction } from 'express';
import { sendSecurityAlertEmail } from '../services/email';

// Throttling: Keep track of IP alerts to avoid spamming the admin email
// Store key: `${ip}_${reason}`, value: timestamp
const emailAlertCooldowns = new Map<string, number>();
const COOLDOWN_MS = 10 * 60 * 1000; // 10 minutes cooldown per alert type per IP

function shouldSendEmail(ip: string, reason: string): boolean {
  const key = `${ip}_${reason}`;
  const now = Date.now();
  const lastSent = emailAlertCooldowns.get(key);
  if (lastSent && now - lastSent < COOLDOWN_MS) {
    return false;
  }
  emailAlertCooldowns.set(key, now);
  return true;
}

export function intrusionDetection(req: Request, res: Response, next: NextFunction): void {
  const ip = (req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown').toString();
  const userAgent = req.headers['user-agent'] || 'unknown';
  const url = req.originalUrl || req.url;
  const method = req.method;

  // 1. Scan for scanner/vulnerability probing paths
  const suspiciousPaths = [
    /\.env/i,
    /\.git/i,
    /wp-admin/i,
    /wp-login/i,
    /wp-config/i,
    /phpmyadmin/i,
    /xmlrpc\.php/i,
    /websql/i,
    /\.well-known\/security\.txt/i,
    /console/i,
    /shell/i,
    /cmd\.exe/i,
    /bin\/sh/i,
  ];

  for (const pattern of suspiciousPaths) {
    if (pattern.test(url)) {
      handleIntrusion(req, res, ip, 'Malicious Scanner Path Probed', `Path matched pattern: ${pattern.toString()}`);
      return;
    }
  }

  // 2. Scan query, params, body for attack signatures (SQLi, XSS, Path Traversal)
  const payloadsToCheck = [
    { source: 'Query Parameters', data: req.query },
    { source: 'URL Parameters', data: req.params },
    { source: 'Request Body', data: req.body }
  ];

  // Regex Patterns
  const sqliPatterns = [
    /union\s+all\s+select/i,
    /union\s+select/i,
    /select\s+.*?\s+from/i,
    /insert\s+into/i,
    /update\s+.*?\s+set/i,
    /delete\s+from/i,
    /drop\s+table/i,
    /truncate\s+table/i,
    /alter\s+table/i,
    /['"]\s*or\s+['"]?\d+['"]?\s*=\s*['"]?\d+/i, // ' or 1=1
    /['"]\s*and\s+['"]?\d+['"]?\s*=\s*['"]?\d+/i, // ' and 1=1
    /--/ // SQL comment
  ];

  const xssPatterns = [
    /<script.*?>/i,
    /javascript:/i,
    /onload\s*=/i,
    /onerror\s*=/i,
    /onclick\s*=/i,
    /onmouseover\s*=/i,
    /alert\s*\(/i,
    /eval\s*\(/i,
    /document\.cookie/i,
    /window\.location/i,
    /<iframe/i,
    /<object/i,
    /<embed/i
  ];

  const pathTraversalPatterns = [
    /\.\.\//, // ../
    /\.\.\\/, // ..\
    /%2e%2e%2f/i, // encoded ../
    /%2e%2e%5c/i, // encoded ..\
    /\/etc\/passwd/i,
    /\/etc\/shadow/i,
    /c:\\windows/i,
    /win\.ini/i,
    /boot\.ini/i
  ];

  // Helper to recursively check objects for patterns
  const checkValue = (val: any): { type: string; pattern: string } | null => {
    if (typeof val === 'string') {
      // Check SQLi
      for (const pattern of sqliPatterns) {
        if (pattern.test(val)) return { type: 'SQL Injection Signature', pattern: pattern.toString() };
      }
      // Check XSS
      for (const pattern of xssPatterns) {
        if (pattern.test(val)) return { type: 'Cross-Site Scripting (XSS) Signature', pattern: pattern.toString() };
      }
      // Check Path Traversal
      for (const pattern of pathTraversalPatterns) {
        if (pattern.test(val)) return { type: 'Path Traversal Signature', pattern: pattern.toString() };
      }
    } else if (typeof val === 'object' && val !== null) {
      for (const key in val) {
        if (Object.prototype.hasOwnProperty.call(val, key)) {
          const result = checkValue(val[key]);
          if (result) return result;
        }
      }
    }
    return null;
  };

  for (const { source, data } of payloadsToCheck) {
    if (data) {
      const match = checkValue(data);
      if (match) {
        handleIntrusion(
          req,
          res,
          ip,
          match.type,
          `Detected in ${source}. Value matched pattern: ${match.pattern}\nPayload: ${JSON.stringify(data, null, 2)}`
        );
        return;
      }
    }
  }

  next();
}

async function handleIntrusion(req: Request, res: Response, ip: string, reason: string, details: string): Promise<void> {
  const url = req.originalUrl || req.url;
  const method = req.method;
  const userAgent = req.headers['user-agent'] || 'unknown';

  console.warn(`🚨 [SECURITY INTRUSION] Blocked request from IP ${ip}. Reason: ${reason}. Path: ${method} ${url}`);

  // Send email alert to admin if not throttled
  if (shouldSendEmail(ip, reason)) {
    sendSecurityAlertEmail({
      ip,
      path: url,
      method,
      reason,
      userAgent,
      details,
    }).catch(err => {
      console.error('Failed to send security alert email:', err);
    });
  }

  res.status(403).json({
    success: false,
    error: 'Access Blocked: Security Policy Violation.',
    incidentId: Date.now().toString(),
  });
}
