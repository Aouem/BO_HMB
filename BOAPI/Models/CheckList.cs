namespace BOAPI.Models;

public class CheckList
{
    public int Id { get; set; }
    public string Libelle { get; set; } = string.Empty;
    public string Version { get; set; } = "2018";
    public string Description { get; set; } = string.Empty;
    
    // Etapes de la checklist
    public ICollection<Etape> Etapes { get; set; } = new List<Etape>();
    
    public DateTime DateCreation { get; set; } = DateTime.UtcNow;
    public bool EstActive { get; set; } = true;
}