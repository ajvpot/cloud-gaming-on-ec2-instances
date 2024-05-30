import { useState, useEffect, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";

function useHash(): [
  URLSearchParams,
  (newParams: Record<string, string>) => void,
] {
  const router = useRouter();
  const pathname = usePathname();

  const [hashParams, setHashParams] = useState<URLSearchParams>(() => {
    const hash = window.location.hash.substring(1) || "";
    return new URLSearchParams(hash);
  });

  const updateHashParams = useCallback(
    (newParams: Record<string, string>) => {
      const params = new URLSearchParams(newParams);
      const newHash = params.toString();
      const newPath = `${pathname}#${newHash}`;
      router.replace(newPath);
      setHashParams(params);
    },
    [pathname, router],
  );

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.substring(1) || "";
      setHashParams(new URLSearchParams(hash));
    };

    window.addEventListener("hashchange", handleHashChange);
    return () => {
      window.removeEventListener("hashchange", handleHashChange);
    };
  }, []);

  return [hashParams, updateHashParams];
}

export default useHash;
