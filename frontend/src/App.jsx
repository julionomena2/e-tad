// App.jsx
// =========================================================================
// C'est le composant PRINCIPAL de l'application. Il a deux grands rôles :
//
//  1) Garder en mémoire les informations importantes partagées par
//     plusieurs pages (on dit "l'état global") : qui est connecté,
//     quelle ville est choisie, quelle est la page actuelle, etc.
//
//  2) Décider quel composant afficher selon la page actuelle.
//
// Remarque pédagogique : dans une vraie application, on utiliserait
// souvent une librairie comme "react-router-dom" pour gérer les pages
// et les adresses (URL) du navigateur. Ici, pour rester simple pendant
// l'apprentissage, on fait "à la main" une navigation basée sur un
// simple state appelé "page" (une chaîne de caractères comme "accueil",
// "connexion", etc.). C'est une technique tout à fait valable pour un
// projet simple ou pour apprendre les bases de React.
// =========================================================================

import { useEffect, useState } from "react";
import { deconnecter as demanderDeconnexion, getUtilisateurConnecte } from "./services/api.js";
import Header from "./components/Header.jsx";
import Accueil from "./components/Accueil.jsx";
import ListeLogements from "./components/ListeLogements.jsx";
import DetailLogement from "./components/DetailLogement.jsx";
import FormulaireConnexion from "./components/FormulaireConnexion.jsx";
import FormulaireInscription from "./components/FormulaireInscription.jsx";
import MonCompte from "./components/MonCompte.jsx";
import PublierAnnonce from "./components/PublierAnnonce.jsx";
import MesAnnonces from "./components/MesAnnonces.jsx";
import Messagerie from "./components/Messagerie.jsx";

export default function App() {
  // -----------------------------------------------------------------
  // ÉTAT GLOBAL DE L'APPLICATION
  // -----------------------------------------------------------------

  // Quelle page est actuellement affichée ?
  const [page, setPage] = useState("accueil");

  // L'utilisateur connecté (null tant que personne ne s'est connecté).
  const [utilisateur, setUtilisateur] = useState(null);
  const [interlocuteurInitial, setInterlocuteurInitial] = useState(null);
  const [sessionEnChargement, setSessionEnChargement] = useState(true);
  const [erreurSession, setErreurSession] = useState("");

  // Les choix successifs du visiteur pendant son parcours :
  // ville -> quartier -> établissement facultatif -> logement.
  const [villeChoisie, setVilleChoisie] = useState(null);
  const [quartierChoisi, setQuartierChoisi] = useState(null);
  const [etablissementChoisi, setEtablissementChoisi] = useState(null);
  const [logementChoisi, setLogementChoisi] = useState(null);
  const [origineDetailLogement, setOrigineDetailLogement] = useState("logements");

  useEffect(() => {
    let annule = false;

    getUtilisateurConnecte()
      .then((utilisateurConnecte) => {
        if (!annule) {
          setUtilisateur(utilisateurConnecte);
        }
      })
      .catch((erreur) => {
        if (!annule) {
          setErreurSession(erreur.message || "La session utilisateur n'a pas pu être vérifiée.");
        }
      })
      .finally(() => {
        if (!annule) {
          setSessionEnChargement(false);
        }
      });

    return () => {
      annule = true;
    };
  }, []);

  // -----------------------------------------------------------------
  // FONCTIONS DE NAVIGATION ET D'ACTION
  // -----------------------------------------------------------------

  // Change simplement la page affichée.
  function allerA(nomDeLaPage) {
    const pagesReservees = ["publierAnnonce", "mesAnnonces", "messagerie", "monCompte"];
    if (pagesReservees.includes(nomDeLaPage) && !utilisateur) {
      setPage("connexion");
      return;
    }
    if (page === "messagerie" && nomDeLaPage !== "messagerie") {
      setInterlocuteurInitial(null);
    }
    setPage(nomDeLaPage);
  }

  function gererRechercheLogements({ ville, quartier, etablissement }) {
    setVilleChoisie(ville);
    setQuartierChoisi(quartier);
    setEtablissementChoisi(etablissement);
    setPage("logements");
  }

  // Étape 3 : un logement a été choisi -> on affiche sa fiche détaillée.
  function gererLogementChoisi(logement, origine = "logements") {
    setLogementChoisi(logement);
    setOrigineDetailLogement(origine);
    setPage("detailLogement");
  }

  function contacterProprietaire(idUtilisateur) {
    setInterlocuteurInitial(idUtilisateur);
    setPage(utilisateur ? "messagerie" : "connexion");
  }

  // Appelée quand la connexion ou l'inscription réussit.
  function gererConnexionReussie(utilisateurConnecte) {
    setUtilisateur(utilisateurConnecte);
    setErreurSession("");
    setPage(interlocuteurInitial ? "messagerie" : "accueil");
  }

  async function seDeconnecter() {
    try {
      await demanderDeconnexion();
    } catch (erreur) {
      setErreurSession(erreur.message || "La déconnexion a échoué, veuillez réessayer.");
      return;
    }

    setUtilisateur(null);
    setErreurSession("");
    setPage("accueil");
  }

  // -----------------------------------------------------------------
  // CHOIX DU COMPOSANT À AFFICHER SELON LA PAGE ACTUELLE
  // -----------------------------------------------------------------
  function afficherPage() {
    switch (page) {
      case "accueil":
        return (
          <Accueil
            onRechercheLogements={gererRechercheLogements}
            onLogementChoisi={(logement) => gererLogementChoisi(logement, "accueil")}
            allerA={allerA}
          />
        );

      case "logements":
        return (
          <ListeLogements
            ville={villeChoisie}
            quartier={quartierChoisi}
            etablissement={etablissementChoisi}
            onLogementChoisi={gererLogementChoisi}
            onRetour={() => setPage("accueil")}
          />
        );

      case "detailLogement":
        return (
          <DetailLogement
            logement={logementChoisi}
            etablissement={etablissementChoisi}
            onRetour={() => setPage(origineDetailLogement)}
            onContacter={contacterProprietaire}
          />
        );

      case "connexion":
        return <FormulaireConnexion onConnecte={gererConnexionReussie} allerA={allerA} />;

      case "inscription":
        return <FormulaireInscription onConnecte={gererConnexionReussie} allerA={allerA} />;

      case "monCompte":
        return utilisateur ? (
          <MonCompte
            utilisateur={utilisateur}
            onUtilisateurModifie={setUtilisateur}
          />
        ) : <FormulaireConnexion onConnecte={gererConnexionReussie} allerA={allerA} />;

      case "publierAnnonce":
        return utilisateur ? (
          <PublierAnnonce
            onPublie={() => setPage("mesAnnonces")}
            onAnnulation={() => setPage("mesAnnonces")}
          />
        ) : <FormulaireConnexion onConnecte={gererConnexionReussie} allerA={allerA} />;

      case "mesAnnonces":
        return utilisateur ? <MesAnnonces allerA={allerA} /> : <FormulaireConnexion onConnecte={gererConnexionReussie} allerA={allerA} />;

      case "messagerie":
        return utilisateur ? (
          <Messagerie
            utilisateurConnecte={utilisateur}
            interlocuteurInitial={interlocuteurInitial}
          />
        ) : <FormulaireConnexion onConnecte={gererConnexionReussie} allerA={allerA} />;

      default:
        return (
          <Accueil
            onRechercheLogements={gererRechercheLogements}
            onLogementChoisi={(logement) => gererLogementChoisi(logement, "accueil")}
            allerA={allerA}
          />
        );
    }
  }

  return (
    <div className="app">
      <Header utilisateur={utilisateur} page={page} allerA={allerA} seDeconnecter={seDeconnecter} />
      <main className={[
        "contenu",
        page === "connexion" || page === "inscription" ? "contenu-auth" : "",
        page === "logements" ? "contenu-logements" : "",
      ].filter(Boolean).join(" ")}>
        {sessionEnChargement && <p role="status">Vérification de la session...</p>}
        {erreurSession && <p className="message-erreur" role="alert">{erreurSession}</p>}
        {afficherPage()}
      </main>
    </div>
  );
}
