using MudForge.Domain.Entities;
using MudForge.Domain.Events;
using MudForge.Domain.ValueObjects;

namespace MudForge.Domain.Tests.Entities;

public class CharacterTests
{
    private static Character CreateTestCharacter(Stats? stats = null)
    {
        return Character.Create(
            accountId: Guid.NewGuid(),
            name: "TestHero",
            classId: "warrior",
            baseStats: stats ?? Stats.Default,
            startingRoomId: "village_square"
        );
    }

    [Fact]
    public void Create_WithValidParameters_ReturnsCharacter()
    {
        // Arrange
        var accountId = Guid.NewGuid();
        var stats = new Stats(12, 10, 8, 14);

        // Act
        var character = Character.Create(accountId, "Hero", "warrior", stats, "start_room");

        // Assert
        Assert.NotEqual(Guid.Empty, character.Id);
        Assert.Equal(accountId, character.AccountId);
        Assert.Equal("Hero", character.Name);
        Assert.Equal("warrior", character.ClassId);
        Assert.Equal("start_room", character.RoomId);
        Assert.Equal(stats, character.Stats);
        Assert.Equal(1, character.Level);
        Assert.Equal(0, character.Experience);
    }

    [Fact]
    public void Create_SetsMaxHealthBasedOnConstitution()
    {
        // Arrange
        var stats = new Stats(10, 10, 10, 15); // 15 constitution

        // Act
        var character = CreateTestCharacter(stats);

        // Assert
        var expectedMaxHealth = 100 + (15 * 10); // 250
        Assert.Equal(expectedMaxHealth, character.MaxHealth);
        Assert.Equal(expectedMaxHealth, character.Health);
    }

    [Fact]
    public void Create_WithNullOrEmptyName_ThrowsException()
    {
        Assert.Throws<ArgumentException>(() =>
            Character.Create(Guid.NewGuid(), "", "warrior", Stats.Default, "room"));

        Assert.Throws<ArgumentException>(() =>
            Character.Create(Guid.NewGuid(), "   ", "warrior", Stats.Default, "room"));
    }

    [Fact]
    public void MoveTo_UpdatesRoomId_AndRaisesDomainEvents()
    {
        // Arrange
        var character = CreateTestCharacter();
        var oldRoomId = character.RoomId;

        // Act
        character.MoveTo("forest_path");

        // Assert
        Assert.Equal("forest_path", character.RoomId);
        Assert.Equal(2, character.DomainEvents.Count);

        var leftEvent = character.DomainEvents.OfType<PlayerLeftRoomEvent>().Single();
        Assert.Equal(oldRoomId, leftEvent.RoomId);

        var enteredEvent = character.DomainEvents.OfType<PlayerEnteredRoomEvent>().Single();
        Assert.Equal("forest_path", enteredEvent.RoomId);
    }

    [Fact]
    public void AddExperience_BelowThreshold_DoesNotLevelUp()
    {
        // Arrange
        var character = CreateTestCharacter();
        var initialLevel = character.Level;

        // Act
        var leveledUp = character.AddExperience(50); // Need 100 for level 2

        // Assert
        Assert.False(leveledUp);
        Assert.Equal(initialLevel, character.Level);
        Assert.Equal(50, character.Experience);
    }

    [Fact]
    public void AddExperience_AtThreshold_LevelsUp()
    {
        // Arrange
        var character = CreateTestCharacter();

        // Act
        var leveledUp = character.AddExperience(100);

        // Assert
        Assert.True(leveledUp);
        Assert.Equal(2, character.Level);
    }

    [Fact]
    public void AddExperience_MultipleLevels_LevelsUpCorrectly()
    {
        // Arrange
        var character = CreateTestCharacter();

        // Act - Add enough XP for multiple levels
        // Level 1->2 needs 100, Level 2->3 needs 200, Level 3->4 needs 300
        // With 300 XP: meets thresholds for levels 2, 3, and 4 (100, 200, 300)
        var leveledUp = character.AddExperience(300);

        // Assert
        Assert.True(leveledUp);
        Assert.Equal(4, character.Level);
    }

    [Fact]
    public void LevelUp_IncreasesStatsAndMaxHealth()
    {
        // Arrange
        var initialStats = new Stats(10, 10, 10, 10);
        var character = CreateTestCharacter(initialStats);
        var initialMaxHealth = character.MaxHealth;

        // Act
        character.AddExperience(100); // Level up to 2

        // Assert
        Assert.Equal(11, character.Stats.Strength);
        Assert.Equal(11, character.Stats.Agility);
        Assert.Equal(11, character.Stats.Intelligence);
        Assert.Equal(11, character.Stats.Constitution);
        Assert.True(character.MaxHealth > initialMaxHealth);
        Assert.Equal(character.MaxHealth, character.Health); // Healed to full on level up
    }

    [Fact]
    public void TakeDamage_ReducesHealth()
    {
        // Arrange
        var character = CreateTestCharacter();
        var initialHealth = character.Health;

        // Act
        var died = character.TakeDamage(50);

        // Assert
        Assert.False(died);
        Assert.Equal(initialHealth - 50, character.Health);
        Assert.True(character.IsAlive);
    }

    [Fact]
    public void TakeDamage_LethalDamage_KillsCharacter()
    {
        // Arrange
        var character = CreateTestCharacter();

        // Act
        var died = character.TakeDamage(character.MaxHealth + 100);

        // Assert
        Assert.True(died);
        Assert.Equal(0, character.Health);
        Assert.False(character.IsAlive);
        Assert.Contains(character.DomainEvents, e => e is CharacterDiedEvent);
    }

    [Fact]
    public void TakeDamage_ZeroOrNegative_DoesNothing()
    {
        // Arrange
        var character = CreateTestCharacter();
        var initialHealth = character.Health;

        // Act
        var died1 = character.TakeDamage(0);
        var died2 = character.TakeDamage(-10);

        // Assert
        Assert.False(died1);
        Assert.False(died2);
        Assert.Equal(initialHealth, character.Health);
    }

    [Fact]
    public void Heal_RestoresHealth_UpToMax()
    {
        // Arrange
        var character = CreateTestCharacter();
        character.TakeDamage(100);
        var damagedHealth = character.Health;

        // Act
        character.Heal(50);

        // Assert
        Assert.Equal(damagedHealth + 50, character.Health);
    }

    [Fact]
    public void Heal_DoesNotExceedMaxHealth()
    {
        // Arrange
        var character = CreateTestCharacter();
        character.TakeDamage(10);

        // Act
        character.Heal(1000);

        // Assert
        Assert.Equal(character.MaxHealth, character.Health);
    }

    [Fact]
    public void AddItem_AddsToInventory_AndRaisesEvent()
    {
        // Arrange
        var character = CreateTestCharacter();

        // Act
        character.AddItem("iron_sword");

        // Assert
        Assert.Contains("iron_sword", character.InventoryItemIds);
        Assert.Contains(character.DomainEvents, e => e is ItemPickedUpEvent);
    }

    [Fact]
    public void RemoveItem_RemovesFromInventory()
    {
        // Arrange
        var character = CreateTestCharacter();
        character.AddItem("iron_sword");

        // Act
        var removed = character.RemoveItem("iron_sword");

        // Assert
        Assert.True(removed);
        Assert.DoesNotContain("iron_sword", character.InventoryItemIds);
    }

    [Fact]
    public void RemoveItem_ItemNotFound_ReturnsFalse()
    {
        // Arrange
        var character = CreateTestCharacter();

        // Act
        var removed = character.RemoveItem("nonexistent");

        // Assert
        Assert.False(removed);
    }

    [Fact]
    public void AddGold_IncreasesGold()
    {
        // Arrange
        var character = CreateTestCharacter();

        // Act
        character.AddGold(100);

        // Assert
        Assert.Equal(100, character.Gold);
    }

    [Fact]
    public void RemoveGold_WithSufficientFunds_ReturnsTrue()
    {
        // Arrange
        var character = CreateTestCharacter();
        character.AddGold(100);

        // Act
        var success = character.RemoveGold(50);

        // Assert
        Assert.True(success);
        Assert.Equal(50, character.Gold);
    }

    [Fact]
    public void RemoveGold_InsufficientFunds_ReturnsFalse()
    {
        // Arrange
        var character = CreateTestCharacter();
        character.AddGold(30);

        // Act
        var success = character.RemoveGold(50);

        // Assert
        Assert.False(success);
        Assert.Equal(30, character.Gold);
    }

    [Fact]
    public void Respawn_RestoresHealthAndMovesToRoom()
    {
        // Arrange
        var character = CreateTestCharacter();
        character.TakeDamage(character.MaxHealth); // Kill character

        // Act
        character.Respawn("temple");

        // Assert
        Assert.Equal("temple", character.RoomId);
        Assert.Equal(character.MaxHealth, character.Health);
        Assert.True(character.IsAlive);
    }

    [Fact]
    public void HealthPercentage_CalculatesCorrectly()
    {
        // Arrange
        var character = CreateTestCharacter();
        character.TakeDamage(character.MaxHealth / 2);

        // Act
        var percentage = character.HealthPercentage;

        // Assert
        Assert.Equal(50, percentage);
    }

    [Fact]
    public void GetExperienceForNextLevel_ReturnsCorrectValue()
    {
        // Arrange
        var character = CreateTestCharacter();

        // Assert
        Assert.Equal(100, character.GetExperienceForNextLevel()); // Level 1 needs 100 XP

        character.AddExperience(100); // Now level 2
        Assert.Equal(200, character.GetExperienceForNextLevel()); // Level 2 needs 200 XP
    }

    [Theory]
    [InlineData(1, 0)]
    [InlineData(2, 100)]
    [InlineData(3, 300)]
    [InlineData(5, 1000)]
    [InlineData(10, 4500)]
    public void GetTotalExperienceForLevel_ReturnsCorrectValue(int level, int expectedXp)
    {
        Assert.Equal(expectedXp, Character.GetTotalExperienceForLevel(level));
    }
}
