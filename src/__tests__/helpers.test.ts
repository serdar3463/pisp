import { calculateVaultCompleteness, validateFieldValue, shortHash, getTemplateReadiness } from "../utils/helpers";
import { initialVaultValues, allFields, Template, initialPolicy } from "../data/pisp";

const testTemplate: Template = {
  id: "test", name: "Test Şablonu", purpose: "Test", recipient: "Test alıcı",
  license: "—", royalty: "—", fieldIds: ["fullName", "email"], output: "JSON-LD"
};

describe("validateFieldValue", () => {
  const baseField = { id: "name", type: "text" as const, label: "Ad", value: "", risk: "ordinary" as const, standard: "ISO-001" };

  it("boş değer için hata döner", () => {
    expect(validateFieldValue(baseField, "")).toBe("Bu alan boş bırakıldı.");
    expect(validateFieldValue(baseField, "   ")).toBe("Bu alan boş bırakıldı.");
  });

  it("geçerli metin için null döner", () => {
    expect(validateFieldValue(baseField, "Test Adı")).toBeNull();
  });

  it("geçersiz tarih formatı için hata döner", () => {
    const dateField = { ...baseField, id: "birthdate", type: "date" as const };
    expect(validateFieldValue(dateField, "22.08.2001")).toBeTruthy();
    expect(validateFieldValue(dateField, "2001-08-22")).toBeNull();
  });

  it("geçersiz email için hata döner", () => {
    const emailField = { ...baseField, id: "email" };
    expect(validateFieldValue(emailField, "bozuk-email")).toBeTruthy();
    expect(validateFieldValue(emailField, "test@example.com")).toBeNull();
  });

  it("geçersiz telefon için hata döner", () => {
    const phoneField = { ...baseField, id: "phone" };
    expect(validateFieldValue(phoneField, "abc")).toBeTruthy();
    expect(validateFieldValue(phoneField, "+90 555 123 45 67")).toBeNull();
  });

  it("sayı alanına metin girilince hata döner", () => {
    const numberField = { ...baseField, id: "score", type: "number" as const };
    expect(validateFieldValue(numberField, "abc")).toBeTruthy();
    expect(validateFieldValue(numberField, "700")).toBeNull();
  });
});

describe("calculateVaultCompleteness", () => {
  it("boş vault için 0 döner", () => {
    expect(calculateVaultCompleteness(initialVaultValues)).toBe(0);
  });

  it("dolu vault için 100 döner", () => {
    const fields = allFields(initialVaultValues);
    const fullVault = { ...initialVaultValues };
    for (const field of fields) {
      fullVault[field.id] = "test-value";
    }
    expect(calculateVaultCompleteness(fullVault)).toBe(100);
  });

  it("yarı dolu vault için yaklaşık 50 döner", () => {
    const fields = allFields(initialVaultValues);
    const halfVault = { ...initialVaultValues };
    const half = Math.floor(fields.length / 2);
    for (let i = 0; i < half; i++) {
      halfVault[fields[i]!.id] = "test-value";
    }
    const result = calculateVaultCompleteness(halfVault);
    expect(result).toBeGreaterThan(30);
    expect(result).toBeLessThan(70);
  });
});

describe("shortHash", () => {
  it("kısa değeri olduğu gibi döner", () => {
    expect(shortHash("abc")).toBe("abc");
    expect(shortHash("12345678901234567")).toBe("12345678901234567");
  });

  it("uzun değeri kısaltır", () => {
    const long = "abcdefghijklmnopqrstuvwxyz";
    const result = shortHash(long);
    expect(result).toContain("...");
    expect(result.length).toBeLessThan(long.length);
  });
});

describe("getTemplateReadiness", () => {
  it("ilk template için hazırlık skoru hesaplar", () => {
    const result = getTemplateReadiness(testTemplate, initialPolicy, initialVaultValues);
    expect(result).toHaveProperty("percent");
    expect(result.percent).toBeGreaterThanOrEqual(0);
    expect(result.percent).toBeLessThanOrEqual(100);
    expect(result).toHaveProperty("missingFieldIds");
    expect(result).toHaveProperty("missingLabels");
    expect(Array.isArray(result.missingFieldIds)).toBe(true);
  });
});
