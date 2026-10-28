import { useEffect, useRef, useState } from "react";
import {
  envoyerMessage,
  getConversations,
  getMessagesConversation,
  obtenirUrlPhoto,
} from "../services/api.js";

function nomComplet(contact) {
  return [contact.prenom, contact.nom].filter(Boolean).join(" ") || "Utilisateur";
}

function Avatar({ utilisateur, petit = false }) {
  const photo = obtenirUrlPhoto(utilisateur.photo);
  const initiales = `${utilisateur.prenom?.[0] || ""}${utilisateur.nom?.[0] || ""}`.toUpperCase();

  return (
    <span className={`messagerie-avatar${petit ? " messagerie-avatar-petit" : ""}`}>
      {photo ? (
        <img src={photo} alt="" />
      ) : (
        initiales || "?"
      )}
    </span>
  );
}

function heureMessage(date) {
  return new Intl.DateTimeFormat("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

export default function Messagerie({
  utilisateurConnecte,
  interlocuteurInitial,
}) {
  const [conversations, setConversations] = useState([]);
  const [contactSelectionne, setContactSelectionne] = useState(null);
  const [messages, setMessages] = useState([]);
  const [recherche, setRecherche] = useState("");
  const [messageSaisi, setMessageSaisi] = useState("");
  const [chargement, setChargement] = useState(true);
  const [chargementMessages, setChargementMessages] = useState(true);
  const [envoiEnCours, setEnvoiEnCours] = useState(false);
  const [erreur, setErreur] = useState("");
  const messagesFin = useRef(null);
  const idContactSelectionne = contactSelectionne?.id_utilisateur;
  const idContactSelectionneRef = useRef(null);

  useEffect(() => {
    let annule = false;
    let requeteEnCours = false;
    let prochaineActualisation = null;

    async function chargerConversations(premierChargement = false) {
      if (
        requeteEnCours ||
        (document.visibilityState === "hidden" && !premierChargement)
      ) {
        return;
      }

      requeteEnCours = true;
      try {
        const donnees = await getConversations();
        if (annule) {
          return;
        }

        setConversations(donnees);
        if (premierChargement && interlocuteurInitial) {
          idContactSelectionneRef.current = interlocuteurInitial;
          setContactSelectionne({
            id_utilisateur: interlocuteurInitial,
            nom: "",
            prenom: "",
            photo: null,
          });
        } else if (premierChargement && donnees.length > 0) {
          idContactSelectionneRef.current = donnees[0].contact.id_utilisateur;
          setContactSelectionne(donnees[0].contact);
        }
        setErreur("");
      } catch (erreurApi) {
        if (!annule) {
          setErreur(erreurApi.message || "Les conversations n’ont pas pu être chargées.");
        }
      } finally {
        requeteEnCours = false;
        if (!annule && premierChargement) {
          setChargement(false);
        }

        if (!annule && document.visibilityState === "visible") {
          prochaineActualisation = window.setTimeout(() => chargerConversations(), 5000);
        }
      }
    }

    function actualiserAuRetour() {
      if (document.visibilityState !== "visible") {
        return;
      }

      window.clearTimeout(prochaineActualisation);
      chargerConversations();
    }

    chargerConversations(true);
    document.addEventListener("visibilitychange", actualiserAuRetour);

    return () => {
      annule = true;
      window.clearTimeout(prochaineActualisation);
      document.removeEventListener("visibilitychange", actualiserAuRetour);
    };
  }, [interlocuteurInitial]);

  useEffect(() => {
    if (!idContactSelectionne) {
      return undefined;
    }

    let annule = false;
    let premierChargement = true;
    let requeteEnCours = false;
    let prochaineActualisation = null;

    async function chargerMessages() {
      if (requeteEnCours || document.visibilityState === "hidden") {
        return;
      }

      requeteEnCours = true;
      if (premierChargement) {
        setChargementMessages(true);
      }

      try {
        const resultat = await getMessagesConversation(idContactSelectionne);
        if (!annule && idContactSelectionneRef.current === idContactSelectionne) {
          setMessages((messagesActuels) => {
            const messagesIdentiques = messagesActuels.length === resultat.messages.length
              && messagesActuels.every((message, index) => (
                message.id === resultat.messages[index].id
                && message.contenu === resultat.messages[index].contenu
              ));

            return messagesIdentiques ? messagesActuels : resultat.messages;
          });
          setContactSelectionne((courant) => (
            courant?.id_utilisateur === idContactSelectionne
              ? { ...courant, ...resultat.contact }
              : courant
          ));
          setErreur("");
        }
      } catch (erreurApi) {
        if (!annule && idContactSelectionneRef.current === idContactSelectionne) {
          setErreur(erreurApi.message || "La conversation n’a pas pu être chargée.");
        }
      } finally {
        requeteEnCours = false;
        if (!annule && idContactSelectionneRef.current === idContactSelectionne && premierChargement) {
          setChargementMessages(false);
          premierChargement = false;
        }

        if (!annule && document.visibilityState === "visible") {
          prochaineActualisation = window.setTimeout(chargerMessages, 5000);
        }
      }
    }

    function actualiserAuRetour() {
      if (document.visibilityState !== "visible") {
        return;
      }

      window.clearTimeout(prochaineActualisation);
      chargerMessages();
    }

    chargerMessages();
    document.addEventListener("visibilitychange", actualiserAuRetour);

    return () => {
      annule = true;
      window.clearTimeout(prochaineActualisation);
      document.removeEventListener("visibilitychange", actualiserAuRetour);
    };
  }, [idContactSelectionne]);

  useEffect(() => {
    messagesFin.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  function ouvrirConversation(contact) {
    setErreur("");
    setMessages([]);
    setMessageSaisi("");
    setChargementMessages(true);
    idContactSelectionneRef.current = contact.id_utilisateur;
    setContactSelectionne(contact);
  }

  async function envoyer(evenement) {
    evenement.preventDefault();
    const contenu = messageSaisi.trim();

    if (!contenu || !contactSelectionne || envoiEnCours) {
      return;
    }

    const destinataireId = contactSelectionne.id_utilisateur;
    setEnvoiEnCours(true);
    setErreur("");

    try {
      const message = await envoyerMessage(destinataireId, contenu);
      if (idContactSelectionneRef.current === destinataireId) {
        setMessages((anciensMessages) => [...anciensMessages, message]);
        setMessageSaisi("");
      }
      getConversations()
        .then(setConversations)
        .catch((erreurApi) => {
          if (idContactSelectionneRef.current === destinataireId) {
            setErreur(erreurApi.message || "Le message est envoyé, mais la liste des conversations n’a pas pu être actualisée.");
          }
        });
    } catch (erreurApi) {
      if (idContactSelectionneRef.current === destinataireId) {
        setErreur(erreurApi.message || "Le message n’a pas pu être envoyé.");
      }
    } finally {
      setEnvoiEnCours(false);
    }
  }

  const rechercheNormalisee = recherche.trim().toLocaleLowerCase("fr");
  const conversationsAffichees = rechercheNormalisee
    ? conversations.filter(({ contact }) => nomComplet(contact).toLocaleLowerCase("fr").includes(rechercheNormalisee))
    : conversations;

  return (
    <section className={`messagerie-page${contactSelectionne ? " messagerie-ouverte" : ""}`}>
      <aside className="messagerie-panneau">
        <div className="messagerie-titre">
          <h1>Messages</h1>
        </div>
        <label className="messagerie-recherche">
          <span className="visuellement-cache">Rechercher une conversation</span>
          <input
            type="search"
            value={recherche}
            onChange={(evenement) => setRecherche(evenement.target.value)}
            placeholder="Rechercher une conversation"
          />
        </label>

        {chargement && <p className="messagerie-etat">Chargement des conversations...</p>}
        {!chargement && conversationsAffichees.length === 0 && (
          <p className="messagerie-etat">
            {rechercheNormalisee
              ? "Aucune conversation trouvée."
              : "Aucune conversation pour le moment."}
          </p>
        )}

        <div className="messagerie-contacts" aria-label="Conversations">
          {conversationsAffichees.map(({ contact, dernier_message }) => (
            <button
              className={`messagerie-contact${contactSelectionne?.id_utilisateur === contact.id_utilisateur ? " messagerie-contact-actif" : ""}`}
              key={contact.id_utilisateur}
              type="button"
              onClick={() => ouvrirConversation(contact)}
            >
              <Avatar utilisateur={contact} />
              <span className="messagerie-contact-texte">
                <strong>{nomComplet(contact)}</strong>
                <span>{dernier_message.contenu}</span>
              </span>
            </button>
          ))}
        </div>
      </aside>

      <div className="messagerie-fil">
        {contactSelectionne ? (
          <>
            <header className="messagerie-entete">
              <button
                className="messagerie-retour"
                type="button"
                onClick={() => {
                  setMessages([]);
                  setMessageSaisi("");
                  setChargementMessages(false);
                  idContactSelectionneRef.current = null;
                  setContactSelectionne(null);
                }}
                aria-label="Retour à la liste des conversations"
              >
                ←
              </button>
              <Avatar utilisateur={contactSelectionne} petit />
              <div className="messagerie-identite">
                <strong>{nomComplet(contactSelectionne)}</strong>
                <span>Messagerie</span>
              </div>
            </header>

            <div className="messagerie-messages" aria-live="polite">
              {chargementMessages && <p className="messagerie-etat">Chargement des messages...</p>}
              {!chargementMessages && !erreur && messages.length === 0 && (
                <p className="messagerie-bienvenue">
                  Cette conversation est vide. Envoyez le premier message à {contactSelectionne.prenom || "cet utilisateur"}.
                </p>
              )}
              {messages.map((message) => {
                const estMonMessage = message.expediteur_id === utilisateurConnecte.id_utilisateur;

                return (
                  <article
                    className={`messagerie-bulle${estMonMessage ? " messagerie-bulle-moi" : ""}`}
                    key={message.id}
                  >
                    <p>{message.contenu}</p>
                    <time dateTime={message.created_at}>{heureMessage(message.created_at)}</time>
                  </article>
                );
              })}
              <div ref={messagesFin} />
            </div>

            <form className="messagerie-envoi" onSubmit={envoyer}>
              <label className="visuellement-cache" htmlFor="messagerie-nouveau-message">
                Votre message
              </label>
              <textarea
                id="messagerie-nouveau-message"
                value={messageSaisi}
                onChange={(evenement) => setMessageSaisi(evenement.target.value)}
                placeholder="Écrivez un message"
                rows="1"
                maxLength={2000}
                required
              />
              <button
                type="submit"
                disabled={envoiEnCours || !messageSaisi.trim()}
                aria-label="Envoyer le message"
              >
                {envoiEnCours ? "..." : "Envoyer"}
              </button>
            </form>
          </>
        ) : (
          <div className="messagerie-vide">
            <span aria-hidden="true">✉</span>
            <h2>Vos messages</h2>
            <p>Les profils avec lesquels vous échangez apparaîtront ici. Pour commencer, contactez le propriétaire d’une annonce.</p>
          </div>
        )}
      </div>

      {erreur && <p className="messagerie-erreur" role="alert">{erreur}</p>}
    </section>
  );
}
