# Tests Directory

All application tests organized by type.

## Structure

- **unit/**: Unit tests for individual functions/components
- **integration/**: Integration tests for feature workflows
- **e2e/**: End-to-end tests with Playwright

## Test Coverage Goals

- Business logic: 90%+
- UI components: 70%+
- Overall: 80%+

## Guidelines

1. Test behavior, not implementation
2. Use descriptive test names
3. Follow AAA pattern (Arrange, Act, Assert)
4. Mock external dependencies
5. Keep tests fast and isolated

## Running Tests

```bash
npm run test              # Run all tests
npm run test:ui           # Open Vitest UI
npm run test:coverage     # Generate coverage report
```
