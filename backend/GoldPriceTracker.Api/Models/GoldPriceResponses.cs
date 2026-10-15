namespace GoldPriceTracker.Api.Models;

/// <summary>One calendar day's illustrative prices, not live or verified historical market rates.</summary>
/// <param name="Date">Gregorian date, serialized as YYYY-MM-DD without a time or timezone.</param>
/// <param name="Prices">Numeric OMR-per-gram prices keyed by karat: 18, 21, 22 and 24. Rounded to one baisa (three decimals).</param>
public sealed record DailyGoldPrice(DateOnly Date, IReadOnlyDictionary<int, decimal> Prices);

/// <summary>The final sample history record with currency, unit and sample identification.</summary>
/// <param name="Currency">ISO currency code OMR.</param>
/// <param name="Unit">Weight unit gram; each price is for one gram.</param>
/// <param name="IsSampleData">Always true: prices are static illustrations, not live market rates.</param>
/// <param name="Date">Actual final dataset date, not today's date.</param>
/// <param name="Prices">Numeric prices keyed by karat: 18, 21, 22 and 24.</param>
public sealed record LatestGoldPricesResponse(
    string Currency,
    string Unit,
    bool IsSampleData,
    DateOnly Date,
    IReadOnlyDictionary<int, decimal> Prices);

/// <summary>The latest sample price for one supported purity.</summary>
/// <param name="Currency">ISO currency code OMR.</param>
/// <param name="Unit">Weight unit gram; the price is for one gram.</param>
/// <param name="IsSampleData">Always true: prices are static illustrations, not live market rates.</param>
/// <param name="Date">Actual final dataset date, serialized as YYYY-MM-DD.</param>
/// <param name="Karat">Supported purity: 18, 21, 22 or 24.</param>
/// <param name="Price">Numeric OMR-per-gram sample price, rounded to three decimals.</param>
public sealed record GoldPriceResponse(
    string Currency,
    string Unit,
    bool IsSampleData,
    DateOnly Date,
    int Karat,
    decimal Price);

/// <summary>All 30 consecutive sample days in chronological order, oldest first.</summary>
/// <param name="Currency">ISO currency code OMR.</param>
/// <param name="Unit">Weight unit gram; each price is for one gram.</param>
/// <param name="IsSampleData">Always true: prices are not live or verified historical market rates.</param>
/// <param name="StartDate">Inclusive first dataset date, serialized as YYYY-MM-DD.</param>
/// <param name="EndDate">Inclusive final dataset date, serialized as YYYY-MM-DD.</param>
/// <param name="Days">Thirty consecutive daily records, each containing all four purities.</param>
public sealed record GoldPriceHistoryResponse(
    string Currency,
    string Unit,
    bool IsSampleData,
    DateOnly StartDate,
    DateOnly EndDate,
    IReadOnlyList<DailyGoldPrice> Days);
