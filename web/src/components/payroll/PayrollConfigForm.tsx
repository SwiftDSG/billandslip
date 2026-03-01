import { useState } from "react";
import type { PayrollConfig } from "../../types";

interface Props {
  initial: PayrollConfig;
  onSave: (c: PayrollConfig) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

const inputCls =
  "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500";

export function PayrollConfigForm({ initial, onSave, onCancel, isLoading }: Props) {
  const [form, setForm] = useState<PayrollConfig>(initial);
  const set = <K extends keyof PayrollConfig>(k: K, v: PayrollConfig[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold">Konfigurasi Periode {form.period}</h2>
        </div>
        <form
          onSubmit={(e) => { e.preventDefault(); onSave(form); }}
          className="p-6 space-y-6"
        >
          {/* Period info */}
          <Section title="Informasi Periode">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Label Periode">
                <input className={inputCls} value={form.period_label} onChange={(e) => set("period_label", e.target.value)} />
              </Field>
              <Field label="Hari Kerja">
                <input type="number" className={inputCls} value={form.hari_kerja} min={1} max={31} onChange={(e) => set("hari_kerja", Number(e.target.value))} />
              </Field>
            </div>
          </Section>

          {/* Allowances */}
          <Section title="Tunjangan & Uang Harian">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Mode Transport">
                <select
                  className={inputCls}
                  value={form.uang_transport_mode}
                  onChange={(e) => set("uang_transport_mode", e.target.value as "flat" | "per_day")}
                >
                  <option value="flat">Flat (per bulan)</option>
                  <option value="per_day">Per hari kerja</option>
                </select>
              </Field>
              {form.uang_transport_mode === "flat" ? (
                <Field label="Transport Flat (Rp)">
                  <input type="number" className={inputCls} value={form.uang_transport_flat} min={0} onChange={(e) => set("uang_transport_flat", Number(e.target.value))} />
                </Field>
              ) : (
                <Field label="Transport per Hari (Rp)">
                  <input type="number" className={inputCls} value={form.uang_transport_per_hari} min={0} onChange={(e) => set("uang_transport_per_hari", Number(e.target.value))} />
                </Field>
              )}
              <Field label="Uang Makan per Hari (Rp)">
                <input type="number" className={inputCls} value={form.uang_makan_per_hari} min={0} onChange={(e) => set("uang_makan_per_hari", Number(e.target.value))} />
              </Field>
            </div>
          </Section>

          {/* BPJS Kesehatan */}
          <Section title="BPJS Kesehatan">
            <div className="grid grid-cols-3 gap-4">
              <Field label="Iuran Karyawan (%)">
                <input type="number" className={inputCls} step="0.001" value={(form.bpjs_kes_employee_rate * 100).toFixed(3)} onChange={(e) => set("bpjs_kes_employee_rate", Number(e.target.value) / 100)} />
              </Field>
              <Field label="Iuran Perusahaan (%)">
                <input type="number" className={inputCls} step="0.001" value={(form.bpjs_kes_employer_rate * 100).toFixed(3)} onChange={(e) => set("bpjs_kes_employer_rate", Number(e.target.value) / 100)} />
              </Field>
              <Field label="Batas Gaji (Rp)">
                <input type="number" className={inputCls} value={form.bpjs_kes_salary_cap} min={0} onChange={(e) => set("bpjs_kes_salary_cap", Number(e.target.value))} />
              </Field>
            </div>
          </Section>

          {/* BPJS TK */}
          <Section title="BPJS Ketenagakerjaan">
            <div className="grid grid-cols-2 gap-4">
              <Field label="JHT Karyawan (%)">
                <input type="number" className={inputCls} step="0.001" value={(form.bpjs_jht_employee_rate * 100).toFixed(3)} onChange={(e) => set("bpjs_jht_employee_rate", Number(e.target.value) / 100)} />
              </Field>
              <Field label="JHT Perusahaan (%)">
                <input type="number" className={inputCls} step="0.001" value={(form.bpjs_jht_employer_rate * 100).toFixed(3)} onChange={(e) => set("bpjs_jht_employer_rate", Number(e.target.value) / 100)} />
              </Field>
              <Field label="JKK Perusahaan (%)">
                <input type="number" className={inputCls} step="0.001" value={(form.bpjs_jkk_employer_rate * 100).toFixed(3)} onChange={(e) => set("bpjs_jkk_employer_rate", Number(e.target.value) / 100)} />
              </Field>
              <Field label="JKM Perusahaan (%)">
                <input type="number" className={inputCls} step="0.001" value={(form.bpjs_jkm_employer_rate * 100).toFixed(3)} onChange={(e) => set("bpjs_jkm_employer_rate", Number(e.target.value) / 100)} />
              </Field>
              <Field label="Batas Gaji TK (Rp)">
                <input type="number" className={inputCls} value={form.bpjs_tk_salary_cap} min={0} onChange={(e) => set("bpjs_tk_salary_cap", Number(e.target.value))} />
              </Field>
            </div>
          </Section>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onCancel} className="px-4 py-2 text-sm rounded-lg border border-gray-300 hover:bg-gray-50">Batal</button>
            <button type="submit" disabled={isLoading} className="px-4 py-2 text-sm rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50">
              {isLoading ? "Menyimpan..." : "Simpan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">{title}</h3>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      {children}
    </div>
  );
}
