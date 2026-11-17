import { useId } from "react";
import buddy from "../assets/buddy-soft.png";

/** The original artwork stays intact; small UI placements crop to the head. */
export default function BuddyMascot({
  size = 40,
  label,
}: {
  size?: number;
  label?: string;
}) {
  const clip = useId().replace(/:/g, "");
  const face = size < 96;
  return (
    <span
      data-buddy-variant={face ? "face" : "full"}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      style={{ width: size, height: size }}
      className="inline-flex shrink-0 items-center justify-center"
    >
      {face ? (
        <svg
          viewBox="102 8 134 106"
          width={size}
          height={size}
          aria-hidden="true"
          focusable="false"
        >
          <defs>
            <clipPath id={clip}>
              <path d="M109 43 Q104 18 119 20 Q132 19 148 37 Q164 33 173 24 Q188 1 201 15 Q219 29 220 56 Q230 64 233 84 Q233 98 216 105 Q186 117 152 111 Q121 107 112 94 Q111 77 117 64 Z" />
            </clipPath>
          </defs>
          <image
            href={buddy}
            width="320"
            height="213"
            clipPath={`url(#${clip})`}
          />
        </svg>
      ) : (
        <img
          src={buddy}
          alt=""
          width={size}
          height={size}
          loading="lazy"
          decoding="async"
          className="h-full w-full object-contain"
        />
      )}
    </span>
  );
}
