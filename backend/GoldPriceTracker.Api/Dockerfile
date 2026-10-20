# Build context: backend/GoldPriceTracker.Api
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

COPY GoldPriceTracker.Api.csproj ./
RUN dotnet restore GoldPriceTracker.Api.csproj

COPY . ./
RUN dotnet publish GoldPriceTracker.Api.csproj --configuration Release --no-restore \
    --output /app/publish /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app
ENV ASPNETCORE_ENVIRONMENT=Production \
    ASPNETCORE_HTTP_PORTS=8080
EXPOSE 8080

COPY --from=build /app/publish ./
USER $APP_UID
ENTRYPOINT ["dotnet", "GoldPriceTracker.Api.dll"]
