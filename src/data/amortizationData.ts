// Mapping of eBKP-H codes to amortization periods in years
export const ebkpAmortizationPeriods: Map<string, number> = new Map([
  ["C01", 80],
  ["C02.01", 80],
  ["C02.02", 80],
  ["C03", 80],
  ["C04.01", 80],
  ["C04.04", 80],
  ["C04.05", 80],
  ["C04.08", 80],
  ["E01", 50],
  ["E02.01", 50],
  ["E02.02", 50],
  ["E02.03", 50],
  ["E02.04", 50],
  ["E02.05", 50],
  ["E03", 30],
  ["F01.01", 40],
  ["F01.02", 40],
  ["F01.03", 40],
  ["F02", 30],
  ["G01", 50],
  ["G02", 40],
  ["G03", 40],
  ["G04", 40],
]);

export { DEFAULT_AMORTIZATION_YEARS } from "../utils/constants";
