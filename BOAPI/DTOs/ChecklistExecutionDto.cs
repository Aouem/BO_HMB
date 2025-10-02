namespace BOAPI.DTOs
{
    public class ChecklistExecutionDto
    {
        public int CheckListId { get; set; }
        public int PatientId { get; set; }
        public int InterventionId { get; set; }
        public List<EtapeExecutionDto> Etapes { get; set; } = new();
    }

    public class EtapeExecutionDto
    {
        public int EtapeId { get; set; }
        public int ValideeParId { get; set; }
        public List<QuestionExecutionDto> Questions { get; set; } = new();
    }

    public class QuestionExecutionDto
    {
        public int QuestionId { get; set; }
        public string Reponse { get; set; } = string.Empty;
        public string? Commentaire { get; set; }
        public int ValideeParId { get; set; }
    }
}