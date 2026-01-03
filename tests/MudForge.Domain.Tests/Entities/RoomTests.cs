using MudForge.Domain.Entities;
using MudForge.Domain.Enums;
using MudForge.Domain.ValueObjects;

namespace MudForge.Domain.Tests.Entities;

public class RoomTests
{
    private static Room CreateTestRoom()
    {
        return Room.Create("village_square", "village", "Village Square", "A bustling square in the center of the village.");
    }

    [Fact]
    public void Create_WithValidParameters_ReturnsRoom()
    {
        // Act
        var room = Room.Create("test_room", "test_area", "Test Room", "A test room description.");

        // Assert
        Assert.Equal("test_room", room.Id);
        Assert.Equal("test_area", room.AreaId);
        Assert.Equal("Test Room", room.Name);
        Assert.Equal("A test room description.", room.Description);
        Assert.Empty(room.Exits);
        Assert.Empty(room.ItemIds);
        Assert.Empty(room.NpcIds);
    }

    [Fact]
    public void Create_WithNullDescription_UsesEmptyString()
    {
        // Act
        var room = Room.Create("test_room", "test_area", "Test Room", null!);

        // Assert
        Assert.Equal(string.Empty, room.Description);
    }

    [Fact]
    public void Create_WithEmptyId_ThrowsException()
    {
        Assert.Throws<ArgumentException>(() => Room.Create("", "area", "Name", "Desc"));
        Assert.Throws<ArgumentException>(() => Room.Create("   ", "area", "Name", "Desc"));
    }

    [Fact]
    public void AddExit_AddsExitToRoom()
    {
        // Arrange
        var room = CreateTestRoom();
        var exit = new Exit(Direction.North, "forest_path");

        // Act
        room.AddExit(exit);

        // Assert
        Assert.Single(room.Exits);
        Assert.Contains(exit, room.Exits);
    }

    [Fact]
    public void AddExit_DuplicateDirection_ThrowsException()
    {
        // Arrange
        var room = CreateTestRoom();
        room.AddExit(new Exit(Direction.North, "forest_path"));

        // Act & Assert
        Assert.Throws<InvalidOperationException>(() =>
            room.AddExit(new Exit(Direction.North, "other_room")));
    }

    [Fact]
    public void AddExit_NullExit_ThrowsException()
    {
        // Arrange
        var room = CreateTestRoom();

        // Act & Assert
        Assert.Throws<ArgumentNullException>(() => room.AddExit(null!));
    }

    [Fact]
    public void RemoveExit_ExistingDirection_ReturnsTrue()
    {
        // Arrange
        var room = CreateTestRoom();
        room.AddExit(new Exit(Direction.North, "forest_path"));

        // Act
        var removed = room.RemoveExit(Direction.North);

        // Assert
        Assert.True(removed);
        Assert.Empty(room.Exits);
    }

    [Fact]
    public void RemoveExit_NonexistentDirection_ReturnsFalse()
    {
        // Arrange
        var room = CreateTestRoom();

        // Act
        var removed = room.RemoveExit(Direction.North);

        // Assert
        Assert.False(removed);
    }

    [Fact]
    public void GetExit_ExistingDirection_ReturnsExit()
    {
        // Arrange
        var room = CreateTestRoom();
        var exit = new Exit(Direction.North, "forest_path");
        room.AddExit(exit);

        // Act
        var result = room.GetExit(Direction.North);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(exit, result);
    }

    [Fact]
    public void GetExit_NonexistentDirection_ReturnsNull()
    {
        // Arrange
        var room = CreateTestRoom();

        // Act
        var result = room.GetExit(Direction.North);

        // Assert
        Assert.Null(result);
    }

    [Fact]
    public void HasExit_ExistingDirection_ReturnsTrue()
    {
        // Arrange
        var room = CreateTestRoom();
        room.AddExit(new Exit(Direction.North, "forest_path"));

        // Act & Assert
        Assert.True(room.HasExit(Direction.North));
    }

    [Fact]
    public void HasExit_NonexistentDirection_ReturnsFalse()
    {
        // Arrange
        var room = CreateTestRoom();

        // Act & Assert
        Assert.False(room.HasExit(Direction.North));
    }

    [Fact]
    public void SetExitLocked_ExistingExit_UpdatesLockedState()
    {
        // Arrange
        var room = CreateTestRoom();
        room.AddExit(new Exit(Direction.North, "forest_path", isLocked: false));

        // Act
        var success = room.SetExitLocked(Direction.North, true);

        // Assert
        Assert.True(success);
        var exit = room.GetExit(Direction.North);
        Assert.NotNull(exit);
        Assert.True(exit.IsLocked);
    }

    [Fact]
    public void SetExitLocked_NonexistentExit_ReturnsFalse()
    {
        // Arrange
        var room = CreateTestRoom();

        // Act
        var success = room.SetExitLocked(Direction.North, true);

        // Assert
        Assert.False(success);
    }

    [Fact]
    public void AddItem_AddsItemToRoom()
    {
        // Arrange
        var room = CreateTestRoom();

        // Act
        room.AddItem("iron_sword");

        // Assert
        Assert.Contains("iron_sword", room.ItemIds);
    }

    [Fact]
    public void AddItem_DuplicateItem_DoesNotAddTwice()
    {
        // Arrange
        var room = CreateTestRoom();
        room.AddItem("iron_sword");

        // Act
        room.AddItem("iron_sword");

        // Assert
        Assert.Single(room.ItemIds);
    }

    [Fact]
    public void RemoveItem_ExistingItem_ReturnsTrue()
    {
        // Arrange
        var room = CreateTestRoom();
        room.AddItem("iron_sword");

        // Act
        var removed = room.RemoveItem("iron_sword");

        // Assert
        Assert.True(removed);
        Assert.Empty(room.ItemIds);
    }

    [Fact]
    public void RemoveItem_NonexistentItem_ReturnsFalse()
    {
        // Arrange
        var room = CreateTestRoom();

        // Act
        var removed = room.RemoveItem("nonexistent");

        // Assert
        Assert.False(removed);
    }

    [Fact]
    public void HasItem_ExistingItem_ReturnsTrue()
    {
        // Arrange
        var room = CreateTestRoom();
        room.AddItem("iron_sword");

        // Assert
        Assert.True(room.HasItem("iron_sword"));
    }

    [Fact]
    public void HasItem_NonexistentItem_ReturnsFalse()
    {
        // Arrange
        var room = CreateTestRoom();

        // Assert
        Assert.False(room.HasItem("nonexistent"));
    }

    [Fact]
    public void AddNpc_AddsNpcToRoom()
    {
        // Arrange
        var room = CreateTestRoom();

        // Act
        room.AddNpc("guard_01");

        // Assert
        Assert.Contains("guard_01", room.NpcIds);
    }

    [Fact]
    public void AddNpc_DuplicateNpc_DoesNotAddTwice()
    {
        // Arrange
        var room = CreateTestRoom();
        room.AddNpc("guard_01");

        // Act
        room.AddNpc("guard_01");

        // Assert
        Assert.Single(room.NpcIds);
    }

    [Fact]
    public void RemoveNpc_ExistingNpc_ReturnsTrue()
    {
        // Arrange
        var room = CreateTestRoom();
        room.AddNpc("guard_01");

        // Act
        var removed = room.RemoveNpc("guard_01");

        // Assert
        Assert.True(removed);
        Assert.Empty(room.NpcIds);
    }

    [Fact]
    public void UpdateDescription_UpdatesDescription()
    {
        // Arrange
        var room = CreateTestRoom();

        // Act
        room.UpdateDescription("A new description.");

        // Assert
        Assert.Equal("A new description.", room.Description);
    }

    [Fact]
    public void UpdateDescription_NullValue_SetsEmptyString()
    {
        // Arrange
        var room = CreateTestRoom();

        // Act
        room.UpdateDescription(null!);

        // Assert
        Assert.Equal(string.Empty, room.Description);
    }

    [Fact]
    public void GetExitsDescription_NoExits_ReturnsNoExitsMessage()
    {
        // Arrange
        var room = CreateTestRoom();

        // Act
        var description = room.GetExitsDescription();

        // Assert
        Assert.Equal("There are no obvious exits.", description);
    }

    [Fact]
    public void GetExitsDescription_WithExits_ReturnsFormattedList()
    {
        // Arrange
        var room = CreateTestRoom();
        room.AddExit(new Exit(Direction.North, "room1"));
        room.AddExit(new Exit(Direction.East, "room2"));

        // Act
        var description = room.GetExitsDescription();

        // Assert
        Assert.Contains("north", description);
        Assert.Contains("east", description);
        Assert.StartsWith("Exits:", description);
    }

    [Fact]
    public void MultipleExits_AllDirections_WorkCorrectly()
    {
        // Arrange
        var room = CreateTestRoom();

        // Act
        room.AddExit(new Exit(Direction.North, "room1"));
        room.AddExit(new Exit(Direction.South, "room2"));
        room.AddExit(new Exit(Direction.East, "room3"));
        room.AddExit(new Exit(Direction.West, "room4"));
        room.AddExit(new Exit(Direction.Up, "room5"));
        room.AddExit(new Exit(Direction.Down, "room6"));

        // Assert
        Assert.Equal(6, room.Exits.Count);
        Assert.True(room.HasExit(Direction.North));
        Assert.True(room.HasExit(Direction.South));
        Assert.True(room.HasExit(Direction.East));
        Assert.True(room.HasExit(Direction.West));
        Assert.True(room.HasExit(Direction.Up));
        Assert.True(room.HasExit(Direction.Down));
    }
}
