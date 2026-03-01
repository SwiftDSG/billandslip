import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Settings, Pencil, ChevronDown } from "lucide-react";
import {
  getPayroll,
  getPayrollConfig,
  upsertPayrollConfig,
  updatePayrollEntry,
  formatIDR,
} from "../api/client";
import { PayrollConfigForm } from "../components/payroll/PayrollConfigForm";
import { PayrollEntryForm, type EntryFormData } from "../components/payroll/PayrollEntryForm";
import type { PayrollConfig, Payslip } from "../types";

const DEFAULT_CONFIG: PayrollConfig = {
  period: "",
  period_label: "",
  hari_kerja: 22,
  uang_transport_mode: "flat",
  uang_transport_flat: 220_000,
  uang_transport_per_hari: 0,
  uang_makan_per_hari: 25_000,
  bpjs_kes_employee_rate: 0.01,
  bpjs_kes_employer_rate: 0.04,
  bpjs_kes_salary_cap: 5_288_796,
  bpjs_jht_employee_rate: 0.02,
  bpjs_jht_employer_rate: 0.037,
  bpjs_jkk_employer_rate: 0.0024,
  bpjs_jkm_employer_rate: 0.003,
  bpjs_tk_salary_cap: 5_000_000,
};

type ExpandKey = "fas" | "pot";

export function PayrollPage() {
  const qc = useQueryClient();
  const [period, setPeriod] = useState("2026-02");
  const [inputPeriod, setInputPeriod] = useState("2026-02");
  const [showConfig, setShowConfig] = useState(false);
  const [editingSlip, setEditingSlip] = useState<Payslip | null>(null);
  const [expandedCell, setExpandedCell] = useState<{ nik: string; col: ExpandKey } | null>(null);

  const toggleExpand = (nik: string, col: ExpandKey) =>
    setExpandedCell((prev) =>
      prev?.nik === nik && prev?.col === col ? null : { nik, col }
    );

  const configQ = useQuery({
    queryKey: ["payroll-config", period],
    queryFn: () => getPayrollConfig(period),
    retry: false,
  });

  const payrollQ = useQuery({
    queryKey: ["payroll", period],
    queryFn: () => getPayroll(period),
    enabled: !!configQ.data,
    retry: false,
  });

  const configMut = useMutation({
    mutationFn: (c: PayrollConfig) => upsertPayrollConfig(period, c),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["payroll-config", period] });
      qc.invalidateQueries({ queryKey: ["payroll", period] });
      setShowConfig(false);
    },
  });

  const entryMut = useMutation({
    mutationFn: ({ nik, ...data }: { nik: string } & EntryFormData) =>
      updatePayrollEntry(period, nik, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["payroll", period] });
      setEditingSlip(null);
    },
  });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Penggajian</h1>
        <p className="text-sm text-gray-500 mt-1">
          Kelola data absensi, fasilitas, dan perhitungan gaji per periode
        </p>
      </div>

      {/* Period selector */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <label className="text-sm font-medium text-gray-700">Periode:</label>
        <input
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-32 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder="YYYY-MM"
          value={inputPeriod}
          onChange={(e) => setInputPeriod(e.target.value)}
        />
        <button
          onClick={() => setPeriod(inputPeriod.trim())}
          className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700"
        >
          Tampilkan
        </button>
        {configQ.data && (
          <>
            <span className="text-sm text-gray-500">
              {configQ.data.period_label} — {configQ.data.hari_kerja} hari kerja
            </span>
            <button
              onClick={() => setShowConfig(true)}
              className="flex items-center gap-1 px-3 py-2 border border-gray-300 text-sm rounded-lg hover:bg-gray-50"
            >
              <Settings size={14} />
              Edit Config
            </button>
          </>
        )}
        {configQ.error && !configQ.data && (
          <button
            onClick={() => setShowConfig(true)}
            className="flex items-center gap-1 px-3 py-2 bg-yellow-50 border border-yellow-300 text-yellow-700 text-sm rounded-lg hover:bg-yellow-100"
          >
            <Settings size={14} />
            Buat Config Baru
          </button>
        )}
      </div>

      {payrollQ.isLoading && (
        <div className="flex items-center justify-center h-48">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        </div>
      )}
      {payrollQ.error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
          {String(payrollQ.error)}
        </div>
      )}

      {payrollQ.data && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-3 py-3 font-medium text-gray-600 whitespace-nowrap">Nama</th>
                  <th className="text-center px-3 py-3 font-medium text-gray-600 whitespace-nowrap">Hari Kerja</th>
                  <th className="text-right px-3 py-3 font-medium text-gray-600 whitespace-nowrap">Gaji Prorata</th>
                  <th className="text-right px-3 py-3 font-medium text-gray-600 whitespace-nowrap">Transport</th>
                  <th className="text-right px-3 py-3 font-medium text-gray-600 whitespace-nowrap">Makan</th>
                  <th className="text-right px-3 py-3 font-medium text-gray-600 whitespace-nowrap">
                    Fasilitas
                    <span className="ml-1 text-xs font-normal text-indigo-500">(per periode)</span>
                  </th>
                  <th className="text-right px-3 py-3 font-medium text-gray-600 whitespace-nowrap">Bonus</th>
                  <th className="text-right px-3 py-3 font-medium text-gray-600 whitespace-nowrap">Total Potongan</th>
                  <th className="text-right px-3 py-3 font-medium text-gray-600 whitespace-nowrap font-semibold">THP</th>
                  <th className="px-3 py-3 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {payrollQ.data.map((slip) => {
                  const fasExpanded = expandedCell?.nik === slip.nik && expandedCell.col === "fas";
                  const potExpanded = expandedCell?.nik === slip.nik && expandedCell.col === "pot";

                  return (
                    <tr key={slip.nik} className="hover:bg-gray-50 align-top">
                      {/* Name */}
                      <td className="px-3 py-2 whitespace-nowrap">
                        <div className="font-medium">{slip.nama}</div>
                        <div className="text-xs text-gray-400">{slip.jabatan}</div>
                      </td>

                      {/* Hari Kerja */}
                      <td className="px-3 py-2 text-center">
                        <span className={slip.hari_kerja_aktual < slip.hari_kerja_config ? "text-orange-600 font-medium" : ""}>
                          {slip.hari_kerja_aktual}/{slip.hari_kerja_config}
                        </span>
                      </td>

                      <td className="px-3 py-2 text-right tabular-nums whitespace-nowrap">
                        {formatIDR(slip.gaji_prorata)}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums whitespace-nowrap">
                        {formatIDR(slip.uang_transport)}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums whitespace-nowrap">
                        {formatIDR(slip.uang_makan)}
                      </td>

                      {/* Fasilitas */}
                      <td className="px-3 py-2 text-right tabular-nums">
                        {slip.fasilitas > 0 ? (
                          <div className="text-right">
                            <button
                              onClick={() => toggleExpand(slip.nik, "fas")}
                              className="flex items-center gap-1 ml-auto font-medium text-indigo-700 hover:text-indigo-900"
                            >
                              {formatIDR(slip.fasilitas)}
                              <ChevronDown size={12} className={`transition-transform ${fasExpanded ? "rotate-180" : ""}`} />
                            </button>
                            {fasExpanded && (
                              <div className="mt-1 space-y-0.5 text-xs text-gray-500">
                                {slip.fasilitas_items.map((item, i) => (
                                  <div key={i} className="whitespace-nowrap">
                                    {item.name}: {formatIDR(item.amount)}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>

                      {/* Bonus */}
                      <td className="px-3 py-2 text-right tabular-nums whitespace-nowrap">
                        {formatIDR(slip.bonus)}
                      </td>

                      {/* Total Potongan */}
                      <td className="px-3 py-2 text-right tabular-nums">
                        <div className="text-right">
                          <button
                            onClick={() => toggleExpand(slip.nik, "pot")}
                            className="flex items-center gap-1 ml-auto hover:text-gray-900"
                          >
                            {formatIDR(slip.total_potongan)}
                            <ChevronDown size={12} className={`transition-transform ${potExpanded ? "rotate-180" : ""}`} />
                          </button>
                          {potExpanded && (
                            <div className="mt-1 space-y-0.5 text-xs text-gray-500">
                              {slip.bpjs_kes_employee > 0 && (
                                <div className="whitespace-nowrap">BPJS Kes: {formatIDR(slip.bpjs_kes_employee)}</div>
                              )}
                              {slip.bpjs_jht_employee > 0 && (
                                <div className="whitespace-nowrap">BPJS JHT: {formatIDR(slip.bpjs_jht_employee)}</div>
                              )}
                              {slip.pph21 > 0 && (
                                <div className="whitespace-nowrap">PPH 21: {formatIDR(slip.pph21)}</div>
                              )}
                              {slip.potongan_internal_items.map((item, i) => (
                                <div key={i} className="whitespace-nowrap">
                                  {item.name}: {formatIDR(item.amount)}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* THP */}
                      <td className="px-3 py-2 text-right tabular-nums font-semibold text-green-700 whitespace-nowrap">
                        {formatIDR(slip.take_home_pay)}
                      </td>

                      {/* Actions */}
                      <td className="px-3 py-2">
                        <button
                          onClick={() => setEditingSlip(slip)}
                          title="Edit"
                          className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded"
                        >
                          <Pencil size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>

              {/* Totals footer */}
              <tfoot className="bg-gray-50 border-t-2 border-gray-200 text-sm">
                <tr>
                  <td className="px-3 py-3 font-semibold">TOTAL ({payrollQ.data.length} karyawan)</td>
                  <td />
                  <td className="px-3 py-3 text-right font-semibold tabular-nums">
                    {formatIDR(payrollQ.data.reduce((s, r) => s + r.gaji_prorata, 0))}
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums">
                    {formatIDR(payrollQ.data.reduce((s, r) => s + r.uang_transport, 0))}
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums">
                    {formatIDR(payrollQ.data.reduce((s, r) => s + r.uang_makan, 0))}
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums text-indigo-700 font-medium">
                    {formatIDR(payrollQ.data.reduce((s, r) => s + r.fasilitas, 0))}
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums">
                    {formatIDR(payrollQ.data.reduce((s, r) => s + r.bonus, 0))}
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums">
                    {formatIDR(payrollQ.data.reduce((s, r) => s + r.total_potongan, 0))}
                  </td>
                  <td className="px-3 py-3 text-right font-bold text-green-700 tabular-nums">
                    {formatIDR(payrollQ.data.reduce((s, r) => s + r.take_home_pay, 0))}
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {showConfig && (
        <PayrollConfigForm
          initial={configQ.data ?? { ...DEFAULT_CONFIG, period, period_label: period }}
          onSave={(c) => configMut.mutate(c)}
          onCancel={() => setShowConfig(false)}
          isLoading={configMut.isPending}
        />
      )}

      {editingSlip && (
        <PayrollEntryForm
          slip={editingSlip}
          onSave={(data) => entryMut.mutate({ nik: editingSlip.nik, ...data })}
          onCancel={() => setEditingSlip(null)}
          isLoading={entryMut.isPending}
        />
      )}
    </div>
  );
}
