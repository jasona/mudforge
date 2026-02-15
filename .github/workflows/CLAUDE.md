# .github/workflows/ - CI/CD Pipeline

## ci.yml

Triggers: PRs and pushes to main/master/v1.9.2

### quality job (ubuntu-latest, Node 22)
```
npm ci → npm run typecheck → npm run lint → npm test → npm run build
```

### coverage job (ubuntu-latest, Node 22)
```
npm ci → npm run test:coverage
```

## audit.yml

Runs `npm run audit` (scripts/audit/check.mjs). Enforces code quality baselines:
- Circular dependency count must not increase
- `any` type usage count checked against baseline
- Critical file sizes checked against bounds
- Known cycles (efun-bridge ↔ mudlib-loader) must stay broken
