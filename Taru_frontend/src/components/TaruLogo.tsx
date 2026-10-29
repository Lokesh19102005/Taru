import logo from "../assets/taru-logo.png";

// Taru brain mark. `light` renders it white (for dark / photo backgrounds).
export default function TaruLogo({
  size = 28,
  light = false,
  className = "",
}: {
  size?: number;
  light?: boolean;
  className?: string;
}) {
  return (
    <img
      src={logo}
      alt="Taru"
      height={size}
      style={{ height: size, width: "auto", filter: light ? "invert(1) brightness(2)" : undefined }}
      className={`select-none ${className}`}
      draggable={false}
    />
  );
}
