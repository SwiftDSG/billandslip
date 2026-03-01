import { useState } from "react";
import { Plus, X } from "lucide-react";
import type { Employee, FacilitasItem } from "../../types";
import { PTKP_OPTIONS } from "../../types";

interface Props {
  initial?: Partial<Employee>;
  onSave: (e: Employee) => void;
  onCancel: () => void;
  isLoading?: boolean;
  title: string;
}

const EMPTY: Employee = {
  nik: "",
  nama: "",
  jabatan: "",
  gaji_pokok: 0,
  tunjangan: 220_000,
  status_ptkp: "",
  fasilitas: [],
  is_bpjs_kes_member: true,
  is_bpjs_tk_member: true,
};

export function EmployeeForm({ initial, onSave, onCancel, isLoading, title }: Props) {
  const [form, setForm] = useState<Employee>({ ...EMPTY, ...initial });
  const [error, setError] = useState("");

  const set = <K extends keyof Employee>(k: K, v: Employee[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const addFasilitas = () =>
    set("fasilitas", [...form.fasilitas, { name: "", amount: 0 }]);

  const updateFasilitas = (idx: number, patch: Partial<FacilitasItem>) =>
    set(
      "fasilitas",
      form.fasilitas.map((item, i) => (i === idx ? { ...item, ...patch } : item))
    );

  const removeFasilitas = (idx: number) =>
    set("fasilitas", form.fasilitas.filter((_, i) => i !== idx));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nik.trim()) return setError("NIK tidak boleh kosong");
    if (form.gaji_pokok <= 0) return setError("Gaji pokok harus lebih dari 0");
    setError("");
    onSave(form);
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold">{title}</h2>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <p className="text-red-600 text-sm bg-red-50 px-3 py-2 rounded">{error}</p>
          )}

          <Field label="NIK">
            <input
              className={inputCls}
              value={form.nik}
              onChange={(e) => set("nik", e.target.value)}
              maxLength={20}
              placeholder="16 digit NIK KTP"
            />
          </Field>

          <Field label="Nama Lengkap">
            <input className={inputCls} value={form.nama} onChange={(e) => set("nama", e.target.value)} />
          </Field>

          <Field label="Jabatan">
            <input className={inputCls} value={form.jabatan} onChange={(e) => set("jabatan", e.target.value)} />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Gaji Pokok (Rp)">
              <input
                type="number"
                className={inputCls}
                value={form.gaji_pokok}
                min={0}
                onChange={(e) => set("gaji_pokok", Number(e.target.value))}
              />
            </Field>
            <Field label="Tunjangan Tetap (Rp)">
              <input
                type="number"
                className={inputCls}
                value={form.tunjangan}
                min={0}
                onChange={(e) => set("tunjangan", Number(e.target.value))}
              />
            </Field>
          </div>

          <Field label="Status PTKP">
            <select
              className={inputCls}
              value={form.status_ptkp}
              onChange={(e) => set("status_ptkp", e.target.value)}
            >
              {PTKP_OPTIONS.map((o) => (
                <option key={o} value={o}>
                  {o === "" ? "— Tidak ada —" : o}
                </option>
              ))}
            </select>
          </Field>

          {/* Fasilitas list editor */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-gray-700">Fasilitas</label>
              <button
                type="button"
                onClick={addFasilitas}
                className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-medium"
              >
                <Plus size={12} />
                Tambah item
              </button>
            </div>
            {form.fasilitas.length === 0 ? (
              <p className="text-xs text-gray-400 italic py-1">
                Tidak ada fasilitas — klik "Tambah item" untuk menambahkan
              </p>
            ) : (
              <div className="space-y-2">
                {form.fasilitas.map((item, idx) => (
                  <div key={idx} className="flex gap-2 items-center">
                    <input
                      className={`${inputCls} flex-1`}
                      placeholder="Nama (mis. Apartemen)"
                      value={item.name}
                      onChange={(e) => updateFasilitas(idx, { name: e.target.value })}
                    />
                    <input
                      type="number"
                      className={`${inputCls} w-36`}
                      placeholder="Jumlah"
                      min={0}
                      value={item.amount}
                      onChange={(e) => updateFasilitas(idx, { amount: Number(e.target.value) })}
                    />
                    <button
                      type="button"
                      onClick={() => removeFasilitas(idx)}
                      className="p-1.5 text-gray-400 hover:text-red-500 rounded hover:bg-red-50"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-6">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={form.is_bpjs_kes_member}
                onChange={(e) => set("is_bpjs_kes_member", e.target.checked)}
                className="w-4 h-4 rounded accent-indigo-600"
              />
              BPJS Kesehatan
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={form.is_bpjs_tk_member}
                onChange={(e) => set("is_bpjs_tk_member", e.target.checked)}
                className="w-4 h-4 rounded accent-indigo-600"
              />
              BPJS Ketenagakerjaan
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-sm rounded-lg border border-gray-300 hover:bg-gray-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 text-sm rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {isLoading ? "Menyimpan..." : "Simpan"}
            </button>
          </div>
        </form>
      </div>
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

const inputCls =
  "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500";
