![Oman Gold Tracker cover banner featuring the Arabic project name and an Omani developer illustration](images/readme-cover.png)

# Oman Gold Tracker — الذهب العُماني

A responsive Angular and ASP.NET Core dashboard for exploring sample gold prices in Oman. It combines purity-based price cards, a calculator, interactive price history, and a complete history table in a warm, bilingual interface.

[View Live Demo](https://gold-tracker-oman.netlify.app/)

## App Preview

![Oman Gold Tracker dashboard in Arabic with the light theme](images/dashboard-arabic-light.png)

*Arabic · Light Mode*

![Oman Gold Tracker dashboard in English with the dark theme](images/dashboard-english-dark.png)

*English · Dark Mode*

Repository: [github.com/3ma1r/oman-gold-tracker](https://github.com/3ma1r/oman-gold-tracker)

## Features

- API-backed sample prices for **18K, 21K, 22K, and 24K**, with consistency checks before data is displayed.
- Gold calculator with positive decimal weights, validation, calculation details, and **1g, 5g, 10g, and 20g** shortcuts.
- Interactive SVG chart with purity switching, latest/highest/lowest statistics, previous-day comparison, pointer and keyboard selection, and 30-day playback.
- CSV export of the complete price history using ISO dates and three-decimal OMR-per-gram values.
- Interactive purity explorer with percentages, a 24-part visual breakdown, sample prices, and calculator handoff.
- All 30 history rows with alternating colours and horizontal scrolling on smaller screens.
- Localized loading, validation, API failure, timeout, and manual retry states without frontend price fallbacks.
- Arabic/English switching, RTL/LTR layouts, light/dark themes, and saved preferences.
- Responsive navigation, active-section highlighting, visible keyboard focus, and reduced-motion support.

## Architecture and Technology

The Angular application communicates with a Controller-based ASP.NET Core API through a typed `HttpClient` service.

A shared Angular data service requests the latest prices and history together, validates their metadata, dates, and values, then provides one consistent dataset to every price-dependent feature.

| Role | Technology | Version |
| --- | --- | --- |
| Frontend framework | Angular, standalone components and signals | 20.3.33 |
| Styling | Tailwind CSS and native CSS | 4.3.3 |
| Backend framework | ASP.NET Core Web API | .NET 10.0 |
| API documentation | Swashbuckle / Swagger UI | 10.3.0 |
| Frontend language | TypeScript, strict mode | 5.9.3 |
| Frontend build tooling | Angular CLI / Angular build package | 20.3.39 |
| Frontend testing | Karma / Jasmine | 6.4.4 / 5.9.0 |

Charts, branding, and interface icons use native SVG. Translation, themes, formatting, and application state are implemented without external chart or translation libraries.

The Angular application is client-rendered without routing, SSR, or prerendering.

## Prerequisites

- Git.
- **Node.js `^20.19.0`, `^22.12.0`, or `^24.0.0`**, with npm.
- **.NET 10 SDK**.
- Google Chrome for the headless Angular test suite.

Development used Node.js **22.18.0**, npm **10.9.3**, and .NET SDK **10.0.402**. A global Angular CLI installation is not required.

## Local Setup

Clone the repository and install frontend dependencies:

```bash
git clone https://github.com/3ma1r/oman-gold-tracker.git
cd oman-gold-tracker
npm ci
```

Start the API in the first terminal:

```bash
dotnet run --project backend/GoldPriceTracker.Api --launch-profile http
```

Start Angular in a second terminal from the repository root:

```bash
npm start
```

| Service | Local URL |
| --- | --- |
| Angular application | http://localhost:4200/ |
| ASP.NET Core API | http://localhost:5118 |
| Swagger UI | http://localhost:5118/swagger |

Keep both applications running while using the dashboard. Swagger UI is enabled in the Development environment.

### API Configuration

Local development uses `src/environments/environment.development.ts`, with `apiBaseUrl` set to `http://localhost:5118`.

For production, configure `apiBaseUrl` with the hosted API’s HTTPS address and allow the deployed frontend origin in the API’s CORS policy. Rebuild Angular after changing its production configuration. Never use a localhost API address for the public deployment.

## API

The API uses Controllers, dependency injection, an immutable in-memory dataset, `DateOnly`, and `decimal`. Responses contain numeric prices and ISO date-only strings without localized display formatting.

| Request | Result |
| --- | --- |
| `GET /api/gold-prices` | Latest prices for all four supported purities |
| `GET /api/gold-prices/{karat}` | Latest price for 18K, 21K, 22K, or 24K |
| `GET /api/gold-prices/history` | All 30 days, oldest first |

### Example Requests

```text
GET http://localhost:5118/api/gold-prices
GET http://localhost:5118/api/gold-prices/24
GET http://localhost:5118/api/gold-prices/history
```

Successful responses identify the currency as `OMR`, the unit as `gram`, and the records as sample data.

- **200 OK:** successful price or history request.
- **404 Not Found:** unsupported purity or invalid route. Unsupported integer purities, such as `/api/gold-prices/19`, return a Problem Details response.
- **405 Method Not Allowed:** unsupported HTTP method for an existing endpoint.

The development CORS policy allows `http://localhost:4200` and `http://127.0.0.1:4200` without enabling credentials or arbitrary origins.

## Build and Verification

### Production Builds

Run from the repository root:

```bash
npm run build
dotnet build backend/GoldPriceTracker.Api/GoldPriceTracker.Api.csproj --configuration Release
```

Build output locations:

- Angular: `dist/oman-gold-tracker/browser/`
- API: `backend/GoldPriceTracker.Api/bin/Release/net10.0/`

### Angular Tests

Run the test suite once in headless Chrome:

```bash
npm test -- --watch=false --browsers=ChromeHeadless
```

### API Verification

With the API running, execute the dependency-free PowerShell verification script:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\backend\scripts\Verify-GoldPrices.ps1 -BaseUrl http://localhost:5118
```

The script checks response structures, supported purities, consecutive dates, rounding, HTTP responses, and repeat-request stability. It returns a nonzero exit code when an assertion fails.

Additional example requests are available in:

```text
backend/GoldPriceTracker.Api/GoldPriceTracker.Api.http
```

## Project Structure

```text
backend/
  GoldPriceTracker.Api/
    Controllers/             Gold-price HTTP endpoints
    Data/                    Immutable 30-day 24K source series
    Models/                  Typed API response records
    Services/                In-memory price service and interface
    Program.cs               Controllers, Swagger, CORS, and DI setup
  scripts/                   PowerShell API verification

images/                      README cover and dashboard previews

public/
  favicon.svg                SVG brand mark
  images/oman-gold-hero.png   Panoramic hero artwork

src/
  app/
    components/              Dashboard sections and controls
    data/                    Arabic/English translations
    models/                  UI and API response types
    services/                API, shared data, formatting, language, and theme
    testing/                 Test-only fixtures and helpers
  environments/              Development and production API configuration
  index.html                 Document shell and theme initialization
  styles.css                 Tailwind, theme tokens, layout, and motion

angular.json                 Angular build and test configuration
package.json                 Frontend scripts and dependencies
package-lock.json            Locked frontend dependency versions
```

## Sample Data and Calculations

The API owns exactly **30 consecutive calendar dates: 29 March–27 April 2025**.

Prices are static illustrations, **not live prices or verified historical market rates**. No database, API key, authentication, or live-price provider is required.

Only the 24K series is stored. The API calculates other purities using `24K price × karat / 24`, rounded half-up to three decimal places. Latest prices come from the final history record, keeping all endpoints consistent.

Angular has no runtime sample-price fallback. Prices are displayed only after the latest and history responses pass validation. Failed requests show localized guidance and a Retry button.

The calculator uses:

```text
Estimated total (OMR) = weight (grams) × selected purity price (OMR/gram)
```

All displayed prices and totals use three decimal places. Estimates exclude making charges and other fees.

## Main Controls

- **Navigation:** use the desktop links or mobile menu to move between sections. The visible section is highlighted.
- **Price cards and purity explorer:** select a purity and send it to the calculator without changing the entered weight or calculating automatically.
- **Calculator:** choose a purity, enter a positive weight or use a shortcut, then press Calculate or Enter.
- **Chart:** switch purity and hover, click, or tap to inspect prices. Use arrow keys to navigate, Home/End for endpoints, and Escape to clear selection.
- **Playback:** press Play to advance through dates, Pause to stop, Restart to return to the beginning, or drag the date slider.
- **CSV export:** download all loaded history rows with ISO dates, English column headers, three-decimal prices, and Excel-compatible UTF-8 encoding.
- **Language/theme:** switch Arabic/English and light/dark mode from the header. Preferences are remembered on reload.
- **Error recovery:** use Retry to reload prices and history after a connection or data failure.

## Assets

Hero artwork is stored at `public/images/oman-gold-hero.png`. Branding, the favicon, interface icons, and charts use local or inline SVG. No external icon library or remote runtime image is required.