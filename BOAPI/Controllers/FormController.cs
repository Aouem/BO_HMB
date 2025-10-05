using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using BOAPI.Data;
using BOAPI.Models;
using System.ComponentModel.DataAnnotations;

namespace BOAPI.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class FormController : ControllerBase
    {
        private readonly BOContext _db;

        public FormController(BOContext db)
        {
            _db = db;
        }

        // POST api/Form/submit
        [HttpPost("submit")]
        public async Task<ActionResult<FormSubmissionDto>> Submit([FromBody] FormResponseDto dto)
        {
            // DEBUG: Log du payload reçu COMPLET
            Console.WriteLine($"🔍 DEBUG SUBMIT - ChecklistId: {dto?.CheckListId}");
            Console.WriteLine($"🔍 DEBUG SUBMIT - Nombre de réponses: {dto?.Reponses?.Count ?? 0}");
            Console.WriteLine($"🔍 DEBUG SUBMIT - SubmittedBy: {dto?.SubmittedBy}");
            Console.WriteLine($"🔍 DEBUG SUBMIT - DecisionFinale: {dto?.DecisionFinale}");
            Console.WriteLine($"🔍 DEBUG SUBMIT - Consequence: {dto?.Consequence}");
            
            if (dto?.Reponses != null)
            {
                foreach (var reponse in dto.Reponses)
                {
                    Console.WriteLine($"  📝 QuestionId: {reponse.QuestionId}, Réponse: '{reponse.Reponse}'");
                }
            }
            else
            {
                Console.WriteLine("⚠️  DEBUG: Aucune réponse reçue dans le payload!");
            }

            if (dto == null)
            {
                return BadRequest("Les données de soumission sont requises.");
            }

            // Validation des données d'entrée
            if (dto.CheckListId <= 0)
            {
                return BadRequest("CheckListId est invalide.");
            }

            // Vérifier si la checklist existe
            var checklistExists = await _db.CheckLists.AnyAsync(c => c.Id == dto.CheckListId);
            if (!checklistExists)
            {
                return NotFound($"CheckList avec l'ID {dto.CheckListId} non trouvée.");
            }

            try
            {
                // Créer une nouvelle soumission AVEC les champs de décision
                var submission = new FormSubmission
                {
                    CheckListId = dto.CheckListId,
                    SubmittedBy = string.IsNullOrEmpty(dto.SubmittedBy) ? "Utilisateur Anonyme" : dto.SubmittedBy,
                    SubmittedAt = DateTime.UtcNow,
                    DecisionFinale = dto.DecisionFinale ?? string.Empty,  // ✅ AJOUTER
                    Consequence = dto.Consequence ?? string.Empty         // ✅ AJOUTER
                };

                _db.FormSubmissions.Add(submission);
                await _db.SaveChangesAsync(); // Génère submission.Id

                Console.WriteLine($"✅ DEBUG: Soumission créée avec ID: {submission.Id}");
                Console.WriteLine($"✅ DEBUG: Décision sauvegardée: {submission.DecisionFinale}");
                Console.WriteLine($"✅ DEBUG: Conséquence sauvegardée: {submission.Consequence}");

                // Valider les QuestionIds par rapport à la checklist
                var validQuestionIds = await _db.Questions
                    .Where(q => q.Etape.CheckListId == dto.CheckListId)
                    .Select(q => q.Id)
                    .ToHashSetAsync();

                // Préparer les réponses
                var answersToAdd = new List<FormAnswer>();
                foreach (var response in dto.Reponses ?? Enumerable.Empty<QuestionResponseDto>())
                {
                    if (!validQuestionIds.Contains(response.QuestionId))
                    {
                        Console.WriteLine($"❌ DEBUG: QuestionId {response.QuestionId} non valide pour checklist {dto.CheckListId}");
                        return BadRequest($"QuestionId {response.QuestionId} ne correspond pas à la checklist {dto.CheckListId}");
                    }

                    answersToAdd.Add(new FormAnswer
                    {
                        SubmissionId = submission.Id,
                        QuestionId = response.QuestionId,
                        Reponse = response.Reponse ?? string.Empty
                    });
                }

                Console.WriteLine($"🔍 DEBUG: {answersToAdd.Count} réponses à ajouter");

                // Ajouter toutes les réponses en une fois
                if (answersToAdd.Any())
                {
                    _db.FormAnswers.AddRange(answersToAdd);
                    await _db.SaveChangesAsync();
                    Console.WriteLine($"✅ DEBUG: {answersToAdd.Count} réponses sauvegardées");
                }
                else
                {
                    Console.WriteLine("⚠️  DEBUG: Aucune réponse à sauvegarder!");
                }

                // Construire la réponse COMPLÈTE
                var result = new FormSubmissionDto
                {
                    Id = submission.Id,
                    CheckListId = submission.CheckListId,
                    SubmittedBy = submission.SubmittedBy,
                    SubmittedAt = submission.SubmittedAt,
                    DecisionFinale = submission.DecisionFinale,  // ✅ AJOUTER
                    Consequence = submission.Consequence,         // ✅ AJOUTER
                    Reponses = answersToAdd.Select(a => new QuestionResponseDto
                    {
                        QuestionId = a.QuestionId,
                        Reponse = a.Reponse
                    }).ToList()
                };

                Console.WriteLine($"✅ DEBUG: Soumission {submission.Id} complétée avec:");
                Console.WriteLine($"  - {result.Reponses.Count} réponses");
                Console.WriteLine($"  - Décision: {result.DecisionFinale}");
                Console.WriteLine($"  - Conséquence: {result.Consequence}");

                return Ok(result);
            }
            catch (DbUpdateException dbEx)
            {
                Console.WriteLine($"❌ DEBUG: Erreur DB: {dbEx.InnerException?.Message ?? dbEx.Message}");
                return StatusCode(500, $"Erreur de base de données: {dbEx.InnerException?.Message ?? dbEx.Message}");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"❌ DEBUG: Erreur: {ex.Message}");
                return StatusCode(500, $"Erreur interne du serveur: {ex.Message}");
            }
        }

        // GET api/Form/submissions?checkListId=1
        [HttpGet("submissions")]
        public async Task<ActionResult<IEnumerable<FormSubmissionDto>>> GetSubmissions([FromQuery] int checkListId)
        {
            Console.WriteLine($"🔍 DEBUG GETSUBMISSIONS - ChecklistId: {checkListId}");

            if (checkListId <= 0)
            {
                return BadRequest("checkListId doit être supérieur à 0.");
            }

            try
            {
                var submissions = await _db.FormSubmissions
                    .AsNoTracking()
                    .Where(s => s.CheckListId == checkListId)
                    .Include(s => s.Answers)
                    .OrderByDescending(s => s.SubmittedAt)
                    .Select(s => new FormSubmissionDto
                    {
                        Id = s.Id,
                        CheckListId = s.CheckListId,
                        SubmittedAt = s.SubmittedAt,
                        SubmittedBy = s.SubmittedBy,
                        DecisionFinale = s.DecisionFinale,  // ✅ AJOUTER
                        Consequence = s.Consequence,         // ✅ AJOUTER
                        Reponses = s.Answers.Select(a => new QuestionResponseDto
                        {
                            QuestionId = a.QuestionId,
                            Reponse = a.Reponse
                        }).ToList()
                    })
                    .ToListAsync();

                Console.WriteLine($"✅ DEBUG GETSUBMISSIONS: {submissions.Count} soumissions trouvées pour checklist {checkListId}");
                foreach (var sub in submissions)
                {
                    Console.WriteLine($"  📄 Soumission {sub.Id}: {sub.Reponses.Count} réponses, Décision: {sub.DecisionFinale}, Conséquence: {sub.Consequence}");
                }

                return Ok(submissions);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"❌ DEBUG GETSUBMISSIONS: Erreur: {ex.Message}");
                return StatusCode(500, $"Erreur lors de la récupération des soumissions: {ex.Message}");
            }
        }

        // GET api/Form/submission/{id}
        [HttpGet("submission/{id}")]
        public async Task<ActionResult<FormSubmissionDto>> GetSubmissionById(int id)
        {
            if (id <= 0)
            {
                return BadRequest("ID de soumission invalide.");
            }

            try
            {
                var submission = await _db.FormSubmissions
                    .AsNoTracking()
                    .Include(s => s.Answers)
                    .FirstOrDefaultAsync(s => s.Id == id);

                if (submission == null)
                {
                    return NotFound($"Soumission avec l'ID {id} non trouvée.");
                }

                var result = new FormSubmissionDto
                {
                    Id = submission.Id,
                    CheckListId = submission.CheckListId,
                    SubmittedAt = submission.SubmittedAt,
                    SubmittedBy = submission.SubmittedBy,
                    DecisionFinale = submission.DecisionFinale,  // ✅ AJOUTER
                    Consequence = submission.Consequence,         // ✅ AJOUTER
                    Reponses = submission.Answers.Select(a => new QuestionResponseDto
                    {
                        QuestionId = a.QuestionId,
                        Reponse = a.Reponse
                    }).ToList()
                };

                return Ok(result);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Erreur lors de la récupération de la soumission: {ex.Message}");
            }
        }

        // DELETE api/Form/submission/{id}
        [HttpDelete("submission/{id}")]
        public async Task<ActionResult> DeleteSubmission(int id)
        {
            if (id <= 0)
            {
                return BadRequest("ID de soumission invalide.");
            }

            try
            {
                var submission = await _db.FormSubmissions
                    .Include(s => s.Answers)
                    .FirstOrDefaultAsync(s => s.Id == id);

                if (submission == null)
                {
                    return NotFound($"Soumission avec l'ID {id} non trouvée.");
                }

                // Supprimer d'abord les réponses associées
                _db.FormAnswers.RemoveRange(submission.Answers);
                // Puis supprimer la soumission
                _db.FormSubmissions.Remove(submission);

                await _db.SaveChangesAsync();

                return Ok(new { message = $"Soumission {id} supprimée avec succès." });
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Erreur lors de la suppression: {ex.Message}");
            }
        }
    }

}