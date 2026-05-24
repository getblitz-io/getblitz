"use client";

import { Button } from "./button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./dropdown-menu";
import { useTheme } from "./theme-provider";

function SunIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 15 15"
      fill="currentColor"
      className={className}
      aria-hidden
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M7.5 0.75C7.91421 0.75 8.25 1.08579 8.25 1.5V2.25C8.25 2.66421 7.91421 3 7.5 3C7.08579 3 6.75 2.66421 6.75 2.25V1.5C6.75 1.08579 7.08579 0.75 7.5 0.75ZM2.19727 2.19727C2.49016 1.90438 2.96503 1.90438 3.25792 2.19727L3.71211 2.65146C4.00499 2.94435 4.00499 3.41922 3.71211 3.71211C3.41922 4.00499 2.94435 4.00499 2.65146 3.71211L2.19727 3.25792C1.90438 2.96503 1.90438 2.49016 2.19727 2.19727ZM12.8027 2.19727C13.0956 2.49016 13.0956 2.96503 12.8027 3.25792L12.3485 3.71211C12.0557 4.00499 11.5808 4.00499 11.2879 3.71211C10.995 3.41922 10.995 2.94435 11.2879 2.65146L11.7421 2.19727C12.035 1.90438 12.5098 1.90438 12.8027 2.19727ZM7.5 5.25C6.25736 5.25 5.25 6.25736 5.25 7.5C5.25 8.74264 6.25736 9.75 7.5 9.75C8.74264 9.75 9.75 8.74264 9.75 7.5C9.75 6.25736 8.74264 5.25 7.5 5.25ZM0.75 7.5C0.75 7.08579 1.08579 6.75 1.5 6.75H2.25C2.66421 6.75 3 7.08579 3 7.5C3 7.91421 2.66421 8.25 2.25 8.25H1.5C1.08579 8.25 0.75 7.91421 0.75 7.5ZM12 7.5C12 7.08579 12.3358 6.75 12.75 6.75H13.5C13.9142 6.75 14.25 7.08579 14.25 7.5C14.25 7.91421 13.9142 8.25 13.5 8.25H12.75C12.3358 8.25 12 7.91421 12 7.5ZM3.71211 11.2879C4.00499 11.5808 4.00499 12.0557 3.71211 12.3485L3.25792 12.8027C2.96503 13.0956 2.49016 13.0956 2.19727 12.8027C1.90438 12.5098 1.90438 12.035 2.19727 11.7421L2.65146 11.2879C2.94435 10.995 3.41922 10.995 3.71211 11.2879ZM12.3485 11.2879C12.6414 10.995 13.1163 10.995 13.4092 11.2879L13.8634 11.7421C14.1563 12.035 14.1563 12.5098 13.8634 12.8027C13.5705 13.0956 13.0956 13.0956 12.8027 12.8027L12.3485 12.3485C12.0557 12.0557 12.0557 11.5808 12.3485 11.2879ZM7.5 12C7.91421 12 8.25 12.3358 8.25 12.75V13.5C8.25 13.9142 7.91421 14.25 7.5 14.25C7.08579 14.25 6.75 13.9142 6.75 13.5V12.75C6.75 12.3358 7.08579 12 7.5 12Z"
      />
    </svg>
  );
}

function MoonIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 15 15"
      fill="currentColor"
      className={className}
      aria-hidden
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M2.89998 0.999974C2.89998 0.55817 3.24217 0.199951 3.68398 0.199951C8.85327 0.199951 13 4.44529 13 9.59995C13 10.35 12.8896 11.0755 12.6848 11.7588C12.5634 12.1788 12.1489 12.4 11.7289 12.2786C11.3089 12.1572 11.0877 11.7427 11.2091 11.3227C11.3731 10.7679 11.46 10.1866 11.46 9.59995C11.46 5.32754 7.97237 1.83995 3.69998 1.83995C3.25817 1.83995 2.89998 1.48177 2.89998 1.03997C2.89998 1.01997 2.89998 1.00997 2.89998 0.999974Z"
      />
    </svg>
  );
}

function DesktopIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 15 15"
      fill="currentColor"
      className={className}
      aria-hidden
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M0.5 2C0.5 1.17157 1.17157 0.5 2 0.5H13C13.8284 0.5 14.5 1.17157 14.5 2V9C14.5 9.82843 13.8284 10.5 13 10.5H9.5V12H11.25C11.6642 12 12 12.3358 12 12.75C12 13.1642 11.6642 13.5 11.25 13.5H3.75C3.33579 13.5 3 13.1642 3 12.75C3 12.3358 3.33579 12 3.75 12H5.5V10.5H2C1.17157 10.5 0.5 9.82843 0.5 9V2ZM2 1.5C1.94772 1.5 1.5 1.94772 1.5 2V9C1.5 9.05228 1.94772 9.5 2 9.5H13C13.0523 9.5 13.5 9.05228 13.5 9V2C13.5 1.94772 13.0523 1.5 13 1.5H2ZM6.5 10.5H8.5V12H6.5V10.5Z"
      />
    </svg>
  );
}

export function ThemeToggle() {
  const { setTheme } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="[&>svg]:absolute [&>svg]:size-5 [&>svg]:scale-0"
        >
          <SunIcon className="light:scale-100! auto:scale-0!" />
          <MoonIcon className="auto:scale-0! dark:scale-100!" />
          <DesktopIcon className="auto:scale-100!" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8} className="min-w-[120px]">
        <DropdownMenuItem
          onClick={() => setTheme("light")}
          className="min-h-[44px] cursor-pointer"
        >
          Light
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setTheme("dark")}
          className="min-h-[44px] cursor-pointer"
        >
          Dark
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setTheme("auto")}
          className="min-h-[44px] cursor-pointer"
        >
          System
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
