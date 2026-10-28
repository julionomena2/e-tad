const API_BASE_URL = import.meta.env.DEV
  ? "/api"
  : (import.meta.env.VITE_API_URL || "/api");
const STORAGE_ORIGIN = import.meta.env.DEV
  ? ""
  : new URL(import.meta.env.VITE_API_URL || window.location.origin, window.location.origin).origin;
const DUREE_CACHE_CATALOGUE_MS = 5 * 60 * 1000;
const DUREE_CACHE_LOGEMENTS_MS = 15 * 1000;
const DUREE_CACHE_MES_LOGEMENTS_MS = 10 * 1000;
let jetonCsrf = null;
let requeteSession = null;
let revisionCacheApi = 0;
const cacheReponsesApi = new Map();
const requetesApiEnCours = new Map();

// Point d'entrée commun des échanges avec Laravel : toutes les réponses et erreurs HTTP
// sont normalisées ici pour que les composants React puissent les traiter de la même façon.
async function appelerApi(chemin, options = {}) {
  const corpsFormulaire = options.body instanceof FormData;
  const reponse = await fetch(`${API_BASE_URL}${chemin}`, {
    ...options,
    credentials: "include",
    cache: "no-store",
    headers: {
      Accept: "application/json",
      ...(!corpsFormulaire && options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
  });

  // Laravel renvoie les erreurs de validation sous "errors" (HTTP 422) ; on les convertit
  // en Error pour que chaque formulaire puisse afficher un message sans connaître le format HTTP.
  if (!reponse.ok) {
    const erreur = await reponse.json().catch(() => ({}));
    const erreursValidation = Object.values(erreur.errors || {}).flat();
    throw new Error(erreursValidation[0] || erreur.message || "Une erreur est survenue côté serveur.");
  }

  // Une réponse 204 est volontairement vide : ne pas tenter de la décoder comme du JSON.
  if (reponse.status === 204) {
    return null;
  }

  return reponse.json();
}

function appelerApiAvecCache(chemin, dureeCacheMs) {
  const cle = `${API_BASE_URL}${chemin}`;
  const reponseEnCache = cacheReponsesApi.get(cle);

  if (reponseEnCache && reponseEnCache.expireA > Date.now()) {
    return Promise.resolve(reponseEnCache.donnees);
  }

  const requeteExistante = requetesApiEnCours.get(cle);
  if (requeteExistante) {
    return requeteExistante;
  }

  const revisionRequete = revisionCacheApi;
  const requete = appelerApi(chemin)
    .then((donnees) => {
      if (revisionRequete === revisionCacheApi) {
        cacheReponsesApi.set(cle, {
          donnees,
          expireA: Date.now() + dureeCacheMs,
        });
      }

      return donnees;
    })
    .finally(() => {
      if (requetesApiEnCours.get(cle) === requete) {
        requetesApiEnCours.delete(cle);
      }
    });

  requetesApiEnCours.set(cle, requete);
  return requete;
}

function invaliderCacheApi() {
  revisionCacheApi++;
  cacheReponsesApi.clear();
  requetesApiEnCours.clear();
}

async function obtenirSession() {
  if (!requeteSession) {
    requeteSession = appelerApi("/auth/session")
      .then((resultat) => {
        if (typeof resultat.csrf_token !== "string") {
          throw new Error("La réponse du serveur ne contient pas de jeton de sécurité.");
        }

        jetonCsrf = resultat.csrf_token;
        return resultat;
      })
      .finally(() => {
        requeteSession = null;
      });
  }

  return requeteSession;
}

async function obtenirJetonCsrf() {
  if (!jetonCsrf) {
    await obtenirSession();
  }

  if (!jetonCsrf) {
    throw new Error("La session de sécurité n'a pas pu être initialisée.");
  }

  return jetonCsrf;
}

function enregistrerJetonCsrf(resultat) {
  if (typeof resultat.csrf_token === "string") {
    jetonCsrf = resultat.csrf_token;
  }
}

export async function getUtilisateurConnecte() {
  const resultat = await obtenirSession();
  return resultat.utilisateur || null;
}

export function obtenirUrlPhoto(photo) {
  if (!photo) {
    return null;
  }

  const cheminEncode = photo.split("/").map(encodeURIComponent).join("/");
  return `${STORAGE_ORIGIN}/storage/${cheminEncode}`;
}

// Ces adaptateurs traduisent les noms de champs de la base Laravel vers ceux utilisés
// par l'interface, sans faire dépendre les composants de la structure SQL.
function mapperVille(ville) {
  return {
    id: ville.id_ville,
    nom: ville.nom_Ville,
  };
}

function mapperQuartier(quartier) {
  return {
    id: quartier.id_quartier,
    idVille: quartier.id_ville,
    nom: quartier.nom_quartier,
  };
}

function mapperEtablissement(etablissement) {
  return {
    id: String(etablissement.id),
    idQuartier: etablissement.id_quartier,
    nom: etablissement.nom_etablissement,
    latitude: etablissement.latitude === null || etablissement.latitude === undefined
      ? null
      : Number(etablissement.latitude),
    longitude: etablissement.longitude === null || etablissement.longitude === undefined
      ? null
      : Number(etablissement.longitude),
  };
}

function mapperLogement(logement) {
  const photos = Array.isArray(logement.photos) ? logement.photos : [];
  const galerie = photos.length > 0
    ? photos.map((photo) => ({
      id: photo.id,
      url: obtenirUrlPhoto(photo.chemin),
      chemin: photo.chemin,
      legacy: photo.legacy === true,
    }))
    : logement.photo
      ? [{
        id: null,
        url: obtenirUrlPhoto(logement.photo),
        chemin: logement.photo,
        legacy: true,
      }]
      : [];

  return {
    id: logement.id,
    proprietaireId: logement.id_utilisateur,
    idQuartier: logement.id_quartier,
    quartier: logement.quartier,
    type: logement.type_logement,
    prix: Number(logement.prix),
    description: logement.description,
    datePublication: logement.date_publication,
    status: logement.status,
    photo: logement.photo,
    photos: galerie,
    latitude: logement.latitude === null || logement.latitude === undefined
      ? null
      : Number(logement.latitude),
    longitude: logement.longitude === null || logement.longitude === undefined
      ? null
      : Number(logement.longitude),
    distanceKm: logement.distance_km === null || logement.distance_km === undefined
      ? null
      : Number(logement.distance_km),
  };
}

export async function getVilles() {
  // GET /api/villes renvoie les villes au format Laravel, puis l'adaptateur prépare les données React.
  return (await appelerApiAvecCache("/villes", DUREE_CACHE_CATALOGUE_MS)).map(mapperVille);
}

export async function getQuartiersParVille(idVille) {
  // Le filtre est encodé comme paramètre d'URL pour que Laravel ne renvoie que les quartiers de cette ville.
  const filtres = new URLSearchParams({ id_ville: String(idVille) });

  return (await appelerApiAvecCache(
    `/quartiers?${filtres}`,
    DUREE_CACHE_CATALOGUE_MS,
  )).map(mapperQuartier);
}

export async function getEtablissementsParVille(idVille) {
  // Demande les établissements d'une ville ; la réponse est convertie au format consommé par l'interface.
  const filtres = new URLSearchParams({ id_ville: String(idVille) });

  return (await appelerApiAvecCache(
    `/etablissements?${filtres}`,
    DUREE_CACHE_CATALOGUE_MS,
  )).map(mapperEtablissement);
}

export async function getLogementsParVille(idVille) {
  const filtres = new URLSearchParams({ id_ville: String(idVille) });

  return (await appelerApiAvecCache(
    `/quartiers?${filtres}`,
    DUREE_CACHE_CATALOGUE_MS,
  )).map(mapperQuartier);
}

export async function getEtablissementsParQuartier(idQuartier) {
  // Cette variante alimente le filtre de proximité après le choix d'un quartier.
  const filtres = new URLSearchParams({ id_quartier: String(idQuartier) });

  return (await appelerApiAvecCache(
    `/etablissements?${filtres}`,
    DUREE_CACHE_CATALOGUE_MS,
  )).map(mapperEtablissement);
}

export async function getMesLogements() {
  return (await appelerApiAvecCache(
    "/mes-logements",
    DUREE_CACHE_MES_LOGEMENTS_MS,
  )).map(mapperLogement);
}

export async function creerLogement(donneesLogement) {
  const csrfToken = await obtenirJetonCsrf();
  const formulaire = creerFormulaireLogement(donneesLogement);
  const resultat = await appelerApi("/mes-logements", {
    method: "POST",
    body: formulaire,
    headers: { "X-CSRF-TOKEN": csrfToken },
  });

  invaliderCacheApi();
  return mapperLogement(resultat);
}

export async function modifierLogement(idLogement, donneesLogement) {
  const csrfToken = await obtenirJetonCsrf();
  const formulaire = creerFormulaireLogement(donneesLogement);
  formulaire.append("_method", "PATCH");

  for (const idPhoto of donneesLogement.photosASupprimer || []) {
    formulaire.append("photos_a_supprimer[]", String(idPhoto));
  }

  if (donneesLogement.supprimerPhotoLegacy) {
    formulaire.append("supprimer_photo_legacy", "1");
  }

  const resultat = await appelerApi(`/mes-logements/${encodeURIComponent(idLogement)}`, {
    method: "POST",
    body: formulaire,
    headers: { "X-CSRF-TOKEN": csrfToken },
  });

  invaliderCacheApi();
  return mapperLogement(resultat);
}

export async function supprimerLogement(idLogement) {
  const csrfToken = await obtenirJetonCsrf();

  const resultat = await appelerApi(`/mes-logements/${encodeURIComponent(idLogement)}`, {
    method: "DELETE",
    headers: { "X-CSRF-TOKEN": csrfToken },
  });

  invaliderCacheApi();
  return resultat;
}

function creerFormulaireLogement(donneesLogement) {
  const formulaire = new FormData();
  formulaire.append("id_quartier", donneesLogement.idQuartier);
  formulaire.append("description", donneesLogement.description);
  formulaire.append("type_logement", donneesLogement.type);
  formulaire.append("prix", String(donneesLogement.prix));
  formulaire.append("latitude", String(donneesLogement.latitude));
  formulaire.append("longitude", String(donneesLogement.longitude));

  for (const photo of donneesLogement.photos || []) {
    formulaire.append("photos[]", photo);
  }

  return formulaire;
}

export async function getLogementsParQuartier(idQuartier, etablissement = null) {
  // Sans établissement, Laravel filtre simplement les logements par quartier.
  const filtres = new URLSearchParams({ id_quartier: String(idQuartier) });
  let chemin = "/logements";

  if (etablissement) {
    // Avec établissement, les coordonnées deviennent les paramètres de recherche du endpoint de proximité.
    if (etablissement.latitude === null || etablissement.longitude === null) {
      throw new Error("Cet établissement n’a pas de coordonnées enregistrées pour calculer la proximité.");
    }

    filtres.set("latitude", String(etablissement.latitude));
    filtres.set("longitude", String(etablissement.longitude));
    filtres.set("rayon_km", "5");
    chemin = "/logements/proches";
  }

  return (await appelerApiAvecCache(
    `${chemin}?${filtres}`,
    DUREE_CACHE_LOGEMENTS_MS,
  )).map(mapperLogement);
}

export async function getLogementsProches(position) {
  const filtres = new URLSearchParams({
    latitude: String(position.latitude),
    longitude: String(position.longitude),
    rayon_km: "25",
  });

  return (await appelerApiAvecCache(
    `/logements/proches?${filtres}`,
    DUREE_CACHE_LOGEMENTS_MS,
  )).map(mapperLogement);
}

export async function inscrire(donneesInscription) {
  const csrfToken = await obtenirJetonCsrf();
  // FormData transporte aussi la photo ; le navigateur ajoute lui-même la limite multipart/form-data.
  const formulaire = new FormData();
  formulaire.append("nom", donneesInscription.nom);
  formulaire.append("prenom", donneesInscription.prenom);
  formulaire.append("email", donneesInscription.email);
  formulaire.append("telephone", donneesInscription.telephone);
  formulaire.append("mot_de_passe", donneesInscription.motDePasse);
  formulaire.append("mot_de_passe_confirmation", donneesInscription.confirmation);
  if (donneesInscription.photo) {
    formulaire.append("photo_profil", donneesInscription.photo);
  }

  const resultat = await appelerApi("/register", {
    method: "POST",
    body: formulaire,
    headers: { "X-CSRF-TOKEN": csrfToken },
  });
  enregistrerJetonCsrf(resultat);
  // Le composant reçoit uniquement le compte renvoyé par Laravel après validation et création.
  if (!resultat.utilisateur) {
    throw new Error("La réponse du serveur ne contient pas le compte créé.");
  }
  invaliderCacheApi();
  return resultat.utilisateur;
}

export async function connecterAvecGoogle(identifiantGoogle) {
  const csrfToken = await obtenirJetonCsrf();
  // Prépare l'échange du justificatif Google ; Laravel doit exposer /auth/google pour que ce flux aboutisse.
  const resultat = await appelerApi("/auth/google", {
    method: "POST",
    body: JSON.stringify({ credential: identifiantGoogle }),
    headers: { "X-CSRF-TOKEN": csrfToken },
  });
  enregistrerJetonCsrf(resultat);

  if (!resultat.utilisateur) {
    throw new Error("La réponse du serveur ne contient pas le compte Google.");
  }
  invaliderCacheApi();
  return resultat.utilisateur;
}

export async function connecter({ email, motDePasse }) {
  const csrfToken = await obtenirJetonCsrf();
  const resultat = await appelerApi("/auth/login", {
    method: "POST",
    body: JSON.stringify({
      email: email.trim().toLowerCase(),
      mot_de_passe: motDePasse,
    }),
    headers: { "X-CSRF-TOKEN": csrfToken },
  });
  enregistrerJetonCsrf(resultat);

  if (!resultat.utilisateur) {
    throw new Error("La réponse du serveur ne contient pas le compte connecté.");
  }

  invaliderCacheApi();
  return resultat.utilisateur;
}

export async function deconnecter() {
  const csrfToken = await obtenirJetonCsrf();
  const resultat = await appelerApi("/auth/logout", {
    method: "POST",
    headers: { "X-CSRF-TOKEN": csrfToken },
  });
  enregistrerJetonCsrf(resultat);
  invaliderCacheApi();
}

export async function modifierProfil(donneesProfil) {
  const csrfToken = await obtenirJetonCsrf();
  const formulaire = new FormData();
  formulaire.append("_method", "PATCH");
  formulaire.append("nom", donneesProfil.nom.trim());
  formulaire.append("prenom", donneesProfil.prenom.trim());
  formulaire.append("email", donneesProfil.email.trim().toLowerCase());
  formulaire.append("telephone", donneesProfil.telephone);
  formulaire.append("mot_de_passe_actuel", donneesProfil.motDePasseActuel);
  formulaire.append("mot_de_passe", donneesProfil.motDePasse);
  formulaire.append("mot_de_passe_confirmation", donneesProfil.confirmation);

  if (donneesProfil.photo) {
    formulaire.append("photo_profil", donneesProfil.photo);
  }

  const resultat = await appelerApi("/auth/profile", {
    method: "POST",
    body: formulaire,
    headers: { "X-CSRF-TOKEN": csrfToken },
  });
  enregistrerJetonCsrf(resultat);

  if (!resultat.utilisateur) {
    throw new Error("La réponse du serveur ne contient pas le profil mis à jour.");
  }

  invaliderCacheApi();
  return resultat.utilisateur;
}

export async function getConversations() {
  return appelerApi("/messagerie/conversations");
}

export async function getMessagesConversation(idContact) {
  return appelerApi(`/messagerie/${encodeURIComponent(idContact)}/messages`);
}

export async function envoyerMessage(idContact, contenu) {
  const csrfToken = await obtenirJetonCsrf();
  const message = await appelerApi(`/messagerie/${encodeURIComponent(idContact)}/messages`, {
    method: "POST",
    body: JSON.stringify({ contenu }),
    headers: { "X-CSRF-TOKEN": csrfToken },
  });

  return message;
}
