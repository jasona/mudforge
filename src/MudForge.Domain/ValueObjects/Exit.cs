using MudForge.Domain.Enums;

namespace MudForge.Domain.ValueObjects;

/// <summary>
/// Represents an exit from a room to another room.
/// </summary>
public sealed record Exit
{
    public Direction Direction { get; init; }
    public string TargetRoomId { get; init; } = string.Empty;
    public bool IsLocked { get; init; }
    public string? KeyItemId { get; init; }
    public string? Description { get; init; }

    public Exit() { }

    public Exit(Direction direction, string targetRoomId, bool isLocked = false, string? keyItemId = null, string? description = null)
    {
        Direction = direction;
        TargetRoomId = targetRoomId;
        IsLocked = isLocked;
        KeyItemId = keyItemId;
        Description = description;
    }

    /// <summary>
    /// Creates a new Exit with the locked state changed.
    /// </summary>
    public Exit WithLockedState(bool isLocked) => this with { IsLocked = isLocked };

    /// <summary>
    /// Gets the opposite direction for this exit.
    /// </summary>
    public Direction GetOppositeDirection() => Direction switch
    {
        Direction.North => Direction.South,
        Direction.South => Direction.North,
        Direction.East => Direction.West,
        Direction.West => Direction.East,
        Direction.Up => Direction.Down,
        Direction.Down => Direction.Up,
        _ => throw new ArgumentOutOfRangeException()
    };
}
