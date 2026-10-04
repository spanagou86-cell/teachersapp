export const PREFS_KEY = "taxi-prefs";

/** Runs in <head> before first paint so the page never flashes the wrong theme. */
export const PREFS_BOOT = `try{var p=JSON.parse(localStorage.getItem("${PREFS_KEY}")||"{}");if(p.theme==="light")document.documentElement.dataset.theme="light";if(p.text==="large")document.documentElement.dataset.text="large"}catch(e){}`;
