import React, { useState } from "react";
import { COLORS } from "../components/ui";
import Classement from "./Classement";
import Groupe from "./Groupe";
import Evolution from "./Evolution";
import Badges from "./Badges";

export default function ClassementGroupe({ data, me }) {
  const [sousOnglet, setSousOnglet] = useState("classement");
  const onglets = [
    ["classement", "Classement"],
    ["recompenses", "🏅 Récompenses"],
    ["groupe", "Tendances du groupe"],
    ["evolution", "Évolution"],
  ];
  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2 flex-wrap">
        {onglets.map(([key, label]) => (
          <button
            key={key}
            onClick={() => setSousOnglet(key)}
            className="px-3 py-1.5 rounded-full text-xs whitespace-nowrap"
            style={{
              background: sousOnglet === key ? COLORS.gold : "transparent",
              color: sousOnglet === key ? COLORS.ink800 : COLORS.paperDim,
              border: `1px solid ${sousOnglet === key ? COLORS.gold : COLORS.ink600}`,
              fontWeight: sousOnglet === key ? 600 : 400,
            }}
          >
            {label}
          </button>
        ))}
      </div>
      {sousOnglet === "classement" && <Classement data={data} me={me} />}
      {sousOnglet === "recompenses" && <Badges data={data} me={me} />}
      {sousOnglet === "groupe" && <Groupe data={data} />}
      {sousOnglet === "evolution" && <Evolution data={data} />}
    </div>
  );
}
