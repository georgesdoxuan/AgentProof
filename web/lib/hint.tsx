import { useId } from "react";

// Explanations stay out of the page: they show on hover over the text or button they explain,
// on keyboard focus, and on tap on touch screens (the trigger takes focus). Usable in server and client components.
// `align="end"` for triggers on the right edge, `side="top"` when there is no room below.
export function Hint({
  tip,
  children,
  focusable = true,
  align = "start",
  side = "bottom",
  className = "",
}: {
  tip: React.ReactNode;
  children: React.ReactNode;
  /** false when the trigger is already a button, link or input (it takes focus itself). */
  focusable?: boolean;
  align?: "start" | "end" | "center";
  side?: "bottom" | "top";
  className?: string;
}) {
  const id = useId();
  if (!tip) return <>{children}</>;
  return (
    <span
      className={`ap-hint ${className}`}
      data-align={align}
      data-side={side}
      tabIndex={focusable ? 0 : undefined}
      aria-describedby={focusable ? id : undefined}
    >
      {children}
      <span role="tooltip" id={id} className="ap-tip">
        {tip}
      </span>
    </span>
  );
}
