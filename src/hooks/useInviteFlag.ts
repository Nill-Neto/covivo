import { useCallback, useEffect, useState } from "react";

const FLAG_KEY = "accepted-invite";

export function useInviteFlag() {
  const [hasInvite, setHasInvite] = useState(false);

  const readFlag = useCallback(() => {
    if (typeof window === "undefined") return false;
    return window.sessionStorage.getItem(FLAG_KEY) === "true";
  }, []);

  const setFlag = useCallback((value: boolean) => {
    if (typeof window === "undefined") return;
    if (value) {
      window.sessionStorage.setItem(FLAG_KEY, "true");
    } else {
      window.sessionStorage.removeItem(FLAG_KEY);
    }
    setHasInvite(value);
  }, []);

  useEffect(() => {
    setHasInvite(readFlag());
  }, [readFlag]);

  return {
    hasInvite,
    markInviteAccepted: () => setFlag(true),
    clearInvite: () => setFlag(false),
  };
}
