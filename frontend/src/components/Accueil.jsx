// components/Accueil.jsx
// -----------------------------------------------------------------------
// Page d'accueil : recherche publique de logements par ville et quartier.
// -----------------------------------------------------------------------

import { useEffect, useState } from "react";
import {
  getEtablissementsParQuartier,
  getLogementsProches,
  getQuartiersParVille,
  getVilles,
} from "../services/api.js";
import { CarteLogement } from "./ListeLogements.jsx";

function messageErreurGeolocalisation(code) {
  if (code === 1) {
    return "L’accès à votre position a été refusé. Autorisez la localisation dans les paramètres du navigateur.";
  }

  if (code === 2) {
    return "Votre position est indisponible. Vérifiez que la localisation est activée sur votre appareil.";
  }

  if (code === 3) {
    return "La recherche de votre position a expiré. Réessayez.";
  }

  return "Votre position n’a pas pu être déterminée.";
}

export default function Accueil({ onRechercheLogements, onLogementChoisi, allerA }) {
  const [villes, setVilles] = useState([]);
  const [quartiers, setQuartiers] = useState([]);
  const [etablissements, setEtablissements] = useState([]);
  const [villeId, setVilleId] = useState("");
  const [quartierId, setQuartierId] = useState("");
  const [etablissementId, setEtablissementId] = useState("");
  const [chargementVilles, setChargementVilles] = useState(true);
  const [chargementQuartiers, setChargementQuartiers] = useState(false);
  const [chargementEtablissements, setChargementEtablissements] = useState(false);
  const [erreurChargement, setErreurChargement] = useState("");
  const [positionVisiteur, setPositionVisiteur] = useState(null);
  const [logementsProches, setLogementsProches] = useState([]);
  const [etatProximite, setEtatProximite] = useState("repos");
  const [erreurProximite, setErreurProximite] = useState("");

  useEffect(() => {
    // Charge le catalogue de départ une seule fois ; ces données alimentent le premier sélecteur.
    getVilles().then((donnees) => {
      setVilles(donnees);
      setChargementVilles(false);
    }).catch((erreurApi) => {
      setErreurChargement(erreurApi.message);
      setChargementVilles(false);
    });
  }, []);

  useEffect(() => {
    if (!villeId) return;
    let actif = true;
    // À chaque changement de ville, transmet son identifiant à Laravel et ignore une réponse devenue obsolète.
    getQuartiersParVille(villeId).then((donnees) => {
      if (actif) {
        setQuartiers(donnees);
        setChargementQuartiers(false);
      }
    }).catch((erreurApi) => {
      if (actif) {
        setErreurChargement(erreurApi.message);
        setChargementQuartiers(false);
      }
    });
    return () => { actif = false; };
  }, [villeId]);

  useEffect(() => {
    if (!quartierId) return;
    let actif = true;
    // À chaque sélection de quartier, récupère les établissements qui peuvent préciser la recherche de proximité.
    getEtablissementsParQuartier(quartierId).then((donnees) => {
      if (actif) {
        setEtablissements(donnees);
        setChargementEtablissements(false);
      }
    }).catch((erreurApi) => {
      if (actif) {
        setErreurChargement(erreurApi.message);
        setChargementEtablissements(false);
      }
    });
    return () => { actif = false; };
  }, [quartierId]);

  useEffect(() => {
    if (!positionVisiteur) {
      return undefined;
    }

    let actif = true;

    getLogementsProches(positionVisiteur)
      .then((donnees) => {
        if (actif) {
          setLogementsProches(donnees);
          setEtatProximite("termine");
        }
      })
      .catch((erreurApi) => {
        if (actif) {
          setErreurProximite(erreurApi.message || "Les logements proches n’ont pas pu être chargés.");
          setEtatProximite("erreur");
        }
      });

    return () => {
      actif = false;
    };
  }, [positionVisiteur]);

  function rechercherAutourDeMoi() {
    setErreurProximite("");

    if (!window.isSecureContext) {
      setErreurProximite("La géolocalisation exige HTTPS (ou localhost en développement).");
      setEtatProximite("erreur");
      return;
    }

    if (!navigator.geolocation) {
      setErreurProximite("La géolocalisation n’est pas disponible dans ce navigateur.");
      setEtatProximite("erreur");
      return;
    }

    setEtatProximite("localisation");
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setPositionVisiteur({
          latitude: coords.latitude,
          longitude: coords.longitude,
        });
        setEtatProximite("chargement");
      },
      (erreur) => {
        setErreurProximite(messageErreurGeolocalisation(erreur.code));
        setEtatProximite("erreur");
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 60000,
      },
    );
  }

  function choisirVille(id) {
    if (String(id) === villeId) return;
    setErreurChargement("");
    setVilleId(String(id));
    setQuartierId("");
    setQuartiers([]);
    setEtablissementId("");
    setEtablissements([]);
    setChargementQuartiers(Boolean(id));
    setChargementEtablissements(false);
  }

  function choisirQuartier(id) {
    setErreurChargement("");
    setQuartierId(id);
    setEtablissementId("");
    setEtablissements([]);
    setChargementEtablissements(Boolean(id));
  }

  function rechercherLogements(evenement) {
    evenement.preventDefault();
    const ville = villes.find((element) => element.id === villeId);
    const quartier = quartiers.find((element) => element.id === quartierId);
    const etablissement = etablissements.find((element) => element.id === etablissementId) || null;
    if (ville && quartier) onRechercheLogements({ ville, quartier, etablissement });
  }

  const villeSelectionnee = villes.find((ville) => ville.id === villeId);

  return (
    <section className="accueil-layout">
      <aside className="accueil-colonne accueil-gauche">

        <nav className="accueil-raccourcis" aria-label="Raccourcis">
          <button className="raccourci-actif" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
            <span className="raccourci-icone">⌂</span> Fil d'actualité
          </button>
          <button onClick={() => document.getElementById("recherche-ville")?.focus()}>
            <span className="raccourci-icone">⌕</span> Trouver un logement
          </button>
          <button onClick={() => allerA("publierAnnonce")}>
            <span className="raccourci-icone">＋</span> Publier une annonce
          </button>
          <button onClick={() => allerA("messagerie")}>
            <span className="raccourci-icone">✉</span> Messagerie
          </button>
        </nav>
        <div className="accueil-pied-gauche">Un logement, un nouveau départ.</div>
      </aside>

      <div className="accueil-fil">

        <section className="proximite-accueil" aria-labelledby="titre-proximite">
          <div className="proximite-accueil-entete">
            <div>
              <span className="sur-titre">AUTOUR DE VOUS</span>
              <h2 id="titre-proximite">Des logements à proximité</h2>
              <p>Découvrez les annonces disponibles dans un rayon de 25 km, classées du plus proche au plus éloigné.</p>
            </div>
            <button
              className="proximite-accueil-action"
              type="button"
              onClick={rechercherAutourDeMoi}
              disabled={etatProximite === "localisation" || etatProximite === "chargement"}
            >
              {etatProximite === "localisation"
                ? "Localisation en cours..."
                : etatProximite === "chargement"
                  ? "Recherche des logements..."
                  : positionVisiteur
                    ? "Actualiser ma position"
                    : "Trouver près de moi"}
            </button>
          </div>

          {etatProximite === "repos" && (
            <p className="proximite-accueil-note">Autorisez l’accès à votre position pour lancer la recherche. La fonction est disponible aux visiteurs et aux membres.</p>
          )}
          {etatProximite === "localisation" && <p className="proximite-accueil-etat" role="status">En attente de l’autorisation de localisation…</p>}
          {etatProximite === "chargement" && <p className="proximite-accueil-etat" role="status">Recherche des logements disponibles dans un rayon de 25 km…</p>}
          {etatProximite === "erreur" && <p className="message-erreur" role="alert">{erreurProximite}</p>}
          {etatProximite === "termine" && logementsProches.length === 0 && (
            <p className="proximite-accueil-etat" role="status">Aucun logement disponible n’a été trouvé dans un rayon de 25 km.</p>
          )}
          {etatProximite === "termine" && logementsProches.length > 0 && (
            <>
              <p className="proximite-accueil-compteur" role="status">
                {logementsProches.length} logement{logementsProches.length === 1 ? "" : "s"} trouvé{logementsProches.length === 1 ? "" : "s"} près de vous
              </p>
              <div className="logements-grille proximite-accueil-grille">
                {logementsProches.map((logement) => (
                  <CarteLogement
                    key={logement.id}
                    logement={logement}
                    onChoisir={onLogementChoisi}
                  />
                ))}
              </div>
            </>
          )}
        </section>

        {erreurChargement && <p className="message-erreur" role="alert">{erreurChargement}</p>}

        <form className="accueil-composer formulaire-recherche" onSubmit={rechercherLogements}>
          <div className="recherche-presentation">
            <div className="avatar">⌕</div>
            <div>
              <span>Votre recherche</span>
              <strong>Choisissez une ville et un quartier</strong>
            </div>
          </div>
          <div className="filtres-recherche">
            <label htmlFor="recherche-ville">
              Ville
              <select
                id="recherche-ville"
                value={villeId}
                onChange={(evenement) => choisirVille(evenement.target.value)}
                required
              >
                <option value="">Choisir une ville</option>
                {villes.map((ville) => <option key={ville.id} value={ville.id}>{ville.nom}</option>)}
              </select>
            </label>
            <label htmlFor="recherche-quartier">
              Quartier
              <select
                id="recherche-quartier"
                value={quartierId}
                onChange={(evenement) => choisirQuartier(evenement.target.value)}
                disabled={!villeId || chargementQuartiers}
                required
              >
                <option value="">{chargementQuartiers ? "Chargement..." : "Choisir un quartier"}</option>
                {quartiers.map((quartier) => <option key={quartier.id} value={quartier.id}>{quartier.nom}</option>)}
              </select>
            </label>
            <label htmlFor="recherche-etablissement">
              Établissement
              <select
                id="recherche-etablissement"
                value={etablissementId}
                onChange={(evenement) => setEtablissementId(evenement.target.value)}
                disabled={!quartierId || chargementEtablissements || etablissements.length === 0}
              >
                <option value="">Tous les logements du quartier</option>
                {etablissements.map((etablissement) => (
                  <option key={etablissement.id} value={etablissement.id}>{etablissement.nom}</option>
                ))}
              </select>
              <span className="optionnel">Facultatif</span>
            </label>
          </div>
          <div className="recherche-actions">
            <p>Consultation libre, avec ou sans compte.</p>
            <button type="submit" disabled={!villeId || !quartierId || chargementVilles}>
              Voir les logements <span aria-hidden="true">→</span>
            </button>
          </div>
        </form>

        <section className="flux-villes" aria-labelledby="titre-villes">
          <div className="titre-flux">
            <div>

              <h2 id="titre-villes">Explorer les villes</h2>
            </div>
            <span className="compteur-villes">{chargementVilles ? "..." : `${villes.length} villes`}</span>
          </div>

          {chargementVilles ? (
            <div className="etat-villes">Chargement des villes...</div>
          ) : villes.length > 0 ? (
            <div className="liste-villes">
              {villes.map((ville, index) => (
                <button
                  key={ville.id}
                  className={`ville-publication ville-ton-${index % 3}${villeSelectionnee?.id === ville.id ? " ville-selectionnee" : ""}`}
                  onClick={() => choisirVille(ville.id)}
                >
                  <span className="ville-initiale" aria-hidden="true">{ville.nom.charAt(0)}</span>
                  <span className="ville-infos">
                    <strong>{ville.nom}</strong>
                  </span>
                  <span className="ville-action">Choisir <span aria-hidden="true">→</span></span>
                </button>
              ))}
            </div>
          ) : (
            <div className="etat-villes">Aucune ville disponible pour le moment.</div>
          )}
        </section>
      </div>

      <aside className="accueil-colonne accueil-droite">
        <section className="panneau-info">
          <span className="sur-titre">VOTRE PARCOURS</span>
          <h2>De la ville au logement, simplement.</h2>
          <ol className="etapes-logement">
            <li><span>01</span><div><strong>Choisissez une ville</strong><small>Selon votre destination</small></div></li>
            <li><span>02</span><div><strong>Choisissez un quartier</strong><small>L'établissement est facultatif</small></div></li>
            <li><span>03</span><div><strong>Consultez les logements</strong><small>Visiteur ou membre connecté</small></div></li>
          </ol>
        </section>

        <section className="panneau-communaute">
          <div className="pastille-communaute">e</div>
          <h2>La recherche est ouverte à tous.</h2>
          <p>Pour publier une annonce ou contacter un propriétaire, connectez-vous.</p>
          <button onClick={() => allerA("publierAnnonce")}>Publier une annonce <span aria-hidden="true">→</span></button>
        </section>
        <p className="accueil-legal">Logement · Trouver sa place, simplement.</p>
      </aside>
    </section>
  );
}
