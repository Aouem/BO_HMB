namespace BOAPI.Models;

public class Personnel
{
    public int Id { get; set; }
    public string Nom { get; set; } = string.Empty;
    public string Prenom { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty; // chirurgien, infirmier, anesthésiste, etc.
    public string Matricule { get; set; } = string.Empty;
    public bool EstActif { get; set; } = true;
    
    // Navigation properties
    public ICollection<Etape> EtapesValidees { get; set; } = new List<Etape>();
    public ICollection<Question> QuestionsValidees { get; set; } = new List<Question>();
}