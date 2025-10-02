namespace BOAPI.Models;

public class ResponseOption
{
    public int Id { get; set; }
    public string Valeur { get; set; } = string.Empty;
    public int Ordre { get; set; } // Pour ordonner les options
    
    public int QuestionId { get; set; }
    public Question Question { get; set; } = null!;
}