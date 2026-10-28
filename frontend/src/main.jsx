// main.jsx
// -----------------------------------------------------------------------
// C'est le tout premier fichier exécuté par le navigateur.
// Son unique rôle est de "brancher" notre composant React principal (App)
// sur la page HTML (index.html), à l'endroit où se trouve <div id="root">.
// -----------------------------------------------------------------------

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css"; // styles généraux de l'application
import App from "./App.jsx"; // notre composant principal

// On récupère la balise <div id="root"></div> présente dans index.html
// puis on y "affiche" (render) notre application React.
createRoot(document.getElementById("root")).render(
  <StrictMode>
    {/* StrictMode est un outil de React qui aide à repérer des erreurs
        pendant le développement. Il n'a aucun effet une fois l'application
        mise en ligne (en production). */}
    <App />
  </StrictMode>
);
