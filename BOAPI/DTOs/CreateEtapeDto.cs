namespace BOAPI.DTOs
{
    public class CreateEtapeDto
    {
        public string Nom { get; set; } = string.Empty;
        public int Ordre { get; set; }
        public List<CreateQuestionDto> Questions { get; set; } = new();
    }
}