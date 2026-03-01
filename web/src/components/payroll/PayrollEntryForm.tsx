import { useState } from "react";
import { Plus, X, RotateCcw } from "lucide-react";
import { formatIDR } from "../../api/client";
import type { DeductionItem, FacilitasItem, Payslip } from "../../types";

export interface EntryFormData {
  hari_kerja_aktual: number;
  overtime_hours: number;
  overtime_rate_per_hour: number;
  bonus: number;
  potongan_internal: DeductionItem[];
  fasilitas_override: FacilitasItem[] | null;
}

interface Props {
  slip: Payslip;
  onSave: (data: EntryFormData) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function PayrollEntryForm({ slip, onSave, onCancel, isLoading }: Props) {
  const [form, setForm] = useState<EntryFormData>({
    hari_kerja_aktual: slip.hari_kerja_aktual,
    overtime_hours: slip.overtime_hours,
    overtime_rate_per_hour: slip.overtime_rate_per_hour,
    bonus: slip.bonus,
    potongan_internal: [...slip.potongan_internal_items],
    fasilitas_override: slip.fasilitas_items.length > 0 ? [...slip.fasilitas_items] : null,
  });

  const set = <K extends keyof EntryFormData>(k: K, v: EntryFormData[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  // Fasilitas helpers
  const addFas = () =>
    set("fasilitas_override", [...(form.fasilitas_override ?? []), { name: "", amount: 0 }]);
  const updateFas = (idx: number, patch: Partial<FacilitasItem>) =>
    set(
      "fasilitas_override",
      (form.fasilitas_override ?? []).map((item, i) => (i === idx ? { ...item, ...patch } : item))
    );
  const removeFas = (idx: number) => {
    const list = (form.fasilitas_override ?? []).filter((_, i) => i !== idx);
    set("fasilitas_override", list.length > 0 ? list : null);
  };

  // Deduction helpers
  const addPot = () =>
    set("potongan_internal", [...form.potongan_internal, { name: "", amount: 0 }]);
  const updatePot = (idx: number, patch: Partial<DeductionItem>) =>
    set(
      "potongan_internal",
      form.potongan_internal.map((item, i) => (i === idx ? { ...item, ...patch } : item))
    );
  const removePot = (idx: number) =>
    set(
      "potongan_internal",
      form.potongan_internal.filter((_, i) => i !== idx)
    );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(form);
  };

  const overtimeTotal = form.overtime_hours * form.overtime_rate_per_hour;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold">Edit Penggajian</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {slip.nama}
            {slip.jabatan && <span className="text-gray-400"> — {slip.jabatan}</span>}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Absensi */}
          <section>
            <h3 className={sectionHeading}>Absensi</h3>
            <div className="flex items-center gap-3">
              <label className={labelCls}>Hari Kerja</label>
              <input
                type="number"
                className={`${inputCls} w-20 text-center`}
                min={0}
                max={31}
                value={form.hari_kerja_aktual}
                onChange={(e) => set("hari_kerja_aktual", Number(e.target.value))}
              />
              <span className="text-sm text-gray-400">dari {slip.hari_kerja_config} hari</span>
            </div>
          </section>

          {/* Overtime */}
          <section>
            <h3 className={sectionHeading}>Overtime</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className={labelCls}>Jam Lembur</label>
                <input
                  type="number"
                  className={`${inputCls} w-full`}
                  min={0}
                  step={0.5}
                  value={form.overtime_hours}
                  onChange={(e) => set("overtime_hours", Number(e.target.value))}
                />
              </div>
              <div className="space-y-1">
                <label className={labelCls}>Rate per Jam (Rp)</label>
                <input
                  type="number"
                  className={`${inputCls} w-full`}
                  min={0}
                  value={form.overtime_rate_per_hour}
                  onChange={(e) => set("overtime_rate_per_hour", Number(e.target.value))}
                />
              </div>
            </div>
            {overtimeTotal > 0 && (
              <p className="text-xs text-gray-500 mt-1.5">
                Total overtime: <span className="font-medium">{formatIDR(overtimeTotal)}</span>
              </p>
            )}
          </section>

          {/* Bonus */}
          <section>
            <h3 className={sectionHeading}>Bonus</h3>
            <input
              type="number"
              className={`${inputCls} w-full`}
              min={0}
              value={form.bonus}
              onChange={(e) => set("bonus", Number(e.target.value))}
            />
          </section>

          {/* Fasilitas Override */}
          <section>
            <div className="flex items-center justify-between mb-2">
              <h3 className={sectionHeading}>Fasilitas (Override Periode Ini)</h3>
              <button type="button" onClick={addFas} className={addBtnCls}>
                <Plus size={12} /> Tambah
              </button>
            </div>
            {form.fasilitas_override === null ? (
              <p className="text-xs text-gray-400 italic">
                Menggunakan nilai dari profil karyawan
                {slip.fasilitas_items.length > 0 && (
                  <span className="ml-1 text-gray-500">
                    ({slip.fasilitas_items.map((i) => `${i.name}: ${formatIDR(i.amount)}`).join(", ")})
                  </span>
                )}
              </p>
            ) : (
              <div className="space-y-2">
                {form.fasilitas_override.map((item, idx) => (
                  <div key={idx} className="flex gap-2 items-center">
                    <input
                      className={`${inputCls} flex-1`}
                      placeholder="Nama (mis. Apartemen)"
                      value={item.name}
                      onChange={(e) => updateFas(idx, { name: e.target.value })}
                    />
                    <input
                      type="number"
                      className={`${inputCls} w-36`}
                      placeholder="Jumlah"
                      min={0}
                      value={item.amount}
                      onChange={(e) => updateFas(idx, { amount: Number(e.target.value) })}
                    />
                    <button
                      type="button"
                      onClick={() => removeFas(idx)}
                      className="p-1.5 text-gray-400 hover:text-red-500 rounded hover:bg-red-50"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => set("fasilitas_override", null)}
                  className="flex items-center gap-1.5 text-xs text-orange-500 hover:text-orange-700"
                >
                  <RotateCcw size={12} />
                  Kembali ke profil karyawan
                </button>
              </div>
            )}
          </section>

          {/* Potongan Internal */}
          <section>
            <div className="flex items-center justify-between mb-2">
              <h3 className={sectionHeading}>Potongan Internal</h3>
              <button type="button" onClick={addPot} className={addBtnCls}>
                <Plus size={12} /> Tambah
              </button>
            </div>
            {form.potongan_internal.length === 0 ? (
              <p className="text-xs text-gray-400 italic">Tidak ada potongan internal</p>
            ) : (
              <div className="space-y-2">
                {form.potongan_internal.map((item, idx) => (
                  <div key={idx} className="flex gap-2 items-center">
                    <input
                      className={`${inputCls} flex-1`}
                      placeholder="Nama (mis. Cicilan Pinjaman)"
                      value={item.name}
                      onChange={(e) => updatePot(idx, { name: e.target.value })}
                    />
                    <input
                      type="number"
                      className={`${inputCls} w-36`}
                      placeholder="Jumlah"
                      min={0}
                      value={item.amount}
                      onChange={(e) => updatePot(idx, { amount: Number(e.target.value) })}
                    />
                    <button
                      type="button"
                      onClick={() => removePot(idx)}
                      className="p-1.5 text-gray-400 hover:text-red-500 rounded hover:bg-red-50"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Footer */}
          <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
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

const sectionHeading = "text-sm font-semibold text-gray-700 mb-2";
const labelCls = "block text-sm text-gray-600";
const inputCls =
  "border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500";
const addBtnCls =
  "flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-medium";
