namespace BOAPI.Models;

public class Etape
{
    public int Id { get; set; }
    public string Nom { get; set; } = string.Empty;
    public int Ordre { get; set; } // Pour ordonner les étapes
    
    // Checklist parente
    public int CheckListId { get; set; }
    public CheckList CheckList { get; set; } = null!;
    
    // Questions de cette étape
    public ICollection<Question> Questions { get; set; } = new List<Question>();
    
    // Validation de l'étape
    public bool EstValidee { get; set; } = false;
    public int? ValideeParId { get; set; }
    public Personnel? ValideePar { get; set; }
    public DateTime? DateValidation { get; set; }
}