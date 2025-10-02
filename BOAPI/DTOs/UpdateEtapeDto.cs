namespace BOAPI.DTOs
{
    public class UpdateEtapeDto
    {
        public int Id { get; set; }
        public string Nom { get; set; } = string.Empty;
        public int Ordre { get; set; }
        public List<UpdateQuestionDto> Questions { get; set; } = new();
    }
}