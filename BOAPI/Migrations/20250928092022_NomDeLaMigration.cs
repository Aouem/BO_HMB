using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BOAPI.Migrations
{
    /// <inheritdoc />
    public partial class NomDeLaMigration : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Etapes_CheckListId",
                table: "Etapes");

            migrationBuilder.AddColumn<int>(
                name: "Ordre",
                table: "ResponseOptions",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AlterColumn<string>(
                name: "Type",
                table: "Questions",
                type: "nvarchar(max)",
                nullable: false,
                oldClrType: typeof(int),
                oldType: "int");

            migrationBuilder.AddColumn<string>(
                name: "Commentaire",
                table: "Questions",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "EstObligatoire",
                table: "Questions",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "EstActif",
                table: "Personnels",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "Matricule",
                table: "Personnels",
                type: "nvarchar(450)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "Prenom",
                table: "Personnels",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<int>(
                name: "Ordre",
                table: "Etapes",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "Description",
                table: "CheckLists",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<bool>(
                name: "EstActive",
                table: "CheckLists",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "Version",
                table: "CheckLists",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.CreateTable(
                name: "CheckListItems",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Description = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    IsChecked = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CheckedBy = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    QuestionId = table.Column<int>(type: "int", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CheckListItems", x => x.Id);
                    table.ForeignKey(
                        name: "FK_CheckListItems_Questions_QuestionId",
                        column: x => x.QuestionId,
                        principalTable: "Questions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Questions_ValideeParId",
                table: "Questions",
                column: "ValideeParId");

            migrationBuilder.CreateIndex(
                name: "IX_Personnels_Matricule",
                table: "Personnels",
                column: "Matricule",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Etapes_CheckListId_Ordre",
                table: "Etapes",
                columns: new[] { "CheckListId", "Ordre" });

            migrationBuilder.CreateIndex(
                name: "IX_Etapes_ValideeParId",
                table: "Etapes",
                column: "ValideeParId");

            migrationBuilder.CreateIndex(
                name: "IX_CheckLists_EstActive",
                table: "CheckLists",
                column: "EstActive");

            migrationBuilder.CreateIndex(
                name: "IX_CheckListItems_QuestionId",
                table: "CheckListItems",
                column: "QuestionId");

            migrationBuilder.AddForeignKey(
                name: "FK_Etapes_Personnels_ValideeParId",
                table: "Etapes",
                column: "ValideeParId",
                principalTable: "Personnels",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Questions_Personnels_ValideeParId",
                table: "Questions",
                column: "ValideeParId",
                principalTable: "Personnels",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Etapes_Personnels_ValideeParId",
                table: "Etapes");

            migrationBuilder.DropForeignKey(
                name: "FK_Questions_Personnels_ValideeParId",
                table: "Questions");

            migrationBuilder.DropTable(
                name: "CheckListItems");

            migrationBuilder.DropIndex(
                name: "IX_Questions_ValideeParId",
                table: "Questions");

            migrationBuilder.DropIndex(
                name: "IX_Personnels_Matricule",
                table: "Personnels");

            migrationBuilder.DropIndex(
                name: "IX_Etapes_CheckListId_Ordre",
                table: "Etapes");

            migrationBuilder.DropIndex(
                name: "IX_Etapes_ValideeParId",
                table: "Etapes");

            migrationBuilder.DropIndex(
                name: "IX_CheckLists_EstActive",
                table: "CheckLists");

            migrationBuilder.DropColumn(
                name: "Ordre",
                table: "ResponseOptions");

            migrationBuilder.DropColumn(
                name: "Commentaire",
                table: "Questions");

            migrationBuilder.DropColumn(
                name: "EstObligatoire",
                table: "Questions");

            migrationBuilder.DropColumn(
                name: "EstActif",
                table: "Personnels");

            migrationBuilder.DropColumn(
                name: "Matricule",
                table: "Personnels");

            migrationBuilder.DropColumn(
                name: "Prenom",
                table: "Personnels");

            migrationBuilder.DropColumn(
                name: "Ordre",
                table: "Etapes");

            migrationBuilder.DropColumn(
                name: "Description",
                table: "CheckLists");

            migrationBuilder.DropColumn(
                name: "EstActive",
                table: "CheckLists");

            migrationBuilder.DropColumn(
                name: "Version",
                table: "CheckLists");

            migrationBuilder.AlterColumn<int>(
                name: "Type",
                table: "Questions",
                type: "int",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)");

            migrationBuilder.CreateIndex(
                name: "IX_Etapes_CheckListId",
                table: "Etapes",
                column: "CheckListId");
        }
    }
}
