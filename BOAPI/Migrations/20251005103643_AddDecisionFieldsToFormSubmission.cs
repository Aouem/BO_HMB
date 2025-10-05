using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BOAPI.Migrations
{
    /// <inheritdoc />
    public partial class AddDecisionFieldsToFormSubmission : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Consequence",
                table: "FormSubmissions",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "DecisionFinale",
                table: "FormSubmissions",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Consequence",
                table: "FormSubmissions");

            migrationBuilder.DropColumn(
                name: "DecisionFinale",
                table: "FormSubmissions");
        }
    }
}
