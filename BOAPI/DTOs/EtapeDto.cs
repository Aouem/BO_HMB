using System.Collections.Generic;

namespace BOAPI.DTOs
{
    public class EtapeDto
    {
         public int Id { get; set; }
        public string Nom { get; set; } = string.Empty;
        public int Ordre { get; set; }
        public List<QuestionDto> Questions { get; set; } = new List<QuestionDto>();
        public bool EstValidee { get; set; }
    }
}