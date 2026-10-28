import { useEffect, useState } from "react";
import { getLogementsParQuartier } from "../services/api.js";

function lireDetailsDescription(description = "") {
  const lignes = description.split(/\r?\n/);
  const nombrePieces = lignes.find((ligne) => ligne.startsWith("Nombre de pièces :"));
  const surface = lignes.find((ligne) => ligne.startsWith("Surface :"));
  const ligneDescription = lignes.findIndex((ligne) => ligne.startsWith("Description :"));
  const descriptionLibre = ligneDescription === -1
    ? nombrePieces
      ? ""
      : description
    : lignes.slice(ligneDescription).join(" ").replace(/^Description\s*:\s*/, "").trim();

  return {
    nombrePieces: nombrePieces?.replace(/^Nombre de pièces\s*:\s*/, ""),
    surface: surface?.replace(/^Surface\s*:\s*/, ""),
    description: descriptionLibre,
  };
}

export function CarteLogement({ logement, onChoisir }) {
  const [photoIndisponible, setPhotoIndisponible] = useState(false);
  const photoCouverture = logement.photos?.[0];
  const details = lireDetailsDescription(logement.description);
  const localisation = [
    logement.quartier?.nom_quartier,
    logement.quartier?.ville?.nom_Ville,
  ].filter(Boolean).join(", ");

  return (
    <button
      className="logement-card"
      type="button"
      onClick={() => onChoisir(logement)}
      aria-label={`Voir le détail du ${logement.type}${localisation ? ` à ${localisation}` : ""}`}
    >
      <span className="logement-card-image">
        {photoCouverture && !photoIndisponible ? (
          <img
            src={photoCouverture.url}
            alt={`Photo du ${logement.type}`}
            loading="lazy"
            onError={() => setPhotoIndisponible(true)}
          />
        ) : (
          <span className="logement-card-sans-photo">
            <span aria-hidden="true">⌂</span>
            <small>{photoCouverture ? "Photo indisponible" : "Aucune photo"}</small>
          </span>
        )}
        <span className="logement-card-type">{logement.type}</span>
        {logement.photos?.length > 1 && (
          <span className="logement-card-nombre-photos">{logement.photos.length} photos</span>
        )}
      </span>

      <span className="logement-card-contenu">
        <span className="logement-card-localisation">
          <span aria-hidden="true">⌖</span>
          {localisation || "Localisation non précisée"}
        </span>
        <span className="logement-card-prix">
          {logement.prix.toLocaleString("fr-FR")}
          <small> Ar <span>/ mois</span></small>
        </span>

        {(details.nombrePieces || details.surface) && (
          <span className="logement-card-caracteristiques">
            {details.nombrePieces && <span>{details.nombrePieces} pièce{details.nombrePieces === "1" ? "" : "s"}</span>}
            {details.surface && <span>{details.surface}</span>}
          </span>
        )}

        {details.description && (
          <span className="logement-card-description">{details.description}</span>
        )}

        {logement.distanceKm !== null && (
          <span className="logement-card-distance">
            {logement.distanceKm.toFixed(1)} km à proximité
          </span>
        )}

        <span className="logement-card-voir">Voir le logement <span aria-hidden="true">→</span></span>
      </span>
    </button>
  );
}

export default function ListeLogements({ ville, quartier, etablissement, onLogementChoisi, onRetour }) {
  const [logements, setLogements] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [tri, setTri] = useState("prix-croissant");
  const [erreur, setErreur] = useState("");

  useEffect(() => {
    let annule = false;

    getLogementsParQuartier(quartier.id, etablissement)
      .then((donnees) => {
        if (!annule) {
          setLogements(donnees);
        }
      })
      .catch((erreurApi) => {
        if (!annule) {
          setErreur(erreurApi.message);
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
  }, [quartier, etablissement]);

  const logementsTries = [...logements].sort((a, b) => {
    if (tri === "prix-decroissant") return b.prix - a.prix;
    if (tri === "distance") return (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity);
    return a.prix - b.prix;
  });

  return (
    <section className="exploration-logements">
      <button className="lien-retour" type="button" onClick={onRetour}>
        ← Modifier la recherche
      </button>

      <div className="logements-entete">
        <div>
          <span className="logements-sur-titre">LOGEMENTS À LOUER</span>
          <h1>{quartier.nom}, {ville.nom}</h1>
          {etablissement && <p>À proximité de {etablissement.nom}</p>}
        </div>
        {!chargement && !erreur && (
          <span className="logements-compteur">
            {logements.length} logement{logements.length === 1 ? "" : "s"}
          </span>
        )}
      </div>

      {erreur && <p className="message-erreur" role="alert">{erreur}</p>}

      <div className="logements-outils">
        {chargement ? (
          <p role="status">Recherche des logements disponibles...</p>
        ) : (
          <>
            <p>{logements.length ? "Trouvez le logement qui vous correspond." : "Aucun résultat pour cette recherche."}</p>
            {logements.length > 0 && (
              <label className="logements-tri">
                Trier par
                <select value={tri} onChange={(evenement) => setTri(evenement.target.value)}>
                  <option value="prix-croissant">Prix croissant</option>
                  <option value="prix-decroissant">Prix décroissant</option>
                  {etablissement && <option value="distance">Distance</option>}
                </select>
              </label>
            )}
          </>
        )}
      </div>

      {!chargement && !erreur && logements.length === 0 && (
        <div className="logements-vides">
          <span aria-hidden="true">⌂</span>
          <h2>Aucun logement disponible</h2>
          <p>
            {etablissement
              ? "Aucun logement disponible à proximité de cet établissement."
              : "Il n’y a pas encore d’annonce dans ce quartier. Essayez une autre recherche."}
          </p>
          <button className="annonce-bouton-secondaire" type="button" onClick={onRetour}>
            Modifier ma recherche
          </button>
        </div>
      )}

      {!chargement && logements.length > 0 && (
        <div className="logements-grille">
          {logementsTries.map((logement) => (
            <CarteLogement
              key={logement.id}
              logement={logement}
              onChoisir={onLogementChoisi}
            />
          ))}
        </div>
      )}
    </section>
  );
}
