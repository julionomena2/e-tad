// components/ListeEtablissements.jsx
// -----------------------------------------------------------------------
// Correspond au cas d'utilisation "Consulter un établissement".
// Affiche les établissements de la ville choisie à l'étape précédente.
// -----------------------------------------------------------------------

import { useEffect, useState } from "react";
import { getEtablissementsParVille } from "../services/api.js";

export default function ListeEtablissements({ ville, onEtablissementChoisi, onRetour }) {
  const [etablissements, setEtablissements] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState("");

  // Ce useEffect dépend de "ville" : si la ville choisie change,
  // React relance la requête API ; l'état local pilote le chargement et l'affichage des éventuelles erreurs.
  useEffect(() => {
    setChargement(true);
    getEtablissementsParVille(ville.id).then((donnees) => {
      setEtablissements(donnees);
      setChargement(false);
    }).catch((erreurApi) => {
      setErreur(erreurApi.message);
      setChargement(false);
    });
  }, [ville]);

  return (
    <section>
      <button className="lien-retour" onClick={onRetour}>
        ← Changer de ville
      </button>

      <h1>Établissements à {ville.nom}</h1>

      {erreur && <p className="message-erreur" role="alert">{erreur}</p>}
      {chargement && <p>Chargement des établissements...</p>}

      {!chargement && etablissements.length === 0 && (
        <p>Aucun établissement trouvé dans cette ville.</p>
      )}

      <div className="liste-cartes">
        {etablissements.map((etab) => (
          <button
            key={etab.id}
            className="carte carte-cliquable"
            onClick={() => onEtablissementChoisi(etab)}
          >
            <strong>{etab.nom}</strong>
            <span>{etab.latitude !== null && etab.longitude !== null ? "Coordonnées disponibles" : "Coordonnées indisponibles"}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
