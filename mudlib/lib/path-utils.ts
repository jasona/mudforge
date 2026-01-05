/**
 * Path utilities for builder file system commands.
 *
 * Provides path resolution and normalization for in-game file operations.
 */

/**
 * Normalize a path by resolving . and .. components.
 * @param path The path to normalize
 * @returns Normalized absolute path starting with /
 */
export function normalizePath(path: string): string {
  // Handle empty path
  if (!path || path === '') return '/';

  // Split into parts
  const parts = path.split('/').filter((p) => p !== '' && p !== '.');
  const result: string[] = [];

  for (const part of parts) {
    if (part === '..') {
      // Go up one level (pop if possible)
      if (result.length > 0) {
        result.pop();
      }
    } else {
      result.push(part);
    }
  }

  return '/' + result.join('/');
}

/**
 * Resolve a path relative to a current working directory.
 * @param cwd Current working directory (absolute path starting with /)
 * @param path Path to resolve (can be relative or absolute)
 * @returns Resolved absolute path
 */
export function resolvePath(cwd: string, path: string): string {
  // Handle empty or null path
  if (!path || path.trim() === '') {
    return normalizePath(cwd);
  }

  path = path.trim();

  // Handle home directory shortcut ~
  if (path === '~') {
    return '/';
  }
  if (path.startsWith('~/')) {
    path = '/' + path.slice(2);
  }

  // If path is absolute, just normalize it
  if (path.startsWith('/')) {
    return normalizePath(path);
  }

  // Relative path - combine with cwd
  const combined = cwd.endsWith('/') ? cwd + path : cwd + '/' + path;
  return normalizePath(combined);
}

/**
 * Get the parent directory of a path.
 * @param path The path
 * @returns Parent directory path
 */
export function dirname(path: string): string {
  const normalized = normalizePath(path);
  const lastSlash = normalized.lastIndexOf('/');
  if (lastSlash <= 0) return '/';
  return normalized.slice(0, lastSlash);
}

/**
 * Get the base name (last component) of a path.
 * @param path The path
 * @returns Base name
 */
export function basename(path: string): string {
  const normalized = normalizePath(path);
  if (normalized === '/') return '';
  const lastSlash = normalized.lastIndexOf('/');
  return normalized.slice(lastSlash + 1);
}

/**
 * Join path segments together.
 * @param segments Path segments to join
 * @returns Joined path
 */
export function joinPath(...segments: string[]): string {
  return normalizePath(segments.join('/'));
}

/**
 * Check if a path is within the mudlib root (doesn't escape via ..).
 * @param path The path to check
 * @returns true if path is safe
 */
export function isSafePath(path: string): boolean {
  const normalized = normalizePath(path);
  // The path should start with / and not contain any ..
  // after normalization (which would indicate escaping root)
  return normalized.startsWith('/');
}

export default {
  normalizePath,
  resolvePath,
  dirname,
  basename,
  joinPath,
  isSafePath,
};
