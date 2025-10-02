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
                // Créer une nouvelle soumission
                var submission = new FormSubmission
                {
                    CheckListId = dto.CheckListId,
                    SubmittedBy = string.IsNullOrEmpty(dto.SubmittedBy) ? "Utilisateur Anonyme" : dto.SubmittedBy,
                    SubmittedAt = DateTime.UtcNow
                };

                _db.FormSubmissions.Add(submission);
                await _db.SaveChangesAsync(); // Génère submission.Id

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
                        return BadRequest($"QuestionId {response.QuestionId} ne correspond pas à la checklist {dto.CheckListId}");
                    }

                    answersToAdd.Add(new FormAnswer
                    {
                        SubmissionId = submission.Id,
                        QuestionId = response.QuestionId,
                        Reponse = response.Reponse ?? string.Empty
                    });
                }

                // Ajouter toutes les réponses en une fois
                if (answersToAdd.Any())
                {
                    _db.FormAnswers.AddRange(answersToAdd);
                    await _db.SaveChangesAsync();
                }

                // Construire la réponse
                var result = new FormSubmissionDto
                {
                    Id = submission.Id,
                    CheckListId = submission.CheckListId,
                    SubmittedBy = submission.SubmittedBy,
                    SubmittedAt = submission.SubmittedAt,
                    Reponses = answersToAdd.Select(a => new QuestionResponseDto
                    {
                        QuestionId = a.QuestionId,
                        Reponse = a.Reponse
                    }).ToList()
                };

                return Ok(result);
            }
            catch (DbUpdateException dbEx)
            {
                return StatusCode(500, $"Erreur de base de données: {dbEx.InnerException?.Message ?? dbEx.Message}");
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Erreur interne du serveur: {ex.Message}");
            }
        }

        // GET api/Form/submissions?checkListId=1
        [HttpGet("submissions")]
        public async Task<ActionResult<IEnumerable<FormSubmissionDto>>> GetSubmissions([FromQuery] int checkListId)
        {
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
                        Reponses = s.Answers.Select(a => new QuestionResponseDto
                        {
                            QuestionId = a.QuestionId,
                            Reponse = a.Reponse
                        }).ToList()
                    })
                    .ToListAsync();

                return Ok(submissions);
            }
            catch (Exception ex)
            {
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

    // DTOs
    public class FormResponseDto
    {
        [Required]
        public int CheckListId { get; set; }

        public string? SubmittedBy { get; set; }

        public List<QuestionResponseDto>? Reponses { get; set; }
    }

    public class FormSubmissionDto
    {
        public int Id { get; set; }
        public int CheckListId { get; set; }
        public string SubmittedBy { get; set; } = string.Empty;
        public DateTime SubmittedAt { get; set; }
        public List<QuestionResponseDto> Reponses { get; set; } = new List<QuestionResponseDto>();
    }

    public class QuestionResponseDto
    {
        public int QuestionId { get; set; }
        public string? Reponse { get; set; }
    }
}