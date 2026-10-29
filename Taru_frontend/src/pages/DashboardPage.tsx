import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation, Outlet, NavLink } from "react-router-dom";
import {
  Phone,
  Menu,
  Bell,
  Sparkles,
  LogOut,
  ClipboardList,
  MessageCircle,
  Gamepad2,
  Stethoscope,
  BarChart2,
  User,
  Bot,
  Megaphone,
} from "lucide-react";
import COLORS from "../lib/studentTheme";
import TaruLogo from "../components/TaruLogo";
import { useAuth } from "../contexts/AuthContext";

const navItems = [
  { id: "chatbot", icon: <Bot size={17} />, label: "Taru AI Assistant" },
  { id: "check", icon: <ClipboardList size={17} />, label: "Take a Check" },
  { id: "talk", icon: <MessageCircle size={17} />, label: "Talk to Someone" },
  { id: "games", icon: <Gamepad2 size={17} />, label: "Play Games" },
  {
    id: "psychiatrist",
    icon: <Stethoscope size={17} />,
    label: "Talk to a Psychiatrist",
  },
  { id: "mood", icon: <BarChart2 size={17} />, label: "Track Your Mood" },
];

function UserDropdown({
  onLogout,
  onClose,
  user,
}: {
  onLogout: () => void;
  onClose: () => void;
  user: any;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="absolute right-0 top-full mt-2 w-64 rounded-2xl border shadow-xl z-50 overflow-hidden animate-fade-in"
      style={{ background: COLORS.card, borderColor: COLORS.border }}
    >
      {/* Header */}
      <div
        className="px-5 py-4 border-b"
        style={{ borderColor: COLORS.border, background: COLORS.muted }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-11 h-11 rounded-full flex items-center justify-center font-extrabold text-lg"
            style={{ background: COLORS.gradient, color: "#fff" }}
          >
            {user?.username?.charAt(0)?.toUpperCase() || "U"}
          </div>
          <div>
            <div className="font-bold text-sm" style={{ color: COLORS.fg }}>
              {user?.username || ""}
            </div>
            <div className="text-xs" style={{ color: COLORS.fg3 }}>
              {user?.college || "Student"}
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="py-1">
        <button
          onClick={() => {
            onClose();
            navigate("/dashboard/profile");
          }}
          className="w-full flex items-center gap-2.5 px-5 py-3 text-sm font-medium transition-colors hover:bg-[#F8EFE3]"
          style={{ color: COLORS.fg }}
        >
          <User size={14} /> View Profile
        </button>
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-2.5 px-5 py-3 text-sm font-medium transition-colors hover:bg-red-50"
          style={{ color: "#cc0000" }}
        >
          <LogOut size={14} /> Sign out
        </button>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);

  const onLogout = () => {
    logout();
    navigate("/");
  };

  const isOverview =
    location.pathname === "/dashboard" ||
    location.pathname === "/dashboard/home";

  const railItems = [
    { to: "/dashboard", label: "Overview", icon: <Sparkles size={18} />, active: isOverview },
    ...navItems.map((item) => ({
      to: `/dashboard/${item.id}`,
      label: item.label,
      icon: item.icon,
      active: location.pathname === `/dashboard/${item.id}`,
    })),
  ];
  const concernsActive = location.pathname === "/dashboard/concerns";

  const railLink = (
    to: string,
    label: string,
    icon: React.ReactNode,
    active: boolean,
  ) => (
    <NavLink
      key={to}
      to={to}
      onClick={() => setSidebarOpen(false)}
      className="flex items-center gap-4 h-11 rounded-full transition-colors"
      style={{ color: active ? "#fff" : COLORS.fg2 }}
    >
      <span
        className="w-11 h-11 shrink-0 rounded-full flex items-center justify-center transition-colors"
        style={{
          background: active ? COLORS.primary : "transparent",
          boxShadow: active ? "0 8px 18px -8px rgba(31,26,23,0.7)" : "none",
        }}
      >
        {icon}
      </span>
      <span
        className="text-sm font-medium whitespace-nowrap md:opacity-0 group-hover/rail:opacity-100 transition-opacity"
        style={{ color: active ? COLORS.primaryDark : COLORS.fg2 }}
      >
        {label}
      </span>
    </NavLink>
  );

  return (
    <div className="student-app h-screen flex flex-col animate-fade-in">
      {/* Top bar */}
      <header className="sticky top-0 z-50 h-16 px-4 md:px-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            className="md:hidden transition-colors"
            style={{ color: COLORS.fg2 }}
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            <Menu size={20} />
          </button>
          <NavLink
            to="/dashboard"
            onClick={() => setSidebarOpen(false)}
            aria-label="Go to overview"
            className="flex items-center gap-2 cursor-pointer transition-opacity hover:opacity-75"
          >
            <TaruLogo size={30} />
            <span
              className="font-display text-xl tracking-[0.18em] uppercase"
              style={{ color: COLORS.fg }}
            >
              taru
            </span>
          </NavLink>
        </div>

        <a
          href="tel:9152987821"
          className="hidden md:flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-medium bg-white/70 backdrop-blur hover:bg-white transition-colors"
          style={{ borderColor: COLORS.border2, color: COLORS.fg }}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          Crisis line · iCall 9152987821 · Vandrevala 1860-2662-345
        </a>

        <div className="flex items-center gap-2">
          <button
            className="relative w-9 h-9 rounded-full flex items-center justify-center hover:bg-white/80 transition-colors"
            style={{ color: COLORS.fg2 }}
          >
            <Bell size={17} />
            <span
              className="absolute top-2 right-2.5 w-1.5 h-1.5 rounded-full"
              style={{ background: COLORS.accent }}
            />
          </button>
          <div className="relative">
            <button
              onClick={() => setUserOpen(!userOpen)}
              className="flex items-center gap-2.5 pl-1 py-1 pr-3 rounded-full hover:bg-white/80 transition-colors cursor-pointer"
            >
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center font-semibold text-sm"
                style={{ background: COLORS.gradient, color: "#fff" }}
              >
                {user?.username?.charAt(0)?.toUpperCase() || "U"}
              </div>
              <div className="hidden sm:block text-left">
                <div className="text-xs font-semibold leading-tight" style={{ color: COLORS.fg }}>
                  {user?.username || ""}
                </div>
                <div className="text-[11px]" style={{ color: COLORS.fg3 }}>
                  {user?.college || "Student"}
                </div>
              </div>
            </button>
            {userOpen && (
              <UserDropdown
                onLogout={onLogout}
                onClose={() => setUserOpen(false)}
                user={user}
              />
            )}
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden relative">
        {sidebarOpen && (
          <div
            className="md:hidden fixed inset-0 bg-black/30 z-30"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Icon rail — expands on hover (always expanded in the mobile drawer) */}
        <div className="md:w-[88px] shrink-0">
          <aside
            className={`group/rail fixed md:absolute top-16 bottom-0 left-0 z-40 flex flex-col px-5 py-4 overflow-hidden transition-all duration-300 w-64 md:w-[88px] md:hover:w-64 md:hover:shadow-2xl md:hover:rounded-r-3xl ${sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}
            style={{ background: "rgba(255,255,255,0.92)", backdropFilter: "blur(14px)" }}
          >
            <nav className="flex-1 space-y-1.5">
              {railItems.map((it) => railLink(it.to, it.label, it.icon, it.active))}
            </nav>
            <div className="space-y-1.5 pt-3 border-t" style={{ borderColor: COLORS.border }}>
              {railLink("/dashboard/concerns", "Concerns", <Megaphone size={18} />, concernsActive)}
              <a
                href="tel:9152987821"
                className="md:hidden flex items-center gap-4 h-11 text-sm font-medium"
                style={{ color: COLORS.fg2 }}
              >
                <span className="w-11 h-11 flex items-center justify-center"><Phone size={18} /></span>
                Crisis: 9152987821
              </a>
              <button
                onClick={onLogout}
                className="w-full flex items-center gap-4 h-11 rounded-full"
                style={{ color: "#c0392b" }}
              >
                <span className="w-11 h-11 flex items-center justify-center"><LogOut size={18} /></span>
                <span className="text-sm font-medium whitespace-nowrap md:opacity-0 group-hover/rail:opacity-100 transition-opacity">Sign out</span>
              </button>
            </div>
          </aside>
        </div>

        {/* Main */}
        <main className="flex-1 overflow-y-auto relative z-0">
          <div className="max-w-5xl mx-auto px-5 md:px-10 pt-4 pb-16">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
