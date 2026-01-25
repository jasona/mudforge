/**
 * Tests for file system efuns.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestEnvironment, createMockPlayer } from '../../helpers/efun-test-utils.js';
import type { EfunBridge } from '../../../src/driver/efun-bridge.js';
import { getPermissions } from '../../../src/driver/permissions.js';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

describe('File Efuns', () => {
  let efunBridge: EfunBridge;
  let testMudlibPath: string;
  let cleanup: () => Promise<void>;

  beforeEach(async () => {
    const env = await createTestEnvironment();
    efunBridge = env.efunBridge;
    testMudlibPath = env.testMudlibPath;
    cleanup = env.cleanup;

    // Set up admin context for file operations
    const adminPlayer = createMockPlayer('/players/admin', { name: 'admin', level: 3 });
    efunBridge.setContext({ thisPlayer: adminPlayer, thisObject: adminPlayer });
    // Register admin permission level with the permissions system
    getPermissions().setLevel('admin', 3);
  });

  afterEach(async () => {
    await cleanup();
  });

  describe('readFile', () => {
    it('should read file contents', async () => {
      await writeFile(join(testMudlibPath, 'test.txt'), 'Hello, World!');

      const content = await efunBridge.readFile('/test.txt');

      expect(content).toBe('Hello, World!');
    });

    it('should read nested file', async () => {
      await mkdir(join(testMudlibPath, 'subdir'), { recursive: true });
      await writeFile(join(testMudlibPath, 'subdir/nested.txt'), 'Nested content');

      const content = await efunBridge.readFile('/subdir/nested.txt');

      expect(content).toBe('Nested content');
    });

    it('should throw on non-existent file', async () => {
      await expect(efunBridge.readFile('/nonexistent.txt')).rejects.toThrow();
    });
  });

  describe('writeFile', () => {
    it('should write file contents', async () => {
      await efunBridge.writeFile('/output.txt', 'Test content');

      const content = await efunBridge.readFile('/output.txt');
      expect(content).toBe('Test content');
    });

    it('should create parent directories', async () => {
      await efunBridge.writeFile('/deep/nested/path/file.txt', 'Nested');

      const content = await efunBridge.readFile('/deep/nested/path/file.txt');
      expect(content).toBe('Nested');
    });

    it('should overwrite existing file', async () => {
      await efunBridge.writeFile('/overwrite.txt', 'Original');
      await efunBridge.writeFile('/overwrite.txt', 'Updated');

      const content = await efunBridge.readFile('/overwrite.txt');
      expect(content).toBe('Updated');
    });
  });

  describe('fileExists', () => {
    it('should return true for existing file', async () => {
      await efunBridge.writeFile('/exists.txt', 'content');

      expect(await efunBridge.fileExists('/exists.txt')).toBe(true);
    });

    it('should return false for non-existing file', async () => {
      expect(await efunBridge.fileExists('/notexists.txt')).toBe(false);
    });

    it('should return true for existing directory', async () => {
      await mkdir(join(testMudlibPath, 'testdir'), { recursive: true });

      expect(await efunBridge.fileExists('/testdir')).toBe(true);
    });
  });

  describe('readDir', () => {
    it('should list directory contents', async () => {
      await efunBridge.writeFile('/dir/file1.txt', 'a');
      await efunBridge.writeFile('/dir/file2.txt', 'b');

      const files = await efunBridge.readDir('/dir');

      expect(files).toContain('file1.txt');
      expect(files).toContain('file2.txt');
    });

    it('should throw on non-existent directory', async () => {
      await expect(efunBridge.readDir('/nonexistent')).rejects.toThrow();
    });

    it('should list subdirectories', async () => {
      await mkdir(join(testMudlibPath, 'parent/child'), { recursive: true });

      const contents = await efunBridge.readDir('/parent');

      expect(contents).toContain('child');
    });
  });

  describe('fileStat', () => {
    it('should return stats for file', async () => {
      await efunBridge.writeFile('/statfile.txt', 'content');

      const stat = await efunBridge.fileStat('/statfile.txt');

      expect(stat.isFile).toBe(true);
      expect(stat.isDirectory).toBe(false);
      expect(stat.size).toBe(7); // 'content'.length
      expect(stat.mtime).toBeInstanceOf(Date);
    });

    it('should return stats for directory', async () => {
      await mkdir(join(testMudlibPath, 'statdir'), { recursive: true });

      const stat = await efunBridge.fileStat('/statdir');

      expect(stat.isFile).toBe(false);
      expect(stat.isDirectory).toBe(true);
    });

    it('should throw on non-existent path', async () => {
      await expect(efunBridge.fileStat('/nonexistent')).rejects.toThrow();
    });
  });

  describe('makeDir', () => {
    it('should create directory', async () => {
      await efunBridge.makeDir('/newdir');

      expect(await efunBridge.fileExists('/newdir')).toBe(true);
      const stat = await efunBridge.fileStat('/newdir');
      expect(stat.isDirectory).toBe(true);
    });

    it('should create nested directories with recursive flag', async () => {
      await efunBridge.makeDir('/a/b/c', true);

      expect(await efunBridge.fileExists('/a/b/c')).toBe(true);
    });

    it('should throw without recursive flag for nested path', async () => {
      await expect(efunBridge.makeDir('/x/y/z')).rejects.toThrow();
    });
  });

  describe('removeDir', () => {
    it('should remove empty directory', async () => {
      await efunBridge.makeDir('/removeme');
      // Note: Node's rm() requires recursive flag for directories
      await efunBridge.removeDir('/removeme', true);

      expect(await efunBridge.fileExists('/removeme')).toBe(false);
    });

    it('should remove directory with contents recursively', async () => {
      await efunBridge.makeDir('/removerecursive', true);
      await efunBridge.writeFile('/removerecursive/file.txt', 'data');

      await efunBridge.removeDir('/removerecursive', true);

      expect(await efunBridge.fileExists('/removerecursive')).toBe(false);
    });

    it('should throw for non-empty directory without recursive flag', async () => {
      await efunBridge.makeDir('/nonempty');
      await efunBridge.writeFile('/nonempty/file.txt', 'data');

      await expect(efunBridge.removeDir('/nonempty')).rejects.toThrow();
    });
  });

  describe('removeFile', () => {
    it('should remove file', async () => {
      await efunBridge.writeFile('/removefile.txt', 'data');
      await efunBridge.removeFile('/removefile.txt');

      expect(await efunBridge.fileExists('/removefile.txt')).toBe(false);
    });

    it('should throw for directory', async () => {
      await efunBridge.makeDir('/isdir');

      await expect(efunBridge.removeFile('/isdir')).rejects.toThrow('Is a directory');
    });

    it('should throw for non-existent file', async () => {
      await expect(efunBridge.removeFile('/nope.txt')).rejects.toThrow();
    });
  });

  describe('moveFile', () => {
    it('should move file', async () => {
      await efunBridge.writeFile('/source.txt', 'data');
      await efunBridge.moveFile('/source.txt', '/dest.txt');

      expect(await efunBridge.fileExists('/source.txt')).toBe(false);
      expect(await efunBridge.fileExists('/dest.txt')).toBe(true);
      expect(await efunBridge.readFile('/dest.txt')).toBe('data');
    });

    it('should rename file', async () => {
      await efunBridge.writeFile('/oldname.txt', 'content');
      await efunBridge.moveFile('/oldname.txt', '/newname.txt');

      expect(await efunBridge.fileExists('/oldname.txt')).toBe(false);
      expect(await efunBridge.readFile('/newname.txt')).toBe('content');
    });

    it('should move to different directory', async () => {
      await efunBridge.writeFile('/moveme.txt', 'content');
      await efunBridge.makeDir('/target');
      await efunBridge.moveFile('/moveme.txt', '/target/moved.txt');

      expect(await efunBridge.fileExists('/moveme.txt')).toBe(false);
      expect(await efunBridge.readFile('/target/moved.txt')).toBe('content');
    });

    it('should create destination directory if needed', async () => {
      await efunBridge.writeFile('/src.txt', 'data');
      await efunBridge.moveFile('/src.txt', '/newdir/dest.txt');

      expect(await efunBridge.readFile('/newdir/dest.txt')).toBe('data');
    });
  });

  describe('copyFileTo', () => {
    it('should copy file', async () => {
      await efunBridge.writeFile('/original.txt', 'content');
      await efunBridge.copyFileTo('/original.txt', '/copy.txt');

      expect(await efunBridge.fileExists('/original.txt')).toBe(true);
      expect(await efunBridge.fileExists('/copy.txt')).toBe(true);
      expect(await efunBridge.readFile('/copy.txt')).toBe('content');
    });

    it('should create destination directory if needed', async () => {
      await efunBridge.writeFile('/src.txt', 'data');
      await efunBridge.copyFileTo('/src.txt', '/copydir/copied.txt');

      expect(await efunBridge.readFile('/copydir/copied.txt')).toBe('data');
    });

    it('should throw for directory source', async () => {
      await efunBridge.makeDir('/copydir');

      await expect(efunBridge.copyFileTo('/copydir', '/dest')).rejects.toThrow('Is a directory');
    });
  });

  describe('path traversal protection', () => {
    it('should prevent path traversal with ../', async () => {
      await expect(efunBridge.readFile('../../../etc/passwd')).rejects.toThrow(
        'Path traversal attempt detected'
      );
    });

    it('should prevent path traversal in write', async () => {
      await expect(efunBridge.writeFile('../../outside.txt', 'bad')).rejects.toThrow(
        'Path traversal attempt detected'
      );
    });

    it('should prevent absolute path outside mudlib', async () => {
      await expect(efunBridge.readFile('/etc/passwd')).rejects.toThrow();
    });

    it('should allow valid nested paths', async () => {
      await efunBridge.writeFile('/valid/nested/path.txt', 'ok');
      const content = await efunBridge.readFile('/valid/nested/path.txt');
      expect(content).toBe('ok');
    });
  });
});
