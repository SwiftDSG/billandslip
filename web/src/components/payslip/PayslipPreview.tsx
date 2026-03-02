import type { Payslip } from "../../types";
import { formatIDR } from "../../api/client";

interface Props {
  payslip: Payslip;
  pdfMode?: boolean;
}

export function PayslipPreview({ payslip: s, pdfMode }: Props) {
  const hasFasilitas = s.fasilitas_items.length > 0;

  // Regular income (excludes fasilitas — shown in its own column when present)
  const incomeRows: [string, number][] = [
    ["Gaji Pokok (Prorata)", s.gaji_prorata],
    ["Uang Transport", s.uang_transport],
    ["Uang Makan", s.uang_makan],
    ...(s.bonus > 0 ? [["Bonus", s.bonus] as [string, number]] : []),
    ...(s.overtime > 0 ? [["Overtime", s.overtime] as [string, number]] : []),
    // When no fasilitas column, include items inline in income
    ...(!hasFasilitas
      ? s.fasilitas_items
          .filter((i) => i.amount > 0)
          .map((i) => [i.name, i.amount] as [string, number])
      : []),
  ];

  // Fasilitas rows (only used in 3-column layout)
  const fasRows: [string, number][] = s.fasilitas_items
    .filter((i) => i.amount > 0)
    .map((i) => [i.name, i.amount]);

  // Deductions
  const deductRows: [string, number][] = [
    ...(s.bpjs_kes_employee > 0 ? [["BPJS Kesehatan", s.bpjs_kes_employee] as [string, number]] : []),
    ...(s.bpjs_jht_employee > 0 ? [["BPJS JHT", s.bpjs_jht_employee] as [string, number]] : []),
    ...s.potongan_internal_items
      .filter((i) => i.amount > 0)
      .map((i) => [i.name, i.amount] as [string, number]),
  ];

  const maxRows = Math.max(incomeRows.length, fasRows.length, deductRows.length);

  // Income total for this column (excludes fasilitas in 3-col mode)
  const incomeTotalDisplay = hasFasilitas
    ? s.total_pendapatan - s.fasilitas
    : s.total_pendapatan;

  return (
    <div className={`bg-white w-full max-w-[794px] mx-auto ${pdfMode ? "p-0" : "border border-gray-200 rounded-xl p-6 print:border-0 print:rounded-none print:shadow-none print:p-4"}`}>
      {/* Header with logo — left-aligned */}
      <div className="flex items-center gap-4 mb-5 pb-4 border-b-2 border-gray-800">
        <img src="/logo.svg" alt="BillAndSlip" className="h-8 w-auto shrink-0" />
        <div>
          <h1 className="text-lg font-bold text-gray-900">SLIP GAJI KARYAWAN</h1>
          <p className="text-xs font-semibold text-gray-700">PT. Tito Digital Kreasi</p>
          <p className="text-xs text-gray-600 mt-0.5">Periode: {s.period_label}</p>
        </div>
      </div>

      {/* Employee info */}
      <div className="grid grid-cols-2 gap-x-8 gap-y-1 mb-5 text-xs">
        <InfoRow label="NIK" value={s.nik} mono />
        <InfoRow label="Jabatan" value={s.jabatan || "—"} />
        <InfoRow label="Nama" value={s.nama} />
        <InfoRow label="Status PTKP" value={s.status_ptkp || "—"} />
        <InfoRow label="Hari Kerja" value={`${s.hari_kerja_aktual} dari ${s.hari_kerja_config} hari`} />
      </div>

      {/* Income / Fasilitas / Deduction table */}
      <div className={`border border-gray-300 rounded overflow-hidden mb-4 ${hasFasilitas ? "grid" : ""}`}>
        {/* Header row */}
        <div className={`grid ${hasFasilitas ? "grid-cols-3" : "grid-cols-2"}`}>
          <div className="bg-gray-100 px-3 py-1.5 text-xs font-semibold text-center border-b border-r border-gray-300">
            PENDAPATAN
          </div>
          {hasFasilitas && (
            <div className="bg-gray-100 px-3 py-1.5 text-xs font-semibold text-center border-b border-r border-gray-300">
              FASILITAS
            </div>
          )}
          <div className="bg-gray-100 px-3 py-1.5 text-xs font-semibold text-center border-b border-gray-300">
            POTONGAN
          </div>
        </div>

        {/* Data rows */}
        {Array.from({ length: maxRows }, (_, i) => (
          <div
            key={i}
            className={`grid ${hasFasilitas ? "grid-cols-3" : "grid-cols-2"} border-b border-gray-200 last:border-b-0 text-xs`}
          >
            <div className="grid grid-cols-2 px-3 py-1 border-r border-gray-200">
              <span className="text-gray-700">{incomeRows[i]?.[0] ?? ""}</span>
              <span className="text-right tabular-nums">
                {incomeRows[i] ? formatIDR(incomeRows[i][1]) : ""}
              </span>
            </div>
            {hasFasilitas && (
              <div className="grid grid-cols-2 px-3 py-1 border-r border-gray-200">
                <span className="text-gray-700">{fasRows[i]?.[0] ?? ""}</span>
                <span className="text-right tabular-nums text-indigo-700">
                  {fasRows[i] ? formatIDR(fasRows[i][1]) : ""}
                </span>
              </div>
            )}
            <div className="grid grid-cols-2 px-3 py-1">
              <span className="text-gray-700">{deductRows[i]?.[0] ?? ""}</span>
              <span className="text-right tabular-nums text-red-600">
                {deductRows[i] ? formatIDR(deductRows[i][1]) : ""}
              </span>
            </div>
          </div>
        ))}

        {/* Totals row */}
        <div className={`grid ${hasFasilitas ? "grid-cols-3" : "grid-cols-2"} bg-gray-50 border-t-2 border-gray-300 text-xs font-semibold`}>
          <div className="grid grid-cols-2 px-3 py-1.5 border-r border-gray-200">
            <span>TOTAL PENDAPATAN</span>
            <span className="text-right tabular-nums">{formatIDR(incomeTotalDisplay)}</span>
          </div>
          {hasFasilitas && (
            <div className="grid grid-cols-2 px-3 py-1.5 border-r border-gray-200">
              <span>TOTAL FASILITAS</span>
              <span className="text-right tabular-nums text-indigo-700">{formatIDR(s.fasilitas)}</span>
            </div>
          )}
          <div className="grid grid-cols-2 px-3 py-1.5">
            <span>TOTAL POTONGAN</span>
            <span className="text-right tabular-nums text-red-600">{formatIDR(s.total_potongan)}</span>
          </div>
        </div>
      </div>

      {/* Take Home Pay */}
      <div className="bg-indigo-600 text-white rounded-lg px-5 py-3 flex justify-between items-center mb-5">
        <span className="text-sm font-bold">TAKE HOME PAY (PENDAPATAN - POTONGAN)</span>
        <span className="text-xl font-bold tabular-nums">{formatIDR(s.take_home_pay)}</span>
      </div>

      {/* Employer BPJS */}
      {(s.bpjs_kes_employer > 0 || s.bpjs_jht_employer > 0) && (
        <div className="border border-gray-200 rounded-lg p-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Kontribusi Perusahaan (Informasi)
          </p>
          <div className="grid grid-cols-2 gap-x-8 gap-y-0.5 text-xs">
            <InfoRow label="BPJS Kes (Perusahaan)" value={formatIDR(s.bpjs_kes_employer)} />
            <InfoRow label="BPJS JHT (Perusahaan)" value={formatIDR(s.bpjs_jht_employer)} />
            <InfoRow label="BPJS JKK (Perusahaan)" value={formatIDR(s.bpjs_jkk_employer)} />
            <InfoRow label="BPJS JKM (Perusahaan)" value={formatIDR(s.bpjs_jkm_employer)} />
          </div>
        </div>
      )}

      <p className="text-xs text-gray-400 mt-4 text-center">
        Dokumen ini digenerate secara otomatis.
      </p>
    </div>
  );
}

function InfoRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex gap-1.5">
      <span className="text-gray-500 w-24 shrink-0">{label}</span>
      <span className="text-gray-500">:</span>
      <span className={`font-medium ${mono ? "font-mono" : ""}`}>{value}</span>
    </div>
  );
}
