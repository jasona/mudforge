using MudForge.Domain.Enums;
using MudForge.Domain.ValueObjects;

namespace MudForge.Domain.Entities;

/// <summary>
/// Represents an item in the game world.
/// </summary>
public class Item : Entity<string>
{
    public string Name { get; private set; } = string.Empty;
    public string Description { get; private set; } = string.Empty;
    public ItemType ItemType { get; private set; }
    public int Weight { get; private set; }
    public int Value { get; private set; }
    public Stats Stats { get; private set; } = Stats.Empty;

    /// <summary>
    /// For weapons: base damage. For armor: base defense.
    /// </summary>
    public int BasePower { get; private set; }

    /// <summary>
    /// For consumables: amount healed or effect magnitude.
    /// </summary>
    public int EffectValue { get; private set; }

    /// <summary>
    /// Whether this item can be dropped/traded.
    /// </summary>
    public bool IsDroppable { get; private set; } = true;

    /// <summary>
    /// Whether this item stacks in inventory.
    /// </summary>
    public bool IsStackable { get; private set; }

    private Item() { } // JSON deserialization constructor

    public static Item Create(
        string id,
        string name,
        string description,
        ItemType itemType,
        int weight = 1,
        int value = 0,
        Stats? stats = null,
        int basePower = 0,
        int effectValue = 0,
        bool isDroppable = true,
        bool isStackable = false)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(id);
        ArgumentException.ThrowIfNullOrWhiteSpace(name);

        return new Item
        {
            Id = id,
            Name = name,
            Description = description ?? string.Empty,
            ItemType = itemType,
            Weight = Math.Max(0, weight),
            Value = Math.Max(0, value),
            Stats = stats ?? Stats.Empty,
            BasePower = basePower,
            EffectValue = effectValue,
            IsDroppable = isDroppable,
            IsStackable = isStackable
        };
    }

    /// <summary>
    /// Creates a weapon item.
    /// </summary>
    public static Item CreateWeapon(string id, string name, string description, int damage, int value = 0, Stats? bonusStats = null)
    {
        return Create(id, name, description, ItemType.Weapon, weight: 5, value: value, stats: bonusStats, basePower: damage);
    }

    /// <summary>
    /// Creates an armor item.
    /// </summary>
    public static Item CreateArmor(string id, string name, string description, int defense, int value = 0, Stats? bonusStats = null)
    {
        return Create(id, name, description, ItemType.Armor, weight: 10, value: value, stats: bonusStats, basePower: defense);
    }

    /// <summary>
    /// Creates a consumable item (potion, food, etc.).
    /// </summary>
    public static Item CreateConsumable(string id, string name, string description, int healAmount, int value = 0)
    {
        return Create(id, name, description, ItemType.Consumable, weight: 1, value: value, effectValue: healAmount, isStackable: true);
    }

    /// <summary>
    /// Creates a key item.
    /// </summary>
    public static Item CreateKey(string id, string name, string description)
    {
        return Create(id, name, description, ItemType.Key, weight: 0, value: 0, isDroppable: false);
    }

    /// <summary>
    /// Creates a miscellaneous item.
    /// </summary>
    public static Item CreateMisc(string id, string name, string description, int value = 0, int weight = 1)
    {
        return Create(id, name, description, ItemType.Misc, weight: weight, value: value);
    }

    /// <summary>
    /// Gets a short description of the item for display.
    /// </summary>
    public string GetShortDescription()
    {
        return ItemType switch
        {
            ItemType.Weapon => $"{Name} (Damage: {BasePower})",
            ItemType.Armor => $"{Name} (Defense: {BasePower})",
            ItemType.Consumable => $"{Name} (Heals: {EffectValue})",
            _ => Name
        };
    }
}
