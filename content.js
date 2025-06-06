// content.js
// ─────────────────────────────────────────────────────────────────────────────
// Injected on https://openfront.io/* at document_idle. It does two things:
//
// 1) Tracks the last mouse position so that when a build-shortcut fires, we know
//    where to simulate the right-click.
// 2) Listens for messages from background.js (action: "selectBuildItem") and
//    runs the “right-click → Build slice → specific build-item” flow, locating
//    the build-item by its visible name, not by index.
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// STEP 1: Track the last mouse position so we know where to right-click.
// ─────────────────────────────────────────────────────────────────────────────
document.addEventListener("mousemove", (e) => {
  window._lastMouseEvent = e;
});

// ─────────────────────────────────────────────────────────────────────────────
// STEP 2: Listen for messages from background.js. When action === "selectBuildItem",
//         call handleMenuSequence(itemName).
// ─────────────────────────────────────────────────────────────────────────────
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "selectBuildItem" && typeof request.name === "string") {
    handleMenuSequence(request.name);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// STEP 3: Main orchestrator — the 3-step flow for any build item named itemName:
//   1) Simulate right-click at the last mouse position → opens radial menu.
//   2) After ~300 ms, click the “Build” slice (path[data-name="build"]).
//   3) After ~300 ms, click the <button.build-button> whose
//      <span.build-name> exactly matches itemName, inside <build-menu>’s shadow DOM.
// ─────────────────────────────────────────────────────────────────────────────
function handleMenuSequence(itemName) {
  const mouseEvent = window._lastMouseEvent;
  if (!mouseEvent) {
    console.warn("⚠️ No mouse position available—move your cursor over the game first.");
    return;
  }

  // Step 1: Right-click at (x, y) to open the radial menu.
  simulateRightClickAt(mouseEvent.clientX, mouseEvent.clientY);

  // Step 2: Wait for the radial menu to fully render, then click “Build” slice.
  setTimeout(() => {
    clickGeneralMenuBuildEntry();

    // Step 3: Wait again for the build submenu to render, then click by name.
    setTimeout(() => {
      clickBuildItemInsideShadowDOM(itemName);
    }, 300); // ⏱ If build submenu is slow, bump to 500–700 ms.
  }, 300);   // ⏱ If radial menu is slow, bump to 500–700 ms.
}

/**
 * Simulates a right-click (mousedown → mouseup → contextmenu) at absolute coords (x, y).
 * Opens the game’s custom radial context menu at that spot.
 */
function simulateRightClickAt(x, y) {
  const el = document.elementFromPoint(x, y);
  if (!el) {
    console.warn(`⚠️ Could not find element at (${x}, ${y}) to right-click.`);
    return;
  }

  const opts = {
    bubbles: true,
    cancelable: true,
    clientX: x,
    clientY: y,
    buttons: 2 // “2” = right mouse button
  };

  el.dispatchEvent(new MouseEvent("mousedown",   opts));
  el.dispatchEvent(new MouseEvent("mouseup",     opts));
  el.dispatchEvent(new MouseEvent("contextmenu", opts));

  console.log(`✅ Simulated right-click at (${x}, ${y}).`);
}

/**
 * Finds and clicks the “Build” slice inside the radial menu:
 *   <path data-name="build"> within the SVG. Computes its center and fires
 *   a left-click there so the game registers “Build.”
 */
function clickGeneralMenuBuildEntry() {
  const buildPath = document.querySelector('path[data-name="build"]');
  if (!buildPath) {
    console.warn(`⚠️ Could not find <path data-name="build"> in the radial menu.`);
    return;
  }

  const rect = buildPath.getBoundingClientRect();
  const centerX = rect.left + rect.width  / 2;
  const centerY = rect.top  + rect.height / 2;

  simulateLeftClickAt(buildPath, centerX, centerY);
  console.log("✅ Clicked the radial menu’s Build slice.");
}

/**
 * Clicks the build-menu button whose <span class="build-name"> exactly matches itemName,
 * inside <build-menu>’s shadow DOM. If no match is found (or it’s disabled), logs a warning.
 *
 * Below are all possible build-menu items (order may change, but names remain constant):
 *   0: Atom Bomb
 *   1: MIRV
 *   2: Hydrogen Bomb
 *   3: Warship
 *   4: Port
 *   5: Missile Silo
 *   6: SAM Launcher
 *   7: Defense Post
 *   8: City
 *
 * @param {string} itemName  The exact visible text of <span class="build-name">, e.g. "Atom Bomb"
 */
function clickBuildItemInsideShadowDOM(itemName) {
  try {
    const buildMenuEl = document.querySelector("body > build-menu");
    if (!buildMenuEl || !buildMenuEl.shadowRoot) {
      console.warn("⚠️ <build-menu> or its shadowRoot not found.");
      return;
    }

    // Query all buttons under .build-row
    const buttons = buildMenuEl.shadowRoot.querySelectorAll(".build-row > button.build-button");
    if (!buttons.length) {
      console.warn("⚠️ No <button.build-button> elements found in <build-menu>.");
      return;
    }

    // Look for the first button whose <span.build-name> matches itemName exactly
    let foundButton = null;
    for (const btn of buttons) {
      const nameSpan = btn.querySelector(".build-name");
      if (nameSpan && nameSpan.textContent.trim() === itemName) {
        foundButton = btn;
        break;
      }
    }

    if (!foundButton) {
      console.warn(`⚠️ No build-menu item with name "${itemName}" found.`);
      return;
    }

    if (foundButton.disabled) {
      console.warn(`⚠️ "${itemName}" is disabled and cannot be clicked.`);
      return;
    }

    foundButton.click();
    console.log(`✅ Clicked build-menu item: "${itemName}".`);
  } catch (err) {
    console.error("❌ Error clicking build-menu item by name:", err);
  }
}

/**
 * Simulates a left-click (mousedown → mouseup → click) at absolute coords (x, y)
 * on the given target element. Passing both the element and the coords ensures
 * we “hit” its center.
 */
function simulateLeftClickAt(target, x, y) {
  const opts = {
    bubbles: true,
    cancelable: true,
    clientX: x,
    clientY: y,
    buttons: 1 // “1” = left mouse button
  };

  target.dispatchEvent(new MouseEvent("mousedown", opts));
  target.dispatchEvent(new MouseEvent("mouseup",   opts));
  target.dispatchEvent(new MouseEvent("click",     opts));
}