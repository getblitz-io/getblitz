import { cx } from "class-variance-authority";
import { twMerge } from "tailwind-merge";

export const cn = (...inputs: Parameters<typeof cx>) => twMerge(cx(inputs));

export {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "./card";
export {
  Dialog,
  DialogTrigger,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "./dialog";
export {
  THEME_MODE_STORAGE_KEY,
  ThemeProvider,
  ThemeToggle,
  themeDetectorScript,
  useTheme,
  type ResolvedTheme,
  type ThemeMode,
} from "./theme";
