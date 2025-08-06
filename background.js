// background.js
// ─────────────────────────────────────────────────────────────────────────────
// Listens for any of our registered commands (e.g. "select_atom_bomb", "select_mirv", etc.).
// When one fires, we send a message { action: "selectBuildItem", id: "<data-id>" }
// to the content script in the active tab (must match https://openfront.io/*).
// ─────────────────────────────────────────────────────────────────────────────

chrome.commands.onCommand.addListener((command) => {
  // Map our commands to the exact data-id values in the radial submenu:
  let sliceId;
  switch (command) {
    case "select_atom_bomb":
      sliceId = "attack_Atom Bomb";
      break;
    case "select_mirv":
      sliceId = "attack_MIRV";
      break;
    case "select_h_bomb":
      sliceId = "attack_Hydrogen Bomb";
      break;
    case "select_warship":
      sliceId = "attack_Warship";
      break;
    case "select_port":
      sliceId = "build_Port";
      break;
    case "select_silo":
      sliceId = "build_Missile Silo";
      break;
    case "select_sam":
      sliceId = "build_SAM Launcher";
      break;
    case "select_defense":
      sliceId = "build_Defense Post";
      break;
    case "select_city":
      sliceId = "build_City";
      break;
   case "select_factory":
      sliceId = "build_Factory";
      break;
    default:
      return; // unknown command
  }

  // Query the active tab, then send our message:
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs || tabs.length === 0) return;
    chrome.tabs.sendMessage(tabs[0].id, {
      action: "selectBuildItem",
      id: sliceId
    });
  });
});