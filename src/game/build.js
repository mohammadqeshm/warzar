// Vite profile; publication never exposes URL shortcuts or partial translations.
(window.WZ ||= {}).Build = {
  playgama: import.meta.env.MODE === 'playgama',
  qa: import.meta.env.DEV || import.meta.env.MODE === 'qa',
};
