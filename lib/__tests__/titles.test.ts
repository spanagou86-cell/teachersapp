import { describe, expect, it } from "vitest";
import { titleFromFileName } from "../materials";

describe("titleFromFileName", () => {
  it("turns greeklish file names into Greek titles", () => {
    expect(titleFromFileName("mathimatika_d.pdf")).toBe("Μαθηματικά Δ΄");
    expect(titleFromFileName("fyllo-ergasias_glossa_st.docx")).toBe("Φύλλο εργασίας Γλώσσα ΣΤ΄");
  });
  it("keeps names it does not recognise", () => {
    expect(titleFromFileName("Κεφάλαιο 3 κλάσματα.pdf")).toBe("Κεφάλαιο 3 κλάσματα");
    expect(titleFromFileName("scan_0042.jpg")).toBe("Scan 0042");
    expect(titleFromFileName(".pdf")).toBe("Νέο υλικό");
  });
});
