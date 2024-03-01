(function () {
  const commandPaletteOpener = document.querySelector("#commandPaletteOpener");
  const commandPalette = document.querySelector("#command-palette");
  const overlay = commandPalette.querySelector("#overlay");
  const input = commandPalette.querySelector("input");
  const commandList = commandPalette.querySelector("#commandList");

  const commands = [
    { category: "Pages", name: "Home", action: () => navigate("/") },
    {
      category: "Pages",
      name: "Sign In",
      action: () => navigate("/signin"),
    },
    {
      category: "Pages",
      name: "Secret",
      action: () => (window.location = "/secret"),
    },
    {
      category: "Utilities",
      name: "Log Hello",
      action: () => console.log("Hello"),
    },
    {
      category: "Utilities",
      name: "Alert World",
      action: () => alert("World"),
    },
    {
      category: "Settings",
      name: "Change Theme",
      action: () => console.log("Changing theme..."),
    },
    {
      category: "Settings",
      name: "Update Profile",
      action: () => console.log("Updating profile..."),
    },
  ];

  let filteredCommands = commands;
  let selectedIndex = 0;

  input.addEventListener("input", filterCommands);
  input.addEventListener("keydown", navigateCommands);
  renderCommands();

  function renderCommands() {
    commandList.innerHTML = "";

    let currentCategory = null;
    filteredCommands.forEach((command, index) => {
      if (currentCategory !== command.category) {
        currentCategory = command.category;
        const categoryHeader = document.createElement("li");
        categoryHeader.textContent = currentCategory;
        categoryHeader.classList.add(
          "font-medium",
          "text-muted-foreground",
          "py-1.5",
          "px-2",
        );
        commandList.appendChild(categoryHeader);
      }

      const li = document.createElement("li");
      li.textContent = command.name;
      li.classList.add(
        "action",
        "rounded-lg",
        "cursor-pointer",
        "py-3",
        "px-2",
      );
      if (index === selectedIndex) {
        li.classList.add("bg-primary/20");
      }
      li.addEventListener("mouseenter", () => {
        selectedIndex = index;
        renderCommands();
      });
      li.addEventListener("mousedown", (e) => {
        e.preventDefault();
        runAction();
      });
      commandList.appendChild(li);
    });
  }

  function filterCommands() {
    const query = input.value.toLowerCase();
    filteredCommands = commands.filter((command) =>
      command.name.toLowerCase().includes(query),
    );
    selectedIndex = 0;
    renderCommands();
  }

  /**
   * @param {KeyboardEvent} event
   */
  function navigateCommands(event) {
    if (event.key === "Escape") {
      closeModal();
    }

    const commandElements = commandList.querySelectorAll("li.action");
    if (event.key === "ArrowUp" || (event.key === "Tab" && event.shiftKey)) {
      event.preventDefault();
      selectedIndex =
        (selectedIndex - 1 + commandElements.length) % commandElements.length;
      commandElements[selectedIndex].scrollIntoView({ block: "center" });
      renderCommands();
    } else if (event.key === "ArrowDown" || event.key === "Tab") {
      event.preventDefault();
      selectedIndex = (selectedIndex + 1) % commandElements.length;
      commandElements[selectedIndex].scrollIntoView({ block: "center" });
      renderCommands();
    } else if (event.key === "Enter") {
      runAction();
    }
  }

  function runAction() {
    const selectedCommand = filteredCommands[selectedIndex];
    closeModal();
    if (selectedCommand) {
      selectedCommand.action();
    }
  }

  /**
   * @param {string} url
   */
  function navigate(url) {
    htmx.ajax("GET", url, document);
    window.history.pushState({}, "", url);
  }

  function openModal() {
    input.value = "";
    commandList.scrollTop = 0;
    filterCommands();
    renderCommands();
    commandPalette.style.opacity = "1";
    commandPalette.style.pointerEvents = "auto";
    input.focus();
  }

  function closeModal() {
    commandPalette.style.opacity = "0";
    commandPalette.style.pointerEvents = "none";
  }

  commandPaletteOpener.addEventListener("click", () => openModal());
  overlay.addEventListener("click", () => closeModal());

  document.addEventListener("keydown", (e) => {
    if (e.ctrlKey && e.key === "k") {
      e.preventDefault();

      if (commandPalette.style.opacity === "0") {
        openModal();
      } else {
        closeModal();
      }
    }
  });
})();
