// content.js
// ─────────────────────────────────────────────────────────────────────────────
// Injected on https://openfront.io/* at document_idle. It does two things:
//
// 1) Tracks the last mouse position so that when a build-shortcut fires, we know
//    where to simulate the right-click.
// 2) Listens for messages from background.js (action: "selectBuildItem", id: "...")
//    and runs the “right-click → Build slice → second-level slice” flow.
// ─────────────────────────────────────────────────────────────────────────────
function disableMenuAnimations() {
  document
    .querySelectorAll(".menu-container *")
    .forEach(el => {
      el.style.transition = "none";
      el.style.animation  = "none";
    });
}

// STEP 1: Track the last mouse position so we know where to right-click.
document.addEventListener("mousemove", e => {
  window._lastMouseEvent = e;
});

// STEP 2: Listen for messages from background.js.
// If we get { action: "selectBuildItem", id: "<data-id>" }, run the flow:
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "selectBuildItem" && typeof request.id === "string") {
   if (busy) {
      console.warn("⚠️ Build command ignored because another is still in progress.");
      return;
    }
      busy = true;
    handleMenuSequence(request.id);
  }
});

let busy = false;
// STEP 3: Orchestrator — right-click, click “Build”, then click the requested slice.
function handleMenuSequence(sliceId) {
  const mouseEvent = window._lastMouseEvent;
  if (!mouseEvent) {
    console.warn("⚠️ No mouse position available—move your cursor over the game first.");
    return;
  }
  //todo:optimize
  disableMenuAnimations();
  const centerBtn = document.querySelector('.menu-container .center-button');
  if (centerBtn) centerBtn.remove();
  // 1) Open the radial menu
  simulateRightClickAt(mouseEvent.clientX, mouseEvent.clientY);

  // 2) Wait ~300ms for it to render, then click the “Build” slice
  setTimeout(() => {
    clickGeneralMenuBuildEntry();

    // 3) Wait another ~300ms, then click the second-level slice by data-id
    setTimeout(() => {
      clickSecondLevelSlice(sliceId);
    }, 400);
  }, 400);
}

/**
 * Simulates a right-click (mousedown → mouseup → contextmenu) at absolute coords (x, y).
 */
function simulateRightClickAt(x, y) {
  const el = document.elementFromPoint(x, y);
  if (!el) {
    console.warn(`⚠️ Could not find element at (${x}, ${y}) to right-click.`);
    return;
  }
  const opts = { bubbles: true, cancelable: true, clientX: x, clientY: y, buttons: 2 };
  el.dispatchEvent(new MouseEvent("mousedown", opts));
  el.dispatchEvent(new MouseEvent("mouseup",   opts));
  el.dispatchEvent(new MouseEvent("contextmenu", opts));
  console.log(`✅ Simulated right-click at (${x}, ${y}).`);
}

/**
 * Finds and clicks the “Build” slice inside the radial menu:
 *   path.menu-item-path[data-id="build"]
 */
function clickGeneralMenuBuildEntry() {
  const buildAttackPath = document.querySelector('path.menu-item-path[data-id="attack"]');
  var buildPath = document.querySelector('path.menu-item-path[data-id="build"]');
  if (!buildPath) {
     buildPath = buildAttackPath
  }
   if (!buildPath) {
    console.warn(`⚠️ Could not find <path data-id="build"> in the radial menu.`);
    return;
  }
  const rect = buildPath.getBoundingClientRect();
  const cx = rect.left + rect.width  / 2;
  const cy = rect.top  + rect.height / 2;
  simulateLeftClickAt(buildPath, cx, cy);
  console.log("✅ Clicked the radial menu’s Build slice.");
}

/**
 * Clicks the second-level slice in the radial menu matching data-id="{{sliceId}}"
 * e.g. "build_Atom Bomb", "build_City", etc. Retries up to ~10 times if not yet present.
 */
function clickSecondLevelSlice(sliceId) {
  const selector = `path.menu-item-path[data-id="${sliceId}"]`;
  let attempts = 0;
  const maxAttempts = 10;
  const attemptClick = () => {
    const slice = document.querySelector(selector);
    if (slice) {
      const rect = slice.getBoundingClientRect();
      const cx = rect.left + rect.width  / 2;
      const cy = rect.top  + rect.height / 2;
      simulateLeftClickAt(slice, cx, cy);
      console.log(`✅ Clicked radial slice: "${sliceId}".`);
    } else if (attempts < maxAttempts) {
      attempts++;
      setTimeout(attemptClick, 200);
    } else {
      console.warn(`⚠️ No radial slice found for "${sliceId}" after ${attempts} attempts (selector: ${selector}).`);
    }
  };
  attemptClick();
}

/**
 * Simulates a left-click (mousedown → mouseup → click) at absolute coords (x, y)
 * on the given target element.
 */
function simulateLeftClickAt(target, x, y) {
  const opts = { bubbles: true, cancelable: true, clientX: x, clientY: y, buttons: 1 };
  target.dispatchEvent(new MouseEvent("mousedown", opts));
  target.dispatchEvent(new MouseEvent("mouseup",   opts));
  target.dispatchEvent(new MouseEvent("click",     opts));
}