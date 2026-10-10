export function getGreeting(
  firstName: string | null | undefined,
  timeZone: string | null | undefined,
  now = new Date(),
): string {
  let greeting = "Hello";
  if (timeZone) {
    try {
      const hour = Number(new Intl.DateTimeFormat("en-US", {
        timeZone,
        hour: "numeric",
        hourCycle: "h23",
      }).format(now));
      greeting = hour >= 5 && hour < 12 ? "Good morning"
        : hour >= 12 && hour < 18 ? "Good afternoon"
        : "Good Evening";
    } catch {
      // Do not guess a local time when the supplied timezone is invalid.
    }
  }
  const name = firstName?.trim();
  return name ? `${greeting}, ${name}` : greeting;
}
