import { useEffect, useRef, useState } from "react";

interface VirtualJoystickProps {
  onDirectionChange: (dx: number, dy: number) => void;
}

const MAX_RADIUS = 50;

export default function VirtualJoystick({
  onDirectionChange,
}: VirtualJoystickProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const pointerActiveRef = useRef(false);
  const pointerIdRef = useRef<number | null>(null);
  const keyboardRef = useRef<Set<string>>(new Set());
  const lastDirectionRef = useRef({ dx: 0, dy: 0 });

  const [base, setBase] = useState<{ x: number; y: number }>({ x: 90, y: 90 });
  const [stick, setStick] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [visible, setVisible] = useState(false);

  const emit = (dx: number, dy: number) => {
    const magnitude = Math.hypot(dx, dy);
    const next =
      magnitude > 1 ? { dx: dx / magnitude, dy: dy / magnitude } : { dx, dy };

    lastDirectionRef.current = next;
    onDirectionChange(next.dx, next.dy);
  };

  const applyPointerDirection = (
    localX: number,
    localY: number,
    centerX: number,
    centerY: number,
  ) => {
    const dx = localX - centerX;
    const dy = localY - centerY;
    const length = Math.hypot(dx, dy);

    if (length <= 0.001) {
      setStick({ x: 0, y: 0 });
      emit(0, 0);
      return;
    }

    const clamped = Math.min(length, MAX_RADIUS);
    const ratio = clamped / length;
    const limitedX = dx * ratio;
    const limitedY = dy * ratio;

    setStick({
      x: limitedX,
      y: limitedY,
    });

    emit(limitedX / MAX_RADIUS, limitedY / MAX_RADIUS);
  };

  const updateKeyboardDirection = () => {
    if (pointerActiveRef.current) return;

    const keys = keyboardRef.current;
    let x = 0;
    let y = 0;

    if (keys.has("arrowup") || keys.has("w")) y -= 1;
    if (keys.has("arrowdown") || keys.has("s")) y += 1;
    if (keys.has("arrowleft") || keys.has("a")) x -= 1;
    if (keys.has("arrowright") || keys.has("d")) x += 1;

    if (x === 0 && y === 0) {
      emit(0, 0);
      return;
    }

    const magnitude = Math.hypot(x, y) || 1;
    emit(x / magnitude, y / magnitude);
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const centerX = event.clientX - rect.left;
    const centerY = event.clientY - rect.top;

    pointerActiveRef.current = true;
    pointerIdRef.current = event.pointerId;
    setBase({ x: centerX, y: centerY });
    setVisible(true);
    setStick({ x: 0, y: 0 });

    event.currentTarget.setPointerCapture(event.pointerId);
    applyPointerDirection(centerX, centerY, centerX, centerY);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!pointerActiveRef.current || pointerIdRef.current !== event.pointerId) {
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    applyPointerDirection(
      event.clientX - rect.left,
      event.clientY - rect.top,
      base.x,
      base.y,
    );
  };

  const resetPointer = () => {
    pointerActiveRef.current = false;
    pointerIdRef.current = null;
    setVisible(false);
    setBase({ x: 90, y: 90 });
    setStick({ x: 0, y: 0 });
    emit(0, 0);
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if (
        [
          "arrowup",
          "arrowdown",
          "arrowleft",
          "arrowright",
          "w",
          "a",
          "s",
          "d",
        ].includes(key)
      ) {
        keyboardRef.current.add(key);
        updateKeyboardDirection();
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if (
        [
          "arrowup",
          "arrowdown",
          "arrowleft",
          "arrowright",
          "w",
          "a",
          "s",
          "d",
        ].includes(key)
      ) {
        keyboardRef.current.delete(key);
        updateKeyboardDirection();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        position: "relative",
        width: 180,
        height: 180,
        touchAction: "none",
        userSelect: "none",
        pointerEvents: "auto",
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={resetPointer}
      onPointerCancel={resetPointer}
    >
      <div
        style={{
          position: "absolute",
          left: base.x - MAX_RADIUS,
          top: base.y - MAX_RADIUS,
          width: MAX_RADIUS * 2,
          height: MAX_RADIUS * 2,
          borderRadius: "50%",
          border: visible
            ? "2px solid rgba(0,0,0,0.12)"
            : "2px dashed rgba(0,0,0,0.06)",
          background: visible
            ? "rgba(255,255,255,0.35)"
            : "rgba(255,255,255,0.12)",
          boxShadow: visible ? "0 4px 12px rgba(0,0,0,0.1)" : "none",
          transition: "all 0.2s ease",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {!visible && (
          <span className="text-[10px] font-black text-black/20 text-center leading-tight">
            DRAG
            <br />
            OR
            <br />
            WASD
          </span>
        )}
      </div>

      <div
        style={{
          position: "absolute",
          left: base.x + stick.x - 22,
          top: base.y + stick.y - 22,
          width: 44,
          height: 44,
          borderRadius: "50%",
          background: visible
            ? "rgba(59, 130, 246, 0.55)"
            : "rgba(148, 163, 184, 0.25)",
          border: visible
            ? "3px solid #ffffff"
            : "2px solid rgba(255,255,255,0.5)",
          boxShadow: visible ? "0 4px 10px rgba(0,0,0,0.25)" : "none",
          transition: visible ? "none" : "all 0.2s ease",
        }}
      />
    </div>
  );
}
