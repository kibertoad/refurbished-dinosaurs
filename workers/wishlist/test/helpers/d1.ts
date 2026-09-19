/**
 * A D1 stand-in backed by node:sqlite, so the store's SQL is exercised as
 * written rather than mocked away. Implements only the slice of the D1 client
 * that src/lib/store.ts uses: prepare().bind().all()/.first()/.run() and
 * batch().
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";

import type { D1Database } from "@cloudflare/workers-types";

const SCHEMA = join(import.meta.dirname, "../../schema.sql");

type Row = Record<string, unknown>;
type Result = { results: Row[]; meta: { changes: number } };

export function createDatabase(): D1Database {
  const sqlite = new DatabaseSync(":memory:");
  sqlite.exec("PRAGMA foreign_keys = ON");
  sqlite.exec(readFileSync(SCHEMA, "utf8"));

  return new D1Stub(sqlite) as unknown as D1Database;
}

class D1Stub {
  constructor(private readonly sqlite: DatabaseSync) {}

  prepare(sql: string): Statement {
    return new Statement(this.sqlite, sql, []);
  }

  async batch(statements: Statement[]): Promise<Result[]> {
    this.sqlite.exec("BEGIN");
    try {
      const results = statements.map((statement) => statement.execute());
      this.sqlite.exec("COMMIT");
      return results;
    } catch (error) {
      this.sqlite.exec("ROLLBACK");
      throw error;
    }
  }
}

class Statement {
  constructor(
    private readonly sqlite: DatabaseSync,
    private readonly sql: string,
    private readonly values: unknown[],
  ) {}

  bind(...values: unknown[]): Statement {
    return new Statement(this.sqlite, this.sql, values);
  }

  execute(): Result {
    const statement = this.sqlite.prepare(this.sql);
    const values = this.values as never[];

    if (/^\s*(SELECT|WITH)\b/i.test(this.sql)) {
      return { results: statement.all(...values) as Row[], meta: { changes: 0 } };
    }

    const { changes } = statement.run(...values);
    return { results: [], meta: { changes: Number(changes) } };
  }

  async all(): Promise<Result> {
    return this.execute();
  }

  async first(): Promise<Row | null> {
    return this.execute().results[0] ?? null;
  }

  async run(): Promise<Result> {
    return this.execute();
  }
}
