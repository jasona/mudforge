using MudForge.Domain.Enums;
using MudForge.Domain.ValueObjects;

namespace MudForge.Domain.Entities;

/// <summary>
/// Represents a location in the game world.
/// </summary>
public class Room : Entity<string>
{
    public string AreaId { get; private set; } = string.Empty;
    public string Name { get; private set; } = string.Empty;
    public string Description { get; private set; } = string.Empty;

    private readonly List<Exit> _exits = [];
    public IReadOnlyCollection<Exit> Exits => _exits.AsReadOnly();

    private readonly List<string> _itemIds = [];
    public IReadOnlyCollection<string> ItemIds => _itemIds.AsReadOnly();

    private readonly List<string> _npcIds = [];
    public IReadOnlyCollection<string> NpcIds => _npcIds.AsReadOnly();

    private Room() { } // EF Core / JSON deserialization constructor

    public static Room Create(string id, string areaId, string name, string description)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(id);
        ArgumentException.ThrowIfNullOrWhiteSpace(areaId);
        ArgumentException.ThrowIfNullOrWhiteSpace(name);

        return new Room
        {
            Id = id,
            AreaId = areaId,
            Name = name,
            Description = description ?? string.Empty
        };
    }

    /// <summary>
    /// Adds an exit to this room.
    /// </summary>
    public void AddExit(Exit exit)
    {
        ArgumentNullException.ThrowIfNull(exit);

        if (_exits.Any(e => e.Direction == exit.Direction))
        {
            throw new InvalidOperationException($"An exit to the {exit.Direction} already exists.");
        }

        _exits.Add(exit);
    }

    /// <summary>
    /// Removes an exit in the specified direction.
    /// </summary>
    public bool RemoveExit(Direction direction)
    {
        var exit = _exits.FirstOrDefault(e => e.Direction == direction);
        return exit is not null && _exits.Remove(exit);
    }

    /// <summary>
    /// Gets the exit in the specified direction, if one exists.
    /// </summary>
    public Exit? GetExit(Direction direction)
    {
        return _exits.FirstOrDefault(e => e.Direction == direction);
    }

    /// <summary>
    /// Checks if an exit exists in the specified direction.
    /// </summary>
    public bool HasExit(Direction direction)
    {
        return _exits.Any(e => e.Direction == direction);
    }

    /// <summary>
    /// Locks or unlocks an exit in the specified direction.
    /// </summary>
    public bool SetExitLocked(Direction direction, bool isLocked)
    {
        var exitIndex = _exits.FindIndex(e => e.Direction == direction);
        if (exitIndex < 0) return false;

        _exits[exitIndex] = _exits[exitIndex].WithLockedState(isLocked);
        return true;
    }

    /// <summary>
    /// Adds an item to this room.
    /// </summary>
    public void AddItem(string itemId)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(itemId);
        if (!_itemIds.Contains(itemId))
        {
            _itemIds.Add(itemId);
        }
    }

    /// <summary>
    /// Removes an item from this room.
    /// </summary>
    public bool RemoveItem(string itemId)
    {
        return _itemIds.Remove(itemId);
    }

    /// <summary>
    /// Checks if an item exists in this room.
    /// </summary>
    public bool HasItem(string itemId) => _itemIds.Contains(itemId);

    /// <summary>
    /// Adds an NPC to this room.
    /// </summary>
    public void AddNpc(string npcId)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(npcId);
        if (!_npcIds.Contains(npcId))
        {
            _npcIds.Add(npcId);
        }
    }

    /// <summary>
    /// Removes an NPC from this room.
    /// </summary>
    public bool RemoveNpc(string npcId)
    {
        return _npcIds.Remove(npcId);
    }

    /// <summary>
    /// Checks if an NPC exists in this room.
    /// </summary>
    public bool HasNpc(string npcId) => _npcIds.Contains(npcId);

    /// <summary>
    /// Updates the room description.
    /// </summary>
    public void UpdateDescription(string description)
    {
        Description = description ?? string.Empty;
    }

    /// <summary>
    /// Gets a formatted list of available exits.
    /// </summary>
    public string GetExitsDescription()
    {
        if (_exits.Count == 0) return "There are no obvious exits.";

        var exitNames = _exits.Select(e => e.Direction.ToString().ToLower());
        return $"Exits: {string.Join(", ", exitNames)}";
    }
}
