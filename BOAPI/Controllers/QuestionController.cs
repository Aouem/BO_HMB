using BOAPI.Data;
using BOAPI.DTOs;
using BOAPI.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BOAPI.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class QuestionController : ControllerBase
    {
        private readonly BOContext _context;

        public QuestionController(BOContext context)
        {
            _context = context;
        }

        // 🔹 GET: api/Question - toutes les questions
        [HttpGet]
        public async Task<ActionResult<IEnumerable<QuestionDto>>> GetAll()
        {
            var questions = await _context.Questions
                                          .Include(q => q.Options)
                                          .Include(q => q.Etape)
                                              .ThenInclude(e => e.CheckList)
                                          .AsSplitQuery()
                                          .ToListAsync();

            return Ok(questions.Select(q => MapToDto(q)));
        }

        // 🔹 GET: api/Question/{id} - question par ID
        [HttpGet("{id}")]
        public async Task<ActionResult<QuestionDto>> GetById(int id)
        {
            var question = await _context.Questions
                                         .Include(q => q.Options)
                                         .Include(q => q.Etape)
                                             .ThenInclude(e => e.CheckList)
                                         .FirstOrDefaultAsync(q => q.Id == id);

            if (question == null) return NotFound();

            return Ok(MapToDto(question));
        }

        // 🔹 GET: api/Question/by-checklist/5 - questions par checklist
        [HttpGet("by-checklist/{checklistId}")]
        public async Task<ActionResult<IEnumerable<QuestionDto>>> GetByChecklist(int checklistId)
        {
            var questions = await _context.Questions
                                          .Include(q => q.Options)
                                          .Include(q => q.Etape)
                                          .Where(q => q.Etape.CheckListId == checklistId)
                                          .AsSplitQuery()
                                          .ToListAsync();

            return Ok(questions.Select(q => MapToDto(q)));
        }

        // 🔹 GET: api/Question/by-etape/5 - questions par étape
        [HttpGet("by-etape/{etapeId}")]
        public async Task<ActionResult<IEnumerable<QuestionDto>>> GetByEtape(int etapeId)
        {
            var questions = await _context.Questions
                                          .Include(q => q.Options)
                                          .Include(q => q.Etape)
                                              .ThenInclude(e => e.CheckList)
                                          .Where(q => q.EtapeId == etapeId)
                                          .AsSplitQuery()
                                          .ToListAsync();

            var result = questions.Select(q => new QuestionDto
            {
                Id = q.Id,
                Texte = q.Texte,
                Type = q.Type.ToString(),
                Options = q.Options?.Select(o => new ResponseOptionDto
                {
                    Id = o.Id,
                    Valeur = o.Valeur
                }).ToList() ?? new List<ResponseOptionDto>(),
                Reponse = q.Reponse,
                EtapeId = q.EtapeId,
                CheckListId = q.Etape.CheckListId,
                CheckListLibelle = q.Etape.CheckList?.Libelle ?? ""
            });

            return Ok(result);
        }

        // 🔹 POST: api/Question
        [HttpPost]
        public async Task<ActionResult<QuestionDto>> Create(QuestionDto dto)
        {
            var question = new Question
            {
                Texte = dto.Texte,
                Type = Enum.Parse<QuestionType>(dto.Type, true),
                Options = dto.Options?.Select(o => new ResponseOption { Valeur = o.Valeur }).ToList()
                          ?? new List<ResponseOption>(),
                Reponse = dto.Reponse,
                EtapeId = dto.EtapeId
            };

            _context.Questions.Add(question);
            await _context.SaveChangesAsync();

            dto.Id = question.Id;
            return CreatedAtAction(nameof(GetById), new { id = question.Id }, dto);
        }

        // 🔹 PUT: api/Question/5
        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, QuestionDto dto)
        {
            if (id != dto.Id) return BadRequest();

            var existingQuestion = await _context.Questions
                                                 .Include(q => q.Options)
                                                 .FirstOrDefaultAsync(q => q.Id == id);
            if (existingQuestion == null) return NotFound();

            existingQuestion.Texte = dto.Texte;
            existingQuestion.Type = Enum.Parse<QuestionType>(dto.Type, true);
            existingQuestion.EtapeId = dto.EtapeId;
            existingQuestion.Reponse = dto.Reponse;

            if (existingQuestion.Type == QuestionType.Liste)
            {
                var optionsToRemove = existingQuestion.Options
                                                     .Where(o => dto.Options == null || !dto.Options.Any(uo => uo.Id == o.Id))
                                                     .ToList();
                _context.ResponseOptions.RemoveRange(optionsToRemove);

                if (dto.Options != null)
                {
                    foreach (var optionDto in dto.Options)
                    {
                        var existingOption = existingQuestion.Options.FirstOrDefault(o => o.Id == optionDto.Id);
                        if (existingOption != null)
                            existingOption.Valeur = optionDto.Valeur;
                        else
                            existingQuestion.Options.Add(new ResponseOption { Valeur = optionDto.Valeur });
                    }
                }
            }
            else
            {
                _context.ResponseOptions.RemoveRange(existingQuestion.Options);
            }

            await _context.SaveChangesAsync();
            return NoContent();
        }

        // 🔹 DELETE: api/Question/5
        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var question = await _context.Questions
                                         .Include(q => q.Options)
                                         .FirstOrDefaultAsync(q => q.Id == id);
            if (question == null) return NotFound();

            _context.ResponseOptions.RemoveRange(question.Options);
            _context.Questions.Remove(question);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        // 🔹 Méthode utilitaire pour mapper Question -> QuestionDto
        private static QuestionDto MapToDto(Question q)
        {
            return new QuestionDto
            {
                Id = q.Id,
                Texte = q.Texte,
                Type = q.Type.ToString(),
                Options = q.Options?.Select(o => new ResponseOptionDto
                {
                    Id = o.Id,
                    Valeur = o.Valeur
                }).ToList() ?? new List<ResponseOptionDto>(),
                Reponse = q.Reponse,
                EtapeId = q.EtapeId,
                CheckListId = q.Etape?.CheckListId ?? 0,
                CheckListLibelle = q.Etape?.CheckList?.Libelle ?? ""
            };
        }
        
        [HttpPost("submit-form")]
public async Task<IActionResult> SubmitForm(FormResponseDto dto)
{
    foreach (var q in dto.Reponses)
    {
        var question = await _context.Questions.FindAsync(q.QuestionId);
        if (question != null)
        {
            question.Reponse = q.Reponse;
        }
    }

    await _context.SaveChangesAsync();
    return Ok(new { message = "Réponses enregistrées !" });
}

    }
}
