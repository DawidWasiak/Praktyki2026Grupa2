import { english, englishOne, englishTwo } from "./eng.js";
import { polish, polishOne, polishTwo } from "./pol.js";
import { programming } from "./exceptions.js";

let inputext = "";
let FinalResult = [];
let regexReview = [];
let regexVerified = false;
let checkReview = [];
let checkVerified = false;
let regexParts = [];
let regexMarked = [];
let checkParts = [];
let checkMarked = [];

const dropZone = document.getElementById("dropZone");
const browseButton = document.getElementById("browseButton");
const fileInput = document.getElementById("fileInput");
const textWindow = document.getElementById("textWindow");
const statusEl = document.getElementById("status");
const reviewPanel = document.createElement("div");

reviewPanel.id = "reviewPanel";
reviewPanel.hidden = true;
statusEl.after(reviewPanel);
Object.defineProperty(window, "inputext", {
    get: () => inputext
});
Object.defineProperty(window, "FinalResult", {
    get: () => FinalResult
});
Object.defineProperty(window, "regexReview", {
    get: () => regexReview
});
Object.defineProperty(window, "regexVerified", {
    get: () => regexVerified
});
Object.defineProperty(window, "checkReview", {
    get: () => checkReview
});
Object.defineProperty(window, "checkVerified", {
    get: () => checkVerified
});

const plTrigrams = new Set(polish.map(t => t.trigram));
const enTrigrams = new Set(english.map(t => t.trigram));
const shortWords = [...polishOne, ...polishTwo, ...englishOne, ...englishTwo];
const exceptions = programming.map(word => word.toUpperCase());
const fillers = /^(y+|e+|m+|mhm|yhm|no|znaczy|jakby|kurde|kurczę|wiesz|generalnie|uh+|um+|erm|ну|типу|короче)$/iu;
function showStatus(message, isError = false) {
    statusEl.textContent = message;
    statusEl.classList.toggle("error", isError);
}

function cleanSentences(text) {
    return text
        .split(/(?<=[.!?])\s+|\r?\n+/)
        .map(sentence => sentence.trim())
        .filter(sentence => sentence !== "");
}
function bareWord(part) {
    return part.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "");
}
function regexTest(word, previous) {
    if (fillers.test(word)) return "Wypełniacz";
    if (word.toLowerCase() === previous) return "Powtórzone słowo";
    if (/(\p{L})\1{2,}/u.test(word)) return "Rozciągnięte słowo";
    if (/\p{L}/u.test(word) && /\p{N}/u.test(word)) return "Litery z cyframi";
    if (/\p{Script=Latin}/u.test(word) && /\p{Script=Cyrillic}/u.test(word)) return "Dwa alfabety w jednym słowie";
    if (word.length >= 25) return "Za długie słowo";
    if (word.length >= 4 && !/[aeiouyąęóаеєиіїоуюяыэё]/iu.test(word)) return "Brak samogłosek";
    return "";
}
function checkTest(word) {
    const upper = word.toUpperCase();
    if (exceptions.includes(upper) || /\p{N}/u.test(upper)) return "";
    const approvedBefore = regexReview.find(item => item.approved && item.word.toUpperCase() === upper);
    if (approvedBefore) return "";
    if (upper.length <= 2) {
        return shortWords.includes(upper) ? "" : "Nieznane krótkie słowo";
    }
    let unknown = 0;
    let total = 0;
    for (let i = 0; i + 3 <= upper.length; i++) {
        const trigram = upper.slice(i, i + 3);
        if (!plTrigrams.has(trigram) && !enTrigrams.has(trigram)) unknown++;
        total++;
    }
    return unknown / total > 0.5 ? "Dziwne połączenia liter (n-gramy)" : "";
}
function findSuspicious(parts, test) {
    const list = [];
    const marked = [];
    let previous = "";
    for (let i = 0; i < parts.length; i += 2) {
        const word = bareWord(parts[i]);
        if (word === "") continue;
        const reason = test(word, previous);
        previous = word.toLowerCase();
        if (reason === "") continue;
        marked.push(i);
        let item = list.find(item => item.word.toLowerCase() === word.toLowerCase());
        if (!item) {
            item = { word: word, count: 0, reason: reason, approved: null };
            list.push(item);
        }
        item.count++;
    }
    return { list, marked };

}
function buildText(parts, marked, list) {
    const result = [...parts];
    for (const i of marked) {
        const word = bareWord(result[i]);
        const item = list.find(item => item.word.toLowerCase() === word.toLowerCase());
        if (item && item.approved === false) {
            result[i] = result[i].replace(word, "");
        }
    }

    return result
        .join("")
        .replace(/,(\s*,)+/g, ",")
        .replace(/ +([,.!?])/g, "$1")
        .replace(/[ \t]{2,}/g, " ")
        .replace(/^[ \t,]+/gm, "")
        .replace(/(^|[.!?]\s+)(\p{Ll})/gu, (match, before, letter) => before + letter.toUpperCase());
}
function showReview(title, list, onConfirm) {
    let rows = "";
    list.forEach((item, i) => {
        rows += `<tr>
            <td><input type="checkbox" data-i="${i}"></td>
            <td class="reviewWord">${item.word.replace(/</g, "&lt;")}</td>
            <td>${item.count}</td>
            <td>${item.reason}</td>
        </tr>`;
    });
    reviewPanel.innerHTML = `
        <h2>${title}</h2>
        <p class="reviewHint">Zaznacz słowa, które trzeba usunąć.</p>
        <table class="reviewTable">
            <tr><th>Usuń</th><th>Słowo</th><th>Ile</th><th>Dlaczego</th></tr>
            ${rows}
        </table>
        <button type="button" class="reviewNext">Zatwierdź</button>`;
    reviewPanel.hidden = false;
    reviewPanel.querySelector(".reviewNext").addEventListener("click", () => {
        reviewPanel.querySelectorAll("input[data-i]").forEach(box => {
            list[box.dataset.i].approved = !box.checked;
        });
        reviewPanel.hidden = true;
        reviewPanel.innerHTML = "";
        onConfirm();
    });
}
function startRegex(text) {
    regexVerified = false;
    checkVerified = false;
    regexParts = text.split(/(\s+)/);
    const found = findSuspicious(regexParts, regexTest);
    regexReview = found.list;
    regexMarked = found.marked;
    console.log("Regex - do sprawdzenia:", regexReview);
    if (regexReview.length === 0) {
        confirmRegex();
        return;
    }
    showStatus("Krok 1: sprawdź słowa znalezione przez regex");
    showReview("Krok 1 - regex", regexReview, confirmRegex);
}
function confirmRegex() {
    regexVerified = true;
    if (regexVerified) {
        const text = buildText(regexParts, regexMarked, regexReview);
        textWindow.value = text;
        console.log("Tekst po regex:", text);
        startCheck(text);
    }
}
function startCheck(text) {
    checkVerified = false;
    checkParts = text.split(/(\s+)/);
    const found = findSuspicious(checkParts, checkTest);
    checkReview = found.list;
    checkMarked = found.marked;
    console.log("Check - do sprawdzenia:", checkReview);
    if (checkReview.length === 0) {
        confirmCheck();
        return;
    }
    showStatus("Krok 2: sprawdź słowa znalezione przez check()");
    showReview("Krok 2 - check()", checkReview, confirmCheck);
}
async function confirmCheck() {
    checkVerified = true;
    if (regexVerified && checkVerified) {
        const text = buildText(checkParts, checkMarked, checkReview);
        textWindow.value = text;
        console.log("Tekst po check:", text);
        FinalResult = cleanSentences(text);
        console.log(
            "Sentences sent to PHP:",
            JSON.stringify(FinalResult, null, 2)
        );
        await sendToPHP(FinalResult);
    }
}

async function importFile(file) {
    if (!file) {
        showStatus("Nie wybrano pliku", true);
        return;
    }
    const name = file.name.toLowerCase();
    if (!name.endsWith(".txt") && file.type !== "text/plain") {
        showStatus("Można wczytać tylko plik TXT", true);
        return;
    }
    try {
        inputext = await file.text();
        if (inputext.trim() === "") {
            showStatus("Plik jest pusty", true);
            return;
        }
        textWindow.value = inputext;
        console.log("Original text:", inputext);
        showStatus("Plik wczytany: " + file.name);
        startRegex(inputext);
    } catch (error) {
        console.log("Import error:", error);
        showStatus("Nie udało się wczytać pliku", true);
    }
}

async function sendToPHP(sentences) {
    try {
        showStatus("Trwa analiza tekstu...");
        const response = await fetch("przetwarzanie.php", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                sentences: sentences
            })
        });
        const responseText = await response.text();
        console.log("PHP HTTP status:", response.status);
        console.log("PHP response:", responseText);
        if (!response.ok) {
            throw new Error(
                "HTTP " + response.status + ": " + responseText
            );
        }
        const data = JSON.parse(responseText);
        if (!data.success) {
            throw new Error(
                data.error || "Analiza zakończyła się błędem"
            );
        }
        console.log("Analysis result:", data);
        console.log(
            JSON.stringify(data.tasks, null, 2)
        );
        showStatus("Analiza zakończona pomyślnie");
    } catch (error) {
        console.error("PHP error:", error);
        showStatus("Błąd: " + error.message, true);
    }
}

browseButton.addEventListener("click", () => {
    fileInput.click();
});
fileInput.addEventListener("change", () => {
    const file = fileInput.files[0];
    importFile(file);
    fileInput.value = "";
});
dropZone.addEventListener("dragover", event => {
    event.preventDefault();
    dropZone.classList.add("dragover");
});
dropZone.addEventListener("dragleave", () => {
    dropZone.classList.remove("dragover");
});
dropZone.addEventListener("drop", event => {
    event.preventDefault();
    dropZone.classList.remove("dragover");
    const file = event.dataTransfer.files[0];
    importFile(file);
});
window.addEventListener("dragover", event => {
    event.preventDefault();
});
window.addEventListener("drop", event => {
    event.preventDefault();
});