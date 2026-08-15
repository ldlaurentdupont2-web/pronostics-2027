import React, { useState } from "react";

/* ---------- Design tokens ----------
Palette: nuit électorale, version claire — papier ivoire, encre navy, or de médaille
Type: display = Fraunces (serif, autorité), body = Inter, data = IBM Plex Mono
------------------------------------ */

export const FONT_LINK =
  "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap";

export const COLORS = {
  ink900: "#F4F1EA", // fond de page (ivoire chaud)
  ink800: "#FFFFFF", // fond des cartes
  ink700: "#E7E2D4", // bordure discrète
  ink600: "#D6CFBC", // bordure plus marquée / éléments non sélectionnés
  gold: "#A6791C", // accent principal (assez sombre pour rester lisible sur fond clair)
  goldSoft: "#8C6516", // variante secondaire de l'or, un peu plus sourde
  verified: "#2F7A64",
  danger: "#B23B33",
  muted: "#6B7280",
  paper: "#1A2333", // texte principal (encre navy sombre)
  paperDim: "#5B6472", // texte secondaire
  onAccent: "#14202F", // texte sombre à utiliser sur les fonds or/accent (boutons actifs)
};

export function Badge({ children, tone = "gold" }) {
  const bg = { gold: COLORS.gold, verified: COLORS.verified, danger: COLORS.danger, muted: COLORS.muted }[tone];
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium"
      style={{ background: bg + "26", color: bg, border: `1px solid ${bg}55` }}
    >
      {children}
    </span>
  );
}

export function Card({ children, style, className = "" }) {
  return (
    <div className={"rounded-2xl p-4 " + className} style={{ background: COLORS.ink800, border: `1px solid ${COLORS.ink600}`, ...style }}>
      {children}
    </div>
  );
}

export function Button({ children, onClick, variant = "primary", disabled, className = "" }) {
  const styles = {
    primary: { background: COLORS.gold, color: "#FFFFFF", border: "none" },
    ghost: { background: "transparent", color: COLORS.paper, border: `1px solid ${COLORS.ink600}` },
    danger: { background: "transparent", color: COLORS.danger, border: `1px solid ${COLORS.danger}66` },
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={"rounded-xl px-4 py-2.5 text-sm font-semibold transition active:scale-[0.98] disabled:opacity-40 " + className}
      style={styles[variant]}
    >
      {children}
    </button>
  );
}

export function Gauge({ value, onChange, disabled }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs" style={{ color: COLORS.paperDim, fontFamily: "'IBM Plex Mono', monospace" }}>
          Probabilité
        </span>
        <span className="text-sm font-semibold" style={{ color: COLORS.goldSoft, fontFamily: "'IBM Plex Mono', monospace" }}>
          {value}%
        </span>
      </div>
      <div className="relative h-3 rounded-full overflow-hidden" style={{ background: COLORS.ink900 }}>
        <div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{ width: value + "%", background: `linear-gradient(90deg, ${COLORS.gold}, ${COLORS.goldSoft})`, transition: "width .15s" }}
        />
      </div>
      <input
        type="range"
        min={0}
        max={100}
        step={5}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full mt-2 accent-current"
        style={{ accentColor: COLORS.gold }}
      />
    </div>
  );
}

export function Field({ label, children }) {
  return (
    <label className="block mb-3">
      <span className="block text-xs mb-1.5" style={{ color: COLORS.paperDim, fontFamily: "'IBM Plex Mono', monospace" }}>
        {label}
      </span>
      {children}
    </label>
  );
}

export const inputStyle = {
  width: "100%",
  background: COLORS.ink900,
  border: `1px solid ${COLORS.ink600}`,
  borderRadius: 10,
  padding: "10px 12px",
  color: COLORS.paper,
  fontSize: 14,
  outline: "none",
};

export function initialsOf(nom) {
  const parts = (nom || "").trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] || "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
}

const AVATAR_PALETTE = [COLORS.gold, COLORS.verified, "#8B6BAF", "#C1554D", "#5B8FB9", COLORS.goldSoft];

function avatarColorOf(nom) {
  let hash = 0;
  const s = nom || "?";
  for (let i = 0; i < s.length; i++) hash = s.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_PALETTE[Math.abs(hash) % AVATAR_PALETTE.length];
}

// Affiche la vraie photo du candidat si disponible (contrairement à l'ancien artifact Claude,
// un vrai site web n'a aucune restriction sur les images externes). Si l'image ne charge pas
// (lien cassé, candidat sans photo…), on retombe automatiquement sur un avatar à initiales.
export function CandidatAvatar({ nom, photoUrl, size = 44 }) {
  const [imgFailed, setImgFailed] = useState(false);
  const bg = avatarColorOf(nom || "?");

  if (photoUrl && !imgFailed) {
    return (
      <img
        src={photoUrl}
        alt={nom || "Candidat"}
        title={nom}
        onError={() => setImgFailed(true)}
        className="rounded-full shrink-0 object-cover"
        style={{ width: size, height: size, border: `1.5px solid ${bg}` }}
      />
    );
  }

  return (
    <div
      title={photoUrl ? "Photo indisponible — fiche source : " + photoUrl : undefined}
      className="rounded-full flex items-center justify-center shrink-0 font-semibold"
      style={{ width: size, height: size, background: bg + "26", border: `1.5px solid ${bg}`, color: bg, fontSize: size * 0.36 }}
    >
      {initialsOf(nom || "?")}
    </div>
  );
}
