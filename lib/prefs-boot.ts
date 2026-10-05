export const PREFS_KEY = "taxi-prefs";

/** Runs in <head> before first paint so the text size never jumps. */
export const PREFS_BOOT = `try{var p=JSON.parse(localStorage.getItem("${PREFS_KEY}")||"{}");if(p.text==="large")document.documentElement.dataset.text="large"}catch(e){}`;
