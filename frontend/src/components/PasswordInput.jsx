import { useState } from "react";

export default function PasswordInput({ id, label, value, onChange, autoComplete, ...attributes }) {
  const [visible, setVisible] = useState(false);

  return (
    <label className="password-field" htmlFor={id}>
      {label}
      <span className="password-input-wrap">
        <input
          {...attributes}
          id={id}
          type={visible ? "text" : "password"}
          value={value}
          onChange={onChange}
          autoComplete={autoComplete}
        />
        <button
          className="password-toggle"
          type="button"
          aria-label={visible ? "Masquer le mot de passe" : "Afficher le mot de passe"}
          aria-controls={id}
          aria-pressed={visible}
          onClick={() => setVisible((current) => !current)}
        >
          {visible ? (
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M3 3l18 18M10.6 10.6a2 2 0 002.8 2.8" />
              <path d="M9.9 5.2A10.8 10.8 0 0112 5c5.2 0 8.6 4.3 9.5 6-.4.8-1.4 2.2-3 3.5M6.2 6.2C4.1 7.5 2.8 9.5 2.5 11c.9 1.7 4.3 6 9.5 6 1 0 1.9-.2 2.8-.5" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M2.5 12S6 5 12 5s9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          )}
        </button>
      </span>
    </label>
  );
}
