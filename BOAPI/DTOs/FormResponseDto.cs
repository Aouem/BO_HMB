public class FormResponseDto
{
     public int CheckListId { get; set; }
        public string? SubmittedBy { get; set; } // optionnel
        public List<QuestionResponseDto> Reponses { get; set; } = new();
}