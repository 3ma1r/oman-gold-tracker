#requires -Version 5.1
<#
.SYNOPSIS
Verifies the read-only sample gold-price API without external dependencies.
.EXAMPLE
.\backend\scripts\Verify-GoldPrices.ps1 -BaseUrl 'http://localhost:5118'
.NOTES
Run against a running API. Does not start servers, alter data, or require Swagger.
Supports Windows PowerShell 5.1 and PowerShell 7. Fails with exit code 1.
#>
[CmdletBinding()]
param(
    [ValidateScript({ $_.IsAbsoluteUri -and $_.Scheme -in @('http', 'https') -and -not $_.Query -and -not $_.Fragment })]
    [uri] $BaseUrl = 'http://localhost:5118'
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
$apiRoot = $BaseUrl.AbsoluteUri.TrimEnd('/')
$karats = @(18, 21, 22, 24)
$snapshots = [ordered]@{}
$script:assertions = 0
$jsonOptions = @{}
if ((Get-Command ConvertFrom-Json).Parameters.ContainsKey('DateKind')) { $jsonOptions.DateKind = 'String' }

function Assert-True([bool] $Condition, [string] $Message) {
    if (-not $Condition) { throw $Message }
    $script:assertions++
}

function Invoke-Api([string] $Path, [string] $Method = 'GET') {
    $options = @{ Uri = "$apiRoot$Path"; Method = $Method; UseBasicParsing = $true;
        TimeoutSec = 10; MaximumRedirection = 0; Headers = @{ Accept = 'application/json, application/problem+json' } }
    if ($PSVersionTable.PSVersion.Major -ge 7) { $options.SkipHttpErrorCheck = $true }
    try {
        $response = Invoke-WebRequest @options
        return @{ Status = [int]$response.StatusCode; Body = [string]$response.Content;
            ContentType = [string]$response.Headers['Content-Type']; Allow = [string]$response.Headers['Allow'] }
    } catch {
        # Windows PowerShell throws for HTTP error statuses; PowerShell 7 can return them directly.
        $response = $_.Exception.Response
        if ($null -eq $response) { throw "$Method $Path failed: $($_.Exception.Message)" }
        $reader = [System.IO.StreamReader]::new($response.GetResponseStream())
        try { $body = $reader.ReadToEnd() } finally { $reader.Dispose() }
        if ([string]::IsNullOrWhiteSpace($body) -and $null -ne $_.ErrorDetails) { $body = $_.ErrorDetails.Message }
        $result = @{ Status = [int]$response.StatusCode; Body = [string]$body;
            ContentType = [string]$response.Headers['Content-Type']; Allow = [string]$response.Headers['Allow'] }
        $response.Close()
        return $result
    }
}

function Get-Json([string] $Path) {
    $response = Invoke-Api $Path
    Assert-True ($response.Status -eq 200) "GET $Path must return 200, got $($response.Status)."
    Assert-True ($response.ContentType -match '^application/json(?:;|$)') "GET $Path must return JSON."
    $value = $response.Body | ConvertFrom-Json @jsonOptions
    $snapshots[$Path] = $value | ConvertTo-Json -Depth 12 -Compress
    return $value
}

function Assert-Properties($Value, [string[]] $Names, [string] $Context) {
    Assert-True ($Value -is [pscustomobject]) "$Context must be a JSON object."
    foreach ($name in $Names) {
        Assert-True ($null -ne $Value.PSObject.Properties[$name]) "$Context is missing '$name'."
    }
}

function Assert-Metadata($Value, [string] $Context) {
    Assert-Properties $Value @('currency', 'unit', 'isSampleData') $Context
    Assert-True ($Value.currency -is [string] -and $Value.currency -ceq 'OMR') "$Context currency must be OMR."
    Assert-True ($Value.unit -is [string] -and $Value.unit -ceq 'gram') "$Context unit must be gram."
    Assert-True ($Value.isSampleData -is [bool] -and $Value.isSampleData) "$Context must identify sample data with Boolean true."
}

function Get-CalendarDate($Value) {
    $date = [datetime]::MinValue
    Assert-True ($Value -is [string] -and [datetime]::TryParseExact($Value, 'yyyy-MM-dd',
        [Globalization.CultureInfo]::InvariantCulture, [Globalization.DateTimeStyles]::None, [ref]$date)) "Invalid ISO date-only value '$Value'."
    return $date # Calendar arithmetic only; never convert through a timezone.
}

function Assert-Price($Value, [string] $Context) {
    Assert-True ($Value -is [int] -or $Value -is [long] -or $Value -is [double] -or $Value -is [decimal]) "$Context must be a JSON number, not formatted text."
    $price = [decimal]$Value # Also rejects NaN, Infinity and out-of-range numbers.
    Assert-True ($price -gt 0 -and [decimal]::Round($price, 3) -eq $price) "$Context must be positive with at most three decimals."
}

function Assert-Prices($Prices, [string] $Context) {
    Assert-Properties $Prices @('18', '21', '22', '24') $Context
    Assert-True (@($Prices.PSObject.Properties).Count -eq 4) "$Context must contain exactly four purities."
    foreach ($karat in $karats) { Assert-Price $Prices.PSObject.Properties["$karat"].Value "$Context ${karat}K" }
}

try {
    $latest = Get-Json '/api/gold-prices'
    Assert-Metadata $latest 'Latest'
    Assert-Properties $latest @('date', 'prices') 'Latest'
    $null = Get-CalendarDate $latest.date
    Assert-Prices $latest.prices 'Latest prices'

    $history = Get-Json '/api/gold-prices/history'
    Assert-Metadata $history 'History'
    Assert-Properties $history @('startDate', 'endDate', 'days') 'History'
    Assert-True ($history.startDate -ceq '2025-03-29' -and $history.endDate -ceq '2025-04-27') 'Sample range must be 29 March-27 April 2025.'
    $start = Get-CalendarDate $history.startDate
    $null = Get-CalendarDate $history.endDate
    Assert-True ($history.days -is [array] -and $history.days.Count -eq 30) 'History must contain an array of exactly 30 days.'
    for ($index = 0; $index -lt 30; $index++) {
        $day = $history.days[$index]
        Assert-Properties $day @('date', 'prices') "History day $index"
        $null = Get-CalendarDate $day.date
        Assert-True ($day.date -ceq $start.AddDays($index).ToString('yyyy-MM-dd', [Globalization.CultureInfo]::InvariantCulture)) 'History dates must be unique, consecutive and oldest first.'
        Assert-Prices $day.prices "$($day.date) prices"
        $baisa24 = [decimal]$day.prices.'24' * 1000
        foreach ($karat in $karats) {
            # Independent positive half-up integer-baisa oracle, including half-baisa ties.
            $expected = [decimal]::Floor(($baisa24 * $karat + 12) / 24) / 1000
            Assert-True ([decimal]$day.prices.PSObject.Properties["$karat"].Value -eq $expected) "$($day.date) ${karat}K rounding does not match 24K * karat / 24."
        }
    }
    Assert-True ($latest.date -ceq $history.days[-1].date -and $latest.date -ceq $history.endDate) 'Latest date must match the final history date.'
    foreach ($karat in $karats) {
        $expected = $latest.prices.PSObject.Properties["$karat"].Value
        Assert-True ($expected -eq $history.days[-1].prices.PSObject.Properties["$karat"].Value) "Latest ${karat}K price differs from final history."
        $lookup = Get-Json "/api/gold-prices/$karat"
        Assert-Metadata $lookup "${karat}K lookup"
        Assert-Properties $lookup @('date', 'karat', 'price') "${karat}K lookup"
        Assert-Price $lookup.price "${karat}K lookup"
        Assert-True (($lookup.karat -is [int] -or $lookup.karat -is [long]) -and $lookup.karat -eq $karat -and $lookup.date -ceq $latest.date -and $lookup.price -eq $expected) "${karat}K lookup must match the latest record."
    }
    foreach ($karat in @(19, 0, -1, 25)) {
        $path = "/api/gold-prices/$karat"
        $response = Invoke-Api $path
        Assert-True ($response.Status -eq 404 -and $response.ContentType -match '^application/problem\+json(?:;|$)') "$path must return 404 ProblemDetails."
        $problem = $response.Body | ConvertFrom-Json @jsonOptions
        Assert-Properties $problem @('type', 'title', 'status', 'detail', 'instance') "$path ProblemDetails"
        Assert-True (($problem.status -is [int] -or $problem.status -is [long]) -and $problem.status -eq 404 -and $problem.title -is [string] -and -not [string]::IsNullOrWhiteSpace($problem.title) -and $problem.detail -is [string] -and $problem.detail.Contains("${karat}K")) "$path must explain the unavailable purity."
        Assert-True ($problem.instance -is [string] -and $problem.instance.EndsWith($path, [StringComparison]::Ordinal) -and [uri]::IsWellFormedUriString($problem.type, [UriKind]::Absolute)) "$path ProblemDetails type/instance is invalid."
    }
    foreach ($path in @('/api/gold-prices/not-a-karat', '/api/gold-prices/history/extra', '/api/not-found')) {
        Assert-True ((Invoke-Api $path).Status -eq 404) "Invalid route $path must return 404."
    }
    foreach ($path in @('/api/gold-prices', '/api/gold-prices/24', '/api/gold-prices/history')) {
        foreach ($method in @('POST', 'PUT', 'PATCH', 'DELETE')) {
            $response = Invoke-Api $path $method
            Assert-True ($response.Status -eq 405 -and $response.Allow -match '\bGET\b') "$method $path must return 405 with GET in Allow."
        }
    }
    for ($round = 0; $round -lt 2; $round++) {
        foreach ($path in $snapshots.Keys) {
            $response = Invoke-Api $path
            Assert-True ($response.Status -eq 200) "Repeated GET $path failed."
            $json = $response.Body | ConvertFrom-Json @jsonOptions | ConvertTo-Json -Depth 12 -Compress
            Assert-True ($json -ceq $snapshots[$path]) "Repeated requests changed the data at $path."
        }
    }
    Write-Host "PASS: $script:assertions assertions; 3 GET routes, 4 purities, 30 consecutive sample days, 120 prices, 404/405 responses, and 2 repeat rounds."
    exit 0
} catch {
    Write-Error "Gold-price API verification failed: $($_.Exception.Message)" -ErrorAction Continue
    exit 1
}
