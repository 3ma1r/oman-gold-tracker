using GoldPriceTracker.Api.Data;
using GoldPriceTracker.Api.Models;

namespace GoldPriceTracker.Api.Services;

/// <summary>Serves immutable local sample data; no live provider, persistence or clock-dependent prices.</summary>
public sealed class GoldPriceService : IGoldPriceService
{
    private const string Currency = "OMR";
    private const string Unit = "gram";

    /// <inheritdoc />
    public LatestGoldPricesResponse GetLatest()
    {
        var latest = SampleGoldPrices.Days[^1];
        return new(Currency, Unit, true, latest.Date, latest.Prices);
    }

    /// <inheritdoc />
    public GoldPriceResponse? GetLatestForKarat(int karat)
    {
        var latest = GetLatest();
        return latest.Prices.TryGetValue(karat, out var price)
            ? new(Currency, Unit, true, latest.Date, karat, price)
            : null;
    }

    /// <inheritdoc />
    public GoldPriceHistoryResponse GetHistory()
    {
        var days = SampleGoldPrices.Days;
        return new(Currency, Unit, true, days[0].Date, days[^1].Date, days);
    }
}
