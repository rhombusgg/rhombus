(function () {
  document.body.addEventListener("htmx:afterSwap", function (detail) {
    const dialog = detail.target.querySelector("dialog[data-onload-showmodal]");
    if (dialog) {
      dialog.addEventListener("close", () => {
        dialog.remove();
      });
      dialog.addEventListener("mousedown", (event) => {
        const rect = event.target.getBoundingClientRect();

        if (
          event.clientX - rect.left <= 0 ||
          rect.right - event.clientX <= 0 ||
          event.clientY - rect.top <= 0 ||
          rect.bottom - event.clientY <= 0
        ) {
          dialog.isMouseDown = true;
        }
      });
      dialog.addEventListener("mouseup", (event) => {
        const rect = event.target.getBoundingClientRect();

        if (
          (event.clientX - rect.left <= 0 ||
            rect.right - event.clientX <= 0 ||
            event.clientY - rect.top <= 0 ||
            rect.bottom - event.clientY <= 0) &&
          dialog.isMouseDown
        ) {
          dialog.close();
        }

        dialog.isMouseDown = false;
      });
      dialog.showModal();
    }
  });

  document.body.addEventListener("closeModal", function () {
    document.querySelector("dialog[open]")?.close();
  });
})();
