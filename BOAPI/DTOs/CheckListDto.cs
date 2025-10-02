using System.Collections.Generic;

namespace BOAPI.DTOs
{
    // Assure-toi que ce fichier n'est pas défini aussi dans CreateQuestionDto.cs
  public class CheckListDto
    {
        public int Id { get; set; }
        public string Libelle { get; set; } = string.Empty;
        public string Version { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public List<EtapeDto> Etapes { get; set; } = new List<EtapeDto>();
    }
}
