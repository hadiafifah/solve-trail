function readLeetCodeEditor() {
  const slug = location.pathname.match(/^\/problems\/([^/]+)/)?.[1];

  if (!slug) {
    return { error: "This is not a LeetCode problem page." };
  }

  const normalizeTitle = (value) =>
    value?.replace(/\s*[-|]\s*LeetCode.*$/i, "").trim();

  const heading = document
    .querySelector('[data-cy="question-title"]')
    ?.textContent?.trim();

  const problemLink = [...document.querySelectorAll('a[href^="/problems/"]')]
    .find((link) => {
      const path = new URL(link.href, location.origin).pathname.replace(/\/$/, "");
      return path === `/problems/${slug}`;
    })
    ?.textContent?.trim();

  const metadataTitle = document
    .querySelector('meta[property="og:title"]')
    ?.getAttribute("content");

  const title =
    normalizeTitle(heading) ||
    normalizeTitle(problemLink) ||
    normalizeTitle(metadataTitle) ||
    normalizeTitle(document.title) ||
    slug;

  const monacoApi = globalThis.monaco;
  const editors = monacoApi?.editor?.getEditors?.() ?? [];

  // Prefer the currently visible editor.
  const editor =
    editors.find((candidate) => {
      const node = candidate.getDomNode?.();
      return node && node.offsetParent !== null;
    }) ?? editors[0];

  const model =
    editor?.getModel?.() ??
    monacoApi?.editor
      ?.getModels?.()
      .find((candidate) => candidate.isAttachedToEditor?.());

  if (!model) {
    return {
      slug,
      title,
      error: "The editor is still loading or its model is unavailable.",
    };
  }

  return {
    slug,
    title,
    code: model.getValue(),
    language: model.getLanguageId?.() ?? "unknown",
  };
}

async function loadProblem() {
  const problemElement = document.querySelector("#problem");
  const statusElement = document.querySelector("#status");
  const solutionElement = document.querySelector("#solution");
  const codeElement = document.querySelector("#code");

  try {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });

    if (!tab?.id || !tab.url?.startsWith("https://leetcode.com/problems/")) {
      problemElement.textContent = "Open a LeetCode problem first.";
      return;
    }

    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      world: "MAIN",
      func: readLeetCodeEditor,
    });

    problemElement.textContent = result?.title
      ? `Problem: ${result.title}`
      : "LeetCode problem";

    if (!result?.code) {
      statusElement.textContent =
        result?.error ?? "Could not read the editor.";
      return;
    }

    statusElement.textContent = `Language: ${result.language}`;
    codeElement.textContent = result.code;
    solutionElement.hidden = false;
  } catch (error) {
    statusElement.textContent = `Could not capture code: ${error.message}`;
  }
}

loadProblem();
