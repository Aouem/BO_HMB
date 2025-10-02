namespace BOAPI.DTOs
{
    public class QuestionDto
    {
        public int Id { get; set; }
        public string Texte { get; set; } = string.Empty;
        public string Type { get; set; } = string.Empty;
        public bool EstObligatoire { get; set; }
        public string? Reponse { get; set; }
        public string? Commentaire { get; set; }
        public List<ResponseOptionDto> Options { get; set; } = new List<ResponseOptionDto>();

        public int EtapeId { get; set; }

public int CheckListId { get; set; }
    public  string? CheckListLibelle { get; set; } // corrigé

    }
}