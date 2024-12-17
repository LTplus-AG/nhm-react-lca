import { EBKPItem } from "../types/ebkp.types";

export const ebkpData: EBKPItem[] = [
  { code: "B06.01", bezeichnung: "Aushub" },
  { code: "B06.04", bezeichnung: "Baugrubenabschluss, Pfählung" },
  { code: "B07.02", bezeichnung: "Baugrubenabschluss, Pfählung" },
  { code: "C01", bezeichnung: "Fundament, Bodenplatte" },
  {
    code: "C02.01",
    bezeichnung: "Aussenwandkonstruktion (ohne Bekleidung nach E01)",
  },
  { code: "C02.02", bezeichnung: "Innenwandkonstruktion tragend" },
  { code: "C03", bezeichnung: "Stützenkonstruktion" },
  {
    code: "C04.01",
    bezeichnung: "Geschossdecke (ohne Bekleidung nach G02 und G04)",
  },
  { code: "C04.04", bezeichnung: "Dachkonstruktion (ohne Bedachung nach F)" },
  { code: "C04.05", bezeichnung: "Dachkonstruktion (ohne Bedachung nach F)" },
  { code: "C04.08", bezeichnung: "Aussen liegende Konstruktion" },
  { code: "E01", bezeichnung: "Äussere Wandbekleidung unter Terrain" },
  {
    code: "E02.01",
    bezeichnung: "Äussere Beschichtung (Putz direkt auf der Konstruktion)",
  },
  { code: "E02.02", bezeichnung: "Aussenwärmedämmung (Kompaktfassade)" },
  { code: "E02.03", bezeichnung: "Fassadenbekleidung (hinterlüftet)" },
  { code: "E02.04", bezeichnung: "Systemfassade" },
  { code: "E02.05", bezeichnung: "Bekleidung Untersicht (inkl. Auskragungen)" },
  { code: "E03", bezeichnung: "Element in Aussenwand (Fenster, Türen, Tore)" },
  { code: "F01.01", bezeichnung: "Dachabdichtung unter Terrain" },
  {
    code: "F01.02",
    bezeichnung: "Bedachung Flachdach (Schutz- und Nutzschicht)",
  },
  {
    code: "F01.03",
    bezeichnung: "Bedachung geneigtes Dach (ab Tragstruktur bis Eindeckung)",
  },
  { code: "F02", bezeichnung: "Element zu Dach (Dachfenster, Sonnenschutz)" },
  {
    code: "G01",
    bezeichnung:
      "Trennwand, Innentür, Innentor (nicht tragend, inkl. Innenfenster)",
  },
  { code: "G02", bezeichnung: "Bodenbelag" },
  { code: "G03", bezeichnung: "Wandbekleidung" },
  { code: "G04", bezeichnung: "Deckenbekleidung (Bekleidungen, Putz)" },
];
