namespace BOAPI.DTOs
{
    public class CreateCheckListDto
    {
        public string Libelle { get; set; } = string.Empty;
        public string Version { get; set; } = "2018";
        public string Description { get; set; } = string.Empty;
        public List<CreateEtapeDto> Etapes { get; set; } = new();
    }
}