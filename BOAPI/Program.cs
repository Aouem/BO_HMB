using BOAPI.Data;
using Microsoft.EntityFrameworkCore;
using BOAPI.Models;

var builder = WebApplication.CreateBuilder(args);

// 🔹 Ajouter DbContext
builder.Services.AddDbContext<BOContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection"))
);

// 🔹 Ajouter CORS
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.WithOrigins("http://localhost:4200")
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

// 🔹 SEED DATA après création de l'app
using (var scope = app.Services.CreateScope())
{
    var services = scope.ServiceProvider;
    try
    {
        var context = services.GetRequiredService<BOContext>();

        // Appliquer les migrations automatiquement
        context.Database.Migrate();

        // Seed des données
        DataSeeder.SeedCheckListSecuritePatient(context);
        DataSeeder.SeedCheckListAnesthesie(context);
        DataSeeder.SeedCheckListHygiene(context);
        DataSeeder.SeedCheckListTransfusion(context);
        DataSeeder.SeedCheckListRadioprotection(context);
        DataSeeder.SeedCheckListLogistique(context);
        DataSeeder.SeedPersonnel(context);
    }
    catch (Exception ex)
    {
        var logger = services.GetRequiredService<ILogger<Program>>();
        logger.LogError(ex, "Une erreur est survenue lors du seed des données.");
    }
}

// 🔹 Swagger uniquement en dev
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

// 🔹 CORS avant UseAuthorization
app.UseCors();

app.UseHttpsRedirection();
app.UseAuthorization();
app.MapControllers();

app.Run();
