/*
 * Default weekly schedule.
 * Loaded only the first time the site is opened in a browser (or after
 * "Restore default schedule"). After that, everything lives in localStorage.
 *
 * day:   0 = Monday, 1 = Tuesday ... 6 = Sunday
 * start/end: "HH:MM", 24-hour clock
 * cat:   "class" | "work" | "meeting" | "other"
 *
 * Kept empty on purpose: the repo is public, so anything here would be
 * shown to everyone who opens the site. Add your own classes in the app.
 */
window.DEFAULT_SCHEDULE = [];
