/**
 * A D1 stand-in backed by node:sqlite, so the store's SQL is exercised as
 * written rather than mocked away. Implements only the slice of the D1 client
 * that lib/store.js uses: prepare().bind().all()/.first()/.run() and batch().
 */

import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";

const SCHEMA = new URL("../../schema.sql", import.meta.url);

export function createDatabase() {
  const sqlite = new DatabaseSync(":memory:");
  sqlite.exec("PRAGMA foreign_keys = ON");
  sqlite.exec(readFileSync(SCHEMA, "utf8"));

  return new D1Stub(sqlite);
}

class D1Stub {
  constructor(sqlite) {
    this.sqlite = sqlite;
  }

  prepare(sql) {
    return new Statement(this.sqlite, sql, []);
  }

  async batch(statements) {
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
  constructor(sqlite, sql, values) {
    this.sqlite = sqlite;
    this.sql = sql;
    this.values = values;
  }

  bind(...values) {
    return new Statement(this.sqlite, this.sql, values);
  }

  execute() {
    const statement = this.sqlite.prepare(this.sql);
    if (isQuery(this.sql)) {
      return { results: statement.all(...this.values), meta: { changes: 0 } };
    }

    const { changes } = statement.run(...this.values);
    return { results: [], meta: { changes: Number(changes) } };
  }

  async all() {
    return this.execute();
  }

  async first() {
    const { results } = this.execute();
    return results[0] ?? null;
  }

  async run() {
    return this.execute();
  }
}

function isQuery(sql) {
  return /^\s*(SELECT|WITH)\b/i.test(sql);
}
