/**
 * Compiler - TypeScript-to-JavaScript compilation for mudlib objects.
 *
 * Uses esbuild for fast transpilation with source map support.
 */

import * as esbuild from 'esbuild';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { dirname, resolve, join } from 'path';

export interface CompileResult {
  /** Whether compilation succeeded */
  success: boolean;
  /** The compiled JavaScript code (if success) */
  code?: string | undefined;
  /** Source map (if success and source maps enabled) */
  sourceMap?: string | undefined;
  /** Error message (if failed) */
  error?: string | undefined;
  /** Error location (if available) */
  location?: {
    file: string;
    line: number;
    column: number;
    lineText: string;
  } | undefined;
  /** All compilation errors */
  errors?: esbuild.Message[] | undefined;
  /** Compilation warnings */
  warnings?: esbuild.Message[] | undefined;
}

export interface CompilerConfig {
  /** Root directory for mudlib files */
  mudlibPath: string;
  /** Whether to generate source maps */
  sourceMaps: boolean;
  /** Target JavaScript version */
  target: string;
}

/**
 * Compiles TypeScript mudlib files to JavaScript.
 */
export class Compiler {
  private config: CompilerConfig;

  constructor(config: Partial<CompilerConfig> = {}) {
    this.config = {
      mudlibPath: config.mudlibPath ?? './mudlib',
      sourceMaps: config.sourceMaps ?? true,
      target: config.target ?? 'es2022',
    };
  }

  /**
   * Compile a single TypeScript file to JavaScript.
   * @param filePath Path to the .ts file (relative to mudlib or absolute)
   */
  async compile(filePath: string): Promise<CompileResult> {
    const absolutePath = this.resolvePath(filePath);

    if (!existsSync(absolutePath)) {
      return {
        success: false,
        error: `File not found: ${absolutePath}`,
      };
    }

    try {
      const source = await readFile(absolutePath, 'utf-8');
      return await this.compileSource(source, absolutePath);
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  /**
   * Compile TypeScript source code to JavaScript.
   * @param source The TypeScript source code
   * @param filename Optional filename for error messages
   */
  async compileSource(source: string, filename: string = 'script.ts'): Promise<CompileResult> {
    try {
      const result = await esbuild.transform(source, {
        loader: 'ts',
        target: this.config.target,
        sourcemap: this.config.sourceMaps ? 'inline' : false,
        sourcefile: filename,
        format: 'esm',
      });

      return {
        success: true,
        code: result.code,
        warnings: result.warnings.length > 0 ? result.warnings : undefined,
      };
    } catch (err) {
      if (this.isEsbuildError(err)) {
        const firstError = err.errors[0];
        return {
          success: false,
          error: firstError?.text ?? 'Compilation failed',
          location: firstError?.location
            ? {
                file: firstError.location.file,
                line: firstError.location.line,
                column: firstError.location.column,
                lineText: firstError.location.lineText,
              }
            : undefined,
          errors: err.errors,
          warnings: err.warnings,
        };
      }

      return {
        success: false,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  /**
   * Compile a bundle with all dependencies included.
   * @param entryPath Path to the entry .ts file
   */
  async compileBundle(entryPath: string): Promise<CompileResult> {
    const absolutePath = this.resolvePath(entryPath);

    if (!existsSync(absolutePath)) {
      return {
        success: false,
        error: `File not found: ${absolutePath}`,
      };
    }

    try {
      const result = await esbuild.build({
        entryPoints: [absolutePath],
        bundle: true,
        write: false,
        format: 'esm',
        target: this.config.target,
        sourcemap: this.config.sourceMaps ? 'inline' : false,
        platform: 'neutral',
        // Externalize driver APIs - they're provided by the sandbox
        external: ['@mudforge/efuns', '@mudforge/driver'],
      });

      const output = result.outputFiles?.[0];
      if (!output) {
        return {
          success: false,
          error: 'No output generated',
        };
      }

      return {
        success: true,
        code: output.text,
        warnings: result.warnings.length > 0 ? result.warnings : undefined,
      };
    } catch (err) {
      if (this.isEsbuildError(err)) {
        const firstError = err.errors[0];
        return {
          success: false,
          error: firstError?.text ?? 'Compilation failed',
          location: firstError?.location
            ? {
                file: firstError.location.file,
                line: firstError.location.line,
                column: firstError.location.column,
                lineText: firstError.location.lineText,
              }
            : undefined,
          errors: err.errors,
          warnings: err.warnings,
        };
      }

      return {
        success: false,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  /**
   * Resolve a path relative to mudlib directory.
   */
  private resolvePath(filePath: string): string {
    if (filePath.startsWith('/')) {
      // Absolute mudlib path like /std/object
      return join(this.config.mudlibPath, filePath + '.ts');
    }
    if (filePath.startsWith('./') || filePath.startsWith('../')) {
      // Relative path
      return resolve(filePath);
    }
    // Assume relative to mudlib
    return join(this.config.mudlibPath, filePath);
  }

  /**
   * Check if an error is an esbuild error.
   */
  private isEsbuildError(err: unknown): err is { errors: esbuild.Message[]; warnings: esbuild.Message[] } {
    return (
      typeof err === 'object' &&
      err !== null &&
      'errors' in err &&
      Array.isArray((err as { errors: unknown }).errors)
    );
  }

  /**
   * Get the mudlib path.
   */
  get mudlibPath(): string {
    return this.config.mudlibPath;
  }
}

/**
 * Format a compilation error for display.
 */
export function formatCompileError(result: CompileResult): string {
  if (result.success) {
    return 'No errors';
  }

  let message = result.error ?? 'Unknown error';

  if (result.location) {
    message = `${result.location.file}:${result.location.line}:${result.location.column}: ${message}`;
    if (result.location.lineText) {
      message += `\n  ${result.location.lineText}`;
      message += `\n  ${' '.repeat(result.location.column)}^`;
    }
  }

  return message;
}
