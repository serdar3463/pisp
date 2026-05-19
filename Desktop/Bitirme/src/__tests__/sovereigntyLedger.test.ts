import { createGenesisBlock, createShareBlock, verifyChain } from "../services/sovereigntyLedger";
import { Template, initialPolicy, defaultPolicyContext } from "../data/pisp";

const testTemplate: Template = {
  id: "test", name: "Test Şablonu", purpose: "Test", recipient: "Test alıcı",
  license: "—", royalty: "—", fieldIds: ["fullName", "email"], output: "JSON-LD"
};

jest.mock("expo-crypto", () => ({
  CryptoDigestAlgorithm: { SHA256: "SHA-256" },
  digestStringAsync: jest.fn().mockImplementation((_, input: string) =>
    Promise.resolve(`hash-${Buffer.from(input).toString("base64").slice(0, 16)}`)
  )
}));

jest.mock("../services/deviceIdentity", () => ({
  getOrCreateDeviceIdentity: jest.fn().mockResolvedValue({
    did: "did:pisp:test-device-001",
    publicKey: new Uint8Array(32).fill(1)
  }),
  signPayload: jest.fn().mockResolvedValue({ ...{}, signature: "mock-sig" })
}));

describe("createGenesisBlock", () => {
  it("genesis bloğunu oluşturur", async () => {
    const block = await createGenesisBlock();
    expect(block.blockHash).toBeTruthy();
    expect(block.action).toBe("GENESIS");
    expect(block.previousHash).toMatch(/^0+$/);
  });
});

describe("createShareBlock", () => {
  it("paylaşım bloğunu zincire ekler", async () => {
    const genesis = await createGenesisBlock();
    const block = await createShareBlock({
      chain: [genesis],
      template: testTemplate,
      policy: initialPolicy,
      context: defaultPolicyContext
    });
    expect(block.blockHash).toBeTruthy();
    expect(block.previousHash).toBe(genesis.blockHash);
    expect(block.templateId).toBe(testTemplate.id);
    expect(["SHARE_COMMITTED", "CONSENT_REVOKED"]).toContain(block.action);
  });
});

describe("verifyChain", () => {
  it("boş zinciri geçerli sayar", async () => {
    const result = await verifyChain([]);
    expect(result.valid).toBe(true);
  });

  it("genesis bloğu içeren zinciri doğrular", async () => {
    const genesis = await createGenesisBlock();
    const result = await verifyChain([genesis]);
    expect(result).toHaveProperty("valid");
    expect(result).toHaveProperty("message");
  });
});
