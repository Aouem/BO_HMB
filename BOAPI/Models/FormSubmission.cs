using System;
using System.Collections.Generic;

namespace BOAPI.Models
{
    public class FormSubmission
    {
        public int Id { get; set; }
        public int CheckListId { get; set; }
        public CheckList? CheckList { get; set; }

        public DateTime SubmittedAt { get; set; } = DateTime.UtcNow;
        public string? SubmittedBy { get; set; }

            public string DecisionFinale { get; set; } = string.Empty;
        public string Consequence { get; set; } = string.Empty;

        public ICollection<FormAnswer> Answers { get; set; } = new List<FormAnswer>();
    }

    public class FormAnswer
    {
        public int Id { get; set; }

        public int SubmissionId { get; set; }
        public FormSubmission? Submission { get; set; }

        public int QuestionId { get; set; }
        public Question? Question { get; set; }

        public string? Reponse { get; set; }
    }
}
