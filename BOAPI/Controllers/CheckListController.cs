using BOAPI.Data;
using BOAPI.Models;
using BOAPI.DTOs;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BOAPI.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class CheckListController : ControllerBase
    {
        private readonly BOContext _context;

        public CheckListController(BOContext context)
        {
            _context = context;
        }

        // GET: api/CheckList
        [HttpGet]
        public async Task<ActionResult<IEnumerable<CheckListDto>>> GetAll()
        {
            var checkLists = await _context.CheckLists
                .Include(c => c.Etapes)
                    .ThenInclude(e => e.Questions)
                        .ThenInclude(q => q.Options)
                .ToListAsync();

            return checkLists.Select(c => MapToDto(c)).ToList();
        }

        // GET: api/CheckList/5
        [HttpGet("{id:int}")]
        public async Task<ActionResult<CheckListDto>> GetById(int id)
        {
            var checkList = await _context.CheckLists
                .Include(c => c.Etapes)
                    .ThenInclude(e => e.Questions)
                        .ThenInclude(q => q.Options)
                .FirstOrDefaultAsync(c => c.Id == id);

            if (checkList == null) return NotFound();

            return MapToDto(checkList);
        }

        // POST: api/CheckList/with-etapes
        [HttpPost("with-etapes")]
        public async Task<ActionResult<CheckListDto>> CreateWithEtapes(CreateCheckListDto dto)
        {
            // Création de la checklist
            var checkList = new CheckList { Libelle = dto.Libelle ?? string.Empty };

            if (dto.Etapes != null)
            {
                foreach (var eDto in dto.Etapes)
                {
                    var etape = new Etape { Nom = eDto.Nom ?? string.Empty };

                    if (eDto.Questions != null)
                    {
                        foreach (var qDto in eDto.Questions)
                        {
                            // Validation du type de question
                            if (string.IsNullOrEmpty(qDto.Type) || !Enum.TryParse<QuestionType>(qDto.Type, true, out var qType))
                                return BadRequest($"Type de question invalide : {qDto.Type}");

                            var question = new Question
                            {
                                Texte = qDto.Texte ?? string.Empty,
                                Type = qType
                            };

                            // Si la question est de type "Liste", ajoute les options
                            if (qType == QuestionType.Liste && qDto.Options != null)
                            {
                                foreach (var o in qDto.Options)
                                {
                                    question.Options.Add(new ResponseOption { Valeur = o.Valeur ?? string.Empty });
                                }
                            }

                            // Ajouter la question à l'étape
                            etape.Questions.Add(question);
                        }
                    }

                    // Ajouter l'étape à la checklist
                    checkList.Etapes.Add(etape);
                }
            }

            // Ajouter la checklist dans la base de données
            _context.CheckLists.Add(checkList);
            await _context.SaveChangesAsync();

            // Retourne la checklist créée
            return CreatedAtAction(nameof(GetById), new { id = checkList.Id }, MapToDto(checkList));
        }


        // PUT: api/CheckList/5
        [HttpPut("{id:int}")]
        public async Task<ActionResult<CheckListDto>> Update(int id, CreateCheckListDto dto)
        {
            var existing = await _context.CheckLists
                .Include(c => c.Etapes)
                    .ThenInclude(e => e.Questions)
                        .ThenInclude(q => q.Options)
                .FirstOrDefaultAsync(c => c.Id == id);

            if (existing == null) return NotFound();

            existing.Libelle = dto.Libelle ?? string.Empty;

            // Supprimer les étapes supprimées
            var toRemoveEtapes = existing.Etapes
                .Where(e => dto.Etapes == null || !dto.Etapes.Any(de => de.Nom == e.Nom))
                .ToList();
            _context.Etapes.RemoveRange(toRemoveEtapes);

            if (dto.Etapes != null)
            {
                foreach (var eDto in dto.Etapes)
                {
                    var etape = existing.Etapes.FirstOrDefault(x => x.Nom == eDto.Nom);
                    if (etape != null)
                    {
                        // Mettre à jour les questions
                        var toRemoveQuestions = etape.Questions
                            .Where(q => eDto.Questions == null || !eDto.Questions.Any(dq => dq.Texte == q.Texte))
                            .ToList();
                        _context.Questions.RemoveRange(toRemoveQuestions);

                        if (eDto.Questions != null)
                        {
                            foreach (var qDto in eDto.Questions)
                            {
                                if (!Enum.TryParse<QuestionType>(qDto.Type, true, out var qType))
                                    return BadRequest($"Type de question invalide : {qDto.Type}");

                                var question = etape.Questions.FirstOrDefault(q => q.Texte == qDto.Texte);
                                if (question != null)
                                {
                                    question.Type = qType;

                                    if (question.Type == QuestionType.Liste)
                                    {
                                        var toRemoveOpts = question.Options
                                            .Where(o => qDto.Options == null || !qDto.Options.Any(od => od.Valeur == o.Valeur))
                                            .ToList();
                                        _context.ResponseOptions.RemoveRange(toRemoveOpts);

                                        if (qDto.Options != null)
                                        {
                                            foreach (var oDto in qDto.Options)
                                            {
                                                var opt = question.Options.FirstOrDefault(o => o.Valeur == oDto.Valeur);
                                                if (opt == null)
                                                    question.Options.Add(new ResponseOption { Valeur = oDto.Valeur ?? string.Empty });
                                            }
                                        }
                                    }
                                    else
                                    {
                                        _context.ResponseOptions.RemoveRange(question.Options);
                                    }
                                }
                                else
                                {
                                    var newQ = new Question
                                    {
                                        Texte = qDto.Texte ?? string.Empty,
                                        Type = qType,
                                        Options = new List<ResponseOption>()
                                    };
                                    if (qType == QuestionType.Liste && qDto.Options != null)
                                        foreach (var o in qDto.Options)
                                            newQ.Options.Add(new ResponseOption { Valeur = o.Valeur ?? string.Empty });

                                    etape.Questions.Add(newQ);
                                }
                            }
                        }
                    }
                    else
                    {
                        var newEtape = new Etape { Nom = eDto.Nom ?? string.Empty, Questions = new List<Question>() };
                        if (eDto.Questions != null)
                        {
                            foreach (var qDto in eDto.Questions)
                            {
                                if (!Enum.TryParse<QuestionType>(qDto.Type, true, out var qType))
                                    return BadRequest($"Type de question invalide : {qDto.Type}");

                                var newQ = new Question
                                {
                                    Texte = qDto.Texte ?? string.Empty,
                                    Type = qType,
                                    Options = new List<ResponseOption>()
                                };
                                if (qType == QuestionType.Liste && qDto.Options != null)
                                    foreach (var o in qDto.Options)
                                        newQ.Options.Add(new ResponseOption { Valeur = o.Valeur ?? string.Empty });

                                newEtape.Questions.Add(newQ);
                            }
                        }
                        existing.Etapes.Add(newEtape);
                    }
                }
            }

            await _context.SaveChangesAsync();

            // ✅ Retourne la checklist mise à jour
            return Ok(MapToDto(existing));
        }


        // DELETE: api/CheckList/5
        [HttpDelete("{id:int}")]
        public async Task<IActionResult> Delete(int id)
        {
            var checkList = await _context.CheckLists
                .Include(c => c.Etapes)
                    .ThenInclude(e => e.Questions)
                        .ThenInclude(q => q.Options)
                .FirstOrDefaultAsync(c => c.Id == id);

            if (checkList == null) return NotFound();

            foreach (var etape in checkList.Etapes)
            {
                foreach (var q in etape.Questions)
                    _context.ResponseOptions.RemoveRange(q.Options);
                _context.Questions.RemoveRange(etape.Questions);
            }
            _context.Etapes.RemoveRange(checkList.Etapes);
            _context.CheckLists.Remove(checkList);

            await _context.SaveChangesAsync();
            return NoContent();
        }

        // Mapping privé
        private CheckListDto MapToDto(CheckList checkList)
        {
            return new CheckListDto
            {
                Id = checkList.Id,
                Libelle = checkList.Libelle,
                Etapes = checkList.Etapes
                    .Select(e => new EtapeDto
                    {
                        Id = e.Id,
                        Nom = e.Nom,
                        Questions = e.Questions
                            .Select(q => new QuestionDto
                            {
                                Id = q.Id,
                                Texte = q.Texte,
                                Type = q.Type.ToString(),
                                Options = q.Options.Select(o => new ResponseOptionDto
                                {
                                    Id = o.Id,
                                    Valeur = o.Valeur
                                }).ToList()
                            }).ToList()
                    }).ToList()
            };
        }
    }
}
