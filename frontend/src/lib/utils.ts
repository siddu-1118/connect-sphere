/**
 * Combines CSS class names safely.
 * Simulates standard 'cn' utility without external dependencies to maximize compile-time reliability.
 */
export function cn(...inputs: (string | boolean | undefined | null | {[key: string]: boolean})[]): string {
  const classes: string[] = [];

  for (const input of inputs) {
    if (!input) continue;

    if (typeof input === 'string') {
      classes.push(input);
    } else if (typeof input === 'object') {
      for (const [key, value] of Object.entries(input)) {
        if (value) {
          classes.push(key);
        }
      }
    }
  }

  return classes.join(' ');
}

/**
 * Gets the initials of a name for profile avatars.
 * E.g. "John Doe" -> "JD"
 */
export function getInitials(name: string): string {
  if (!name) return 'CS';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Generates a consistent, visually pleasing HSL color scheme based on user ID or name string.
 * This is used for premium default profile tiles!
 */
export function getHSLColor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h = Math.abs(hash % 360);
  return `hsl(${h}, 65%, 45%)`;
}

/**
 * Custom date-formatting helper.
 */
export function formatTime(dateStr: string | Date): string {
  const date = new Date(dateStr);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function formatDate(dateStr: string | Date): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
}