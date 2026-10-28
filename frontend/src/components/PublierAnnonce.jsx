import { useCallback, useEffect, useRef, useState } from "react";
import CarteEmplacement from "./CarteEmplacement.jsx";
import {
  creerLogement,
  getQuartiersParVille,
  getVilles,
  modifierLogement,
} from "../services/api.js";

const TYPES_LOGEMENT = ["Studio", "Chambre", "Appartement", "Maison", "Autre"];
const NOMBRE_MAXIMUM_PHOTOS = 10;
const OPTIONS_PIECES = [
  { cle: "cuisine", libelle: "Cuisine" },
  { cle: "salleAManger", libelle: "Salle à manger" },
  { cle: "wc", libelle: "WC" },
  { cle: "douche", libelle: "Douche" },
  { cle: "autres", libelle: "Autres" },
];
const DETAILS_VIDES = {
  nombrePieces: "",
  cuisine: false,
  salleAManger: false,
  wc: false,
  douche: false,
  autres: false,
  precisionAutres: "",
  surface: "",
  description: "",
};

function lireDescriptionEnDetails(description = "") {
  const lignes = description.split(/\r?\n/);
  const nombrePieces = lignes[0]?.match(/^Nombre de pièces\s*:\s*(\d+)$/);
  if (!nombrePieces) {
    return { ...DETAILS_VIDES, description };
  }

  const valeurs = new Map();
  const indexDescription = lignes.findIndex((ligne) => ligne.startsWith("Description :"));
  const lignesDetails = indexDescription === -1 ? lignes : lignes.slice(0, indexDescription);

  lignesDetails.slice(1).forEach((ligne) => {
    const correspondance = ligne.match(/^([^:]+)\s*:\s*(.*)$/);
    if (correspondance) {
      valeurs.set(correspondance[1].trim(), correspondance[2].trim());
    }
  });

  const surface = valeurs.get("Surface")?.match(/^([\d.,]+)/)?.[1]?.replace(",", ".") || "";

  return {
    nombrePieces: nombrePieces[1],
    cuisine: valeurs.get("Cuisine") === "Oui",
    salleAManger: valeurs.get("Salle à manger") === "Oui",
    wc: valeurs.get("WC") === "Oui",
    douche: valeurs.get("Douche") === "Oui",
    autres: Boolean(valeurs.get("Autres") && valeurs.get("Autres") !== "Non"),
    precisionAutres: valeurs.get("Autres") === "Non" ? "" : valeurs.get("Autres") || "",
    surface,
    description: indexDescription === -1
      ? ""
      : lignes.slice(indexDescription).join("\n").replace(/^Description\s*:\s*/, "").trim(),
  };
}

function creerDescriptionDepuisDetails(details) {
  const lignes = [
    `Nombre de pièces : ${details.nombrePieces}`,
    `Cuisine : ${details.cuisine ? "Oui" : "Non"}`,
    `Salle à manger : ${details.salleAManger ? "Oui" : "Non"}`,
    `WC : ${details.wc ? "Oui" : "Non"}`,
    `Douche : ${details.douche ? "Oui" : "Non"}`,
    `Autres : ${details.autres ? details.precisionAutres.trim() : "Non"}`,
    `Surface : ${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(Number(details.surface))} m²`,
    `Description : ${details.description.trim()}`,
  ];

  return lignes.join("\n");
}

function ApercuFichiers({ fichiers, retirer }) {
  return fichiers.map(({ fichier, url }, index) => (
    <div className="annonce-photo" key={`${fichier.name}-${fichier.lastModified}-${index}`}>
      <img src={url} alt={`Aperçu ${fichier.name}`} />
      <button type="button" onClick={() => retirer(index)} aria-label={`Retirer ${fichier.name}`}>
        Retirer
      </button>
    </div>
  ));
}

export default function PublierAnnonce({ annonce = null, onPublie, onAnnulation }) {
  const [villes, setVilles] = useState([]);
  const [quartiers, setQuartiers] = useState([]);
  const [villeId, setVilleId] = useState(annonce?.quartier?.id_ville ? String(annonce.quartier.id_ville) : "");
  const [quartierId, setQuartierId] = useState(annonce?.idQuartier ? String(annonce.idQuartier) : "");
  const [type, setType] = useState(annonce?.type || "");
  const [prix, setPrix] = useState(annonce?.prix ? String(annonce.prix) : "");
  const [details, setDetails] = useState(() => lireDescriptionEnDetails(annonce?.description));
  const [latitude, setLatitude] = useState(annonce?.latitude ?? null);
  const [longitude, setLongitude] = useState(annonce?.longitude ?? null);
  const photosExistantes = annonce?.photos || [];
  const [photosAAjouter, setPhotosAAjouter] = useState([]);
  const apercusPhotos = useRef([]);
  const [photosASupprimer, setPhotosASupprimer] = useState([]);
  const [supprimerPhotoLegacy, setSupprimerPhotoLegacy] = useState(false);
  const [chargementVilles, setChargementVilles] = useState(true);
  const [chargementQuartiers, setChargementQuartiers] = useState(Boolean(annonce?.quartier?.id_ville));
  const [envoiEnCours, setEnvoiEnCours] = useState(false);
  const [erreur, setErreur] = useState("");

  useEffect(() => {
    let annule = false;

    getVilles()
      .then((resultat) => {
        if (!annule) {
          setVilles(resultat);
        }
      })
      .catch((erreurApi) => {
        if (!annule) {
          setErreur(erreurApi.message || "La liste des villes n’a pas pu être chargée.");
        }
      })
      .finally(() => {
        if (!annule) {
          setChargementVilles(false);
        }
      });

    return () => {
      annule = true;
    };
  }, []);

  useEffect(() => {
    return () => {
      apercusPhotos.current.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  useEffect(() => {
    if (!villeId) {
      return undefined;
    }

    let annule = false;

    getQuartiersParVille(villeId)
      .then((resultat) => {
        if (!annule) {
          setQuartiers(resultat);
        }
      })
      .catch((erreurApi) => {
        if (!annule) {
          setErreur(erreurApi.message || "Les quartiers n’ont pas pu être chargés.");
        }
      })
      .finally(() => {
        if (!annule) {
          setChargementQuartiers(false);
        }
      });

    return () => {
      annule = true;
    };
  }, [villeId]);

  const villeSelectionnee = villes.find((ville) => ville.id === villeId);
  const quartierSelectionne = quartiers.find((quartier) => quartier.id === quartierId);
  const identifiantsPhotosActuelles = photosExistantes
    .filter((photo) => !(photo.legacy && supprimerPhotoLegacy))
    .filter((photo) => photo.id === null || !photosASupprimer.includes(photo.id));
  const nombrePhotosTotal = identifiantsPhotosActuelles.length + photosAAjouter.length;
  const descriptionGeneree = creerDescriptionDepuisDetails(details);

  const choisirEmplacement = useCallback((coordonnees) => {
    setLatitude(coordonnees.latitude);
    setLongitude(coordonnees.longitude);
  }, []);

  function choisirVille(id) {
    setVilleId(id);
    setQuartierId("");
    setLatitude(null);
    setLongitude(null);
    setChargementQuartiers(Boolean(id));
    setErreur("");
  }

  function choisirQuartier(id) {
    setQuartierId(id);
    setLatitude(null);
    setLongitude(null);
    setErreur("");
  }

  function choisirPhotos(evenement) {
    const nouveauxFichiers = Array.from(evenement.target.files || []);
    const nombreRestant = NOMBRE_MAXIMUM_PHOTOS - nombrePhotosTotal;

    if (nouveauxFichiers.length > nombreRestant) {
      setErreur(`Vous pouvez ajouter encore ${nombreRestant} photo(s) au maximum.`);
      evenement.target.value = "";
      return;
    }

    setErreur("");
    const photosAvecApercus = nouveauxFichiers.map((fichier) => {
      const url = URL.createObjectURL(fichier);
      apercusPhotos.current.push(url);

      return { fichier, url };
    });
    setPhotosAAjouter((fichiers) => [...fichiers, ...photosAvecApercus]);
    evenement.target.value = "";
  }

  function retirerPhotoExistante(photo) {
    if (photo.legacy) {
      setSupprimerPhotoLegacy(true);
      return;
    }

    setPhotosASupprimer((identifiants) => [...identifiants, photo.id]);
  }

  async function soumettre(evenement) {
    evenement.preventDefault();

    if (latitude === null || longitude === null) {
      setErreur("Cliquez sur la carte pour choisir l’emplacement exact du logement.");
      return;
    }

    setEnvoiEnCours(true);
    setErreur("");

    try {
      const donnees = {
        idQuartier: quartierId,
        type,
        prix,
        description: descriptionGeneree,
        latitude,
        longitude,
        photos: photosAAjouter.map(({ fichier }) => fichier),
        photosASupprimer: photosASupprimer.filter(Boolean),
        supprimerPhotoLegacy,
      };

      if (annonce) {
        await modifierLogement(annonce.id, donnees);
      } else {
        await creerLogement(donnees);
      }

      onPublie?.();
    } catch (erreurApi) {
      setErreur(erreurApi.message || "L’annonce n’a pas pu être enregistrée.");
    } finally {
      setEnvoiEnCours(false);
    }
  }

  return (
    <section className="annonce-page">
      <button className="lien-retour" type="button" onClick={onAnnulation || (() => window.history.back())}>
        ← Retour
      </button>
      <div className="annonce-introduction">
        <span>ESPACE PROPRIÉTAIRE</span>
        <h1>{annonce ? "Modifier l’annonce" : "Publier une annonce"}</h1>
        <p>Présentez votre logement et indiquez son emplacement pour aider les locataires à le trouver.</p>
      </div>

      {erreur && <p className="message-erreur" role="alert">{erreur}</p>}

      <form className="annonce-formulaire" onSubmit={soumettre}>
        <section className="annonce-section">
          <div className="annonce-section-titre">
            <span>01</span>
            <div>
              <h2>Le logement</h2>
              <p>Les informations qui figureront sur votre annonce.</p>
            </div>
          </div>

          <div className="annonce-champs">
            <label>
              Type de logement
              <select value={type} onChange={(evenement) => setType(evenement.target.value)} required>
                <option value="">Choisir un type</option>
                {TYPES_LOGEMENT.map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
            </label>

            <label>
              Loyer mensuel (Ar)
              <input
                type="number"
                min="1"
                step="1"
                value={prix}
                onChange={(evenement) => setPrix(evenement.target.value)}
                placeholder="Ex. 250000"
                required
              />
            </label>

            <label>
              Nombre de pièces
              <input
                type="number"
                min="1"
                step="1"
                value={details.nombrePieces}
                onChange={(evenement) => setDetails((valeurs) => ({
                  ...valeurs,
                  nombrePieces: evenement.target.value,
                }))}
                placeholder="Ex. 3"
                required
              />
            </label>

            <label>
              Surface (m²)
              <input
                type="number"
                min="0.1"
                step="0.1"
                value={details.surface}
                onChange={(evenement) => setDetails((valeurs) => ({
                  ...valeurs,
                  surface: evenement.target.value,
                }))}
                placeholder="Ex. 35,5"
                required
              />
            </label>

            <fieldset className="annonce-champ-large annonce-options-groupe">
              <legend>Pièces et équipements présents</legend>
              <div className="annonce-options-pieces">
                {OPTIONS_PIECES.map(({ cle, libelle }) => (
                  <label className="annonce-option-piece" key={cle}>
                    <input
                      type="checkbox"
                      checked={details[cle]}
                      onChange={(evenement) => setDetails((valeurs) => ({
                        ...valeurs,
                        [cle]: evenement.target.checked,
                        ...(cle === "autres" && !evenement.target.checked ? { precisionAutres: "" } : {}),
                      }))}
                    />
                    <span>{libelle}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            {details.autres && (
              <label className="annonce-champ-large">
                Précisez les autres pièces ou espaces
                <input
                  type="text"
                  value={details.precisionAutres}
                  onChange={(evenement) => setDetails((valeurs) => ({
                    ...valeurs,
                    precisionAutres: evenement.target.value,
                  }))}
                  maxLength="100"
                  placeholder="Ex. balcon, buanderie"
                  required
                />
              </label>
            )}

            <label className="annonce-champ-large">
              Description
              <textarea
                value={details.description}
                onChange={(evenement) => setDetails((valeurs) => ({
                  ...valeurs,
                  description: evenement.target.value,
                }))}
                rows="5"
                maxLength="9500"
                placeholder="Décrivez le logement, ses équipements et ses conditions de location..."
                required
              />
              <span className="annonce-aide">{details.description.length}/9 500 caractères</span>
            </label>
          </div>
        </section>

        <section className="annonce-section">
          <div className="annonce-section-titre">
            <span>02</span>
            <div>
              <h2>La localisation</h2>
              <p>Sélectionnez une ville et un quartier, puis placez le repère sur la carte.</p>
            </div>
          </div>

          <div className="annonce-champs annonce-localisation-champs">
            <label>
              Ville
              <select
                value={villeId}
                onChange={(evenement) => choisirVille(evenement.target.value)}
                disabled={chargementVilles}
                required
              >
                <option value="">{chargementVilles ? "Chargement des villes..." : "Choisir une ville"}</option>
                {villes.map((ville) => <option key={ville.id} value={ville.id}>{ville.nom}</option>)}
              </select>
            </label>

            <label>
              Quartier
              <select
                value={quartierId}
                onChange={(evenement) => choisirQuartier(evenement.target.value)}
                disabled={!villeId || chargementQuartiers}
                required
              >
                <option value="">{chargementQuartiers ? "Chargement..." : "Choisir un quartier"}</option>
                {quartiers.map((quartier) => <option key={quartier.id} value={quartier.id}>{quartier.nom}</option>)}
              </select>
            </label>
          </div>

          <CarteEmplacement
            ville={villeSelectionnee?.nom}
            quartier={quartierSelectionne?.nom}
            latitude={latitude}
            longitude={longitude}
            onCoordonneesChange={choisirEmplacement}
          />
          {latitude !== null && longitude !== null && (
            <p className="annonce-coordonnees">
              Repère : {latitude.toFixed(7)}, {longitude.toFixed(7)}
            </p>
          )}
        </section>

        <section className="annonce-section">
          <div className="annonce-section-titre">
            <span>03</span>
            <div>
              <h2>Les photos</h2>
              <p>Ajoutez jusqu’à 10 images (JPEG, PNG ou WebP, 5 Mo maximum chacune).</p>
            </div>
          </div>

          <label className="annonce-televersement">
            <span aria-hidden="true">＋</span>
            <strong>Ajouter des photos</strong>
            <small>{nombrePhotosTotal}/{NOMBRE_MAXIMUM_PHOTOS} sélectionnée(s)</small>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              onChange={choisirPhotos}
              disabled={nombrePhotosTotal >= NOMBRE_MAXIMUM_PHOTOS}
            />
          </label>

          <div className="annonce-photos">
            {photosExistantes.map((photo) => {
              const estSupprimee = photo.legacy
                ? supprimerPhotoLegacy
                : photosASupprimer.includes(photo.id);

              if (estSupprimee) {
                return null;
              }

              return (
                <div className="annonce-photo" key={photo.id ?? photo.chemin}>
                  <img src={photo.url} alt="Photo actuelle du logement" />
                  <button type="button" onClick={() => retirerPhotoExistante(photo)}>
                    Retirer
                  </button>
                </div>
              );
            })}
            <ApercuFichiers
              fichiers={photosAAjouter}
              retirer={(index) => {
                const photo = photosAAjouter[index];
                URL.revokeObjectURL(photo.url);
                apercusPhotos.current = apercusPhotos.current.filter((url) => url !== photo.url);
                setPhotosAAjouter((fichiers) => fichiers.filter((_, numero) => numero !== index));
              }}
            />
          </div>
        </section>

        <div className="annonce-pied-formulaire">
          <p>Date de publication : aujourd’hui <span>·</span> Statut initial : Disponible</p>
          <div>
            {onAnnulation && (
              <button className="annonce-bouton-secondaire" type="button" onClick={onAnnulation}>
                Annuler
              </button>
            )}
            <button
              className="annonce-bouton-principal"
              type="submit"
              disabled={envoiEnCours || chargementVilles || !quartierId || latitude === null || longitude === null}
            >
              {envoiEnCours ? "Enregistrement..." : annonce ? "Enregistrer les modifications" : "Publier l’annonce"}
            </button>
          </div>
        </div>
      </form>
    </section>
  );
}
