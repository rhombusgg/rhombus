document.addEventListener("htmx:beforeOnLoad", (e) => {
  if (e.detail.requestConfig.headers["HX-Boosted"]) {
    if (window.deregister) {
      window.deregister();
      window.deregister = undefined;
    }
  }
});
window.onunload = function () {};
window.addEventListener("popstate", (e) => {
  if (window.deregister) {
    window.deregister();
    window.deregister = undefined;
  }
});

window.addEventListener("htmx:oobAfterSwap", (e) => {
  if (e.detail.elt.id === "htmx-toaster") {
    if (e.detail.elt.dataset.toast === "success") {
      rhombus.toast.success(e.detail.elt.innerHTML);
    } else if (e.detail.elt.dataset.toast === "error") {
      rhombus.toast.error(e.detail.elt.innerHTML);
    }
  }
});

const getThemePreference = () => {
  if (
    typeof localStorage !== "undefined" &&
    localStorage.getItem("rhombus-theme")
  ) {
    return localStorage.getItem("rhombus-theme");
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
};
const setTheme = (isDark) => {
  // document.documentElement.classList[isDark ? "add" : "remove"]("dark");
};

window
  .matchMedia("(prefers-color-scheme: dark)")
  .addEventListener("change", (event) => {
    setTheme(event.matches);
  });

setTheme(getThemePreference() === "dark");

if (typeof localStorage !== "undefined") {
  const observer = new MutationObserver(() => {
    const isDark = document.documentElement.classList.contains("dark");
    localStorage.setItem("rhombus-theme", isDark ? "dark" : "light");
  });
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class"],
  });
}
