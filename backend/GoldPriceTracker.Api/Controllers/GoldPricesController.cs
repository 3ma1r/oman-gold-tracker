using GoldPriceTracker.Api.Models;
using GoldPriceTracker.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace GoldPriceTracker.Api.Controllers;

/// <summary>Static sample gold prices in Omani rials per gram, not live market rates.</summary>
/// <param name="goldPrices">The injected in-memory sample-price service.</param>
[ApiController]
[Route("api/gold-prices")]
public sealed class GoldPricesController(IGoldPriceService goldPrices) : ControllerBase
{
    /// <summary>Get the latest sample prices for 18K, 21K, 22K and 24K.</summary>
    /// <remarks>The date and prices come from the final history record: 27 April 2025. Prices are numeric, not localized display strings.</remarks>
    /// <response code="200">All four sample prices with their actual date, OMR currency and gram unit.</response>
    [HttpGet]
    [ProducesResponseType(typeof(LatestGoldPricesResponse), StatusCodes.Status200OK)]
    public ActionResult<LatestGoldPricesResponse> GetLatest() => Ok(goldPrices.GetLatest());

    /// <summary>Get the latest sample price for one purity.</summary>
    /// <param name="karat">Supported purity: 18, 21, 22 or 24.</param>
    /// <response code="200">The selected purity's final sample price with its date and units.</response>
    /// <response code="404">No price is available for the requested purity; returns ProblemDetails.</response>
    [HttpGet("{karat:int}")]
    [ProducesResponseType(typeof(GoldPriceResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound, "application/problem+json")]
    public ActionResult<GoldPriceResponse> GetLatestForKarat(int karat)
    {
        var price = goldPrices.GetLatestForKarat(karat);
        if (price is not null) return Ok(price);

        return Problem(
            statusCode: StatusCodes.Status404NotFound,
            title: "Gold purity unavailable",
            detail: $"No sample gold price is available for {karat}K. Supported purities are 18K, 21K, 22K and 24K.",
            instance: Request.Path.Value);
    }

    /// <summary>Get all 30 sample days, oldest first.</summary>
    /// <remarks>The inclusive range is 29 March-27 April 2025. Each day contains 18K, 21K, 22K and 24K prices derived from the same stored 24K series.</remarks>
    /// <response code="200">Thirty consecutive daily sample records with the inclusive date range, OMR currency and gram unit.</response>
    [HttpGet("history")]
    [ProducesResponseType(typeof(GoldPriceHistoryResponse), StatusCodes.Status200OK)]
    public ActionResult<GoldPriceHistoryResponse> GetHistory() => Ok(goldPrices.GetHistory());
}
