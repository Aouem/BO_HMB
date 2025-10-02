namespace BOAPI.DTOs
{
    public class PersonnelDto
    {
        public int Id { get; set; }
        public string Nom { get; set; } = string.Empty;
        public string Prenom { get; set; } = string.Empty;
        public string Role { get; set; } = string.Empty;
        public string Matricule { get; set; } = string.Empty;
    }
}