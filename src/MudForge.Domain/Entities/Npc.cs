using MudForge.Domain.Enums;
using MudForge.Domain.ValueObjects;

namespace MudForge.Domain.Entities;

/// <summary>
/// Represents a non-player character in the game world.
/// </summary>
public class Npc : Entity<string>
{
    public string Name { get; private set; } = string.Empty;
    public string Description { get; private set; } = string.Empty;
    public string RoomId { get; private set; } = string.Empty;
    public NpcBehavior Behavior { get; private set; }
    public Stats Stats { get; private set; } = Stats.Default;
    public bool IsHostile { get; private set; }
    public int Health { get; private set; }
    public int MaxHealth { get; private set; }
    public int Level { get; private set; } = 1;
    public int ExperienceReward { get; private set; }
    public int GoldReward { get; private set; }

    /// <summary>
    /// Items this NPC drops on death.
    /// </summary>
    private readonly List<string> _lootTableItemIds = [];
    public IReadOnlyCollection<string> LootTableItemIds => _lootTableItemIds.AsReadOnly();

    /// <summary>
    /// For merchants: items available for sale.
    /// </summary>
    private readonly List<string> _inventoryItemIds = [];
    public IReadOnlyCollection<string> InventoryItemIds => _inventoryItemIds.AsReadOnly();

    /// <summary>
    /// Dialogue lines the NPC can say.
    /// </summary>
    private readonly List<string> _dialogueLines = [];
    public IReadOnlyCollection<string> DialogueLines => _dialogueLines.AsReadOnly();

    private Npc() { } // JSON deserialization constructor

    public static Npc Create(
        string id,
        string name,
        string description,
        string roomId,
        NpcBehavior behavior,
        Stats stats,
        int level = 1,
        int experienceReward = 0,
        int goldReward = 0)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(id);
        ArgumentException.ThrowIfNullOrWhiteSpace(name);
        ArgumentException.ThrowIfNullOrWhiteSpace(roomId);

        var npc = new Npc
        {
            Id = id,
            Name = name,
            Description = description ?? string.Empty,
            RoomId = roomId,
            Behavior = behavior,
            Stats = stats,
            IsHostile = behavior == NpcBehavior.Hostile,
            Level = Math.Max(1, level),
            ExperienceReward = experienceReward,
            GoldReward = goldReward
        };

        npc.MaxHealth = stats.CalculateMaxHealth();
        npc.Health = npc.MaxHealth;

        return npc;
    }

    /// <summary>
    /// Moves the NPC to a new room.
    /// </summary>
    public void MoveTo(string newRoomId)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(newRoomId);
        RoomId = newRoomId;
    }

    /// <summary>
    /// Takes damage, reducing health. Returns true if NPC died.
    /// </summary>
    public bool TakeDamage(int amount)
    {
        if (amount <= 0) return false;

        Health = Math.Max(0, Health - amount);
        return Health == 0;
    }

    /// <summary>
    /// Heals the NPC by the specified amount.
    /// </summary>
    public void Heal(int amount)
    {
        if (amount <= 0) return;
        Health = Math.Min(MaxHealth, Health + amount);
    }

    /// <summary>
    /// Respawns the NPC with full health.
    /// </summary>
    public void Respawn()
    {
        Health = MaxHealth;
    }

    /// <summary>
    /// Adds an item to the NPC's loot table.
    /// </summary>
    public void AddLootItem(string itemId)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(itemId);
        if (!_lootTableItemIds.Contains(itemId))
        {
            _lootTableItemIds.Add(itemId);
        }
    }

    /// <summary>
    /// Adds an item to the merchant's inventory.
    /// </summary>
    public void AddInventoryItem(string itemId)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(itemId);
        if (!_inventoryItemIds.Contains(itemId))
        {
            _inventoryItemIds.Add(itemId);
        }
    }

    /// <summary>
    /// Removes an item from the merchant's inventory.
    /// </summary>
    public bool RemoveInventoryItem(string itemId)
    {
        return _inventoryItemIds.Remove(itemId);
    }

    /// <summary>
    /// Adds a dialogue line.
    /// </summary>
    public void AddDialogueLine(string line)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(line);
        _dialogueLines.Add(line);
    }

    /// <summary>
    /// Gets a random dialogue line, if any exist.
    /// </summary>
    public string? GetRandomDialogue()
    {
        if (_dialogueLines.Count == 0) return null;
        return _dialogueLines[Random.Shared.Next(_dialogueLines.Count)];
    }

    /// <summary>
    /// Checks if the NPC is alive.
    /// </summary>
    public bool IsAlive => Health > 0;

    /// <summary>
    /// Checks if this NPC is a merchant.
    /// </summary>
    public bool IsMerchant => Behavior == NpcBehavior.Merchant;

    /// <summary>
    /// Gets the health percentage.
    /// </summary>
    public int HealthPercentage => MaxHealth > 0 ? (int)((double)Health / MaxHealth * 100) : 0;
}
