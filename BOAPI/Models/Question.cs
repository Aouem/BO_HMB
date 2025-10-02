namespace BOAPI.Models;

public class Question
{
    public int Id { get; set; }
    public string Texte { get; set; } = string.Empty;
    public QuestionType Type { get; set; }
    public bool EstObligatoire { get; set; } = true;
    
    // Options de réponse (pour les listes déroulantes)
    public ICollection<ResponseOption> Options { get; set; } = new List<ResponseOption>();
    
    // Association à l'étape
    public int EtapeId { get; set; }
    public Etape Etape { get; set; } = null!;
    
    // Réponse saisie
    public string? Reponse { get; set; }
    public int? ValideeParId { get; set; }
    public Personnel? ValideePar { get; set; }
    public DateTime? DateValidation { get; set; }
    
    // Pour les questions avec commentaire
    public string? Commentaire { get; set; }
}

public enum QuestionType
{
    Boolean = 0,    // Oui/Non
    BooleanNA = 1,  // Oui/Non/N/A
    Liste = 2,      // Liste déroulante
    Texte = 3       // Réponse texte libre
}