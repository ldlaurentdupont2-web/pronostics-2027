import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import JoinLigue from "./JoinLigue.jsx";
import "./index.css";

// Routage minimal, volontairement sans librairie externe : le site n'a qu'une seule
// vraie route publique en dehors de l'appli principale, /join/:code (lien d'invitation
// partageable). Tout le reste continue de fonctionner comme avant, en state interne
// (onglets) au sein de App.jsx.
function Racine() {
  const match = window.location.pathname.match(/^\/join\/([A-Za-z0-9]+)\/?$/);
  if (match) return <JoinLigue code={match[1]} />;
  return <App />;
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Racine />
  </React.StrictMode>
);
