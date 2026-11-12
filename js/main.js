const themeStorageKey = "portfolio-theme";
const root = document.documentElement;
const validThemes = ["dark", "light"];
const entryBoxSelector = ".hero, .intro, .accounts-section, .account-card, " +
    ".contact-section, .contact-item, .about-content, .education-block, " +
    ".projects-content, .project-card, .intro .btn-cv";

function readSavedTheme() {
    try {
        const savedTheme = localStorage.getItem(themeStorageKey);
        return validThemes.includes(savedTheme) ? savedTheme : null;
    } catch (error) {
        console.warn("Could not read the saved portfolio theme.", error);
        return null;
    }
}

const savedTheme = readSavedTheme();
if (savedTheme) {
    root.dataset.theme = savedTheme;
}

function getCurrentTheme() {
    return root.dataset.theme ||
        (window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark");
}

function updateThemeButton(button, theme) {
    const nextTheme = theme === "dark" ? "light" : "dark";
    const label = `${nextTheme === "light" ? "Light" : "Dark"} mode`;
    const characters = Array.from(label);
    if (button.children.length === characters.length) {
        Array.from(button.children).forEach((span, index) => {
            span.textContent = characters[index];
        });
    } else {
        button.replaceChildren(...characters.map((character) => {
            const span = document.createElement("span");
            span.className = "wave-char";
            span.textContent = character;
            span.setAttribute("aria-hidden", "true");
            return span;
        }));
    }
    button.setAttribute("aria-label", `Switch to ${nextTheme} theme`);
    button.setAttribute("aria-pressed", String(theme === "light"));
}

function setupWaveNavigationText() {
    document.querySelectorAll(".navbar-nav .nav-link").forEach((link) => {
        const label = link.textContent;
        link.setAttribute("aria-label", label);
        link.replaceChildren(...Array.from(label, (character) => {
            const span = document.createElement("span");
            span.className = "wave-char";
            span.textContent = character;
            return span;
        }));
    });
}

function setupThemeToggle() {
    const button = document.querySelector("#theme-toggle");
    if (!button) return;

    updateThemeButton(button, getCurrentTheme());
    button.addEventListener("click", () => {
        const theme = getCurrentTheme() === "dark" ? "light" : "dark";
        root.dataset.theme = theme;
        updateThemeButton(button, theme);

        try {
            localStorage.setItem(themeStorageKey, theme);
        } catch (error) {
            console.warn("Could not save the portfolio theme preference.", error);
        }
    });

    window.matchMedia("(prefers-color-scheme: light)").addEventListener("change", () => {
        if (!root.dataset.theme) {
            updateThemeButton(button, getCurrentTheme());
        }
    });
}

function setupBrandAnimation() {
    const brandChars = document.querySelectorAll(".brand-char");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    if (!brandChars.length || reducedMotion.matches) {
        return;
    }

    const canInteract = window.matchMedia("(hover: hover)").matches;
    let pointerX = -Infinity;
    let pointerY = -Infinity;
    let animationFrameId = null;
    let waveStartedAt = 0;
    let waveTargets = [];
    let currentOffsets = new Map();
    let waveDuration = 0;
    const pointerTargets = new Map(Array.from(brandChars, (char) => [char, 0]));

    function refreshWaveTargets() {
        const navigationChars = document.querySelectorAll(".navbar-nav .wave-char, .theme-toggle .wave-char");
        waveTargets = [
            ...Array.from(brandChars, (element, index) => ({ element, delay: index * 55 })),
            ...Array.from(navigationChars, (element, index) => ({
                element,
                delay: brandChars.length * 55 + 500 + index * 55
            }))
        ];
        currentOffsets = new Map(waveTargets.map(({ element }) => [
            element,
            currentOffsets.get(element) || 0
        ]));
        waveDuration = Math.max(...waveTargets.map((target) => target.delay + 500));
    }

    refreshWaveTargets();

    function animateBrand() {
        let stillMoving = false;
        const now = performance.now();
        const waveElapsed = waveStartedAt ? now - waveStartedAt : waveDuration;
        const waveActive = waveElapsed < waveDuration;

        brandChars.forEach((char) => {
            const rect = char.getBoundingClientRect();
            const distanceX = pointerX - (rect.left + rect.width / 2);
            const distanceY = pointerY - (rect.top + rect.height / 2 - currentOffsets.get(char));
            const isNearby = Math.abs(distanceX) <= rect.width * 1.2 &&
                Math.abs(distanceY) <= rect.height * 0.8;
            const pointerTarget = pointerTargets.get(char);
            const remainsNearby = pointerTarget !== 0 &&
                Math.abs(distanceX) <= rect.width * 1.8 &&
                Math.abs(distanceY) <= rect.height * 1.6;

            if (isNearby && pointerTarget === 0) {
                const direction = Math.abs(distanceY) <= rect.height * 0.15
                    ? (Math.random() < 0.5 ? -1 : 1)
                    : distanceY < 0 ? 1 : -1;
                pointerTargets.set(char, direction * 15);
            } else if (!remainsNearby && !isNearby) {
                pointerTargets.set(char, 0);
            }
        });

        waveTargets.forEach(({ element, delay }) => {
            const waveProgress = (waveElapsed - delay) / 500;
            const waveOffset = waveActive && waveProgress >= 0 && waveProgress <= 1
                ? -Math.sin(waveProgress * Math.PI) * 11
                : 0;
            const pointerTarget = pointerTargets.get(element) || 0;
            const combinedTarget = pointerTarget + waveOffset;
            const offset = currentOffsets.get(element) +
                (combinedTarget - currentOffsets.get(element)) * 0.16;

            currentOffsets.set(element, offset);
            element.style.transform = `translate3d(0, ${offset}px, 0)`;
            stillMoving ||= Math.abs(combinedTarget - offset) > 0.1;
        });

        animationFrameId = stillMoving || waveActive ? requestAnimationFrame(animateBrand) : null;
    }

    function requestBrandFrame() {
        if (animationFrameId === null) {
            animationFrameId = requestAnimationFrame(animateBrand);
        }
    }

    document.querySelector("#theme-toggle")?.addEventListener("click", () => {
        refreshWaveTargets();
        requestBrandFrame();
    });

    if (canInteract) {
        document.addEventListener("pointermove", (event) => {
            if (event.pointerType === "touch") return;
            pointerX = event.clientX;
            pointerY = event.clientY;
            requestBrandFrame();
        });

        function resetPointer() {
            pointerX = -Infinity;
            pointerY = -Infinity;
            requestBrandFrame();
        }

        document.addEventListener("pointerout", (event) => {
            if (!event.relatedTarget) resetPointer();
        });
        window.addEventListener("blur", resetPointer);
    }

    window.setInterval(() => {
        refreshWaveTargets();
        waveStartedAt = performance.now();
        requestBrandFrame();
    }, 10000);
}

function setupCyberWall() {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const columnCount = Math.max(8, Math.floor(window.innerWidth / 76));
    const wall = document.createElement("div");
    wall.className = "cyber-wall";
    wall.setAttribute("aria-hidden", "true");
    wall.inert = true;

    for (let index = 0; index < columnCount; index += 1) {
        const column = document.createElement("span");
        const glyphs = Array.from({ length: 44 }, () => {
            const symbols = "010101001011{}[]<>/+=";
            return symbols[Math.floor(Math.random() * symbols.length)];
        });

        column.className = "matrix-column";
        column.textContent = glyphs.join("\n");
        column.style.setProperty("--matrix-left", `${(index / columnCount) * 100}%`);
        column.style.setProperty("--matrix-start", `${-Math.random() * 95}vh`);
        column.style.setProperty("--matrix-duration", `${24 + Math.random() * 18}s`);
        column.style.setProperty("--matrix-delay", `${-Math.random() * 30}s`);
        wall.append(column);
    }

    document.body.prepend(wall);
}

function playBoxEntry(element) {
    return new Promise((resolve) => {
        let timeoutId;
        const finish = () => {
            window.clearTimeout(timeoutId);
            element.removeEventListener("animationend", finish);
            element.classList.remove("terminal-box-entry");
            resolve();
        };

        element.classList.remove("terminal-box-pending");
        element.classList.add("terminal-box-entry");
        element.addEventListener("animationend", finish, { once: true });
        timeoutId = window.setTimeout(finish, 500);
    });
}

function prepareTextNodes(element) {
    for (const child of Array.from(element.childNodes)) {
        if (child.nodeType === Node.TEXT_NODE) {
            if (!child.textContent.trim()) continue;

            const characters = typeof Intl.Segmenter === "function"
                ? Array.from(new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(child.textContent), part => part.segment)
                : Array.from(child.textContent);
            const group = document.createElement("span");
            group.className = "terminal-text-group";

            characters.forEach((character) => {
                const span = document.createElement("span");
                span.className = "terminal-character";
                span.textContent = character;
                group.append(span);
            });

            child.replaceWith(group);
        } else if (child.nodeType === Node.ELEMENT_NODE) {
            prepareTextNodes(child);
        }
    }
}

function revealTextGroup(group) {
    const characters = Array.from(group.children);
    if (!characters.length) return Promise.resolve();

    const styles = getComputedStyle(root);
    const characterStep = parseFloat(styles.getPropertyValue("--terminal-character-step")) || 6;
    const characterDuration = parseFloat(styles.getPropertyValue("--terminal-character-duration")) || 55;
    characters.forEach((character, index) => {
        character.style.setProperty("--character-delay", `${index * characterStep}ms`);
        character.classList.add("terminal-character-active");

        if (index % 24 === 0) {
            window.setTimeout(() => {
                if (!followRevealingText) return;
                const rect = character.getBoundingClientRect();
                const bottomMargin = 72;
                if (rect.bottom > window.innerHeight - bottomMargin) {
                    scrollForRevealedText(rect.bottom - (window.innerHeight - bottomMargin));
                }
            }, index * characterStep);
        }
    });

    return new Promise((resolve) => {
        const finish = () => {
            characters.forEach((character) => {
                character.classList.add("terminal-character-revealed");
                character.classList.remove("terminal-character", "terminal-character-active");
                character.style.removeProperty("--character-delay");
            });
            group.classList.remove("terminal-text-group");
            resolve();
        };

        const timeout = window.setTimeout(
            finish,
            (characters.length - 1) * characterStep + characterDuration + 20
        );
        characters.at(-1).addEventListener("animationend", () => {
            window.clearTimeout(timeout);
            finish();
        }, { once: true });
    });
}

async function revealInOrder(element) {
    if (element.nodeType !== Node.ELEMENT_NODE) return;

    const currentElement = element;
    if (currentElement.classList.contains("terminal-text-group")) {
        await revealTextGroup(currentElement);
        return;
    }

    if (currentElement.matches(entryBoxSelector)) {
        await playBoxEntry(currentElement);
    }

    for (const child of Array.from(currentElement.childNodes)) {
        await revealInOrder(child);
    }
}

let followRevealingText = true;
let automaticScrollTimer;

function stopFollowingRevealedText() {
    followRevealingText = false;
}

function scrollForRevealedText(distance) {
    if (!followRevealingText || distance <= 0) return;

    window.clearTimeout(automaticScrollTimer);
    document.documentElement.dataset.autoScrolling = "true";
    window.scrollBy({ top: distance, behavior: "instant" });
    automaticScrollTimer = window.setTimeout(() => {
        delete document.documentElement.dataset.autoScrolling;
    }, 100);
}

function setupRevealAutoScroll() {
    window.addEventListener("wheel", stopFollowingRevealedText, { passive: true });
    window.addEventListener("touchstart", stopFollowingRevealedText, { passive: true });
    window.addEventListener("touchmove", stopFollowingRevealedText, { passive: true });
    window.addEventListener("keydown", (event) => {
        if (["ArrowDown", "ArrowUp", "PageDown", "PageUp", "Home", "End", " "].includes(event.key)) {
            stopFollowingRevealedText();
        }
    });
    window.addEventListener("scroll", () => {
        if (document.documentElement.dataset.autoScrolling !== "true") {
            stopFollowingRevealedText();
        }
    }, { passive: true });
    window.addEventListener("pointerdown", (event) => {
        if (event.clientX >= document.documentElement.clientWidth - 16) {
            stopFollowingRevealedText();
        }
    }, { passive: true });
}

function createSshTerminal() {
    const overlay = document.createElement("div");
    const terminal = document.createElement("div");
    const prompt = document.createElement("span");
    const spinner = document.createElement("span");
    const connecting = document.createElement("p");
    const authenticating = document.createElement("p");
    const connected = document.createElement("p");

    overlay.className = "page-transition";
    overlay.setAttribute("aria-hidden", "true");
    overlay.inert = true;
    terminal.className = "transition-terminal";
    prompt.className = "transition-prompt";
    spinner.className = "transition-spinner";
    spinner.setAttribute("aria-hidden", "true");
    connecting.className = "transition-status transition-connecting";
    authenticating.className = "transition-status transition-authenticating";
    connected.className = "transition-status transition-connected";
    prompt.textContent = "william@local:~$ ssh portfolio";
    prompt.style.setProperty("--terminal-steps", prompt.textContent.length);
    connecting.append(spinner, document.createTextNode(" Connecting to remote host..."));
    authenticating.textContent = "Authenticating credentials...";
    connected.textContent = "Connection established. Loading interface...";
    terminal.append(prompt, connecting, authenticating, connected);
    overlay.append(terminal);
    document.body.append(overlay);
    return overlay;
}

async function setupPageEntry() {
    const main = document.querySelector("main");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const isHomePage = /\/home\/?$/.test(window.location.pathname);

    if (reducedMotion) return;
    prepareTextNodes(main);
    main.querySelectorAll(entryBoxSelector).forEach((box) => {
        box.classList.add("terminal-box-pending");
    });

    if (isHomePage) {
        const terminal = createSshTerminal();
        await new Promise(resolve => window.setTimeout(resolve, 4000));
        terminal.remove();
    }

    for (const section of Array.from(main.children)) {
        await revealInOrder(section);
    }
}

document.addEventListener("DOMContentLoaded", () => {
    setupThemeToggle();
    setupWaveNavigationText();
    setupBrandAnimation();
    setupCyberWall();
    setupRevealAutoScroll();
    setupPageEntry();
});
