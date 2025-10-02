// Controllers/FormController.cs
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using BOAPI.Data;
using BOAPI.Models;

[ApiController]
[Route("api/[controller]")]
public class FormController : ControllerBase
{
    private readonly BOContext _db;
    public FormController(BOContext db) => _db = db;

    // POST api/Form/submit
   [HttpPost("submit")]
public async Task<ActionResult<FormSubmissionDto>> Submit([FromBody] FormResponseDto dto)
{
    var sub = new FormSubmission {
        CheckListId = dto.CheckListId,
        SubmittedBy = dto.SubmittedBy,
        SubmittedAt = DateTime.UtcNow
    };
    _db.FormSubmissions.Add(sub);
    await _db.SaveChangesAsync(); // génère sub.Id

    var validQIds = await _db.Questions
        .Where(q => q.Etape.CheckListId == dto.CheckListId)
        .Select(q => q.Id)
        .ToHashSetAsync();

    foreach (var r in dto.Reponses ?? Enumerable.Empty<QuestionResponseDto>()) {
        if (!validQIds.Contains(r.QuestionId))
            return BadRequest($"QuestionId {r.QuestionId} ne correspond pas à la checklist {dto.CheckListId}");

        _db.FormAnswers.Add(new FormAnswer {
            SubmissionId = sub.Id,
            QuestionId   = r.QuestionId,
            Reponse      = r.Reponse
        });
    }

    await _db.SaveChangesAsync();

    return Ok(new FormSubmissionDto {
        Id = sub.Id,
        CheckListId = sub.CheckListId,
        SubmittedBy = sub.SubmittedBy,
        SubmittedAt = sub.SubmittedAt,
        Reponses = dto.Reponses?.ToList() ?? new()
    });
}

    // GET api/Form/submissions?checkListId=8
    [HttpGet("submissions")]
    public async Task<ActionResult<IEnumerable<FormSubmissionDto>>> GetSubs([FromQuery] int checkListId)
    {
        var list = await _db.FormSubmissions
            .AsNoTracking()
            .Where(s => s.CheckListId == checkListId)
            .OrderByDescending(s => s.SubmittedAt)
            .Select(s => new FormSubmissionDto
            {
                Id          = s.Id,
                CheckListId = s.CheckListId,
                SubmittedAt = s.SubmittedAt,
                SubmittedBy = s.SubmittedBy,
                Reponses    = s.Answers.Select(a => new QuestionResponseDto
                {
                    QuestionId = a.QuestionId,
                    Reponse    = a.Reponse
                }).ToList()
            })
            .ToListAsync();

        return Ok(list);
    }
}
