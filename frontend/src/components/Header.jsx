import { useEffect, useState } from "react";

function IconeNavigation({ nom }) {
  const chemins = {
    accueil: <><path d="m3 10 9-7 9 7" /><path d="M5 9v11h14V9M9 20v-7h6v7" /></>,
    messagerie: <><path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8z" /></>,
    annonces: <><path d="M8 6h13M8 12h13M8 18h13" /><path d="M3 6h.01M3 12h.01M3 18h.01" /></>,
    menu: <><path d="M4 6h16M4 12h16M4 18h16" /></>,
    compte: <><circle cx="12" cy="8" r="4" /><path d="M5 21a7 7 0 0 1 14 0" /></>,
    publier: <><path d="M12 5v14M5 12h14" /></>,
    deconnexion: <><path d="M10 17l5-5-5-5M15 12H3" /><path d="M12 3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6" /></>,
    connexion: <><path d="M14 17l5-5-5-5M19 12H7" /><path d="M11 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h6" /></>,
    inscription: <><circle cx="9" cy="8" r="4" /><path d="M3 21a6 6 0 0 1 12 0M19 8v6M16 11h6" /></>,
  };

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      {chemins[nom]}
    </svg>
  );
}

// components/Header.jsx
// -----------------------------------------------------------------------
// Barre de navigation affichée en haut de toutes les pages.
// Elle reçoit des "props" (des informations données par le composant
// parent App.jsx) :
//   - utilisateur : l'utilisateur connecté (ou null si personne connecté)
//   - allerA      : une fonction qui permet de changer de page
//   - seDeconnecter : une fonction à appeler quand on clique sur "Se déconnecter"
// -----------------------------------------------------------------------

export default function Header({ utilisateur, page, allerA, seDeconnecter }) {
  const [menuOuvert, setMenuOuvert] = useState(false);
  const nomUtilisateur = [utilisateur?.prenom, utilisateur?.nom].filter(Boolean).join(" ");
  const explorerActif = ["accueil", "logements", "detailLogement"].includes(page);

  useEffect(() => {
    if (!menuOuvert) {
      return undefined;
    }

    function fermerAvecEchap(evenement) {
      if (evenement.key === "Escape") {
        setMenuOuvert(false);
      }
    }

    document.addEventListener("keydown", fermerAvecEchap);
    return () => document.removeEventListener("keydown", fermerAvecEchap);
  }, [menuOuvert]);

  function naviguerVers(nomDeLaPage) {
    setMenuOuvert(false);
    allerA(nomDeLaPage);
  }

  return (
    <header className="header">
      <button className="logo" type="button" onClick={() => naviguerVers("accueil")}>
        <span className="logo-marque" aria-hidden="true">e-</span>
        <span className="logo-texte">taditrano<span>.</span></span>
      </button>

      <nav className="nav nav-desktop" aria-label="Navigation principale">
        {utilisateur ? (
          <>
            <button className="nav-accueil" type="button" onClick={() => naviguerVers("accueil")}>Explorer</button>
            <button type="button" onClick={() => naviguerVers("mesAnnonces")}>Mes annonces</button>
            <button type="button" onClick={() => naviguerVers("messagerie")}>Messagerie</button>
            <button type="button" onClick={() => naviguerVers("monCompte")}>Mon compte</button>
            <button type="button" onClick={seDeconnecter}>Se déconnecter</button>
          </>
        ) : (
          <>
            <button className="nav-accueil" type="button" onClick={() => naviguerVers("accueil")}>Explorer</button>
            <button type="button" onClick={() => naviguerVers("connexion")}>Se connecter</button>
            <button className="nav-inscription" type="button" onClick={() => naviguerVers("inscription")}>Créer un compte</button>
          </>
        )}
      </nav>

      <nav className="nav-mobile" aria-label="Navigation mobile">
        <button
          className={explorerActif ? "nav-mobile-actif" : ""}
          type="button"
          onClick={() => naviguerVers("accueil")}
          aria-current={explorerActif ? "page" : undefined}
        >
          <IconeNavigation nom="accueil" />
          <span>Explorer</span>
        </button>
        {utilisateur ? (
          <>
            <button
              className={page === "messagerie" ? "nav-mobile-actif" : ""}
              type="button"
              onClick={() => naviguerVers("messagerie")}
              aria-current={page === "messagerie" ? "page" : undefined}
            >
              <IconeNavigation nom="messagerie" />
              <span>Messages</span>
            </button>
            <button
              className={page === "mesAnnonces" ? "nav-mobile-actif" : ""}
              type="button"
              onClick={() => naviguerVers("mesAnnonces")}
              aria-current={page === "mesAnnonces" ? "page" : undefined}
            >
              <IconeNavigation nom="annonces" />
              <span>Mes annonces</span>
            </button>
            <button
              className={menuOuvert ? "nav-mobile-actif" : ""}
              type="button"
              onClick={() => setMenuOuvert((ouvert) => !ouvert)}
              aria-expanded={menuOuvert}
              aria-controls="menu-compte-mobile"
            >
              <IconeNavigation nom="menu" />
              <span>Menu</span>
            </button>
          </>
        ) : (
          <>
            <button
              className={page === "connexion" ? "nav-mobile-actif" : ""}
              type="button"
              onClick={() => naviguerVers("connexion")}
              aria-current={page === "connexion" ? "page" : undefined}
            >
              <IconeNavigation nom="connexion" />
              <span>Connexion</span>
            </button>
            <button
              className={page === "inscription" ? "nav-mobile-actif" : ""}
              type="button"
              onClick={() => naviguerVers("inscription")}
              aria-current={page === "inscription" ? "page" : undefined}
            >
              <IconeNavigation nom="inscription" />
              <span>Créer un compte</span>
            </button>
          </>
        )}
      </nav>

      {utilisateur && menuOuvert && (
        <div className="menu-mobile-superposition">
          <button
            className="menu-mobile-fond"
            type="button"
            aria-label="Fermer le menu"
            onClick={() => setMenuOuvert(false)}
          />
          <section
            className="menu-mobile-panneau"
            id="menu-compte-mobile"
            role="dialog"
            aria-modal="true"
            aria-label="Menu du compte"
          >
            <div className="menu-mobile-entete">
              <div>
                <span className="menu-mobile-surtitre">VOTRE ESPACE</span>
                <h2>{nomUtilisateur || "Mon compte"}</h2>
              </div>
              <button
                className="menu-mobile-fermer"
                type="button"
                onClick={() => setMenuOuvert(false)}
                aria-label="Fermer le menu"
              >
                ×
              </button>
            </div>
            <button
              className="menu-mobile-action"
              type="button"
              onClick={() => naviguerVers("monCompte")}
            >
              <IconeNavigation nom="compte" />
              <span>
                <strong>Mon compte</strong>
                <small>Gérer mes informations personnelles</small>
              </span>
              <span className="menu-mobile-fleche" aria-hidden="true">›</span>
            </button>
            <button
              className="menu-mobile-action"
              type="button"
              onClick={() => naviguerVers("publierAnnonce")}
            >
              <IconeNavigation nom="publier" />
              <span>
                <strong>Publier une annonce</strong>
                <small>Mettre un logement en location</small>
              </span>
              <span className="menu-mobile-fleche" aria-hidden="true">›</span>
            </button>
            <button
              className="menu-mobile-action menu-mobile-deconnexion"
              type="button"
              onClick={() => {
                setMenuOuvert(false);
                seDeconnecter();
              }}
            >
              <IconeNavigation nom="deconnexion" />
              <span>
                <strong>Se déconnecter</strong>
                <small>Fermer votre session</small>
              </span>
              <span className="menu-mobile-fleche" aria-hidden="true">›</span>
            </button>
          </section>
        </div>
      )}
    </header>
  );
}
