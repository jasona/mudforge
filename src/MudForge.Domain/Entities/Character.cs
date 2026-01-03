using MudForge.Domain.Events;
using MudForge.Domain.ValueObjects;

namespace MudForge.Domain.Entities;

/// <summary>
/// Represents a player character in the game world.
/// </summary>
public class Character : Entity<Guid>
{
    public Guid AccountId { get; private set; }
    public string Name { get; private set; } = string.Empty;
    public string RoomId { get; private set; } = string.Empty;
    public string ClassId { get; private set; } = string.Empty;
    public Stats Stats { get; private set; } = Stats.Default;
    public int Level { get; private set; } = 1;
    public int Experience { get; private set; }
    public int Health { get; private set; }
    public int MaxHealth { get; private set; }
    public int Gold { get; private set; }
    public DateTime CreatedAt { get; private set; }
    public DateTime? LastPlayedAt { get; private set; }

    private readonly List<string> _inventoryItemIds = [];
    public IReadOnlyCollection<string> InventoryItemIds => _inventoryItemIds.AsReadOnly();

    private Character() { } // EF Core constructor

    public static Character Create(Guid accountId, string name, string classId, Stats baseStats, string startingRoomId)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(name);
        ArgumentException.ThrowIfNullOrWhiteSpace(classId);
        ArgumentException.ThrowIfNullOrWhiteSpace(startingRoomId);

        var character = new Character
        {
            Id = Guid.NewGuid(),
            AccountId = accountId,
            Name = name.Trim(),
            ClassId = classId,
            Stats = baseStats,
            RoomId = startingRoomId,
            Level = 1,
            Experience = 0,
            Gold = 0,
            CreatedAt = DateTime.UtcNow
        };

        character.MaxHealth = character.Stats.CalculateMaxHealth();
        character.Health = character.MaxHealth;

        return character;
    }

    /// <summary>
    /// Moves the character to a new room.
    /// </summary>
    public void MoveTo(string newRoomId)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(newRoomId);

        var oldRoomId = RoomId;
        RoomId = newRoomId;

        AddDomainEvent(new PlayerLeftRoomEvent(Id, oldRoomId));
        AddDomainEvent(new PlayerEnteredRoomEvent(Id, newRoomId));
    }

    /// <summary>
    /// Adds experience points and handles level up if threshold is reached.
    /// </summary>
    /// <returns>True if the character leveled up.</returns>
    public bool AddExperience(int amount)
    {
        if (amount <= 0) return false;

        Experience += amount;
        var leveledUp = false;

        while (Experience >= GetExperienceForNextLevel())
        {
            LevelUp();
            leveledUp = true;
        }

        return leveledUp;
    }

    /// <summary>
    /// Gets the experience required to reach the next level.
    /// Formula: level * 100 (e.g., level 1->2 needs 100 XP, level 2->3 needs 200 XP)
    /// </summary>
    public int GetExperienceForNextLevel() => Level * 100;

    /// <summary>
    /// Gets the total experience required to reach a specific level from level 1.
    /// </summary>
    public static int GetTotalExperienceForLevel(int level)
    {
        if (level <= 1) return 0;
        // Sum of 100 + 200 + ... + (level-1)*100 = 100 * (1 + 2 + ... + (level-1)) = 50 * level * (level-1)
        return 50 * level * (level - 1);
    }

    private void LevelUp()
    {
        Level++;

        // Increase stats on level up
        Stats = Stats with
        {
            Strength = Stats.Strength + 1,
            Agility = Stats.Agility + 1,
            Intelligence = Stats.Intelligence + 1,
            Constitution = Stats.Constitution + 1
        };

        // Recalculate max health and heal to full
        MaxHealth = Stats.CalculateMaxHealth();
        Health = MaxHealth;
    }

    /// <summary>
    /// Takes damage, reducing health. Returns true if character died.
    /// </summary>
    public bool TakeDamage(int amount)
    {
        if (amount <= 0) return false;

        Health = Math.Max(0, Health - amount);

        if (Health == 0)
        {
            AddDomainEvent(new CharacterDiedEvent(Id, RoomId));
            return true;
        }

        return false;
    }

    /// <summary>
    /// Heals the character by the specified amount.
    /// </summary>
    public void Heal(int amount)
    {
        if (amount <= 0) return;
        Health = Math.Min(MaxHealth, Health + amount);
    }

    /// <summary>
    /// Restores the character to full health (e.g., after respawn).
    /// </summary>
    public void RestoreFullHealth()
    {
        Health = MaxHealth;
    }

    /// <summary>
    /// Respawns the character at the specified room with full health.
    /// </summary>
    public void Respawn(string respawnRoomId)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(respawnRoomId);
        RoomId = respawnRoomId;
        RestoreFullHealth();
    }

    /// <summary>
    /// Adds gold to the character's purse.
    /// </summary>
    public void AddGold(int amount)
    {
        if (amount <= 0) return;
        Gold += amount;
    }

    /// <summary>
    /// Removes gold from the character's purse. Returns false if insufficient gold.
    /// </summary>
    public bool RemoveGold(int amount)
    {
        if (amount <= 0 || Gold < amount) return false;
        Gold -= amount;
        return true;
    }

    /// <summary>
    /// Adds an item to the character's inventory.
    /// </summary>
    public void AddItem(string itemId)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(itemId);
        _inventoryItemIds.Add(itemId);
        AddDomainEvent(new ItemPickedUpEvent(Id, itemId, RoomId));
    }

    /// <summary>
    /// Removes an item from the character's inventory. Returns false if not found.
    /// </summary>
    public bool RemoveItem(string itemId)
    {
        return _inventoryItemIds.Remove(itemId);
    }

    /// <summary>
    /// Checks if the character has the specified item.
    /// </summary>
    public bool HasItem(string itemId) => _inventoryItemIds.Contains(itemId);

    /// <summary>
    /// Updates the last played timestamp.
    /// </summary>
    public void UpdateLastPlayed()
    {
        LastPlayedAt = DateTime.UtcNow;
    }

    /// <summary>
    /// Checks if the character is alive.
    /// </summary>
    public bool IsAlive => Health > 0;

    /// <summary>
    /// Gets the character's health as a percentage.
    /// </summary>
    public int HealthPercentage => MaxHealth > 0 ? (int)((double)Health / MaxHealth * 100) : 0;
}
