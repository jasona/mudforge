namespace MudForge.Domain.ValueObjects;

/// <summary>
/// Represents character or item statistics as an immutable value object.
/// </summary>
public sealed record Stats
{
    public int Strength { get; init; }
    public int Agility { get; init; }
    public int Intelligence { get; init; }
    public int Constitution { get; init; }

    public Stats() : this(0, 0, 0, 0) { }

    public Stats(int strength, int agility, int intelligence, int constitution)
    {
        Strength = strength;
        Agility = agility;
        Intelligence = intelligence;
        Constitution = constitution;
    }

    /// <summary>
    /// Gets the total of all stats.
    /// </summary>
    public int Total => Strength + Agility + Intelligence + Constitution;

    /// <summary>
    /// Calculates max health based on constitution.
    /// Base 100 HP + 10 per constitution point.
    /// </summary>
    public int CalculateMaxHealth() => 100 + (Constitution * 10);

    /// <summary>
    /// Calculates physical damage bonus based on strength.
    /// </summary>
    public int CalculateMeleeDamageBonus() => Strength / 2;

    /// <summary>
    /// Calculates dodge chance based on agility.
    /// </summary>
    public int CalculateDodgeChance() => Math.Min(Agility, 50);

    /// <summary>
    /// Calculates magic damage bonus based on intelligence.
    /// </summary>
    public int CalculateMagicDamageBonus() => Intelligence / 2;

    /// <summary>
    /// Adds two Stats together, returning a new Stats instance.
    /// </summary>
    public static Stats operator +(Stats left, Stats right)
    {
        return new Stats(
            left.Strength + right.Strength,
            left.Agility + right.Agility,
            left.Intelligence + right.Intelligence,
            left.Constitution + right.Constitution
        );
    }

    /// <summary>
    /// Subtracts one Stats from another, returning a new Stats instance.
    /// </summary>
    public static Stats operator -(Stats left, Stats right)
    {
        return new Stats(
            left.Strength - right.Strength,
            left.Agility - right.Agility,
            left.Intelligence - right.Intelligence,
            left.Constitution - right.Constitution
        );
    }

    /// <summary>
    /// Multiplies Stats by a scalar value.
    /// </summary>
    public static Stats operator *(Stats stats, int multiplier)
    {
        return new Stats(
            stats.Strength * multiplier,
            stats.Agility * multiplier,
            stats.Intelligence * multiplier,
            stats.Constitution * multiplier
        );
    }

    /// <summary>
    /// Creates default starting stats for a new character.
    /// </summary>
    public static Stats Default => new(10, 10, 10, 10);

    /// <summary>
    /// Creates empty stats (all zeros).
    /// </summary>
    public static Stats Empty => new(0, 0, 0, 0);
}
