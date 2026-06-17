import { describe, expect, it } from "vitest";
import { generateEntityCode, type EntityTableModel } from "@/lib/entityCodeGenerator";
import type { ColumnInfo } from "@/types/database";

function column(overrides: Partial<ColumnInfo> & { name: string; data_type: string }): ColumnInfo {
  return {
    is_nullable: true,
    column_default: null,
    is_primary_key: false,
    extra: null,
    ...overrides,
  };
}

const userTable: EntityTableModel = {
  schema: "dbo",
  tableName: "users",
  tableComment: "Application users",
  objectType: "table",
  columns: [
    column({
      name: "id",
      data_type: "int",
      is_nullable: false,
      is_primary_key: true,
      extra: "identity",
      comment: "Primary key",
    }),
    column({
      name: "display_name",
      data_type: "nvarchar(50)",
      character_maximum_length: 50,
      comment: "User's display name",
    }),
  ],
};

describe("entityCodeGenerator", () => {
  it("generates EF Core code with table, column mappings and comments", () => {
    const code = generateEntityCode({ language: "csharp", orm: "efcore", tables: [userTable] });

    expect(code).toContain('[Table("users", Schema = "dbo")]');
    expect(code).toContain("/// Application users");
    expect(code).toContain("/// User's display name");
    expect(code).toContain('[Column("display_name", TypeName = "nvarchar(50)")]');
    expect(code).toContain("public string? DisplayName { get; set; }");
  });

  it("generates SqlSugar code with description metadata", () => {
    const code = generateEntityCode({ language: "csharp", orm: "sqlsugar", tables: [userTable] });

    expect(code).toContain('[SugarTable("users", TableDescription = "Application users")]');
    expect(code).toContain('ColumnDescription = "User\'s display name"');
    expect(code).toContain("IsPrimaryKey = true");
    expect(code).toContain("IsIdentity = true");
  });

  it("generates TypeORM code with field comments", () => {
    const code = generateEntityCode({ language: "typescript", orm: "typeorm", tables: [userTable] });

    expect(code).toContain('@Entity({ name: "users", schema: "dbo" })');
    expect(code).toContain("/** User's display name */");
    expect(code).toContain('comment: "User\'s display name"');
  });
});
