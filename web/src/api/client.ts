import type { Employee, PayrollConfig, PayrollEntry, Payslip } from "../types";

const API_BASE = (import.meta.env.VITE_API_URL as string) ?? "http://localhost:8080/api";

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const body = await res.json();
      msg = body.error ?? msg;
    } catch {
      // ignore parse errors
    }
    throw new Error(msg);
  }
  return res.json() as Promise<T>;
}

// ── Employees ──────────────────────────────────────────────────────────────

export const getEmployees = () => apiFetch<Employee[]>("/employees");

export const getEmployee = (nik: string) =>
  apiFetch<Employee>(`/employees/${encodeURIComponent(nik)}`);

export const createEmployee = (e: Employee) =>
  apiFetch<Employee>("/employees", { method: "POST", body: JSON.stringify(e) });

export const updateEmployee = (nik: string, e: Employee) =>
  apiFetch<Employee>(`/employees/${encodeURIComponent(nik)}`, {
    method: "PUT",
    body: JSON.stringify(e),
  });

export const deleteEmployee = (nik: string) =>
  apiFetch<void>(`/employees/${encodeURIComponent(nik)}`, { method: "DELETE" });

// ── Payroll Config ────────────────────────────────────────────────────────

export const getPayrollConfig = (period: string) =>
  apiFetch<PayrollConfig>(`/payroll/config/${period}`);

export const upsertPayrollConfig = (period: string, config: PayrollConfig) =>
  apiFetch<PayrollConfig>(`/payroll/config/${period}`, {
    method: "PUT",
    body: JSON.stringify(config),
  });

// ── Payroll Entries ───────────────────────────────────────────────────────

export const getPayroll = (period: string) =>
  apiFetch<Payslip[]>(`/payroll/${period}`);

export const getPayrollEntry = (period: string, nik: string) =>
  apiFetch<PayrollEntry>(`/payroll/${period}/${encodeURIComponent(nik)}`);

export const updatePayrollEntry = (
  period: string,
  nik: string,
  entry: Partial<PayrollEntry>
) =>
  apiFetch<PayrollEntry>(
    `/payroll/${period}/${encodeURIComponent(nik)}`,
    { method: "PUT", body: JSON.stringify(entry) }
  );

// ── Payslips ──────────────────────────────────────────────────────────────

export const getPayslip = (period: string, nik: string) =>
  apiFetch<Payslip>(`/payslip/${period}/${encodeURIComponent(nik)}`);

export const getAllPayslips = (period: string) =>
  apiFetch<Payslip[]>(`/payslip/${period}/all`);

export const downloadPayslipPdf = async (
  period: string,
  nik: string
): Promise<void> => {
  const res = await fetch(
    `${API_BASE}/payslip/${period}/${encodeURIComponent(nik)}/pdf`
  );
  if (!res.ok) throw new Error(`PDF download failed: HTTP ${res.status}`);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `slip-${period}-${nik}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

// ── Utility ───────────────────────────────────────────────────────────────

export const formatIDR = (value: number): string =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.round(value));
