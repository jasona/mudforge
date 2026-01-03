namespace MudForge.Domain.Enums;

/// <summary>
/// Represents the AI behavior pattern of an NPC.
/// </summary>
public enum NpcBehavior
{
    /// <summary>NPC stays in place and doesn't move.</summary>
    Static,

    /// <summary>NPC wanders between connected rooms.</summary>
    Wandering,

    /// <summary>NPC attacks players on sight.</summary>
    Hostile,

    /// <summary>NPC can buy/sell items.</summary>
    Merchant
}
