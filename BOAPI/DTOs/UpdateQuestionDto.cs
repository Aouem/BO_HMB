namespace BOAPI.DTOs
{
    public class UpdateQuestionDto
    {
        public int Id { get; set; }
        public string Texte { get; set; } = string.Empty;
        public string Type { get; set; } = string.Empty;
        public bool EstObligatoire { get; set; } = true;
        public string? Reponse { get; set; }
        public string? Commentaire { get; set; }
        public List<UpdateResponseOptionDto> Options { get; set; } = new();
    }
}