using System.Reflection;
using GoldPriceTracker.Api.Services;

var builder = WebApplication.CreateBuilder(args);
const string LocalAngularCorsPolicy = "LocalAngular";
const string ProductionAngularCorsPolicy = "ProductionAngular";

// Add services to the container.

builder.Services.AddControllers();
if (builder.Environment.IsDevelopment())
{
    builder.Services.AddCors(options => options.AddPolicy(LocalAngularCorsPolicy, policy => policy
        .WithOrigins("http://localhost:4200", "http://127.0.0.1:4200")
        .WithMethods(HttpMethods.Get)
        .WithHeaders("Accept", "Content-Type")));
}
else
{
    var allowedOrigins = builder.Configuration.GetRequiredSection("Cors:AllowedOrigins").Get<string[]>()
        ?? throw new InvalidOperationException("Production CORS origins must be configured.");
    builder.Services.AddCors(options => options.AddPolicy(ProductionAngularCorsPolicy, policy => policy
        .WithOrigins(allowedOrigins)
        .WithMethods(HttpMethods.Get)
        .WithHeaders("Accept", "Content-Type")));
}
builder.Services.AddSingleton<IGoldPriceService, GoldPriceService>();
builder.Services.AddSwaggerGen(options =>
{
    var xmlFile = $"{Assembly.GetExecutingAssembly().GetName().Name}.xml";
    options.IncludeXmlComments(Path.Combine(AppContext.BaseDirectory, xmlFile), includeControllerXmlComments: true);
});

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
    app.UseHttpsRedirection();
}

// Render terminates TLS and redirects public HTTP at its edge. Keep the production
// hop HTTP to avoid redirect loops; this API does not consume forwarded headers.
app.UseRouting();
app.UseCors(app.Environment.IsDevelopment() ? LocalAngularCorsPolicy : ProductionAngularCorsPolicy);

app.UseAuthorization();

app.MapControllers();

app.Run();
