// Soft background for every screen of the daily check-in: a barely-there peach
// gradient, gentle waves along the bottom and a couple of quiet shapes.
// Pure SVG/CSS; kept faint so it never competes with the questions.

export default function CheckinIntroArt() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
    >
      {/* base gradient */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(60% 50% at 50% 0%, rgba(255,255,255,0.9), transparent 70%), linear-gradient(150deg, #FFFDFB 0%, #FEF7F1 60%, #FDEEE4 100%)",
        }}
      />

      {/* waves along the bottom */}
      <svg
        className="absolute inset-x-0 bottom-0 w-full h-[34%]"
        viewBox="0 0 1000 300"
        preserveAspectRatio="none"
        style={{ opacity: 0.5 }}
      >
        <path
          d="M0 170 C 200 110, 380 230, 600 170 S 900 90, 1000 150 L1000 300 L0 300 Z"
          fill="#FAE0CE"
          opacity="0.75"
        />
        <path
          d="M0 232 C 250 190, 450 282, 700 222 S 920 192, 1000 212 L1000 300 L0 300 Z"
          fill="#F8D5BD"
          opacity="0.85"
        />
      </svg>

      {/* a thin highlight curve */}
      <svg
        className="absolute right-0 top-[40%] w-[20%]"
        style={{ opacity: 0.35 }}
        viewBox="0 0 200 160"
        fill="none"
      >
        <path
          d="M0 150 C 60 140, 110 90, 130 30 C 138 6, 170 0, 200 16"
          stroke="#fff"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>

      {/* quiet dots */}
      <span
        className="absolute right-[6%] top-[60%] w-3.5 h-3.5 rounded-full"
        style={{ background: "#F6C9AE", opacity: 0.5 }}
      />
      <span
        className="absolute left-[20%] bottom-[10%] w-3.5 h-3.5 rounded-full"
        style={{ background: "#F6C9AE", opacity: 0.5 }}
      />
    </div>
  );
}
