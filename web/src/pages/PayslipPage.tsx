import { useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Printer, Download } from "lucide-react";
import { getEmployees, getPayslip } from "../api/client";
import { PayslipPreview } from "../components/payslip/PayslipPreview";

export function PayslipPage() {
  const [period, setPeriod] = useState("2026-02");
  const [inputPeriod, setInputPeriod] = useState("2026-02");
  const [selectedNik, setSelectedNik] = useState("");
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState("");
  const [pdfMode, setPdfMode] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);

  const employeesQ = useQuery({
    queryKey: ["employees"],
    queryFn: getEmployees,
  });

  const payslipQ = useQuery({
    queryKey: ["payslip", period, selectedNik],
    queryFn: () => getPayslip(period, selectedNik),
    enabled: !!selectedNik && !!period,
    retry: false,
  });

  const handlePrint = () => window.print();

  const handleDownloadPdf = async () => {
    if (!payslipQ.data || !previewRef.current) return;
    setPdfLoading(true);
    setPdfError("");
    setPdfMode(true);
    // Wait two frames so React re-renders with pdfMode=true before capture
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => { requestAnimationFrame(() => resolve()); })
    );
    try {
      const html2pdf = (await import("html2pdf.js")).default;
      const { nama, period: p } = payslipQ.data;
      await html2pdf()
        .set({
          margin: 10,
          filename: `slip-gaji-${p}-${nama}.pdf`,
          image: { type: "jpeg", quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true, logging: false, windowWidth: 794 },
          jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
        })
        .from(previewRef.current)
        .save();
    } catch (e) {
      setPdfError(String(e));
    } finally {
      setPdfMode(false);
      setPdfLoading(false);
    }
  };

  return (
    <div>
      <div className="no-print">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Slip Gaji</h1>
            <p className="text-sm text-gray-500 mt-1">Lihat dan unduh slip gaji karyawan</p>
          </div>
          {payslipQ.data && (
            <div className="flex gap-2">
              <button
                onClick={handlePrint}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-sm rounded-lg hover:bg-gray-50"
              >
                <Printer size={16} />
                Cetak
              </button>
              <button
                onClick={handleDownloadPdf}
                disabled={pdfLoading}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                <Download size={16} />
                {pdfLoading ? "Mengunduh..." : "Unduh PDF"}
              </button>
            </div>
          )}
        </div>

        {/* Selectors */}
        <div className="flex items-center gap-4 mb-6 flex-wrap">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Periode:</label>
            <input
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-32 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="YYYY-MM"
              value={inputPeriod}
              onChange={(e) => setInputPeriod(e.target.value)}
            />
            <button
              onClick={() => setPeriod(inputPeriod.trim())}
              className="px-3 py-2 bg-gray-100 text-sm rounded-lg hover:bg-gray-200"
            >
              Set
            </button>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Karyawan:</label>
            <select
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={selectedNik}
              onChange={(e) => setSelectedNik(e.target.value)}
            >
              <option value="">— Pilih karyawan —</option>
              {employeesQ.data?.map((emp) => (
                <option key={emp.nik} value={emp.nik}>
                  {emp.nama}
                </option>
              ))}
            </select>
          </div>
        </div>

        {pdfError && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">
            {pdfError}
          </div>
        )}

        {payslipQ.isLoading && (
          <div className="flex items-center justify-center h-48">
            <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {payslipQ.error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
            {String(payslipQ.error)}
          </div>
        )}

        {!selectedNik && (
          <div className="text-center text-gray-400 py-16 text-sm">
            Pilih periode dan karyawan untuk melihat slip gaji
          </div>
        )}
      </div>

      {/* Payslip preview — visible on screen and in print */}
      {payslipQ.data && (
        <div ref={previewRef}>
          <PayslipPreview payslip={payslipQ.data} pdfMode={pdfMode} />
        </div>
      )}
    </div>
  );
}
