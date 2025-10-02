namespace BOAPI.DTOs
{
    public class UpdateCheckListDto
    {
        public string Libelle { get; set; } = string.Empty;
        public string Version { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public List<UpdateEtapeDto> Etapes { get; set; } = new();
    }
}