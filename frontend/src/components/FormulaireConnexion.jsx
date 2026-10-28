// components/FormulaireConnexion.jsx
// -----------------------------------------------------------------------
// Correspond au cas d'utilisation "Se connecter".
// -----------------------------------------------------------------------

import { useState } from "react";
import { connecter, connecterAvecGoogle } from "../services/api.js";
import BoutonConnexionGoogle from "./BoutonConnexionGoogle.jsx";
import PasswordInput from "./PasswordInput.jsx";

export default function FormulaireConnexion({ onConnecte, allerA }) {
  // Un state pour chaque champ du formulaire.
  const [email, setEmail] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  // Un state pour afficher un message d'erreur si besoin.
  const [erreur, setErreur] = useState("");
  const [erreurGoogle, setErreurGoogle] = useState("");
  const [envoiEnCours, setEnvoiEnCours] = useState(false);

  // Cette fonction est appelée quand l'utilisateur clique sur "Se connecter".
  async function gererEnvoi(evenement) {
    // On empêche le comportement par défaut du formulaire HTML, qui est
    // de recharger toute la page (on ne veut pas de ça dans une app React).
    evenement.preventDefault();

    setErreur("");
    setEnvoiEnCours(true);

    try {
      const utilisateur = await connecter({ email, motDePasse });
      onConnecte(utilisateur); // on prévient App.jsx que la connexion a réussi
    } catch (e) {
      setErreur(e.message || "Connexion impossible, veuillez réessayer.");
    } finally {
      setEnvoiEnCours(false);
    }
  }

  async function gererConnexionGoogle(credential) {
    setErreurGoogle("");
    setEnvoiEnCours(true);

    try {
      const utilisateur = await connecterAvecGoogle(credential);
      onConnecte(utilisateur);
    } catch (e) {
      setErreurGoogle(e.message || "Connexion Google impossible, veuillez réessayer.");
    } finally {
      setEnvoiEnCours(false);
    }
  }

  return (
    <section className="formulaire-page">
      <h1>Se connecter</h1>

      <form onSubmit={gererEnvoi} className="formulaire">
        <label>
          E-mail
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            maxLength={50}
            required
          />
        </label>

        <PasswordInput
          id="connexion-mot-de-passe"
          label="Mot de passe"
          value={motDePasse}
          onChange={(e) => setMotDePasse(e.target.value)}
          autoComplete="current-password"
          required
        />

        {erreur && <p className="message-erreur" role="alert">{erreur}</p>}

        <button type="submit" disabled={envoiEnCours}>
          {envoiEnCours ? "Connexion..." : "Se connecter"}
        </button>
      </form>

      <div className="separateur-auth" aria-hidden="true"><span>ou</span></div>
      <BoutonConnexionGoogle onCredential={gererConnexionGoogle} erreur={erreurGoogle} />

      <p>
        Pas encore de compte ?{" "}
        <button className="lien" type="button" onClick={() => allerA("inscription")}>
          S'inscrire
        </button>
      </p>
    </section>
  );
}
