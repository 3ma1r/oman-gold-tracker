using GoldPriceTracker.Api.Models;

namespace GoldPriceTracker.Api.Services;

/// <summary>Read-only access to the shared in-memory sample history and its final record.</summary>
public interface IGoldPriceService
{
    /// <summary>Returns all four prices from the final sample history record.</summary>
    LatestGoldPricesResponse GetLatest();

    /// <summary>Returns the final sample price for a purity, or null if it is unavailable.</summary>
    GoldPriceResponse? GetLatestForKarat(int karat);

    /// <summary>Returns the same sample history in chronological order with its inclusive date range.</summary>
    GoldPriceHistoryResponse GetHistory();
}
