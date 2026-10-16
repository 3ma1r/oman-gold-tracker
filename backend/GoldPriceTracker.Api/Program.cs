using System.Reflection;
using GoldPriceTracker.Api.Services;

var builder = WebApplication.CreateBuilder(args);
const string LocalAngularCorsPolicy = "LocalAngular";

// Add services to the container.

builder.Services.AddControllers();
if (builder.Environment.IsDevelopment())
{
    builder.Services.AddCors(options => options.AddPolicy(LocalAngularCorsPolicy, policy => policy
        .WithOrigins("http://localhost:4200", "http://127.0.0.1:4200")
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
}

app.UseHttpsRedirection();
app.UseRouting();
if (app.Environment.IsDevelopment())
{
    app.UseCors(LocalAngularCorsPolicy);
}

app.UseAuthorization();

app.MapControllers();

app.Run();
