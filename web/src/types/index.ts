export interface FacilitasItem {
  name: string;
  amount: number;
}

export interface DeductionItem {
  name: string;
  amount: number;
}

export interface Employee {
  nik: string;
  nama: string;
  jabatan: string;
  gaji_pokok: number;
  tunjangan: number;
  status_ptkp: string;
  fasilitas: FacilitasItem[];
  is_bpjs_kes_member: boolean;
  is_bpjs_tk_member: boolean;
}

export type TransportMode = "flat" | "per_day";

export interface PayrollConfig {
  period: string;
  period_label: string;
  hari_kerja: number;
  uang_transport_mode: TransportMode;
  uang_transport_flat: number;
  uang_transport_per_hari: number;
  uang_makan_per_hari: number;
  bpjs_kes_employee_rate: number;
  bpjs_kes_employer_rate: number;
  bpjs_kes_salary_cap: number;
  bpjs_jht_employee_rate: number;
  bpjs_jht_employer_rate: number;
  bpjs_jkk_employer_rate: number;
  bpjs_jkm_employer_rate: number;
  bpjs_tk_salary_cap: number;
}

export interface PayrollEntry {
  nik: string;
  hari_kerja_aktual: number;
  overtime_hours: number;
  overtime_rate_per_hour: number;
  bonus: number;
  potongan_internal: DeductionItem[];
  fasilitas_override: FacilitasItem[] | null;
  transport_override: number | null;
  makan_override: number | null;
}

export interface Payslip {
  period: string;
  period_label: string;
  nik: string;
  nama: string;
  jabatan: string;
  status_ptkp: string;
  hari_kerja_config: number;
  hari_kerja_aktual: number;
  gaji_pokok: number;
  gaji_prorata: number;
  overtime: number;
  overtime_hours: number;
  overtime_rate_per_hour: number;
  uang_transport: number;
  uang_makan: number;
  bonus: number;
  fasilitas: number;
  fasilitas_items: FacilitasItem[];
  bpjs_kes_employee: number;
  bpjs_jht_employee: number;
  pph21: number;
  potongan_internal: number;
  potongan_internal_items: DeductionItem[];
  bpjs_kes_employer: number;
  bpjs_jht_employer: number;
  bpjs_jkk_employer: number;
  bpjs_jkm_employer: number;
  total_pendapatan: number;
  total_potongan: number;
  take_home_pay: number;
}

export const PTKP_OPTIONS = [
  "",
  "TK/0",
  "TK/1",
  "TK/2",
  "TK/3",
  "K/0",
  "K/1",
  "K/2",
  "K/3",
];
