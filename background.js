// background.js
// ─────────────────────────────────────────────────────────────────────────────
// Listens for any of our registered commands (e.g. "select_atom_bomb", "select_mirv", etc.).
// When one fires, we send a message { action: "selectBuildItem", name: "<Item>" }
// to the content script in the active tab (must match https://openfront.io/*).
// ─────────────────────────────────────────────────────────────────────────────

chrome.commands.onCommand.addListener((command) => {
  // Map each command name to its exact build‐menu item name:
  //   "Atom Bomb", "MIRV", "Hydrogen Bomb", "Warship",
  //   "Port", "Missile Silo", "SAM Launcher", "Defense Post", "City"
  let itemName;
  switch (command) {
    case "select_atom_bomb":
      itemName = "Atom Bomb";
      break;
    case "select_mirv":
      itemName = "MIRV";
      break;
    case "select_h_bomb":
      itemName = "Hydrogen Bomb";
      break;
    case "select_warship":
      itemName = "Warship";
      break;
    case "select_port":
      itemName = "Port";
      break;
    case "select_silo":
      itemName = "Missile Silo";
      break;
    case "select_sam":
      itemName = "SAM Launcher";
      break;
    case "select_defense":
      itemName = "Defense Post";
      break;
    case "select_city":
      itemName = "City";
      break;
    default:
      return; // unknown command
  }

  // Query the active tab in the current window, then send our message:
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs || tabs.length === 0) return;
    chrome.tabs.sendMessage(tabs[0].id, {
      action: "selectBuildItem",
      name: itemName
    });
  });
});