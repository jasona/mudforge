namespace MudForge.Domain.Entities;

/// <summary>
/// Represents a player account that can own multiple characters.
/// </summary>
public class Account : Entity<Guid>
{
    public string Email { get; private set; } = string.Empty;
    public string PasswordHash { get; private set; } = string.Empty;
    public DateTime CreatedAt { get; private set; }
    public DateTime? LastLoginAt { get; private set; }

    private readonly List<Character> _characters = [];
    public IReadOnlyCollection<Character> Characters => _characters.AsReadOnly();

    private Account() { } // EF Core constructor

    public static Account Create(string email, string passwordHash)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(email);
        ArgumentException.ThrowIfNullOrWhiteSpace(passwordHash);

        return new Account
        {
            Id = Guid.NewGuid(),
            Email = email.ToLowerInvariant().Trim(),
            PasswordHash = passwordHash,
            CreatedAt = DateTime.UtcNow
        };
    }

    public void UpdateLastLogin()
    {
        LastLoginAt = DateTime.UtcNow;
    }

    public void UpdateEmail(string newEmail)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(newEmail);
        Email = newEmail.ToLowerInvariant().Trim();
    }

    public void UpdatePasswordHash(string newPasswordHash)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(newPasswordHash);
        PasswordHash = newPasswordHash;
    }

    public void AddCharacter(Character character)
    {
        ArgumentNullException.ThrowIfNull(character);

        if (_characters.Any(c => c.Name.Equals(character.Name, StringComparison.OrdinalIgnoreCase)))
        {
            throw new InvalidOperationException($"A character named '{character.Name}' already exists on this account.");
        }

        _characters.Add(character);
    }

    public void RemoveCharacter(Character character)
    {
        ArgumentNullException.ThrowIfNull(character);
        _characters.Remove(character);
    }
}
