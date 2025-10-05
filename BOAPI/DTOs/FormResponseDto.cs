public class FormResponseDto
{
        public int CheckListId { get; set; }
        public string? SubmittedBy { get; set; } // optionnel
        public List<QuestionResponseDto> Reponses { get; set; } = new();

        public string DecisionFinale { get; set; } = string.Empty;
        public string Consequence { get; set; } = string.Empty;
    
}