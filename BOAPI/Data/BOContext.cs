using Microsoft.EntityFrameworkCore;
using BOAPI.Models;

namespace BOAPI.Data
{
    public class BOContext : DbContext
    {
        public BOContext(DbContextOptions<BOContext> options) : base(options) { }

        public DbSet<CheckList> CheckLists { get; set; } = null!;
        public DbSet<Etape> Etapes { get; set; } = null!;
        public DbSet<Question> Questions { get; set; } = null!;
        public DbSet<ResponseOption> ResponseOptions { get; set; } = null!;
        public DbSet<Personnel> Personnels { get; set; } = null!;
        public DbSet<CheckListItem> CheckListItems { get; set; } = null!;

        // ✅ Historique des soumissions
        public DbSet<FormSubmission> FormSubmissions { get; set; } = null!;
        public DbSet<FormAnswer> FormAnswers { get; set; } = null!;

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            // ===== Relations existantes =====
            modelBuilder.Entity<CheckList>()
                .HasMany(c => c.Etapes)
                .WithOne(e => e.CheckList)
                .HasForeignKey(e => e.CheckListId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<Etape>()
                .HasMany(e => e.Questions)
                .WithOne(q => q.Etape)
                .HasForeignKey(q => q.EtapeId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<Question>()
                .HasMany(q => q.Options)
                .WithOne(o => o.Question)
                .HasForeignKey(o => o.QuestionId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<Personnel>()
                .HasMany(p => p.EtapesValidees)
                .WithOne(e => e.ValideePar)
                .HasForeignKey(e => e.ValideeParId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<Personnel>()
                .HasMany(p => p.QuestionsValidees)
                .WithOne(q => q.ValideePar)
                .HasForeignKey(q => q.ValideeParId)
                .OnDelete(DeleteBehavior.Restrict);

            // Enums → string
            modelBuilder.Entity<Question>()
                .Property(q => q.Type)
                .HasConversion<string>();

            // Index utiles
            modelBuilder.Entity<CheckList>()
                .HasIndex(c => c.EstActive);

            modelBuilder.Entity<Etape>()
                .HasIndex(e => new { e.CheckListId, e.Ordre });

            modelBuilder.Entity<Personnel>()
                .HasIndex(p => p.Matricule)
                .IsUnique();

            modelBuilder.Entity<CheckListItem>()
                .HasOne(cli => cli.Question)
                .WithMany()
                .HasForeignKey(cli => cli.QuestionId)
                .OnDelete(DeleteBehavior.SetNull);

            // ===== ✅ Nouvelles relations pour l'historique =====
            modelBuilder.Entity<FormSubmission>()
                .HasOne(s => s.CheckList)
                .WithMany() // pas de collection inverse requise
                .HasForeignKey(s => s.CheckListId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<FormSubmission>()
                .Property(s => s.SubmittedAt)
                .HasDefaultValueSql("GETUTCDATE()");

            modelBuilder.Entity<FormSubmission>()
                .Property(s => s.SubmittedBy)
                .HasMaxLength(128);

            modelBuilder.Entity<FormAnswer>()
                .HasOne(a => a.Submission)
                .WithMany(s => s.Answers)
                .HasForeignKey(a => a.SubmissionId)
                .OnDelete(DeleteBehavior.Cascade);

            // ✅ CONFIGURATION CORRIGÉE - Sans propriété de navigation inverse
            modelBuilder.Entity<FormAnswer>()
                .HasOne(a => a.Question)
                .WithMany() // Sans propriété de navigation dans Question
                .HasForeignKey(a => a.QuestionId)
                .OnDelete(DeleteBehavior.Restrict); // Garder Restrict pour préserver l'historique

            modelBuilder.Entity<FormAnswer>()
                .Property(a => a.Reponse)
                .HasMaxLength(256);

            // Index pour requêtes fréquentes
            modelBuilder.Entity<FormSubmission>()
                .HasIndex(s => new { s.CheckListId, s.SubmittedAt });

            modelBuilder.Entity<FormAnswer>()
                .HasIndex(a => a.SubmissionId);

            modelBuilder.Entity<FormAnswer>()
                .HasIndex(a => a.QuestionId);
        }
    }
}