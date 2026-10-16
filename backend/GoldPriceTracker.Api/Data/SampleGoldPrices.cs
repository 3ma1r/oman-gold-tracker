using System.Collections.ObjectModel;
using GoldPriceTracker.Api.Models;

namespace GoldPriceTracker.Api.Data;

/// <summary>Immutable, fictional sample data faithfully copied from the Angular sample series.</summary>
public static class SampleGoldPrices
{
    /// <summary>The supported gold purities, in karats.</summary>
    public static IReadOnlyList<int> SupportedKarats { get; } = Array.AsReadOnly(new[] { 18, 21, 22, 24 });

    /// <summary>Thirty date-only records from 29 March through 27 April 2025, oldest first.</summary>
    public static IReadOnlyList<DailyGoldPrice> Days { get; } = CreateDays();

    private static IReadOnlyList<DailyGoldPrice> CreateDays()
    {
        // The only stored price series: 24K OMR per gram. Never follows the system clock.
        decimal[] prices24K =
        [
            46.720m, 47.025m, 47.087m, 47.620m, 47.555m, 47.982m,
            48.445m, 48.270m, 48.360m, 48.652m, 48.520m, 48.880m,
            49.355m, 49.430m, 49.820m, 50.270m, 50.510m, 50.025m,
            49.740m, 49.825m, 50.325m, 50.805m, 50.250m, 50.310m,
            50.260m, 50.775m, 51.095m, 50.860m, 50.900m, 51.200m,
        ];
        var finalDate = new DateOnly(2025, 4, 27);
        var firstDate = finalDate.AddDays(1 - prices24K.Length);

        return Array.AsReadOnly(prices24K.Select((price24K, index) =>
        {
            var baisa24K = decimal.Round(price24K * 1000m, 0, MidpointRounding.AwayFromZero);
            // Match the frontend's positive half-up integer-baisa rounding, including ties.
            // Derive every purity directly from 24K, not from another rounded purity.
            var prices = SupportedKarats.ToDictionary(
                karat => karat,
                karat => decimal.Round(baisa24K * karat / 24m, 0, MidpointRounding.AwayFromZero) / 1000m);

            return new DailyGoldPrice(firstDate.AddDays(index), new ReadOnlyDictionary<int, decimal>(prices));
        }).ToArray());
    }
}
