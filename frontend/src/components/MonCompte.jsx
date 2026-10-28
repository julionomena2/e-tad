import { useEffect, useState } from "react";
import { modifierProfil, obtenirUrlPhoto } from "../services/api.js";
import PasswordInput from "./PasswordInput.jsx";

const TAILLE_MAX_PHOTO = 5 * 1024 * 1024;
const TYPES_PHOTO = ["image/jpeg", "image/png", "image/webp"];

export default function MonCompte({ utilisateur, onUtilisateurModifie }) {
  const [nom, setNom] = useState(utilisateur.nom || "");
  const [prenom, setPrenom] = useState(utilisateur.prenom || "");
  const [email, setEmail] = useState(utilisateur.id_utilisateur || utilisateur.email || "");
  const [telephone, setTelephone] = useState(utilisateur.telephone || "");
  const [motDePasseActuel, setMotDePasseActuel] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [photo, setPhoto] = useState(null);
  const [apercuPhoto, setApercuPhoto] = useState("");
  const [erreur, setErreur] = useState("");
  const [messageSucces, setMessageSucces] = useState("");
  const [envoiEnCours, setEnvoiEnCours] = useState(false);

  useEffect(() => () => {
    if (apercuPhoto) {
      URL.revokeObjectURL(apercuPhoto);
    }
  }, [apercuPhoto]);

  function gererSelectionPhoto(evenement) {
    const fichier = evenement.target.files?.[0] || null;
    setErreur("");
    setMessageSucces("");

    if (fichier && !TYPES_PHOTO.includes(fichier.type)) {
      setErreur("Choisissez une image au format JPEG, PNG ou WebP.");
      evenement.target.value = "";
      setPhoto(null);
      setApercuPhoto("");
      return;
    }

    if (fichier && fichier.size > TAILLE_MAX_PHOTO) {
      setErreur("La photo ne doit pas dépasser 5 Mo.");
      evenement.target.value = "";
      setPhoto(null);
      setApercuPhoto("");
      return;
    }

    setPhoto(fichier);
    setApercuPhoto(fichier ? URL.createObjectURL(fichier) : "");
  }

  async function gererEnvoi(evenement) {
    evenement.preventDefault();
    setErreur("");
    setMessageSucces("");
    setEnvoiEnCours(true);

    try {
      const utilisateurMisAJour = await modifierProfil({
        nom,
        prenom,
        email,
        telephone,
        motDePasseActuel,
        motDePasse,
        confirmation,
        photo,
      });

      onUtilisateurModifie(utilisateurMisAJour);
      setNom(utilisateurMisAJour.nom);
      setPrenom(utilisateurMisAJour.prenom);
      setEmail(utilisateurMisAJour.id_utilisateur);
      setTelephone(utilisateurMisAJour.telephone);
      setMotDePasseActuel("");
      setMotDePasse("");
      setConfirmation("");
      setPhoto(null);
      setApercuPhoto("");
      setMessageSucces("Votre profil a été mis à jour.");
    } catch (e) {
      setErreur(e.message || "La mise à jour du profil a échoué, veuillez réessayer.");
    } finally {
      setEnvoiEnCours(false);
    }
  }

  const photoAffichee = apercuPhoto || obtenirUrlPhoto(utilisateur.photo);

  return (
    <section className="formulaire-page formulaire-profil">
      <h1>Mon compte</h1>
      <p className="aide-formulaire">Modifiez vos informations personnelles et enregistrez vos changements.</p>

      <form onSubmit={gererEnvoi} className="formulaire">
        <label>
          Nom
          <input
            type="text"
            value={nom}
            onChange={(e) => setNom(e.target.value)}
            autoComplete="family-name"
            maxLength={100}
            required
          />
        </label>

        <label>
          Prénom
          <input
            type="text"
            value={prenom}
            onChange={(e) => setPrenom(e.target.value)}
            autoComplete="given-name"
            maxLength={100}
            required
          />
        </label>

        <label>
          Adresse e-mail
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            maxLength={50}
            required
          />
        </label>

        <label>
          Numéro de téléphone
          <input
            type="tel"
            value={telephone}
            onChange={(e) => setTelephone(e.target.value)}
            autoComplete="tel"
            inputMode="numeric"
            pattern="[0-9]{10}"
            title="Saisissez exactement 10 chiffres, sans espace."
            maxLength={10}
            required
          />
          <span className="aide-formulaire">10 chiffres exactement, sans espace.</span>
        </label>

        <label>
          Photo de profil <span className="champ-facultatif">(facultatif)</span>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={gererSelectionPhoto}
            aria-describedby="aide-photo-profil"
          />
        </label>
        <p id="aide-photo-profil" className="aide-formulaire">
          JPEG, PNG ou WebP, 5 Mo maximum. Laissez vide pour conserver la photo actuelle.
        </p>
        {photoAffichee && (
          <img className="apercu-photo-profil" src={photoAffichee} alt="Photo de profil" />
        )}

        <h2>Changer de mot de passe</h2>
        <p className="aide-formulaire">
          Laissez ces champs vides si vous ne souhaitez pas changer votre mot de passe.
        </p>
        <PasswordInput
          id="profil-mot-de-passe-actuel"
          label="Mot de passe actuel"
          value={motDePasseActuel}
          onChange={(e) => setMotDePasseActuel(e.target.value)}
          autoComplete="current-password"
          maxLength={128}
        />
        <PasswordInput
          id="profil-nouveau-mot-de-passe"
          label="Nouveau mot de passe"
          value={motDePasse}
          onChange={(e) => setMotDePasse(e.target.value)}
          autoComplete="new-password"
          minLength={8}
          maxLength={128}
        />
        <p className="aide-formulaire">
          8 caractères minimum, avec une majuscule, une minuscule et un chiffre.
        </p>
        <PasswordInput
          id="profil-confirmation-mot-de-passe"
          label="Confirmation du nouveau mot de passe"
          value={confirmation}
          onChange={(e) => setConfirmation(e.target.value)}
          autoComplete="new-password"
          maxLength={128}
        />

        {erreur && <p className="message-erreur" role="alert">{erreur}</p>}
        {messageSucces && <p className="message-succes" role="status">{messageSucces}</p>}

        <button type="submit" disabled={envoiEnCours}>
          {envoiEnCours ? "Enregistrement..." : "Enregistrer les modifications"}
        </button>
      </form>
    </section>
  );
}
