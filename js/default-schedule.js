/*
 * Default weekly schedule.
 * Loaded only the first time the site is opened in a browser (or after
 * "Restore default schedule"). After that, everything lives in localStorage.
 *
 * day:   0 = Monday, 1 = Tuesday ... 6 = Sunday
 * start/end: "HH:MM", 24-hour clock
 * cat:   "class" | "work" | "meeting" | "other"
 *
 * Tip: if your repo is public, anyone who opens the site sees this
 * schedule. Replace it with [] to ship an empty planner.
 */
window.DEFAULT_SCHEDULE = [
  { title: "MATH306", cat: "class", days: [1, 3], start: "09:00", end: "10:15", place: "Jepson Hall" },
  { title: "MATH309", cat: "class", days: [0, 2], start: "10:30", end: "11:45", place: "Jepson Hall" },
  { title: "CMSC327 Lab", cat: "class", days: [3], start: "10:30", end: "11:20", place: "Jepson Hall" },
  { title: "DSST329", cat: "class", days: [1, 3], start: "13:30", end: "14:45", place: "Boatwright Library" },
  { title: "Math Research Meeting", cat: "meeting", days: [2], start: "13:30", end: "14:30", place: "" },
  { title: "MUS213", cat: "class", days: [0, 2], start: "15:00", end: "15:50", place: "Webb Tower" },
  { title: "MUS229", cat: "class", days: [1, 3], start: "15:00", end: "16:15", place: "Booker Hall" },
  { title: "CMSC327", cat: "class", days: [0, 2], start: "16:30", end: "17:45", place: "Jepson Hall" },

  { title: "Music Library Assistant", cat: "work", days: [0], start: "21:00", end: "23:00", place: "Music Library" },
  { title: "Music Library Assistant", cat: "work", days: [1], start: "17:00", end: "19:00", place: "Music Library" },
  { title: "Music Library Assistant", cat: "work", days: [4], start: "13:00", end: "15:00", place: "Music Library" },
  { title: "Music Library Assistant", cat: "work", days: [6], start: "14:00", end: "16:00", place: "Music Library" },
  { title: "ETC Data Entry", cat: "work", days: [4, 6], start: "16:00", end: "18:00", place: "ETC" },
  { title: "Tutor", cat: "work", days: [2, 6], start: "19:00", end: "22:00", place: "WLC in Boatwright" }
];
