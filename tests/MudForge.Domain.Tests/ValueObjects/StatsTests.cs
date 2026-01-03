using MudForge.Domain.ValueObjects;

namespace MudForge.Domain.Tests.ValueObjects;

public class StatsTests
{
    [Fact]
    public void Constructor_SetsAllProperties()
    {
        // Act
        var stats = new Stats(10, 12, 8, 14);

        // Assert
        Assert.Equal(10, stats.Strength);
        Assert.Equal(12, stats.Agility);
        Assert.Equal(8, stats.Intelligence);
        Assert.Equal(14, stats.Constitution);
    }

    [Fact]
    public void DefaultConstructor_InitializesToZero()
    {
        // Act
        var stats = new Stats();

        // Assert
        Assert.Equal(0, stats.Strength);
        Assert.Equal(0, stats.Agility);
        Assert.Equal(0, stats.Intelligence);
        Assert.Equal(0, stats.Constitution);
    }

    [Fact]
    public void Total_SumsAllStats()
    {
        // Arrange
        var stats = new Stats(10, 12, 8, 14);

        // Act
        var total = stats.Total;

        // Assert
        Assert.Equal(44, total);
    }

    [Fact]
    public void Default_ReturnsStatsWithTenInEachStat()
    {
        // Act
        var stats = Stats.Default;

        // Assert
        Assert.Equal(10, stats.Strength);
        Assert.Equal(10, stats.Agility);
        Assert.Equal(10, stats.Intelligence);
        Assert.Equal(10, stats.Constitution);
        Assert.Equal(40, stats.Total);
    }

    [Fact]
    public void Empty_ReturnsStatsWithZeroInEachStat()
    {
        // Act
        var stats = Stats.Empty;

        // Assert
        Assert.Equal(0, stats.Strength);
        Assert.Equal(0, stats.Agility);
        Assert.Equal(0, stats.Intelligence);
        Assert.Equal(0, stats.Constitution);
        Assert.Equal(0, stats.Total);
    }

    [Fact]
    public void Equality_SameValues_AreEqual()
    {
        // Arrange
        var stats1 = new Stats(10, 12, 8, 14);
        var stats2 = new Stats(10, 12, 8, 14);

        // Assert
        Assert.Equal(stats1, stats2);
        Assert.True(stats1 == stats2);
        Assert.False(stats1 != stats2);
        Assert.Equal(stats1.GetHashCode(), stats2.GetHashCode());
    }

    [Fact]
    public void Equality_DifferentValues_AreNotEqual()
    {
        // Arrange
        var stats1 = new Stats(10, 12, 8, 14);
        var stats2 = new Stats(10, 12, 8, 15); // Different constitution

        // Assert
        Assert.NotEqual(stats1, stats2);
        Assert.False(stats1 == stats2);
        Assert.True(stats1 != stats2);
    }

    [Fact]
    public void AdditionOperator_AddsTwoStats()
    {
        // Arrange
        var stats1 = new Stats(10, 12, 8, 14);
        var stats2 = new Stats(2, 3, 4, 5);

        // Act
        var result = stats1 + stats2;

        // Assert
        Assert.Equal(12, result.Strength);
        Assert.Equal(15, result.Agility);
        Assert.Equal(12, result.Intelligence);
        Assert.Equal(19, result.Constitution);
    }

    [Fact]
    public void SubtractionOperator_SubtractsTwoStats()
    {
        // Arrange
        var stats1 = new Stats(10, 12, 8, 14);
        var stats2 = new Stats(2, 3, 4, 5);

        // Act
        var result = stats1 - stats2;

        // Assert
        Assert.Equal(8, result.Strength);
        Assert.Equal(9, result.Agility);
        Assert.Equal(4, result.Intelligence);
        Assert.Equal(9, result.Constitution);
    }

    [Fact]
    public void SubtractionOperator_CanResultInNegativeValues()
    {
        // Arrange
        var stats1 = new Stats(5, 5, 5, 5);
        var stats2 = new Stats(10, 10, 10, 10);

        // Act
        var result = stats1 - stats2;

        // Assert
        Assert.Equal(-5, result.Strength);
        Assert.Equal(-5, result.Agility);
        Assert.Equal(-5, result.Intelligence);
        Assert.Equal(-5, result.Constitution);
    }

    [Fact]
    public void MultiplicationOperator_MultipliesByScalar()
    {
        // Arrange
        var stats = new Stats(10, 12, 8, 14);

        // Act
        var result = stats * 2;

        // Assert
        Assert.Equal(20, result.Strength);
        Assert.Equal(24, result.Agility);
        Assert.Equal(16, result.Intelligence);
        Assert.Equal(28, result.Constitution);
    }

    [Fact]
    public void MultiplicationOperator_ByZero_ReturnsZeroStats()
    {
        // Arrange
        var stats = new Stats(10, 12, 8, 14);

        // Act
        var result = stats * 0;

        // Assert
        Assert.Equal(Stats.Empty, result);
    }

    [Theory]
    [InlineData(0, 100)]
    [InlineData(10, 200)]
    [InlineData(20, 300)]
    [InlineData(5, 150)]
    public void CalculateMaxHealth_ReturnsCorrectValue(int constitution, int expectedMaxHealth)
    {
        // Arrange
        var stats = new Stats(10, 10, 10, constitution);

        // Act
        var maxHealth = stats.CalculateMaxHealth();

        // Assert
        Assert.Equal(expectedMaxHealth, maxHealth);
    }

    [Theory]
    [InlineData(0, 0)]
    [InlineData(10, 5)]
    [InlineData(20, 10)]
    [InlineData(15, 7)]
    public void CalculateMeleeDamageBonus_ReturnsHalfStrength(int strength, int expectedBonus)
    {
        // Arrange
        var stats = new Stats(strength, 10, 10, 10);

        // Act
        var bonus = stats.CalculateMeleeDamageBonus();

        // Assert
        Assert.Equal(expectedBonus, bonus);
    }

    [Theory]
    [InlineData(0, 0)]
    [InlineData(10, 10)]
    [InlineData(50, 50)]
    [InlineData(100, 50)] // Capped at 50
    public void CalculateDodgeChance_ReturnsCappedAgility(int agility, int expectedChance)
    {
        // Arrange
        var stats = new Stats(10, agility, 10, 10);

        // Act
        var chance = stats.CalculateDodgeChance();

        // Assert
        Assert.Equal(expectedChance, chance);
    }

    [Theory]
    [InlineData(0, 0)]
    [InlineData(10, 5)]
    [InlineData(20, 10)]
    [InlineData(15, 7)]
    public void CalculateMagicDamageBonus_ReturnsHalfIntelligence(int intelligence, int expectedBonus)
    {
        // Arrange
        var stats = new Stats(10, 10, intelligence, 10);

        // Act
        var bonus = stats.CalculateMagicDamageBonus();

        // Assert
        Assert.Equal(expectedBonus, bonus);
    }

    [Fact]
    public void WithExpression_CreatesNewInstanceWithModifiedValue()
    {
        // Arrange
        var original = new Stats(10, 10, 10, 10);

        // Act
        var modified = original with { Strength = 15 };

        // Assert
        Assert.Equal(10, original.Strength); // Original unchanged
        Assert.Equal(15, modified.Strength);
        Assert.Equal(10, modified.Agility); // Other properties copied
    }

    [Fact]
    public void AdditionOperator_IsCommutative()
    {
        // Arrange
        var stats1 = new Stats(10, 12, 8, 14);
        var stats2 = new Stats(2, 3, 4, 5);

        // Assert
        Assert.Equal(stats1 + stats2, stats2 + stats1);
    }

    [Fact]
    public void AdditionWithEmpty_ReturnsOriginal()
    {
        // Arrange
        var stats = new Stats(10, 12, 8, 14);

        // Act
        var result = stats + Stats.Empty;

        // Assert
        Assert.Equal(stats, result);
    }
}
