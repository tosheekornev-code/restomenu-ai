interface ToggleProps {
  checked: boolean;
  onChange: (v: boolean) => void;
  size?: "xs" | "sm" | "md";
  disabled?: boolean;
}

export function Toggle({ checked, onChange, size = "md", disabled }: ToggleProps) {
  const sizes = {
    xs: { track: "w-7 h-4", dot: "w-3 h-3 top-0.5", on: "translate-x-3" },
    sm: { track: "w-9 h-5", dot: "w-3.5 h-3.5 top-[3px]", on: "translate-x-4" },
    md: { track: "w-10 h-6", dot: "w-4 h-4 top-1", on: "translate-x-5" },
  };
  const s = sizes[size];
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      className={`relative inline-flex shrink-0 rounded-full transition-colors focus:outline-none ${s.track} ${
        checked ? "bg-green-500" : "bg-gray-300"
      } ${disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}`}
    >
      <span
        className={`${s.dot} absolute left-0.5 rounded-full bg-white shadow transition-transform ${
          checked ? s.on : "translate-x-0"
        }`}
      />
    </button>
  );
}
