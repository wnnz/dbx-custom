import type { ColumnInfo } from "@/types/database";

export type EntityCodeLanguage = "csharp" | "java" | "typescript" | "go" | "python";
export type EntityCodeOrm = "efcore" | "sqlsugar" | "jpa" | "mybatis-plus" | "typeorm" | "gorm" | "sqlalchemy";

export interface EntityCodePreset {
  language: EntityCodeLanguage;
  orm: EntityCodeOrm;
  languageLabel: string;
  ormLabel: string;
  fileExtension: string;
}

export interface EntityTableModel {
  schema?: string | null;
  tableName: string;
  tableComment?: string | null;
  objectType?: "table" | "view";
  columns: ColumnInfo[];
}

export interface GenerateEntityCodeOptions {
  language: EntityCodeLanguage;
  orm: EntityCodeOrm;
  tables: EntityTableModel[];
}

export const ENTITY_CODE_PRESETS: EntityCodePreset[] = [
  { language: "csharp", orm: "efcore", languageLabel: "C#", ormLabel: "EF Core", fileExtension: "cs" },
  { language: "csharp", orm: "sqlsugar", languageLabel: "C#", ormLabel: "SqlSugar", fileExtension: "cs" },
  { language: "java", orm: "jpa", languageLabel: "Java", ormLabel: "JPA / Hibernate", fileExtension: "java" },
  { language: "java", orm: "mybatis-plus", languageLabel: "Java", ormLabel: "MyBatis Plus", fileExtension: "java" },
  { language: "typescript", orm: "typeorm", languageLabel: "TypeScript", ormLabel: "TypeORM", fileExtension: "ts" },
  { language: "go", orm: "gorm", languageLabel: "Go", ormLabel: "GORM", fileExtension: "go" },
  { language: "python", orm: "sqlalchemy", languageLabel: "Python", ormLabel: "SQLAlchemy", fileExtension: "py" },
];

export const DEFAULT_ENTITY_CODE_PRESET = ENTITY_CODE_PRESETS[0]!;

export const ENTITY_CODE_LANGUAGES = [...new Map(ENTITY_CODE_PRESETS.map((preset) => [preset.language, { value: preset.language, label: preset.languageLabel }])).values()];

export function entityOrmOptionsForLanguage(language: EntityCodeLanguage): EntityCodePreset[] {
  return ENTITY_CODE_PRESETS.filter((preset) => preset.language === language);
}

export function entityCodePreset(language: EntityCodeLanguage, orm: EntityCodeOrm): EntityCodePreset | undefined {
  return ENTITY_CODE_PRESETS.find((preset) => preset.language === language && preset.orm === orm);
}

export function generateEntityCode(options: GenerateEntityCodeOptions): string {
  if (!entityCodePreset(options.language, options.orm)) {
    throw new Error(`Unsupported entity code preset: ${options.language}/${options.orm}`);
  }
  if (options.tables.length === 0) return "";

  switch (options.orm) {
    case "efcore":
      return generateEfCore(options.tables);
    case "sqlsugar":
      return generateSqlSugar(options.tables);
    case "jpa":
      return generateJpa(options.tables);
    case "mybatis-plus":
      return generateMyBatisPlus(options.tables);
    case "typeorm":
      return generateTypeOrm(options.tables);
    case "gorm":
      return generateGorm(options.tables);
    case "sqlalchemy":
      return generateSqlAlchemy(options.tables);
  }
}

function words(value: string): string[] {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[^A-Za-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

function pascalCase(value: string, fallback: string): string {
  const result = words(value)
    .map((word) => word.slice(0, 1).toUpperCase() + word.slice(1).toLowerCase())
    .join("");
  return validIdentifierStart(result) ? result : `${fallback}${result}`;
}

function camelCase(value: string, fallback: string): string {
  const name = pascalCase(value, fallback);
  return name.slice(0, 1).toLowerCase() + name.slice(1);
}

function snakeCase(value: string, fallback: string): string {
  const result = words(value)
    .map((word) => word.toLowerCase())
    .join("_");
  return validIdentifierStart(result) ? result : `${fallback.toLowerCase()}_${result}`;
}

function validIdentifierStart(value: string): boolean {
  return /^[A-Za-z_]/.test(value);
}

function uniqueName(base: string, seen: Set<string>): string {
  let name = base || "Field";
  let index = 2;
  while (seen.has(name)) {
    name = `${base}${index}`;
    index += 1;
  }
  seen.add(name);
  return name;
}

function dbType(column: ColumnInfo): string {
  return String(column.data_type || "").trim();
}

function baseDbType(column: ColumnInfo): string {
  return dbType(column)
    .toLowerCase()
    .replace(/\s+identity\b/g, "")
    .replace(/\s+unsigned\b/g, "")
    .replace(/\(.*/, "")
    .trim();
}

function lengthOf(column: ColumnInfo): number | undefined {
  if (typeof column.character_maximum_length === "number" && column.character_maximum_length > 0) return column.character_maximum_length;
  const match = dbType(column).match(/\((\d+)\)/);
  return match ? Number(match[1]) : undefined;
}

function precisionScaleOf(column: ColumnInfo): { precision?: number; scale?: number } {
  const precision = typeof column.numeric_precision === "number" ? column.numeric_precision : undefined;
  const scale = typeof column.numeric_scale === "number" ? column.numeric_scale : undefined;
  const match = dbType(column).match(/\((\d+)\s*,\s*(\d+)\)/);
  return {
    precision: precision ?? (match ? Number(match[1]) : undefined),
    scale: scale ?? (match ? Number(match[2]) : undefined),
  };
}

function isIdentity(column: ColumnInfo): boolean {
  return /identity|auto_increment|serial/i.test(`${column.extra ?? ""} ${column.column_default ?? ""} ${column.data_type}`);
}

function comment(value: string | null | undefined): string {
  return String(value ?? "").trim();
}

function qualifiedName(table: EntityTableModel, separator = "."): string {
  return table.schema ? `${table.schema}${separator}${table.tableName}` : table.tableName;
}

function csharpString(value: string): string {
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

function javaString(value: string): string {
  return csharpString(value);
}

function tsString(value: string): string {
  return JSON.stringify(value);
}

function pyString(value: string): string {
  return JSON.stringify(value);
}

function docLines(prefix: string, text: string, suffix = ""): string[] {
  if (!text) return [];
  return [`${prefix}${text.replace(/\*\//g, "* /")}${suffix}`];
}

function xmlSummary(text: string, indent = ""): string[] {
  if (!text) return [];
  return [`${indent}/// <summary>`, `${indent}/// ${text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}`, `${indent}/// </summary>`];
}

function javaDoc(text: string, indent = ""): string[] {
  if (!text) return [];
  return [`${indent}/**`, `${indent} * ${text.replace(/\*\//g, "* /")}`, `${indent} */`];
}

function csharpType(column: ColumnInfo): string {
  const type = baseDbType(column);
  let result = "string";
  if (["bigint"].includes(type)) result = "long";
  else if (["int", "integer", "serial", "int4"].includes(type)) result = "int";
  else if (["smallint", "int2"].includes(type)) result = "short";
  else if (["tinyint"].includes(type)) result = "byte";
  else if (["bit", "bool", "boolean"].includes(type)) result = "bool";
  else if (["decimal", "numeric", "money", "smallmoney"].includes(type)) result = "decimal";
  else if (["float", "double", "double precision"].includes(type)) result = "double";
  else if (["real"].includes(type)) result = "float";
  else if (["date", "datetime", "datetime2", "smalldatetime", "timestamp", "timestamp without time zone"].includes(type)) result = "DateTime";
  else if (["datetimeoffset", "timestamp with time zone"].includes(type)) result = "DateTimeOffset";
  else if (["time"].includes(type)) result = "TimeSpan";
  else if (["uniqueidentifier", "uuid"].includes(type)) result = "Guid";
  else if (["binary", "varbinary", "image", "bytea", "blob"].includes(type)) result = "byte[]";

  if (!column.is_nullable) return result;
  return result === "string" || result.endsWith("[]") ? `${result}?` : `${result}?`;
}

function javaType(column: ColumnInfo): string {
  const type = baseDbType(column);
  if (["bigint", "int8"].includes(type)) return "Long";
  if (["int", "integer", "serial", "int4"].includes(type)) return "Integer";
  if (["smallint", "int2"].includes(type)) return "Short";
  if (["tinyint"].includes(type)) return "Byte";
  if (["bit", "bool", "boolean"].includes(type)) return "Boolean";
  if (["decimal", "numeric", "money", "smallmoney"].includes(type)) return "BigDecimal";
  if (["float", "double", "double precision", "real"].includes(type)) return "Double";
  if (["date"].includes(type)) return "LocalDate";
  if (["datetime", "datetime2", "smalldatetime", "timestamp", "timestamp without time zone", "timestamp with time zone"].includes(type)) return "LocalDateTime";
  if (["time"].includes(type)) return "LocalTime";
  if (["uniqueidentifier", "uuid"].includes(type)) return "UUID";
  if (["binary", "varbinary", "image", "bytea", "blob"].includes(type)) return "byte[]";
  return "String";
}

function tsType(column: ColumnInfo): string {
  const type = baseDbType(column);
  if (["bigint", "int", "integer", "serial", "int4", "smallint", "int2", "tinyint", "decimal", "numeric", "money", "smallmoney", "float", "double", "double precision", "real"].includes(type)) return "number";
  if (["bit", "bool", "boolean"].includes(type)) return "boolean";
  if (["date", "datetime", "datetime2", "smalldatetime", "timestamp", "timestamp without time zone", "timestamp with time zone", "time"].includes(type)) return "Date";
  if (["binary", "varbinary", "image", "bytea", "blob"].includes(type)) return "Buffer";
  if (["json", "jsonb"].includes(type)) return "unknown";
  return "string";
}

function goType(column: ColumnInfo): string {
  const type = baseDbType(column);
  let result = "string";
  if (["bigint", "int8"].includes(type)) result = "int64";
  else if (["int", "integer", "serial", "int4"].includes(type)) result = "int";
  else if (["smallint", "int2"].includes(type)) result = "int16";
  else if (["tinyint"].includes(type)) result = "uint8";
  else if (["bit", "bool", "boolean"].includes(type)) result = "bool";
  else if (["decimal", "numeric", "money", "smallmoney", "float", "double", "double precision", "real"].includes(type)) result = "float64";
  else if (["date", "datetime", "datetime2", "smalldatetime", "timestamp", "timestamp without time zone", "timestamp with time zone", "time"].includes(type)) result = "time.Time";
  else if (["binary", "varbinary", "image", "bytea", "blob"].includes(type)) result = "[]byte";
  return column.is_nullable && !result.startsWith("[]") ? `*${result}` : result;
}

function sqlalchemyType(column: ColumnInfo): string {
  const type = baseDbType(column);
  const length = lengthOf(column);
  const { precision, scale } = precisionScaleOf(column);
  if (["bigint", "int8"].includes(type)) return "BigInteger";
  if (["int", "integer", "serial", "int4"].includes(type)) return "Integer";
  if (["smallint", "int2", "tinyint"].includes(type)) return "SmallInteger";
  if (["bit", "bool", "boolean"].includes(type)) return "Boolean";
  if (["decimal", "numeric", "money", "smallmoney"].includes(type)) return precision ? `Numeric(${precision}, ${scale ?? 0})` : "Numeric";
  if (["float", "double", "double precision", "real"].includes(type)) return "Float";
  if (["date"].includes(type)) return "Date";
  if (["datetime", "datetime2", "smalldatetime", "timestamp", "timestamp without time zone", "timestamp with time zone"].includes(type)) return "DateTime";
  if (["time"].includes(type)) return "Time";
  if (["binary", "varbinary", "image", "bytea", "blob"].includes(type)) return "LargeBinary";
  if (["json", "jsonb"].includes(type)) return "JSON";
  if (["text", "ntext", "xml"].includes(type) || /max/i.test(dbType(column))) return "Text";
  return length ? `String(${length})` : "String";
}

function generateEfCore(tables: EntityTableModel[]): string {
  const parts = ["using System;", "using System.ComponentModel.DataAnnotations;", "using System.ComponentModel.DataAnnotations.Schema;", "", "namespace Dbx.Entities;", "", ...tables.flatMap((table) => csharpClass(table, "efcore"))];
  return `${parts.join("\n").trimEnd()}\n`;
}

function generateSqlSugar(tables: EntityTableModel[]): string {
  const parts = ["using SqlSugar;", "", "namespace Dbx.Entities;", "", ...tables.flatMap((table) => csharpClass(table, "sqlsugar"))];
  return `${parts.join("\n").trimEnd()}\n`;
}

function csharpClass(table: EntityTableModel, orm: "efcore" | "sqlsugar"): string[] {
  const className = pascalCase(table.tableName, "Entity");
  const seen = new Set<string>();
  const lines = [...xmlSummary(comment(table.tableComment))];
  if (orm === "efcore") {
    const schema = table.schema ? `, Schema = ${csharpString(table.schema)}` : "";
    lines.push(`[Table(${csharpString(table.tableName)}${schema})]`);
  } else {
    const description = comment(table.tableComment);
    lines.push(description ? `[SugarTable(${csharpString(table.tableName)}, TableDescription = ${csharpString(description)})]` : `[SugarTable(${csharpString(table.tableName)})]`);
  }
  lines.push(`public class ${className}`, "{");
  for (const column of table.columns) {
    const property = uniqueName(pascalCase(column.name, "Field"), seen);
    const colComment = comment(column.comment);
    lines.push(...xmlSummary(colComment, "  "));
    if (orm === "efcore") {
      if (column.is_primary_key) lines.push("  [Key]");
      lines.push(`  [Column(${csharpString(column.name)}, TypeName = ${csharpString(dbType(column))})]`);
    } else {
      const args = [`ColumnName = ${csharpString(column.name)}`, `ColumnDataType = ${csharpString(dbType(column))}`, `IsNullable = ${column.is_nullable ? "true" : "false"}`];
      if (column.is_primary_key) args.push("IsPrimaryKey = true");
      if (isIdentity(column)) args.push("IsIdentity = true");
      if (colComment) args.push(`ColumnDescription = ${csharpString(colComment)}`);
      lines.push(`  [SugarColumn(${args.join(", ")})]`);
    }
    lines.push(`  public ${csharpType(column)} ${property} { get; set; }`, "");
  }
  if (table.columns.length) lines.pop();
  lines.push("}", "");
  return lines;
}

function generateJpa(tables: EntityTableModel[]): string {
  return generateJava(tables, "jpa");
}

function generateMyBatisPlus(tables: EntityTableModel[]): string {
  return generateJava(tables, "mybatis-plus");
}

function generateJava(tables: EntityTableModel[], orm: "jpa" | "mybatis-plus"): string {
  const imports = new Set<string>();
  if (orm === "jpa") {
    ["jakarta.persistence.Column", "jakarta.persistence.Entity", "jakarta.persistence.Id", "jakarta.persistence.Table"].forEach((item) => imports.add(item));
  } else {
    ["com.baomidou.mybatisplus.annotation.TableField", "com.baomidou.mybatisplus.annotation.TableId", "com.baomidou.mybatisplus.annotation.TableName"].forEach((item) => imports.add(item));
  }
  for (const table of tables) {
    for (const column of table.columns) {
      const type = javaType(column);
      if (type === "BigDecimal") imports.add("java.math.BigDecimal");
      if (type === "LocalDate" || type === "LocalDateTime" || type === "LocalTime") imports.add(`java.time.${type}`);
      if (type === "UUID") imports.add("java.util.UUID");
    }
  }
  const lines = ["package com.example.entity;", "", ...[...imports].sort().map((item) => `import ${item};`), "", ...tables.flatMap((table) => javaClass(table, orm))];
  return `${lines.join("\n").trimEnd()}\n`;
}

function javaClass(table: EntityTableModel, orm: "jpa" | "mybatis-plus"): string[] {
  const className = pascalCase(table.tableName, "Entity");
  const seen = new Set<string>();
  const fields: Array<{ type: string; name: string }> = [];
  const lines = [...javaDoc(comment(table.tableComment))];
  if (orm === "jpa") {
    lines.push("@Entity");
    const schema = table.schema ? `, schema = ${javaString(table.schema)}` : "";
    lines.push(`@Table(name = ${javaString(table.tableName)}${schema})`);
  } else {
    lines.push(`@TableName(${javaString(qualifiedName(table))})`);
  }
  lines.push(`public class ${className} {`, "");
  for (const column of table.columns) {
    const type = javaType(column);
    const field = uniqueName(camelCase(column.name, "field"), seen);
    fields.push({ type, name: field });
    lines.push(...javaDoc(comment(column.comment), "    "));
    if (orm === "jpa") {
      if (column.is_primary_key) lines.push("    @Id");
      lines.push(`    @Column(name = ${javaString(column.name)}, nullable = ${column.is_nullable ? "true" : "false"}, columnDefinition = ${javaString(dbType(column))})`);
    } else if (column.is_primary_key) {
      lines.push(`    @TableId(${javaString(column.name)})`);
    } else {
      lines.push(`    @TableField(${javaString(column.name)})`);
    }
    lines.push(`    private ${type} ${field};`, "");
  }
  for (const field of fields) {
    const suffix = pascalCase(field.name, "Field");
    lines.push(`    public ${field.type} get${suffix}() {`, `        return ${field.name};`, "    }", "", `    public void set${suffix}(${field.type} ${field.name}) {`, `        this.${field.name} = ${field.name};`, "    }", "");
  }
  if (fields.length) lines.pop();
  lines.push("}", "");
  return lines;
}

function generateTypeOrm(tables: EntityTableModel[]): string {
  const usesPrimary = tables.some((table) => table.columns.some((column) => column.is_primary_key));
  const importNames = usesPrimary ? "Column, Entity, PrimaryColumn" : "Column, Entity";
  const lines = [`import { ${importNames} } from "typeorm";`, "", ...tables.flatMap(typeOrmClass)];
  return `${lines.join("\n").trimEnd()}\n`;
}

function typeOrmClass(table: EntityTableModel): string[] {
  const className = pascalCase(table.tableName, "Entity");
  const seen = new Set<string>();
  const entityArgs = table.schema ? `{ name: ${tsString(table.tableName)}, schema: ${tsString(table.schema)} }` : `{ name: ${tsString(table.tableName)} }`;
  const lines = [...docLines("/** ", comment(table.tableComment), " */"), `@Entity(${entityArgs})`, `export class ${className} {`];
  for (const column of table.columns) {
    const property = uniqueName(camelCase(column.name, "field"), seen);
    const options = typeOrmColumnOptions(column);
    lines.push(...docLines("  /** ", comment(column.comment), " */"));
    lines.push(`  @${column.is_primary_key ? "PrimaryColumn" : "Column"}(${options})`);
    const type = tsType(column);
    lines.push(column.is_nullable ? `  ${property}?: ${type} | null;` : `  ${property}!: ${type};`, "");
  }
  if (table.columns.length) lines.pop();
  lines.push("}", "");
  return lines;
}

function typeOrmColumnOptions(column: ColumnInfo): string {
  const type = baseDbType(column) || dbType(column);
  const options = [`name: ${tsString(column.name)}`, `type: ${tsString(type)}`];
  const length = lengthOf(column);
  if (length && ["char", "varchar", "nchar", "nvarchar"].includes(type)) options.push(`length: ${length}`);
  const { precision, scale } = precisionScaleOf(column);
  if (precision && ["decimal", "numeric"].includes(type)) {
    options.push(`precision: ${precision}`);
    options.push(`scale: ${scale ?? 0}`);
  }
  if (column.is_nullable) options.push("nullable: true");
  const colComment = comment(column.comment);
  if (colComment) options.push(`comment: ${tsString(colComment)}`);
  return `{ ${options.join(", ")} }`;
}

function generateGorm(tables: EntityTableModel[]): string {
  const usesTime = tables.some((table) => table.columns.some((column) => goType(column).includes("time.Time")));
  const lines = ["package models", "", ...(usesTime ? ['import "time"', ""] : []), ...tables.flatMap(gormStruct)];
  return `${lines.join("\n").trimEnd()}\n`;
}

function gormStruct(table: EntityTableModel): string[] {
  const structName = pascalCase(table.tableName, "Entity");
  const seen = new Set<string>();
  const lines = [...docLines("// ", comment(table.tableComment)), `type ${structName} struct {`];
  for (const column of table.columns) {
    const field = uniqueName(pascalCase(column.name, "Field"), seen);
    const tags = [`column:${column.name}`, `type:${dbType(column)}`];
    if (column.is_primary_key) tags.push("primaryKey");
    if (!column.is_nullable) tags.push("not null");
    const colComment = comment(column.comment);
    if (colComment) tags.push(`comment:${colComment.replace(/[;`]/g, ",")}`);
    lines.push(...docLines("\t// ", colComment));
    lines.push(`\t${field} ${goType(column)} \`gorm:"${tags.join(";")}" json:"${snakeCase(column.name, "field")}"\``);
  }
  lines.push("}", "", `func (${structName}) TableName() string {`, `\treturn "${qualifiedName(table)}"`, "}", "");
  return lines;
}

function generateSqlAlchemy(tables: EntityTableModel[]): string {
  const lines = ["from sqlalchemy import BigInteger, Boolean, Column, Date, DateTime, Float, Integer, JSON, LargeBinary, Numeric, SmallInteger, String, Text, Time", "from sqlalchemy.orm import declarative_base", "", "Base = declarative_base()", "", ...tables.flatMap(sqlAlchemyClass)];
  return `${lines.join("\n").trimEnd()}\n`;
}

function sqlAlchemyClass(table: EntityTableModel): string[] {
  const className = pascalCase(table.tableName, "Entity");
  const seen = new Set<string>();
  const lines = [`class ${className}(Base):`];
  const tableComment = comment(table.tableComment);
  if (tableComment) lines.push(`    """${tableComment.replace(/"""/g, '\\"\\"\\"')}"""`);
  lines.push(`    __tablename__ = ${pyString(table.tableName)}`);
  const tableArgs: string[] = [];
  if (table.schema) tableArgs.push(`"schema": ${pyString(table.schema)}`);
  if (tableComment) tableArgs.push(`"comment": ${pyString(tableComment)}`);
  if (tableArgs.length) lines.push(`    __table_args__ = {${tableArgs.join(", ")}}`);
  if (!table.columns.some((column) => column.is_primary_key)) {
    lines.push("    # TODO: define a primary key if this object is mapped as a SQLAlchemy ORM entity.");
  }
  for (const column of table.columns) {
    const property = uniqueName(snakeCase(column.name, "field"), seen);
    const args = [pyString(column.name), sqlalchemyType(column)];
    if (column.is_primary_key) args.push("primary_key=True");
    args.push(`nullable=${column.is_nullable ? "True" : "False"}`);
    const colComment = comment(column.comment);
    if (colComment) args.push(`comment=${pyString(colComment)}`);
    lines.push(`    ${property} = Column(${args.join(", ")})`);
  }
  lines.push("");
  return lines;
}
