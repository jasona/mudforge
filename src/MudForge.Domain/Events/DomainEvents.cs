using MudForge.Domain.Entities;

namespace MudForge.Domain.Events;

/// <summary>
/// Raised when a player enters a room.
/// </summary>
public sealed record PlayerEnteredRoomEvent(Guid CharacterId, string RoomId) : IDomainEvent
{
    public DateTime OccurredAt { get; } = DateTime.UtcNow;
}

/// <summary>
/// Raised when a player leaves a room.
/// </summary>
public sealed record PlayerLeftRoomEvent(Guid CharacterId, string RoomId) : IDomainEvent
{
    public DateTime OccurredAt { get; } = DateTime.UtcNow;
}

/// <summary>
/// Raised when a player picks up an item.
/// </summary>
public sealed record ItemPickedUpEvent(Guid CharacterId, string ItemId, string RoomId) : IDomainEvent
{
    public DateTime OccurredAt { get; } = DateTime.UtcNow;
}

/// <summary>
/// Raised when combat starts between entities.
/// </summary>
public sealed record CombatStartedEvent(Guid AttackerId, Guid DefenderId, string RoomId) : IDomainEvent
{
    public DateTime OccurredAt { get; } = DateTime.UtcNow;
}

/// <summary>
/// Raised when a character dies.
/// </summary>
public sealed record CharacterDiedEvent(Guid CharacterId, string RoomId) : IDomainEvent
{
    public DateTime OccurredAt { get; } = DateTime.UtcNow;
}

/// <summary>
/// Raised when a character levels up.
/// </summary>
public sealed record CharacterLeveledUpEvent(Guid CharacterId, int NewLevel) : IDomainEvent
{
    public DateTime OccurredAt { get; } = DateTime.UtcNow;
}

/// <summary>
/// Raised when a player drops an item.
/// </summary>
public sealed record ItemDroppedEvent(Guid CharacterId, string ItemId, string RoomId) : IDomainEvent
{
    public DateTime OccurredAt { get; } = DateTime.UtcNow;
}
