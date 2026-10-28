import { useEffect, useState } from "react";
import { getMesLogements, supprimerLogement } from "../services/api.js";
import PublierAnnonce from "./PublierAnnonce.jsx";

export default function MesAnnonces({ allerA }) {
  const [annonces, setAnnonces] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState("");
  const [annonceEnModification, setAnnonceEnModification] = useState(null);
  const [annonceEnSuppression, setAnnonceEnSuppression] = useState(null);
  const [actualisation, setActualisation] = useState(0);

  useEffect(() => {
    let annule = false;

    getMesLogements()
      .then((resultat) => {
        if (!annule) {
          setAnnonces(resultat);
        }
      })
      .catch((erreurApi) => {
        if (!annule) {
          setErreur(erreurApi.message || "Vos annonces n’ont pas pu être chargées.");
        }
      })
      .finally(() => {
        if (!annule) {
          setChargement(false);
        }
      });

    return () => {
      annule = true;
    };
  }, [actualisation]);

  async function supprimerAnnonce(annonce) {
    if (!window.confirm(`Voulez-vous vraiment supprimer l’annonce « ${annonce.type} » ?`)) {
      return;
    }

    setAnnonceEnSuppression(annonce.id);
    setErreur("");

    try {
      await supprimerLogement(annonce.id);
      setChargement(true);
      setActualisation((valeur) => valeur + 1);
    } catch (erreurApi) {
      setErreur(erreurApi.message || "L’annonce n’a pas pu être supprimée.");
    } finally {
      setAnnonceEnSuppression(null);
    }
  }

  if (annonceEnModification) {
    return (
      <PublierAnnonce
        key={annonceEnModification.id}
        annonce={annonceEnModification}
        onPublie={() => {
          setAnnonceEnModification(null);
          setChargement(true);
          setActualisation((valeur) => valeur + 1);
        }}
        onAnnulation={() => setAnnonceEnModification(null)}
      />
    );
  }

  return (
    <section className="annonces-page">
      <div className="annonces-entete">
        <div>
          <span className="annonce-sur-titre">ESPACE PROPRIÉTAIRE</span>
          <h1>Mes annonces</h1>
          <p>Retrouvez et gérez les logements que vous avez publiés.</p>
        </div>
        <button className="annonce-bouton-principal" type="button" onClick={() => allerA("publierAnnonce")}>
          + Publier une annonce
        </button>
      </div>

      {erreur && <p className="message-erreur" role="alert">{erreur}</p>}
      {chargement && <p role="status">Chargement de vos annonces...</p>}

      {!chargement && !erreur && annonces.length === 0 && (
        <div className="annonces-vides">
          <span aria-hidden="true">⌂</span>
          <h2>Pas encore d’annonce</h2>
          <p>Publiez votre premier logement pour le proposer aux locataires.</p>
          <button className="annonce-bouton-principal" type="button" onClick={() => allerA("publierAnnonce")}>
            Publier mon premier logement
          </button>
        </div>
      )}

      {!chargement && annonces.length > 0 && (
        <div className="annonces-liste">
          {annonces.map((annonce) => {
            const photo = annonce.photos[0];
            const quartier = annonce.quartier?.nom_quartier;
            const ville = annonce.quartier?.ville?.nom_Ville;

            return (
              <article className="annonce-carte-proprietaire" key={annonce.id}>
                <div className="annonce-carte-visuel">
                  {photo ? (
                    <img src={photo.url} alt={`Logement ${annonce.type}`} />
                  ) : (
                    <span aria-hidden="true">⌂</span>
                  )}
                  {annonce.photos.length > 1 && (
                    <span className="annonce-nombre-photos">{annonce.photos.length} photos</span>
                  )}
                </div>
                <div className="annonce-carte-contenu">
                  <div className="annonce-carte-titre">
                    <div>
                      <span className="annonce-statut">{annonce.status}</span>
                      <h2>{annonce.type}</h2>
                    </div>
                    <strong>{annonce.prix.toLocaleString("fr-FR")} <small>Ar / mois</small></strong>
                  </div>
                  {(quartier || ville) && <p className="annonce-adresse">{[quartier, ville].filter(Boolean).join(", ")}</p>}
                  <p className="annonce-description">{annonce.description}</p>
                  <p className="annonce-date">
                    Publiée le {annonce.datePublication ? new Date(`${annonce.datePublication}T00:00:00`).toLocaleDateString("fr-FR") : "—"}
                  </p>
                  <div className="annonce-actions">
                    <button
                      className="annonce-bouton-secondaire"
                      type="button"
                      onClick={() => setAnnonceEnModification(annonce)}
                    >
                      Modifier
                    </button>
                    <button
                      className="annonce-bouton-suppression"
                      type="button"
                      onClick={() => supprimerAnnonce(annonce)}
                      disabled={annonceEnSuppression === annonce.id}
                    >
                      {annonceEnSuppression === annonce.id ? "Suppression..." : "Supprimer"}
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
