namespace BOAPI.Models;

public class CheckListItem
{
    public int Id { get; set; }
    public string Description { get; set; } = string.Empty;
    public bool IsChecked { get; set; } = false;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public string CheckedBy { get; set; } = string.Empty;
    
    // Lier à une question si nécessaire
    public int? QuestionId { get; set; }
    public Question? Question { get; set; }
}