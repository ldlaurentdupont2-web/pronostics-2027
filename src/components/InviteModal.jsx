import React, { useState } from "react";
import { Card, COLORS, Button, Modal } from "./ui";

// Composant partagé : utilisé depuis Classement.jsx (bouton "Inviter des amis" dans le
// classement d'une ligue) et depuis Accueil.jsx (bouton "Inviter" à côté de chaque ligue
// dans "Mes ligues"). Toujours pris avec la même prop `ligue` ({ nom, code }).
export default function InviteModal({ ligue, onClose }) {
  const [copie, setCopie] = useState(false);
  const lien = `${window.location.origin}/join/${ligue.code}`;
  // Pas d'émoji dans le message : leur rendu dépend trop de la police système du
  // destinataire (Windows notamment affiche parfois un losange à la place). La flèche
  // "→" est un simple caractère typographique, pas un emoji — aucun risque de ce genre.
  const message = `Je t'invite dans ma ligue « ${ligue.nom} » sur Pronostics Présidentielle 2027. Qui aura vu juste ? Fais tes pronostics pendant toute la campagne et défie-nous au classement. → ${lien}`;

  const copierLien = async () => {
    try {
      await navigator.clipboard.writeText(lien);
      setCopie(true);
      setTimeout(() => setCopie(false), 2000);
    } catch {
      setCopie(false);
    }
  };

  const partageNatifDisponible = typeof navigator !== "undefined" && !!navigator.share;

  return (
    <Modal onClose={onClose}>
      <div className="flex items-center justify-between mb-3">
        <h3 style={{ fontFamily: "'Fraunces', serif", color: COLORS.paper, fontSize: 18, fontWeight: 600 }}>Inviter des amis</h3>
        <button onClick={onClose} className="text-xl leading-none" style={{ color: COLORS.paperDim }}>×</button>
      </div>
      <p className="text-xs mb-1" style={{ color: COLORS.paperDim, fontFamily: "'IBM Plex Mono', monospace" }}>Message qui sera partagé</p>
      <div className="rounded-xl p-3 mb-4 text-sm" style={{ background: COLORS.ink900, border: `1px solid ${COLORS.ink600}`, color: COLORS.paper }}>
        {message}
      </div>
      <div className="flex flex-col gap-2">
        <Button
          onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer")}
          className="w-full"
        >
          Partager sur WhatsApp
        </Button>
        <Button
          variant="ghost"
          onClick={() =>
            (window.location.href = `mailto:?subject=${encodeURIComponent(`Invitation à rejoindre « ${ligue.nom} »`)}&body=${encodeURIComponent(message)}`)
          }
          className="w-full"
        >
          Envoyer par email
        </Button>
        <Button variant="ghost" onClick={copierLien} className="w-full">
          {copie ? "✓ Lien copié" : "Copier le lien"}
        </Button>
        {partageNatifDisponible && (
          <Button
            variant="ghost"
            onClick={() => navigator.share({ title: `Rejoins « ${ligue.nom} »`, text: message }).catch(() => {})}
            className="w-full"
          >
            Autre application…
          </Button>
        )}
      </div>
    </Modal>
  );
}
