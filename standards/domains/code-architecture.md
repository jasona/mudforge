---
id: CODE
name: .NET & C# Code Standards
version: 1.0.0
owner: "Engineering"
last_updated: "2026-01-02"
---

## Purpose

These standards ensure our .NET/C# codebase is readable, maintainable, testable, and consistent across all team members and projects.

## Musts (Non-Negotiable)

### Code Quality
- [CODE-1] **Follow .NET Conventions**: All code MUST follow Microsoft's .NET coding conventions and C# naming guidelines (PascalCase for public members, camelCase for private fields with underscore prefix `_fieldName`).
- [CODE-2] **Use Nullable Reference Types**: Projects MUST have nullable reference types enabled (`<Nullable>enable</Nullable>`); handle nullability explicitly.
- [CODE-3] **Small Methods**: Methods MUST be focused and single-purpose; avoid methods exceeding 30 lines unless justified.
- [CODE-4] **Async All the Way**: Async methods MUST use `async/await` consistently; never block on async code with `.Result` or `.Wait()`.
- [CODE-5] **No Magic Strings**: Configuration keys, route paths, and repeated strings MUST be constants or pulled from configuration.

### Testing
- [CODE-6] **Test Coverage**: New features MUST include unit tests using xUnit or NUnit; aim for testing public API surface and critical paths.
- [CODE-7] **Tests Must Pass**: All existing tests MUST pass before merging; do not use `[Skip]` to make builds pass.
- [CODE-8] **Test Naming**: Test methods MUST follow the pattern `MethodName_Scenario_ExpectedResult` (e.g., `CreateUser_WithValidEmail_ReturnsSuccess`).

### Error Handling
- [CODE-9] **Explicit Error Handling**: Exceptions MUST be caught and handled explicitly; no empty catch blocks or `catch (Exception) { }` without logging.

## Shoulds (Strong Recommendations)

### Design Principles
- [CODE-10] **Dependency Injection**: SHOULD use constructor injection via the built-in DI container; avoid service locator patterns.
- [CODE-11] **Interface Segregation**: SHOULD define focused interfaces; prefer `IUserReader` and `IUserWriter` over a monolithic `IUserService`.
- [CODE-12] **Immutability**: SHOULD prefer immutable types (`record`, `readonly`, `init` properties) where practical.
- [CODE-13] **CQRS-Lite**: SHOULD separate read and write operations in services; queries return data, commands return void or Result types.

### Modern C# Features
- [CODE-14] **Use Records**: SHOULD use `record` types for DTOs and value objects.
- [CODE-15] **Pattern Matching**: SHOULD use pattern matching (`is`, `switch` expressions) for type checks and conditionals.
- [CODE-16] **Collection Expressions**: SHOULD use collection expressions (`[]`) and LINQ for collection operations.
- [CODE-17] **File-Scoped Namespaces**: SHOULD use file-scoped namespaces to reduce nesting.

### Code Organization
- [CODE-18] **One Class Per File**: SHOULD have one public class/record/interface per file; exceptions for small related types.
- [CODE-19] **Folder-by-Feature**: SHOULD organize code by feature/domain rather than by technical layer when possible.

## Architecture Patterns

### Recommended Patterns
- **Clean Architecture**: Separate Domain, Application, Infrastructure, and Presentation layers
- **Repository Pattern**: Abstract data access behind repositories; use EF Core DbContext internally
- **MediatR/CQRS**: Use MediatR for command/query separation in larger applications
- **Result Pattern**: Return `Result<T>` or `OneOf<Success, Error>` instead of throwing exceptions for expected failures
- **Options Pattern**: Use `IOptions<T>` for strongly-typed configuration

### Patterns to Avoid
- **Anemic Domain Models**: Entities with only properties and no behavior
- **God Services**: Services that handle too many responsibilities
- **Static Dependencies**: Static classes that hold state or make testing difficult
- **Sync-over-Async**: Calling `.Result` or `.Wait()` on async methods

## Project Structure

```
src/
├── YourApp.Domain/           # Entities, value objects, domain logic
├── YourApp.Application/      # Use cases, commands, queries, interfaces
├── YourApp.Infrastructure/   # EF Core, external services, implementations
├── YourApp.Api/              # Controllers, middleware, DI configuration
└── YourApp.Tests/            # Unit and integration tests
```

## Examples

### Good: Modern C# with Records and Pattern Matching
```csharp
public record CreateUserCommand(string Email, string Name);

public record CreateUserResult
{
    public record Success(Guid UserId) : CreateUserResult;
    public record ValidationError(string Message) : CreateUserResult;
    public record EmailTaken() : CreateUserResult;
}

public async Task<CreateUserResult> Handle(CreateUserCommand command)
{
    if (string.IsNullOrWhiteSpace(command.Email))
        return new CreateUserResult.ValidationError("Email is required");

    var existingUser = await _userRepository.FindByEmailAsync(command.Email);
    
    return existingUser switch
    {
        not null => new CreateUserResult.EmailTaken(),
        null => await CreateAndSaveUser(command)
    };
}
```

### Bad: Legacy Style with Exceptions
```csharp
public class UserService
{
    public Guid CreateUser(string email, string name)
    {
        if (email == null) throw new ArgumentNullException();
        var existing = _db.Users.FirstOrDefault(u => u.Email == email);
        if (existing != null) throw new Exception("Email taken");
        // ... blocking database call with no async
    }
}
```

### Good: Proper Async/Await
```csharp
public async Task<User?> GetUserAsync(Guid id, CancellationToken ct = default)
{
    return await _context.Users
        .Include(u => u.Profile)
        .FirstOrDefaultAsync(u => u.Id == id, ct);
}
```

### Bad: Sync-over-Async
```csharp
public User? GetUser(Guid id)
{
    // NEVER DO THIS - causes deadlocks
    return _context.Users.FirstOrDefaultAsync(u => u.Id == id).Result;
}
```

### Good: Test Naming
```csharp
[Fact]
public async Task CreateUser_WithValidEmail_ReturnsSuccessWithUserId()
{
    // Arrange
    var command = new CreateUserCommand("test@example.com", "Test User");
    
    // Act
    var result = await _handler.Handle(command);
    
    // Assert
    var success = Assert.IsType<CreateUserResult.Success>(result);
    Assert.NotEqual(Guid.Empty, success.UserId);
}
```

## NuGet Packages (Recommended)

| Package | Purpose |
|---------|---------|
| MediatR | CQRS / command-query separation |
| FluentValidation | Request validation |
| Serilog | Structured logging |
| Polly | Resilience and retry policies |
| Mapster or AutoMapper | Object mapping |
| xUnit + Moq/NSubstitute | Testing |
| FluentAssertions | Readable test assertions |

## References

- Microsoft C# Coding Conventions: https://learn.microsoft.com/en-us/dotnet/csharp/fundamentals/coding-style/coding-conventions
- .NET Architecture Guides: https://learn.microsoft.com/en-us/dotnet/architecture/
- Clean Architecture in .NET: https://github.com/jasontaylordev/CleanArchitecture
