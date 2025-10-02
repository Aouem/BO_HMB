   public class FormSubmissionDto
    {
        public int Id { get; set; }
        public int CheckListId { get; set; }
        public DateTime SubmittedAt { get; set; }
        public string? SubmittedBy { get; set; }
        public List<QuestionResponseDto> Reponses { get; set; } = new();
    }