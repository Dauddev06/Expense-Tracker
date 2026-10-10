// Light / Dark / "same as phone" - stored in this browser's localStorage.
export const THEME_STORAGE_KEY = "theme";

// Runs in <head> before the first paint (see app/layout.tsx), so a saved
// Light/Dark choice never flashes. "Same as phone" means no attribute at
// all, and the CSS follows the phone's own setting.
export const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem("${THEME_STORAGE_KEY}");if(t==="light"||t==="dark")document.documentElement.setAttribute("data-theme",t)}catch(e){}})()`;
