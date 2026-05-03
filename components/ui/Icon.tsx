import type { SVGProps } from "react";

type IconName =
  | "home"
  | "ring"
  | "building"
  | "handshake"
  | "user"
  | "logout"
  | "key"
  | "ticket"
  | "list"
  | "message"
  | "paperclip"
  | "file"
  | "phone"
  | "mail"
  | "link"
  | "pin"
  | "plane"
  | "sparkle";

type IconProps = SVGProps<SVGSVGElement> & {
  name: IconName;
  size?: number;
};

export function Icon({ name, size = 16, className, ...rest }: IconProps) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.5,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
    className,
    ...rest,
  };

  switch (name) {
    case "home":
      return (
        <svg {...common}>
          <path d="M3.5 11.5 12 4l8.5 7.5" />
          <path d="M5.5 10v9.5h13V10" />
          <path d="M10 19.5V14h4v5.5" />
        </svg>
      );
    case "ring":
      return (
        <svg {...common}>
          <circle cx="12" cy="14.5" r="5.5" />
          <path d="m9 9 1.2-3.5h3.6L15 9" />
          <path d="M10.5 9.7 12 7l1.5 2.7" />
        </svg>
      );
    case "building":
      return (
        <svg {...common}>
          <path d="M4 20V6.5l8-3 8 3V20" />
          <path d="M3 20h18" />
          <path d="M9 20v-4h6v4" />
          <path d="M8 9.5h2M8 12.5h2M14 9.5h2M14 12.5h2" />
        </svg>
      );
    case "handshake":
      return (
        <svg {...common}>
          <path d="m3 12 3-3 4 1 2 2-2 2-3-1Z" />
          <path d="m21 12-3-3-4 1-2 2 2 2 3-1Z" />
          <path d="m9 14 2 2 2-2 2 2" />
          <path d="M3 9h2M19 9h2" />
        </svg>
      );
    case "user":
      return (
        <svg {...common}>
          <circle cx="12" cy="8.5" r="3.5" />
          <path d="M5 20c1.2-3.5 4-5.5 7-5.5s5.8 2 7 5.5" />
        </svg>
      );
    case "logout":
      return (
        <svg {...common}>
          <path d="M14 4h4.5v16H14" />
          <path d="M3.5 12h11" />
          <path d="m10 8 4 4-4 4" />
        </svg>
      );
    case "key":
      return (
        <svg {...common}>
          <circle cx="8" cy="14" r="3.5" />
          <path d="m11 12 8-8" />
          <path d="m17 6 2 2" />
          <path d="m15 8 2 2" />
        </svg>
      );
    case "ticket":
      return (
        <svg {...common}>
          <path d="M3 9.5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v1a2 2 0 0 0 0 3v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1a2 2 0 0 0 0-3Z" />
          <path d="M10 7.5v9" strokeDasharray="2 2" />
        </svg>
      );
    case "list":
      return (
        <svg {...common}>
          <path d="M8 6h12M8 12h12M8 18h12" />
          <circle cx="4" cy="6" r="0.6" fill="currentColor" />
          <circle cx="4" cy="12" r="0.6" fill="currentColor" />
          <circle cx="4" cy="18" r="0.6" fill="currentColor" />
        </svg>
      );
    case "message":
      return (
        <svg {...common}>
          <path d="M4 6h16v10H8.5L4 19.5Z" />
        </svg>
      );
    case "paperclip":
      return (
        <svg {...common}>
          <path d="m20 11-8.5 8.5a4.5 4.5 0 1 1-6.4-6.4l9-9a3 3 0 1 1 4.2 4.3l-9 9a1.5 1.5 0 1 1-2.1-2.1L15 7.5" />
        </svg>
      );
    case "file":
      return (
        <svg {...common}>
          <path d="M6 3.5h8.5L19 8v12.5H6Z" />
          <path d="M14.5 3.5V8H19" />
          <path d="M9 13h7M9 16.5h5" />
        </svg>
      );
    case "phone":
      return (
        <svg {...common}>
          <path d="M5 4.5h3.5l1.5 4-2 1.5a12 12 0 0 0 6 6l1.5-2 4 1.5V19a1.5 1.5 0 0 1-1.6 1.5C10.6 20.3 3.7 13.4 3.5 6.1A1.5 1.5 0 0 1 5 4.5Z" />
        </svg>
      );
    case "mail":
      return (
        <svg {...common}>
          <rect x="3" y="5.5" width="18" height="13" rx="1.5" />
          <path d="m3.5 6.5 8.5 7 8.5-7" />
        </svg>
      );
    case "link":
      return (
        <svg {...common}>
          <path d="M10.5 13.5a3 3 0 0 0 4.2 0l3-3a3 3 0 1 0-4.2-4.2l-1.2 1.2" />
          <path d="M13.5 10.5a3 3 0 0 0-4.2 0l-3 3a3 3 0 1 0 4.2 4.2l1.2-1.2" />
        </svg>
      );
    case "pin":
      return (
        <svg {...common}>
          <path d="M12 21s7-6.5 7-12a7 7 0 1 0-14 0c0 5.5 7 12 7 12Z" />
          <circle cx="12" cy="9" r="2.5" />
        </svg>
      );
    case "plane":
      return (
        <svg {...common}>
          <path d="m3 13 18-7-7 16-2.5-6.5Z" />
          <path d="m11.5 15.5 3-3" />
        </svg>
      );
    case "sparkle":
      return (
        <svg {...common}>
          <path d="M12 3v18M3 12h18M5.5 5.5l13 13M18.5 5.5l-13 13" />
        </svg>
      );
  }
}

export default Icon;
