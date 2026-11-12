// Runs in <head> before the page paints, so on the Dremedia site (/ugc) a saved
// Light or Dark choice never flashes the other one first. components/ugc/theme.tsx
// keeps it in sync after that; app/globals.css reads <html data-dm-theme>.
export const THEME_KEY = "dremedia-theme";
export const THEME_SCRIPT = `(function(){try{if(!/\\/ugc(\\/|$)/.test(location.pathname))return;var t=localStorage.getItem("${THEME_KEY}");document.documentElement.setAttribute("data-dm-theme",t==="light"||t==="dark"?t:"auto")}catch(e){}})();`;
