export const fmtDate = (iso) =>
  iso ? new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" }) : "—";

export const fmtDateTime = (iso) =>
  iso ? new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "—";

// Format explicite pour une échéance : "dim. 30 août 2026 à 23:59"
export const fmtDeadline = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  const date = d.toLocaleDateString("fr-FR", { weekday: "short", day: "2-digit", month: "long", year: "numeric" });
  const heure = d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  return `${date} à ${heure}`;
};

export const daysBetween = (a, b) => Math.abs((new Date(b) - new Date(a)) / (1000 * 60 * 60 * 24));
