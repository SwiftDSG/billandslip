import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, AlertCircle, ChevronDown } from "lucide-react";
import {
  getEmployees,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  formatIDR,
} from "../api/client";
import { EmployeeForm } from "../components/employees/EmployeeForm";
import type { Employee } from "../types";

export function EmployeesPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [expandedFas, setExpandedFas] = useState<string | null>(null);

  const { data: employees = [], isLoading, error } = useQuery({
    queryKey: ["employees"],
    queryFn: getEmployees,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["employees"] });

  const createMut = useMutation({
    mutationFn: createEmployee,
    onSuccess: () => { invalidate(); setShowForm(false); },
  });
  const updateMut = useMutation({
    mutationFn: ({ nik, e }: { nik: string; e: Employee }) =>
      updateEmployee(nik, e),
    onSuccess: () => { invalidate(); setEditing(null); },
  });
  const deleteMut = useMutation({
    mutationFn: deleteEmployee,
    onSuccess: () => { invalidate(); setConfirmDelete(null); },
  });

  if (isLoading) return <PageSpinner />;
  if (error) return <ErrorBanner message={String(error)} />;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Karyawan</h1>
          <p className="text-sm text-gray-500 mt-1">{employees.length} karyawan terdaftar</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700"
        >
          <Plus size={16} />
          Tambah Karyawan
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {["NIK", "Nama", "Jabatan", "Gaji Pokok", "Tunjangan", "PTKP", "Fasilitas", "BPJS", ""].map(
                  (h) => (
                    <th key={h} className="text-left px-4 py-3 font-medium text-gray-600 whitespace-nowrap">
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {employees.map((emp) => (
                <tr key={emp.nik} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">
                    {emp.nik}
                    {emp.nik.replace(/0/g, "").length === 0 && (
                      <AlertCircle size={12} className="inline ml-1 text-yellow-500" aria-label="NIK placeholder" />
                    )}
                  </td>
                  <td className="px-4 py-3 font-medium">{emp.nama}</td>
                  <td className="px-4 py-3 text-gray-600">{emp.jabatan || "—"}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatIDR(emp.gaji_pokok)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatIDR(emp.tunjangan)}</td>
                  <td className="px-4 py-3">
                    {emp.status_ptkp ? (
                      <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs font-medium">
                        {emp.status_ptkp}
                      </span>
                    ) : (
                      <span className="text-gray-400 text-xs">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {emp.fasilitas.length > 0 ? (
                      <div>
                        <button
                          onClick={() => setExpandedFas(expandedFas === emp.nik ? null : emp.nik)}
                          className="flex items-center gap-1 ml-auto text-indigo-700 font-medium hover:text-indigo-900"
                        >
                          {formatIDR(emp.fasilitas.reduce((s, i) => s + i.amount, 0))}
                          <ChevronDown size={12} className={`transition-transform ${expandedFas === emp.nik ? "rotate-180" : ""}`} />
                        </button>
                        {expandedFas === emp.nik && (
                          <div className="mt-1 space-y-0.5 text-xs text-right">
                            {emp.fasilitas.map((item, i) => (
                              <div key={i} className="whitespace-nowrap text-gray-500">
                                {item.name}: {formatIDR(item.amount)}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : <span className="text-gray-400">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 flex-wrap">
                      {emp.is_bpjs_kes_member && (
                        <span className="px-1.5 py-0.5 bg-green-50 text-green-700 rounded text-xs">Kes</span>
                      )}
                      {emp.is_bpjs_tk_member && (
                        <span className="px-1.5 py-0.5 bg-green-50 text-green-700 rounded text-xs">TK</span>
                      )}
                      {!emp.is_bpjs_kes_member && !emp.is_bpjs_tk_member && (
                        <span className="text-gray-400 text-xs">—</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 justify-end">
                      <button
                        onClick={() => setEditing(emp)}
                        className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => setConfirmDelete(emp.nik)}
                        className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <EmployeeForm
          title="Tambah Karyawan Baru"
          onSave={(e) => createMut.mutate(e)}
          onCancel={() => setShowForm(false)}
          isLoading={createMut.isPending}
        />
      )}

      {editing && (
        <EmployeeForm
          title="Edit Karyawan"
          initial={editing}
          onSave={(e) => updateMut.mutate({ nik: editing.nik, e })}
          onCancel={() => setEditing(null)}
          isLoading={updateMut.isPending}
        />
      )}

      {confirmDelete && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm">
            <h3 className="font-semibold text-lg mb-2">Hapus Karyawan?</h3>
            <p className="text-sm text-gray-600 mb-4">
              NIK <code className="bg-gray-100 px-1 rounded">{confirmDelete}</code> akan dihapus beserta
              semua data penggajiannya.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                className="px-4 py-2 text-sm rounded-lg border border-gray-300 hover:bg-gray-50"
              >
                Batal
              </button>
              <button
                onClick={() => deleteMut.mutate(confirmDelete)}
                disabled={deleteMut.isPending}
                className="px-4 py-2 text-sm rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
              >
                {deleteMut.isPending ? "Menghapus..." : "Hapus"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PageSpinner() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
      Error: {message}
    </div>
  );
}
