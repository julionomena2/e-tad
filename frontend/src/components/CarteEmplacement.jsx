import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const CENTRE_MADAGASCAR = [-18.8792, 47.5079];
const URL_NOMINATIM = "https://nominatim.openstreetmap.org/search";

function attendreDelai(ms, signal) {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(new DOMException("La requête a été annulée.", "AbortError"));
      return;
    }

    const timeout = window.setTimeout(resolve, ms);
    signal.addEventListener("abort", () => {
      window.clearTimeout(timeout);
      reject(new DOMException("La requête a été annulée.", "AbortError"));
    }, { once: true });
  });
}

export default function CarteEmplacement({
  ville,
  quartier,
  latitude,
  longitude,
  onCoordonneesChange,
}) {
  const conteneurCarte = useRef(null);
  const carte = useRef(null);
  const marqueur = useRef(null);
  const dernierGeocodage = useRef(0);
  const derniereRequeteNominatim = useRef(0);
  const callbackCoordonnees = useRef(onCoordonneesChange);
  const [carteChargee, setCarteChargee] = useState(false);
  const [resultatGeocodage, setResultatGeocodage] = useState(null);

  useEffect(() => {
    callbackCoordonnees.current = onCoordonneesChange;
  }, [onCoordonneesChange]);

  useEffect(() => {
    if (!conteneurCarte.current) {
      return undefined;
    }

    const instanceCarte = L.map(conteneurCarte.current, {
      center: CENTRE_MADAGASCAR,
      zoom: 12,
      scrollWheelZoom: true,
    });
    carte.current = instanceCarte;

    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(instanceCarte);

    const iconeMarqueur = L.divIcon({
      className: "annonce-marqueur-osm",
      html: '<span class="annonce-marqueur-osm-point"></span>',
      iconSize: [24, 32],
      iconAnchor: [12, 30],
    });
    const instanceMarqueur = L.marker(CENTRE_MADAGASCAR, {
      icon: iconeMarqueur,
      draggable: false,
    });
    marqueur.current = instanceMarqueur;

    const placerMarqueur = (position) => {
      const coordonnees = {
        latitude: position.lat,
        longitude: position.lng,
      };
      instanceMarqueur.addTo(instanceCarte).setLatLng(position);
      callbackCoordonnees.current(coordonnees);
    };

    const handleClick = (evenement) => {
      dernierGeocodage.current++;
      placerMarqueur(evenement.latlng);
    };

    instanceCarte.on("click", handleClick);
    setCarteChargee(true);

    return () => {
      instanceCarte.off("click", handleClick);
      instanceCarte.remove();
      carte.current = null;
      marqueur.current = null;
    };
  }, []);

  useEffect(() => {
    if (!carteChargee || !carte.current || !marqueur.current) {
      return;
    }

    const coordonneesExistantes = Number.isFinite(latitude) && Number.isFinite(longitude);
    if (coordonneesExistantes) {
      dernierGeocodage.current++;
      const position = [latitude, longitude];
      carte.current.setView(position, 17);
      marqueur.current.setLatLng(position).addTo(carte.current);
      return;
    }

    if (!ville || !quartier) {
      return;
    }

    const requete = ++dernierGeocodage.current;
    const cleRecherche = `${quartier}, ${ville}`;
    const controleur = new AbortController();
    marqueur.current.remove();

    async function rechercherLocalisation(requeteLieu, signal) {
      const delai = Math.max(
        0,
        1000 - (Date.now() - derniereRequeteNominatim.current),
      );
      if (delai > 0) {
        await attendreDelai(delai, signal);
      }

      derniereRequeteNominatim.current = Date.now();
      const parametres = new URLSearchParams({
        format: "jsonv2",
        limit: "1",
        countrycodes: "mg",
        q: `${requeteLieu}, Madagascar`,
      });
      const reponse = await fetch(`${URL_NOMINATIM}?${parametres}`, {
        signal,
        headers: { "Accept-Language": "fr" },
      });

      if (!reponse.ok) {
        throw new Error(`Nominatim a répondu avec le statut ${reponse.status}.`);
      }

      return reponse.json();
    }

    async function centrerCarteSurLocalisation() {
      try {
        const resultatQuartier = await rechercherLocalisation(
          `${quartier}, ${ville}`,
          controleur.signal,
        );

        if (controleur.signal.aborted || requete !== dernierGeocodage.current) {
          return;
        }

        const localisationQuartier = resultatQuartier[0];
        if (localisationQuartier) {
          carte.current.setView(
            [Number(localisationQuartier.lat), Number(localisationQuartier.lon)],
            15,
          );
          setResultatGeocodage({
            cleRecherche,
            message: `Carte centrée sur ${quartier}, ${ville}. Cliquez pour placer le repère.`,
          });
          return;
        }

        const resultatVille = await rechercherLocalisation(ville, controleur.signal);
        if (controleur.signal.aborted || requete !== dernierGeocodage.current) {
          return;
        }

        const localisationVille = resultatVille[0];
        if (!localisationVille) {
          setResultatGeocodage({
            cleRecherche,
            message: `La ville ${ville} n’a pas été trouvée. Vous pouvez déplacer la carte manuellement.`,
          });
          return;
        }

        carte.current.setView(
          [Number(localisationVille.lat), Number(localisationVille.lon)],
          12,
        );
        setResultatGeocodage({
          cleRecherche,
          message: `Quartier introuvable : carte centrée sur ${ville}. Zoomez sur ${quartier} avant de placer le repère.`,
        });
      } catch (erreur) {
        if (controleur.signal.aborted || requete !== dernierGeocodage.current) {
          return;
        }

        setResultatGeocodage({
          cleRecherche,
          message: "Le quartier n’a pas pu être localisé par OpenStreetMap. Vous pouvez déplacer la carte manuellement.",
        });
        console.error("OpenStreetMap geocoding failed:", erreur);
      }
    }

    centrerCarteSurLocalisation();
    return () => controleur.abort();
  }, [carteChargee, latitude, longitude, quartier, ville]);

  const cleRechercheCourante = quartier && ville ? `${quartier}, ${ville}` : "";
  const coordonneesExistantes = Number.isFinite(latitude) && Number.isFinite(longitude);
  const etatCarte = coordonneesExistantes
    ? "Emplacement sélectionné. Cliquez sur la carte pour le déplacer."
    : !carteChargee
      ? "Chargement de la carte OpenStreetMap..."
      : !ville || !quartier
        ? "Choisissez une ville et un quartier pour centrer la carte."
        : resultatGeocodage?.cleRecherche === cleRechercheCourante
          ? resultatGeocodage.message
          : "Recherche du quartier sur OpenStreetMap...";

  return (
    <div className="annonce-carte-groupe">
      <div className="annonce-carte-conteneur">
        <div
          className="annonce-carte"
          ref={conteneurCarte}
          role="application"
          aria-label="Carte OpenStreetMap. Cliquez pour placer le repère du logement."
        />
      </div>
      <p className="annonce-carte-etat" role="status">{etatCarte}</p>
    </div>
  );
}
