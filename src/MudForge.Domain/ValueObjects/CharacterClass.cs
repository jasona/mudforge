namespace MudForge.Domain.ValueObjects;

/// <summary>
/// Represents a character class definition (e.g., Warrior, Mage, Rogue).
/// </summary>
public sealed record CharacterClass
{
    public string Id { get; init; } = string.Empty;
    public string Name { get; init; } = string.Empty;
    public string Description { get; init; } = string.Empty;
    public Stats BaseStats { get; init; } = Stats.Default;
    public IReadOnlyList<string> Abilities { get; init; } = [];
    public IReadOnlyList<string> StartingItems { get; init; } = [];

    public CharacterClass() { }

    public CharacterClass(string id, string name, string description, Stats baseStats, IEnumerable<string>? abilities = null, IEnumerable<string>? startingItems = null)
    {
        Id = id;
        Name = name;
        Description = description;
        BaseStats = baseStats;
        Abilities = abilities?.ToList() ?? [];
        StartingItems = startingItems?.ToList() ?? [];
    }

    /// <summary>
    /// Default warrior class.
    /// </summary>
    public static CharacterClass Warrior => new(
        "warrior",
        "Warrior",
        "A mighty combatant skilled in melee combat and physical endurance.",
        new Stats(14, 10, 6, 12),
        ["bash", "shield_block"],
        ["iron_sword", "leather_armor"]
    );

    /// <summary>
    /// Default mage class.
    /// </summary>
    public static CharacterClass Mage => new(
        "mage",
        "Mage",
        "A wielder of arcane magic with powerful spells but fragile constitution.",
        new Stats(6, 10, 14, 8),
        ["fireball", "frost_bolt"],
        ["wooden_staff", "cloth_robes"]
    );

    /// <summary>
    /// Default rogue class.
    /// </summary>
    public static CharacterClass Rogue => new(
        "rogue",
        "Rogue",
        "A nimble fighter who relies on speed and cunning.",
        new Stats(10, 14, 10, 8),
        ["backstab", "evade"],
        ["steel_dagger", "leather_armor"]
    );
}
