import { describe, expect, it } from "vitest";
import { buildSqlCompletionItems, getSqlCompletionContext } from "@/lib/sqlCompletion";

describe("sqlCompletion quoted schema qualifiers", () => {
  it("parses quoted PostgreSQL schema names before a dot", () => {
    const sql = 'SELECT *\nFROM "order-management".';
    const context = getSqlCompletionContext(sql, sql.length);

    expect(context.qualifier).toBe("order-management");
    expect(context.prefix).toBe("");
    expect(context.suggestTables).toBe(true);
    expect(context.exclusiveColumnSuggestions).toBe(false);
  });

  it("suggests tables after a quoted schema qualifier", () => {
    const sql = 'SELECT *\nFROM "order-management".';
    const items = buildSqlCompletionItems(sql, sql.length, {
      dialect: "postgres",
      tables: [
        { name: "orders", schema: "order-management", type: "table" },
        { name: "shipments", schema: "order-management", type: "table" },
      ],
      columnsByTable: new Map(),
    });

    expect(items.some((item) => item.label === "orders" && item.type === "table")).toBe(true);
    expect(items.some((item) => item.label === "shipments" && item.type === "table")).toBe(true);
  });
});

describe("sqlCompletion where clause columns", () => {
  it("suggests referenced table columns after WHERE", () => {
    const sql = "select * from BusinessUnit where depar";
    const items = buildSqlCompletionItems(sql, sql.length, {
      dialect: "sqlserver",
      tables: [{ name: "BusinessUnit", type: "table" }],
      columnsByTable: new Map([
        [
          "BusinessUnit",
          [
            {
              name: "departmentId",
              table: "BusinessUnit",
              dataType: "int",
            },
          ],
        ],
      ]),
    });

    expect(items.some((item) => item.label === "departmentId" && item.type === "column")).toBe(true);
  });
});
