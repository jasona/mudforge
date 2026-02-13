import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdir, rm, writeFile } from 'fs/promises';
import { join } from 'path';
import { MudlibLoader, resetMudlibLoader } from '../../src/driver/mudlib-loader.js';
import { resetRegistry } from '../../src/driver/object-registry.js';

const TEST_MUDLIB = './test-mudlib-loader';

describe('MudlibLoader', () => {
  beforeEach(async () => {
    resetMudlibLoader();
    resetRegistry();
    await rm(TEST_MUDLIB, { recursive: true, force: true });
    await mkdir(join(TEST_MUDLIB, 'std'), { recursive: true });
    await writeFile(
      join(TEST_MUDLIB, 'std', 'dummy.ts'),
      `
export default class DummyObject {
  objectPath = '';
  objectId = '';
  _setupAsBlueprint(path) {
    this.objectPath = path;
    this.objectId = path;
  }
  async onCreate() {}
}
`,
      'utf-8'
    );
  });

  afterEach(async () => {
    resetMudlibLoader();
    resetRegistry();
    await rm(TEST_MUDLIB, { recursive: true, force: true });
  });

  it('loads and instantiates a mudlib object', async () => {
    const loader = new MudlibLoader({ mudlibPath: TEST_MUDLIB });
    const obj = await loader.loadObject('/std/dummy');
    expect((obj as { objectPath: string }).objectPath).toBe('/std/dummy');
  });
});
