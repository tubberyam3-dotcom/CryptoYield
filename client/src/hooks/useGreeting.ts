import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getGreeting } from "@shared/greeting";

interface TimezoneResponse {
  timeZone: string | null;
  source: "ip" | "unavailable";
}

export function useGreeting(firstName: string | null | undefined, isAuthenticated: boolean) {
  const [now, setNow] = useState(() => new Date());
  const { data } = useQuery<TimezoneResponse>({
    queryKey: ["/api/account/timezone"],
    enabled: isAuthenticated,
    staleTime: 60 * 60 * 1000,
    refetchInterval: 60 * 60 * 1000,
    refetchOnWindowFocus: true,
    retry: false,
  });

  useEffect(() => {
    const update = () => setNow(new Date());
    const timer = window.setInterval(update, 60 * 1000);
    window.addEventListener("focus", update);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", update);
    };
  }, []);

  const source = data?.source === "ip" && data.timeZone ? "ip" : "device";
  const timeZone = source === "ip" ? data!.timeZone : Intl.DateTimeFormat().resolvedOptions().timeZone;
  return { greeting: getGreeting(firstName, timeZone, now), source };
}
