using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BOAPI.Migrations
{
    /// <inheritdoc />
    public partial class AddCheckListQuestionResponseOption4 : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Questions_CheckLists_CheckListId",
                table: "Questions");

            migrationBuilder.RenameColumn(
                name: "CheckListId",
                table: "Questions",
                newName: "EtapeId");

            migrationBuilder.RenameIndex(
                name: "IX_Questions_CheckListId",
                table: "Questions",
                newName: "IX_Questions_EtapeId");

            migrationBuilder.AddColumn<DateTime>(
                name: "DateValidation",
                table: "Questions",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Reponse",
                table: "Questions",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "ValideeParId",
                table: "Questions",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "DateCreation",
                table: "CheckLists",
                type: "datetime2",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified));

            migrationBuilder.CreateTable(
                name: "Etapes",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Nom = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    CheckListId = table.Column<int>(type: "int", nullable: false),
                    EstValidee = table.Column<bool>(type: "bit", nullable: false),
                    ValideeParId = table.Column<int>(type: "int", nullable: true),
                    DateValidation = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Etapes", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Etapes_CheckLists_CheckListId",
                        column: x => x.CheckListId,
                        principalTable: "CheckLists",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Personnels",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Nom = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Role = table.Column<string>(type: "nvarchar(max)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Personnels", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Etapes_CheckListId",
                table: "Etapes",
                column: "CheckListId");

            migrationBuilder.AddForeignKey(
                name: "FK_Questions_Etapes_EtapeId",
                table: "Questions",
                column: "EtapeId",
                principalTable: "Etapes",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Questions_Etapes_EtapeId",
                table: "Questions");

            migrationBuilder.DropTable(
                name: "Etapes");

            migrationBuilder.DropTable(
                name: "Personnels");

            migrationBuilder.DropColumn(
                name: "DateValidation",
                table: "Questions");

            migrationBuilder.DropColumn(
                name: "Reponse",
                table: "Questions");

            migrationBuilder.DropColumn(
                name: "ValideeParId",
                table: "Questions");

            migrationBuilder.DropColumn(
                name: "DateCreation",
                table: "CheckLists");

            migrationBuilder.RenameColumn(
                name: "EtapeId",
                table: "Questions",
                newName: "CheckListId");

            migrationBuilder.RenameIndex(
                name: "IX_Questions_EtapeId",
                table: "Questions",
                newName: "IX_Questions_CheckListId");

            migrationBuilder.AddForeignKey(
                name: "FK_Questions_CheckLists_CheckListId",
                table: "Questions",
                column: "CheckListId",
                principalTable: "CheckLists",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
