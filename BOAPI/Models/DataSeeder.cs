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

            // ✅ VÉRIFICATION GLOBALE - Éviter tout re-seeding si données existent
            if (context.CheckLists.Any())
            {
                Console.WriteLine("✅ Base de données déjà initialisée - skip du seeding");
                return;
            }

            try
            {
                Console.WriteLine("🔧 Début de l'initialisation des données...");
                
                SeedCheckListSecuritePatient(context);
                SeedCheckListAnesthesie(context);
                SeedCheckListHygiene(context);
                SeedCheckListTransfusion(context);
                SeedCheckListRadioprotection(context);
                SeedCheckListLogistique(context);
                SeedPersonnel(context);
                
                Console.WriteLine("✅ Seed des données terminé avec succès !");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"❌ Erreur lors du seed des données: {ex.Message}");
                throw;
            }
        }

        // ✅ 1. CheckList Sécurité Patient - VERSION CORRIGÉE
        public static void SeedCheckListSecuritePatient(BOContext context)
        {
            if (context.CheckLists.Any(c => c.Libelle.Contains("SÉCURITÉ DU PATIENT"))) 
            {
                Console.WriteLine("✅ Checklist Sécurité Patient déjà existante");
                return;
            }

            Console.WriteLine("🔧 Création de la Checklist Sécurité Patient...");

            var checkList = new CheckList
            {
                Libelle = "CHECK-LIST « SÉCURITÉ DU PATIENT AU BLOC OPÉRATOIRE »",
                Version = "2018",
                Description = "Vérifier ensemble pour décider",
                DateCreation = DateTime.UtcNow,
                EstActive = true,
                Etapes = new List<Etape>
                {
                    new Etape
                    {
                        Nom = "AVANT INDUCTION ANESTHÉSIQUE - Temps de pause avant anesthésie",
                        Ordre = 0,
                        Questions = new List<Question>
                        {
                            new Question { 
                                Texte = "L'identité du patient est correcte", 
                                Type = QuestionType.Boolean, 
                                EstObligatoire = true
                            },
                            new Question { 
                                Texte = "L'autorisation d'opérer est signée par les parents ou le représentant légal", 
                                Type = QuestionType.Boolean, 
                                EstObligatoire = true
                            },
                            new Question { 
                                Texte = "L'intervention et le site opératoire sont confirmés : idéalement par le patient et, dans tous les cas, par le dossier ou procédure spécifique. La documentation clinique et sans clinique nécessaire est disponible en salle.", 
                                Type = QuestionType.Boolean, 
                                EstObligatoire = true
                            },
                            new Question { 
                                Texte = "Le mode d'installation est connu de l'équipe en salle, cohérent avec le site/l'intervention et non dangereux pour le patient", 
                                Type = QuestionType.Boolean, 
                                EstObligatoire = true
                            },
                            new Question { 
                                Texte = "La préparation cutanée de l'opéré est documentée dans la fiche de liaison service/bloc opératoire (ou autre procédure en œuvre dans l'établissement)", 
                                Type = QuestionType.Boolean, 
                                EstObligatoire = true
                            },
                            new Question { 
                                Texte = "L'équipement/le matériel nécessaires pour l'intervention sont vérifiés et adaptés au poids et à la taille du patient (pour la partie chirurgicale et pour la partie anesthésique)", 
                                Type = QuestionType.Boolean, 
                                EstObligatoire = true
                            },
                            new Question { 
                                Texte = "Le patient présente-t-il un : risque allergique, risque d'inhalation, de difficulté d'intubation ou de ventilation au masque, risque de saignement important", 
                                Type = QuestionType.Boolean, 
                                EstObligatoire = false
                            }
                        }
                    },
                    new Etape
                    {
                        Nom = "AVANT INTERVENTION CHIRURGICALE - Temps de pause avant incision (time-out)",
                        Ordre = 1,
                        Questions = new List<Question>
                        {
                            new Question { 
                                Texte = "Vérification « ultime » discutée au sein de l'équipe en présence des chirurgiens, anesthésistes, IADE-BODEF/IDE : identité patient confirmée, intervention prévue confirmée, site opératoire confirmé, installation correcte confirmée, documents nécessaires disponibles (notamment imagerie)", 
                                Type = QuestionType.Boolean, 
                                EstObligatoire = true
                            },
                            new Question { 
                                Texte = "Partage des informations essentielles oralement au sein de l'équipe sur les éléments à risque/étapes critiques de l'intervention : sur le plan chirurgical (temps opératoire difficile, points spécifiques, identification des matériels) et sur le plan anesthésique (problèmes potentiels liés au monitorage)", 
                                Type = QuestionType.Boolean, 
                                EstObligatoire = true
                            },
                            new Question { 
                                Texte = "L'antibiothérapie a été effectuée selon les recommandations et protocoles en vigueur dans l'établissement", 
                                Type = QuestionType.Boolean, 
                                EstObligatoire = true
                            },
                            new Question { 
                                Texte = "La préparation du champ opératoire est réalisée selon le protocole en vigueur dans l'établissement", 
                                Type = QuestionType.Boolean, 
                                EstObligatoire = true
                            }
                        }
                    },
                    new Etape
                    {
                        Nom = "APRÈS INTERVENTION - Pause avant sortie de salle d'opération",
                        Ordre = 2,
                        Questions = new List<Question>
                        {
                            new Question { 
                                Texte = "Confirmation orale par le personnel auprès de l'équipe : intervention enregistrée, compte final correct, compresses/aiguilles/instruments, étiquetage des prélèvements/pièces opératoires. Si événements indésirables : signalement/déclaration effectué.", 
                                Type = QuestionType.BooleanNA, 
                                EstObligatoire = true
                            },
                            new Question { 
                                Texte = "Les prescriptions et la surveillance post-opératoires (y compris les seuils d'alerte spécifiques) sont faites complètement par l'équipe chirurgicale et anesthésique et adaptées à l'âge, au poids et à la taille du patient", 
                                Type = QuestionType.Boolean, 
                                EstObligatoire = true
                            }
                        }
                    },
                    new Etape
                    {
                        Nom = "DÉCISION FINALE",
                        Ordre = 3,
                        Questions = new List<Question>
                        {
                            new Question { 
                                Texte = "GO = OK pour incision", 
                                Type = QuestionType.Boolean, 
                                EstObligatoire = true
                            },
                            new Question { 
                                Texte = "NO GO = Pas d'incision", 
                                Type = QuestionType.Boolean, 
                                EstObligatoire = false
                            },
                            new Question { 
                                Texte = "Si NO GO, conséquence sur l'intervention : Retard ou Annulation", 
                                Type = QuestionType.Boolean, 
                                EstObligatoire = false
                            }
                        }
                    }
                }
            };

            context.CheckLists.Add(checkList);
            context.SaveChanges();
            Console.WriteLine("✅ Checklist Sécurité Patient créée avec succès");
        }

        // ✅ 2. CheckList Anesthésie
        public static void SeedCheckListAnesthesie(BOContext context)
        {
            if (context.CheckLists.Any(c => c.Libelle.Contains("ANESTHÉSIE"))) 
            {
                Console.WriteLine("✅ Checklist Anesthésie déjà existante");
                return;
            }

            Console.WriteLine("🔧 Création de la Checklist Anesthésie...");

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
                            new Question { Texte = "Machine d'anesthésie fonctionnelle ?", Type = QuestionType.Boolean, EstObligatoire = true },
                            new Question { Texte = "Système d'aspiration vérifié ?", Type = QuestionType.Boolean, EstObligatoire = true },
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
            Console.WriteLine("✅ Checklist Anesthésie créée avec succès");
        }

        // ✅ 3. CheckList Hygiène
        public static void SeedCheckListHygiene(BOContext context)
        {
            if (context.CheckLists.Any(c => c.Libelle.Contains("HYGIÈNE"))) 
            {
                Console.WriteLine("✅ Checklist Hygiène déjà existante");
                return;
            }

            Console.WriteLine("🔧 Création de la Checklist Hygiène...");

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
                        Nom = "AVANT L'INTERVENTION",
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
            Console.WriteLine("✅ Checklist Hygiène créée avec succès");
        }

        // ✅ 4. CheckList Transfusion
        public static void SeedCheckListTransfusion(BOContext context)
        {
            if (context.CheckLists.Any(c => c.Libelle.Contains("TRANSFUSION"))) 
            {
                Console.WriteLine("✅ Checklist Transfusion déjà existante");
                return;
            }

            Console.WriteLine("🔧 Création de la Checklist Transfusion...");

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
            Console.WriteLine("✅ Checklist Transfusion créée avec succès");
        }

        // ✅ 5. CheckList Radioprotection
        public static void SeedCheckListRadioprotection(BOContext context)
        {
            if (context.CheckLists.Any(c => c.Libelle.Contains("RADIOPROTECTION"))) 
            {
                Console.WriteLine("✅ Checklist Radioprotection déjà existante");
                return;
            }

            Console.WriteLine("🔧 Création de la Checklist Radioprotection...");

            var checkList = new CheckList
            {
                Libelle = "CHECK-LIST « RADIOPROTECTION »",
                Version = "2018",
                Description = "Protection contre l'irradiation",
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
            Console.WriteLine("✅ Checklist Radioprotection créée avec succès");
        }

        // ✅ 6. CheckList Logistique
        public static void SeedCheckListLogistique(BOContext context)
        {
            if (context.CheckLists.Any(c => c.Libelle.Contains("LOGISTIQUE"))) 
            {
                Console.WriteLine("✅ Checklist Logistique déjà existante");
                return;
            }

            Console.WriteLine("🔧 Création de la Checklist Logistique...");

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
            Console.WriteLine("✅ Checklist Logistique créée avec succès");
        }

        // ✅ Seed Personnel
        public static void SeedPersonnel(BOContext context)
        {
            if (context.Personnels.Any())
            {
                Console.WriteLine("✅ Personnel déjà existant");
                return;
            }

            Console.WriteLine("🔧 Création du Personnel...");

            var personnels = new List<Personnel>
            {
                new Personnel { Nom = "DUPONT", Prenom = "Jean", Role = "Chirurgien", Matricule = "CHIR001" },
                new Personnel { Nom = "MARTIN", Prenom = "Marie", Role = "Anesthésiste", Matricule = "ANES001" },
                new Personnel { Nom = "BERNARD", Prenom = "Pierre", Role = "Infirmier", Matricule = "INF001" },
                new Personnel { Nom = "DUBOIS", Prenom = "Sophie", Role = "IADE", Matricule = "IADE001" }
            };

            context.Personnels.AddRange(personnels);
            context.SaveChanges();
            Console.WriteLine("✅ Personnel créé avec succès");
        }
    }
}