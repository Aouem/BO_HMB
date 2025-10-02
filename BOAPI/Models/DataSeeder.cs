using Microsoft.EntityFrameworkCore;
using BOAPI.Models;

namespace BOAPI.Data
{
    public static class DataSeeder
    {
        public static void Initialize(IServiceProvider serviceProvider)
        {
            using var context = new BOContext(
                serviceProvider.GetRequiredService<DbContextOptions<BOContext>>());

            SeedCheckListSecuritePatient(context);
            SeedCheckListAnesthesie(context);
            SeedCheckListHygiene(context);
            SeedCheckListTransfusion(context);
            SeedCheckListRadioprotection(context);
            SeedCheckListLogistique(context);
            SeedPersonnel(context);
        }

        // ✅ 1. CheckList Sécurité Patient
        public static void SeedCheckListSecuritePatient(BOContext context)
        {
            var existingCheckList = context.CheckLists
                .Include(c => c.Etapes)
                    .ThenInclude(e => e.Questions)
                .AsSplitQuery() // ← pour éviter le warning EF Core
                .FirstOrDefault(c => c.Libelle == "CHECK-LIST « SÉCURITÉ DU PATIENT AU BLOC OPÉRATOIRE »");

            if (existingCheckList == null)
            {
                existingCheckList = new CheckList
                {
                    Libelle = "CHECK-LIST « SÉCURITÉ DU PATIENT AU BLOC OPÉRATOIRE »",
                    Version = "2018",
                    Description = "Vérifier ensemble pour décider",
                    DateCreation = DateTime.UtcNow,
                    EstActive = true,
                    Etapes = new List<Etape>()
                };
                context.CheckLists.Add(existingCheckList);
            }

            // Mise à jour des propriétés principales
            existingCheckList.Version = "2018";
            existingCheckList.Description = "Vérifier ensemble pour décider";
            existingCheckList.EstActive = true;

            // Supprimer les anciennes étapes et questions
            if (existingCheckList.Etapes.Any())
            {
                context.Questions.RemoveRange(existingCheckList.Etapes.SelectMany(e => e.Questions));
                context.Etapes.RemoveRange(existingCheckList.Etapes);
            }

            // Ajouter les nouvelles étapes
            existingCheckList.Etapes = new List<Etape>
            {
                new Etape
                {
                    Nom = "AVANT INDUCTION ANESTHÉSIQUE - Temps de pause avant anesthésie",
                    Ordre = 0,
                    Questions = new List<Question>
                    {
                        new Question { Texte = "L'identité du patient est correcte", Type = QuestionType.Boolean, EstObligatoire = true },
                        new Question { Texte = "L'autorisation d'opérer est signée", Type = QuestionType.Boolean, EstObligatoire = true },
                        new Question { Texte = "Intervention et site opératoire confirmés", Type = QuestionType.Boolean, EstObligatoire = true },
                        new Question { Texte = "Mode d'installation cohérent et sûr", Type = QuestionType.Boolean, EstObligatoire = true },
                        new Question { Texte = "Préparation cutanée documentée", Type = QuestionType.Boolean, EstObligatoire = true },
                        new Question { Texte = "Matériel vérifié et adapté", Type = QuestionType.Boolean, EstObligatoire = true },
                        new Question { Texte = "Risque allergique, inhalation, saignement ?", Type = QuestionType.BooleanNA }
                    }
                },
                new Etape
                {
                    Nom = "AVANT INTERVENTION CHIRURGICALE - Time-out",
                    Ordre = 1,
                    Questions = new List<Question>
                    {
                        new Question { Texte = "Vérification ultime réalisée", Type = QuestionType.Boolean, EstObligatoire = true },
                        new Question { Texte = "Partage des informations essentielles", Type = QuestionType.Boolean, EstObligatoire = true },
                        new Question { Texte = "Antibiothérapie effectuée", Type = QuestionType.Boolean, EstObligatoire = true },
                        new Question { Texte = "Préparation du champ opératoire correcte", Type = QuestionType.Boolean, EstObligatoire = true }
                    }
                },
                new Etape
                {
                    Nom = "APRÈS INTERVENTION - Pause avant sortie",
                    Ordre = 2,
                    Questions = new List<Question>
                    {
                        new Question { Texte = "Confirmation orale par l'équipe", Type = QuestionType.Boolean, EstObligatoire = true },
                        new Question { Texte = "Prescriptions post-opératoires complètes", Type = QuestionType.Boolean, EstObligatoire = true }
                    }
                }
            };

            context.SaveChanges();
        }

        // ✅ 2. CheckList Anesthésie
        public static void SeedCheckListAnesthesie(BOContext context)
        {
            if (context.CheckLists.Any(c => c.Libelle.Contains("ANESTHÉSIE"))) return;

            var checkList = new CheckList
            {
                Libelle = "CHECK-LIST « ANESTHÉSIE »",
                Version = "2018",
                Description = "Sécurité anesthésique au bloc opératoire",
                DateCreation = DateTime.UtcNow,
                EstActive = true,
                Etapes = new List<Etape>
                {
                    new Etape
                    {
                        Nom = "VÉRIFICATION DU MATÉRIEL",
                        Ordre = 0,
                        Questions = new List<Question>
                        {
                            new Question { Texte = "Machine d’anesthésie fonctionnelle ?", Type = QuestionType.Boolean, EstObligatoire = true },
                            new Question { Texte = "Système d’aspiration vérifié ?", Type = QuestionType.Boolean, EstObligatoire = true },
                            new Question { Texte = "Monitoring prêt ?", Type = QuestionType.Boolean, EstObligatoire = true }
                        }
                    },
                    new Etape
                    {
                        Nom = "VÉRIFICATION PATIENT",
                        Ordre = 1,
                        Questions = new List<Question>
                        {
                            new Question { Texte = "Voie aérienne préparée ?", Type = QuestionType.Boolean, EstObligatoire = true },
                            new Question { Texte = "Voie veineuse posée ?", Type = QuestionType.Boolean, EstObligatoire = true },
                            new Question { Texte = "Allergies connues vérifiées ?", Type = QuestionType.Boolean, EstObligatoire = true }
                        }
                    }
                }
            };

            context.CheckLists.Add(checkList);
            context.SaveChanges();
        }

        // ✅ 3. CheckList Hygiène
        public static void SeedCheckListHygiene(BOContext context)
        {
            if (context.CheckLists.Any(c => c.Libelle.Contains("HYGIÈNE"))) return;

            var checkList = new CheckList
            {
                Libelle = "CHECK-LIST « HYGIÈNE & ASEPSIE »",
                Version = "2018",
                Description = "Prévention des infections au bloc",
                DateCreation = DateTime.UtcNow,
                EstActive = true,
                Etapes = new List<Etape>
                {
                    new Etape
                    {
                        Nom = "AVANT L’INTERVENTION",
                        Ordre = 0,
                        Questions = new List<Question>
                        {
                            new Question { Texte = "Lavage chirurgical effectué ?", Type = QuestionType.Boolean, EstObligatoire = true },
                            new Question { Texte = "Tenue et gants stériles portés ?", Type = QuestionType.Boolean, EstObligatoire = true },
                            new Question { Texte = "Stérilisation du matériel vérifiée ?", Type = QuestionType.Boolean, EstObligatoire = true }
                        }
                    }
                }
            };

            context.CheckLists.Add(checkList);
            context.SaveChanges();
        }

        // ✅ 4. CheckList Transfusion
        public static void SeedCheckListTransfusion(BOContext context)
        {
            if (context.CheckLists.Any(c => c.Libelle.Contains("TRANSFUSION"))) return;

            var checkList = new CheckList
            {
                Libelle = "CHECK-LIST « TRANSFUSION »",
                Version = "2018",
                Description = "Sécurité transfusionnelle",
                DateCreation = DateTime.UtcNow,
                EstActive = true,
                Etapes = new List<Etape>
                {
                    new Etape
                    {
                        Nom = "VÉRIFICATION AVANT TRANSFUSION",
                        Ordre = 0,
                        Questions = new List<Question>
                        {
                            new Question { Texte = "Identité patient confirmée ?", Type = QuestionType.Boolean, EstObligatoire = true },
                            new Question { Texte = "Concordance du groupe sanguin vérifiée ?", Type = QuestionType.Boolean, EstObligatoire = true },
                            new Question { Texte = "Compatibilité croisée effectuée ?", Type = QuestionType.Boolean, EstObligatoire = true }
                        }
                    }
                }
            };

            context.CheckLists.Add(checkList);
            context.SaveChanges();
        }

        // ✅ 5. CheckList Radioprotection
        public static void SeedCheckListRadioprotection(BOContext context)
        {
            if (context.CheckLists.Any(c => c.Libelle.Contains("RADIOPROTECTION"))) return;

            var checkList = new CheckList
            {
                Libelle = "CHECK-LIST « RADIOPROTECTION »",
                Version = "2018",
                Description = "Protection contre l’irradiation",
                DateCreation = DateTime.UtcNow,
                EstActive = true,
                Etapes = new List<Etape>
                {
                    new Etape
                    {
                        Nom = "VÉRIFICATION AVANT EXPOSITION",
                        Ordre = 0,
                        Questions = new List<Question>
                        {
                            new Question { Texte = "Équipements plombés portés ?", Type = QuestionType.Boolean, EstObligatoire = true },
                            new Question { Texte = "Dosimètres portés ?", Type = QuestionType.Boolean, EstObligatoire = true },
                            new Question { Texte = "Signalisation de la radioscopie activée ?", Type = QuestionType.Boolean, EstObligatoire = true }
                        }
                    }
                }
            };

            context.CheckLists.Add(checkList);
            context.SaveChanges();
        }

        // ✅ 6. CheckList Logistique
        public static void SeedCheckListLogistique(BOContext context)
        {
            if (context.CheckLists.Any(c => c.Libelle.Contains("LOGISTIQUE"))) return;

            var checkList = new CheckList
            {
                Libelle = "CHECK-LIST « LOGISTIQUE & MATÉRIEL »",
                Version = "2018",
                Description = "Disponibilité et fonctionnement du matériel",
                DateCreation = DateTime.UtcNow,
                EstActive = true,
                Etapes = new List<Etape>
                {
                    new Etape
                    {
                        Nom = "VÉRIFICATION MATÉRIEL",
                        Ordre = 0,
                        Questions = new List<Question>
                        {
                            new Question { Texte = "Aspiration fonctionnelle ?", Type = QuestionType.Boolean, EstObligatoire = true },
                            new Question { Texte = "Bistouri électrique testé ?", Type = QuestionType.Boolean, EstObligatoire = true },
                            new Question { Texte = "Lampe scialytique fonctionnelle ?", Type = QuestionType.Boolean, EstObligatoire = true }
                        }
                    }
                }
            };

            context.CheckLists.Add(checkList);
            context.SaveChanges();
        }

        // ✅ Seed Personnel
        public static void SeedPersonnel(BOContext context)
        {
            if (!context.Personnels.Any())
            {
                var personnels = new List<Personnel>
                {
                    new Personnel { Nom = "DUPONT", Prenom = "Jean", Role = "Chirurgien", Matricule = "CHIR001" },
                    new Personnel { Nom = "MARTIN", Prenom = "Marie", Role = "Anesthésiste", Matricule = "ANES001" },
                    new Personnel { Nom = "BERNARD", Prenom = "Pierre", Role = "Infirmier", Matricule = "INF001" },
                    new Personnel { Nom = "DUBOIS", Prenom = "Sophie", Role = "IADE", Matricule = "IADE001" }
                };

                context.Personnels.AddRange(personnels);
                context.SaveChanges();
            }
        }
    }
}
