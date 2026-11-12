"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** old links keep working: the static site can't redirect on the server, so the page does it */
export function Redirect({ to }: { to: string }) {
  const router = useRouter();
  useEffect(() => {
    router.replace(to.includes("#") ? to : to + window.location.hash);
  }, [router, to]);
  return <p className="p-8 text-center text-sm text-[#71717A]">Moved. Taking you to the new page…</p>;
}
