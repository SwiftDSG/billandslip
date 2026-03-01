import { NavLink } from "react-router-dom";
import { Users, BarChart2, FileText } from "lucide-react";

const links = [
  { to: "/employees", icon: Users, label: "Karyawan" },
  { to: "/payroll", icon: BarChart2, label: "Penggajian" },
  { to: "/payslips", icon: FileText, label: "Slip Gaji" },
];

export function Sidebar() {
  return (
    <aside className="w-56 min-h-screen bg-white border-r border-gray-200 flex flex-col">
      <div className="h-16 flex items-center px-5 border-b border-gray-200">
        <img src="/logo.svg" alt="BillAndSlip" className="h-7 w-auto" />
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {links.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? "bg-indigo-50 text-indigo-700"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              }`
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="p-4 text-xs text-gray-400 border-t border-gray-200">
        HR Management Portal
      </div>
    </aside>
  );
}
