import { describe, it, expect } from "vitest";
import { nextDocumentNumber, DEFAULT_DOC_NUMBER_CONFIG } from "@/lib/document-number";
import type { Prisma } from "@/lib/generated/prisma/client";

// mock transaction client ที่จำลอง documentSequence.upsert (increment)
function makeMockTx(initial = 0) {
  let value = initial;
  return {
    documentSequence: {
      upsert: async () => {
        value += 1;
        return { value };
      },
    },
  } as unknown as Prisma.TransactionClient;
}

// สเปคหมวด 35: ระบบเลขที่เอกสาร
describe("Document number generation", () => {
  it("สร้างเลขรูปแบบ DOC-YYYY-NNNNNN พร้อม padding", async () => {
    const tx = makeMockTx(0);
    const now = new Date(2026, 0, 15);
    const n = await nextDocumentNumber(tx, "org1", DEFAULT_DOC_NUMBER_CONFIG, undefined, now);
    expect(n).toBe("DOC-2026-000001");
  });

  it("running sequence เพิ่มขึ้นต่อเนื่อง", async () => {
    const tx = makeMockTx(5);
    const now = new Date(2026, 0, 15);
    const n = await nextDocumentNumber(tx, "org1", DEFAULT_DOC_NUMBER_CONFIG, undefined, now);
    expect(n).toBe("DOC-2026-000006");
  });

  it("รองรับ prefix override (เช่น รหัสแผนก)", async () => {
    const tx = makeMockTx(0);
    const now = new Date(2026, 0, 15);
    const n = await nextDocumentNumber(tx, "org1", DEFAULT_DOC_NUMBER_CONFIG, "HR", now);
    expect(n).toBe("HR-2026-000001");
  });

  it("รองรับการใส่เดือนในเลขที่เอกสาร", async () => {
    const tx = makeMockTx(0);
    const now = new Date(2026, 7, 1); // สิงหาคม
    const config = { ...DEFAULT_DOC_NUMBER_CONFIG, includeMonth: true };
    const n = await nextDocumentNumber(tx, "org1", config, "FIN", now);
    expect(n).toBe("FIN-2026-08-000001");
  });
});
