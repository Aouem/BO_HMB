namespace BOAPI.DTOs
{
    public class CreateQuestionDto
    {
        public string Texte { get; set; } = string.Empty;
        public string Type { get; set; } = "Boolean";
        public bool EstObligatoire { get; set; } = true;
        public List<CreateResponseOptionDto> Options { get; set; } = new();
    }
}