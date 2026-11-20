import { useEffect, useRef, useState } from "react";
import { useNavigate, useLocation, Outlet, NavLink } from "react-router-dom";
import {
  LogOut,
  Building2,
  Activity,
  Users,
  Menu,
  X,
  LineChart,
  TrendingUp,
  Megaphone,
} from "lucide-react";
import { useInstitutionAuth } from "../contexts/InstitutionAuthContext";
import { COLORS } from "../lib/institutionTheme";
import "../institution.css";

const navItems = [
  { id: "overview", icon: Activity, label: "Overview" },
  { id: "trends", icon: TrendingUp, label: "Campus Trends" },
  { id: "students", icon: Users, label: "Students" },
  { id: "mood-analytics", icon: LineChart, label: "Mood Analytics" },
  { id: "concerns", icon: Megaphone, label: "Concerns" },
];

interface RailProps {
  pathname: string;
  /** Always show labels (mobile drawer); otherwise labels appear on hover/focus */
  expanded?: boolean;
  onNavigate: () => void;
  onLogout: () => void;
}

// Round icon buttons straight on the page (no container). On hover / keyboard
// focus the circles widen into pills that show their label.
function Rail({ pathname, expanded, onNavigate, onLogout }: RailProps) {
  // A clicked link keeps focus, which would hold the rail open via
  // focus-within after the cursor leaves. Drop focus once it's activated.
  const releaseFocus = (e: React.MouseEvent<HTMLElement>) => e.currentTarget.blur();

  const label = expanded
    ? "opacity-100"
    : "opacity-0 group-hover/rail:opacity-100 group-focus-within/rail:opacity-100";

  const item =
    "flex items-center gap-3 h-10 w-full rounded-full px-[11px] overflow-hidden whitespace-nowrap text-sm font-bold transition-colors border border-[#E1EAEA] shadow-[0_6px_16px_-8px_rgba(40,80,82,0.3)]";

  return (
    <nav
      aria-label="Institution navigation"
      className={`group/rail relative isolate flex flex-col gap-3 h-full transition-[width] duration-200 ease-out ${
        expanded ? "w-56" : "w-10 hover:w-52 focus-within:w-52"
      }`}
    >
      {/* Frosted panel that fades in behind the buttons when the rail opens, so
          it reads as an open sidebar and the page content underneath is muted */}
      {!expanded && (
        <div
          aria-hidden
          className="pointer-events-none absolute -inset-3 -z-10 rounded-[28px] border border-[#E1EAEA] bg-white/75 backdrop-blur-xl shadow-[0_24px_60px_-28px_rgba(40,80,82,0.35)] opacity-0 transition-opacity duration-200 group-hover/rail:opacity-100 group-focus-within/rail:opacity-100"
        />
      )}
      <NavLink
        to="/institution/dashboard/overview"
        onClick={(e) => {
          releaseFocus(e);
          onNavigate();
        }}
        aria-label="Taru campus"
        className="flex items-center gap-3 h-10 mb-5 whitespace-nowrap"
      >
        <img
          src="/favicon.png"
          alt=""
          className="w-10 h-10 rounded-xl shrink-0"
        />
        <span
          className={`font-display uppercase tracking-[0.25em] text-lg transition-opacity duration-150 ${label}`}
          style={{ color: COLORS.fg }}
        >
          taru campus
        </span>
      </NavLink>

      {navItems.map(({ id, icon: Icon, label: text }) => {
        const path = `/institution/dashboard/${id}`;
        const active = pathname === path;
        return (
          <NavLink
            key={id}
            to={path}
            onClick={(e) => {
              releaseFocus(e);
              onNavigate();
            }}
            aria-label={text}
            title={text}
            className={`${item} ${active ? "" : "hover:bg-[#E8EFEF]"}`}
            style={{
              background: active ? COLORS.primary : "#fff",
              color: active ? "#fff" : COLORS.fg,
            }}
          >
            <Icon size={18} className="shrink-0" />
            <span className={`transition-opacity duration-150 ${label}`}>
              {text}
            </span>
          </NavLink>
        );
      })}

      <button
        onClick={(e) => {
          releaseFocus(e);
          onLogout();
        }}
        aria-label="Sign out"
        title="Sign out"
        className={`${item} mt-auto bg-white hover:bg-red-50`}
        style={{ color: "#D93025" }}
      >
        <LogOut size={18} className="shrink-0" />
        <span className={`transition-opacity duration-150 ${label}`}>
          Sign out
        </span>
      </button>
    </nav>
  );
}

export default function InstitutionDashboardPage() {
  const { institution, logout } = useInstitutionAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const drawerTrigger = useRef<HTMLButtonElement>(null);
  const drawer = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (!drawerOpen) return;
    const panel = drawer.current;
    panel?.showModal();
    const desktop = window.matchMedia("(min-width: 48rem)");
    const closeOnDesktop = () => {
      if (desktop.matches) panel?.close();
    };
    desktop.addEventListener("change", closeOnDesktop);
    closeOnDesktop();
    return () => desktop.removeEventListener("change", closeOnDesktop);
  }, [drawerOpen]);

  const handleLogout = () => {
    logout();
    navigate("/institution/login");
  };

  if (!institution) return null;

  const initial = institution.collegeName.trim().charAt(0).toUpperCase();

  return (
    <div
      className="inst-root min-h-dvh"
      style={{ background: COLORS.bg }}
    >
      <div className="inst-panel relative flex h-dvh overflow-hidden">
        {/* Desktop rail: the placeholder reserves space, the rail widens over the content */}
        <div className="hidden md:block w-[88px] shrink-0 relative">
          <div className="absolute left-6 top-5 bottom-6 z-30">
            <Rail
              pathname={location.pathname}
              onNavigate={() => {}}
              onLogout={handleLogout}
            />
          </div>
        </div>

        {/* Mobile drawer */}
        {drawerOpen && (
          <dialog
            ref={drawer}
            id="campus-navigation"
            aria-label="Campus navigation"
            className="md:hidden fixed inset-y-0 left-0 m-0 h-dvh max-h-none max-w-[calc(100vw-2rem)] overflow-y-auto bg-[#EEF4F4] p-4 backdrop:bg-black/30"
            onClose={() => {
              setDrawerOpen(false);
              drawerTrigger.current?.focus();
            }}
            onClick={(event) => {
              if (event.target === event.currentTarget) event.currentTarget.close();
            }}
          >
            <div>
              <button
                autoFocus
                onClick={() => drawer.current?.close()}
                aria-label="Close navigation"
                className="mb-3 grid size-11 place-items-center rounded-full bg-white"
              >
                <X size={18} />
              </button>
              <Rail
                expanded
                pathname={location.pathname}
                onNavigate={() => drawer.current?.close()}
                onLogout={handleLogout}
              />
            </div>
          </dialog>
        )}

        <div className="flex-1 min-w-0 flex flex-col">
          {/* Top bar */}
          <header className="flex items-center justify-between gap-3 px-5 md:pl-2 md:pr-10 pt-5 pb-2">
            <button
              className="md:hidden w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center"
              style={{ color: COLORS.fg }}
              onClick={() => setDrawerOpen(true)}
              ref={drawerTrigger}
              aria-expanded={drawerOpen}
              aria-controls={drawerOpen ? "campus-navigation" : undefined}
              aria-label="Open navigation"
            >
              {drawerOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
            <div className="flex min-w-0 items-center gap-2.5 ml-auto">
              <div className="flex min-w-0 items-center gap-2 rounded-full bg-white pl-3 pr-4 min-h-10 shadow-sm">
                <Building2 size={15} style={{ color: COLORS.fg2 }} />
                <span
                  className="text-xs font-bold break-words min-w-0"
                  style={{ color: COLORS.fg }}
                >
                  {institution.collegeName}
                </span>
              </div>
              <div
                className="w-10 h-10 shrink-0 rounded-full flex items-center justify-center text-sm font-extrabold text-white shadow-sm"
                style={{ background: COLORS.primary }}
                title={institution.contactEmail}
              >
                {initial}
              </div>
            </div>
          </header>

          {/* Main content */}
          <main className="flex-1 min-h-0 overflow-y-auto" key={location.pathname}>
            <div className="max-w-6xl mx-auto pl-5 pr-5 md:pl-2 md:pr-10 pt-2 pb-10">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
