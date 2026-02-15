# tests/ - Test Suite (70 test files, vitest)

## Structure

```
tests/
├── driver/              (12 files) - Core driver tests
│   ├── efun-bridge/     (21 files) - All ~50+ efun API tests
│   └── persistence/     (3 files)  - Serialization/loading
├── mudlib/              (22 files) - Game object class tests
├── daemons/             (1 file)   - Help daemon test
├── isolation/           (2 files)  - V8 isolate pool and sandbox
├── network/             (4 files)  - WebSocket, sessions, protocol
├── client/              (1 file)   - Browser IDE editor
├── integration/         (4 files)  - End-to-end workflows
└── helpers/             (1 file)   - Shared test utilities
```

## Running Tests

```bash
npm test                                      # All tests
npm run test:watch                            # Watch mode
npx vitest tests/driver/driver.test.ts        # Single file
npx vitest -t "should initialize"             # Pattern match
npm run test:coverage                         # With coverage
```

## Test Utilities (tests/helpers/efun-test-utils.ts)

```typescript
createTestEnvironment()     // Isolated env with temp mudlib + cleanup
createMockPlayer(path, opts) // Mock player with receivedMessages tracking
createMockConnection()      // Mock connection with sentMessages array
stripAnsi(), stripColorTokens() // Text normalization for assertions
resetRegistry, resetScheduler, resetEfunBridge, resetMudlibLoader, resetPermissions
```

## Setup Pattern

```typescript
beforeEach(async () => {
  resetDriver();
  testMudlibPath = join(process.cwd(), `test-mudlib-${randomUUID()}`);
  await mkdir(testMudlibPath, { recursive: true });
});
afterEach(async () => {
  resetDriver();
  await rm(testMudlibPath, { recursive: true, force: true });
});
```

## Mocking Strategy

Direct class-based mocks (no external mocking libraries). MockWebSocket extends EventEmitter. State tracked in public arrays.

## Known Issues

- `efun-bridge.test.ts` "should prevent path traversal with absolute paths" fails on Linux (Windows path test)
- Lint errors exist in `shadow-registry.test.ts`, `shadow.test.ts` (pre-existing)
