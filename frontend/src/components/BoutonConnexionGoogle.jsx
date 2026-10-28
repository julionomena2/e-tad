import { useEffect, useRef, useState } from "react";

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const GOOGLE_SCRIPT_URL = "https://accounts.google.com/gsi/client";

export default function BoutonConnexionGoogle({ onCredential, erreur }) {
  const conteneur = useRef(null);
  const traiterCredential = useRef(onCredential);
  const [googlePret, setGooglePret] = useState(false);
  const [erreurChargement, setErreurChargement] = useState("");

  useEffect(() => {
    traiterCredential.current = onCredential;
  }, [onCredential]);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID || !conteneur.current) {
      return undefined;
    }

    let annule = false;
    let observeurTaille = null;
    const initialiserGoogle = () => {
      if (annule || !window.google?.accounts?.id || !conteneur.current) {
        return;
      }

      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: ({ credential }) => traiterCredential.current(credential),
      });

      let largeurRendue = 0;
      const rendreBouton = () => {
        if (annule || !conteneur.current) {
          return;
        }

        const largeurConteneur = Math.floor(conteneur.current.getBoundingClientRect().width);
        const largeur = Math.max(200, Math.min(360, largeurConteneur));
        if (largeur === largeurRendue) {
          return;
        }

        largeurRendue = largeur;
        conteneur.current.replaceChildren();
        window.google.accounts.id.renderButton(conteneur.current, {
          type: "standard",
          theme: "outline",
          size: "large",
          text: "continue_with",
          shape: "rect",
          width: largeur,
        });
        setGooglePret(true);
      };

      observeurTaille = new ResizeObserver(rendreBouton);
      observeurTaille.observe(conteneur.current);
      rendreBouton();
    };

    const scriptExistant = document.querySelector(`script[src="${GOOGLE_SCRIPT_URL}"]`);
    if (window.google?.accounts?.id) {
      initialiserGoogle();
    } else if (scriptExistant) {
      scriptExistant.addEventListener("load", initialiserGoogle);
      return () => {
        annule = true;
        observeurTaille?.disconnect();
        scriptExistant.removeEventListener("load", initialiserGoogle);
      };
    } else {
      const script = document.createElement("script");
      script.src = GOOGLE_SCRIPT_URL;
      script.async = true;
      script.defer = true;
      script.onload = initialiserGoogle;
      script.onerror = () => setErreurChargement("Le service Google n'a pas pu être chargé.");
      document.head.appendChild(script);
      return () => {
        annule = true;
        observeurTaille?.disconnect();
        script.onload = null;
        script.onerror = null;
      };
    }

    return () => {
      annule = true;
      observeurTaille?.disconnect();
    };
  }, []);

  if (!GOOGLE_CLIENT_ID) {
    return (
      <p className="aide-formulaire">
        La connexion Google sera disponible après configuration de VITE_GOOGLE_CLIENT_ID.
      </p>
    );
  }

  return (
    <>
      <div className="bouton-google" ref={conteneur} />
      {!googlePret && !erreurChargement && (
        <p className="aide-formulaire">Chargement de Google...</p>
      )}
      {(erreur || erreurChargement) && (
        <p className="message-erreur" role="alert">{erreur || erreurChargement}</p>
      )}
    </>
  );
}
