import { describe, it } from "node:test";
import assert from "node:assert/strict";
import axios from "axios";
import { parsePersonnummer, normalizeToTwelveDigit } from "../src/utils.js";

const API_URL =
  "https://skatteverket.entryscape.net/rowstore/dataset/b4de7df7-63c0-4e7e-bb59-1f156a591763";

// ─── parsePersonnummer ────────────────────────────────────────────────────────

describe("parsePersonnummer", () => {
  it("parses a female personnummer correctly", () => {
    const result = parsePersonnummer("198501012382");
    assert.equal(result.birthDate, "1985-01-01");
    assert.equal(result.gender, "female");   // birthNumber 238 is even
    assert.equal(result.tenDigit, "850101-2382");
    assert.equal(result.year, 1985);
    assert.equal(result.month, 1);
    assert.equal(result.day, 1);
    assert.equal(result.birthNumber, 238);
  });

  it("parses a male personnummer correctly", () => {
    const result = parsePersonnummer("198501012390");
    assert.equal(result.gender, "male");     // birthNumber 239 is odd
    assert.equal(result.birthDate, "1985-01-01");
    assert.equal(result.tenDigit, "850101-2390");
  });

  it("parses the earliest number in the dataset", () => {
    const result = parsePersonnummer("189001019802");
    assert.equal(result.year, 1890);
    assert.equal(result.month, 1);
    assert.equal(result.day, 1);
    assert.equal(result.tenDigit, "900101-9802");
  });
});

// ─── normalizeToTwelveDigit ───────────────────────────────────────────────────

describe("normalizeToTwelveDigit", () => {
  it("passes through a 12-digit number unchanged", () => {
    assert.equal(normalizeToTwelveDigit("198501012382"), "198501012382");
  });

  it("expands a 10-digit number born in 1985 to 12 digits", () => {
    assert.equal(normalizeToTwelveDigit("8501012382"), "198501012382");
  });

  it("strips hyphens before normalizing", () => {
    assert.equal(normalizeToTwelveDigit("850101-2382"), "198501012382");
  });

  it("throws on invalid length", () => {
    assert.throws(() => normalizeToTwelveDigit("12345"), /Cannot normalize/);
  });
});

// ─── Live API ─────────────────────────────────────────────────────────────────

describe("Skatteverket API (live)", () => {
  it("returns results and a positive total count", async () => {
    const response = await axios.get(API_URL, {
      params: { _limit: 5 },
      headers: { Accept: "application/json" },
      timeout: 10000,
    });
    assert.equal(response.status, 200);
    assert.ok(response.data.resultCount > 0, "resultCount should be > 0");
    assert.ok(Array.isArray(response.data.results), "results should be an array");
    assert.ok(response.data.results.length > 0, "results array should not be empty");
  });

  it("filters correctly with a regex pattern", async () => {
    const response = await axios.get(API_URL, {
      params: { testpersonnummer: "^189001$", _limit: 10 },
      headers: { Accept: "application/json" },
      timeout: 10000,
    });
    assert.equal(response.status, 200);
    // All returned numbers must start with 189001
    for (const row of response.data.results as Array<{ testpersonnummer: string }>) {
      assert.match(row.testpersonnummer, /^189001/);
    }
  });

  it("first record in the dataset is 189001019802", async () => {
    const response = await axios.get(API_URL, {
      params: { _limit: 1, _offset: 0 },
      headers: { Accept: "application/json" },
      timeout: 10000,
    });
    assert.equal(response.data.results[0].testpersonnummer, "189001019802");
  });
});
