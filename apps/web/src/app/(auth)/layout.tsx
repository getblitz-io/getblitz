import Image from "next/image";
import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950">
      <div className="w-full max-w-md space-y-8 rounded-lg border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex flex-col items-center justify-center space-y-2">
          <Link href="/">
            <Image
              src="/logo-icon.png"
              alt="GetBlitz"
              className="h-12 w-12"
              width={48}
              height={48}
            />
          </Link>
        </div>
        {children}
      </div>
    </div>
  );
}
