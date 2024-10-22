(function () {
  require.config({
    paths: { vs: "https://unpkg.com/monaco-editor@0.52.0/min/vs" },
  });
  window.MonacoEnvironment = { getWorkerUrl: () => proxy };

  let proxy = URL.createObjectURL(
    new Blob(
      [
        `
  self.MonacoEnvironment = {
      baseUrl: 'https://unpkg.com/monaco-editor@0.52.0/min/'
  };
  importScripts('https://unpkg.com/monaco-editor@0.52.0/min/vs/base/worker/workerMain.js');
`,
      ],
      { type: "text/javascript" },
    ),
  );

  require(["vs/editor/editor.main"], function () {
    monaco.editor.defineTheme("customDark", {
      base: "vs-dark",
      inherit: true,
      rules: [],
      colors: {
        "editor.background": "#020817",
      },
    });

    window.editor = monaco.editor.create(document.getElementById("editor"), {
      value: document.getElementById("ticket-template").textContent,
      language: "markdown",
      minimap: { enabled: false },
      lineNumbers: "off",
      wordWrap: "on",
      scrollBeyondLastLine: false,
      scrollbar: {
        verticalScrollbarSize: 0,
      },
      folding: false,
      lineDecorationsWidth: 0,
    });

    window.editor.setPosition({ lineNumber: 999999, column: 0 });

    const setTheme = () => {
      const isDark = document.documentElement.classList.contains("dark");
      if (isDark) {
        monaco.editor.setTheme("customDark");
      } else {
        monaco.editor.setTheme("vs");
      }
    };

    setTheme();
    const observer = new MutationObserver(() => setTheme());
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
  });
})();
