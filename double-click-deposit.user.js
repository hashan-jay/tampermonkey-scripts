// ==UserScript==
// @name         Deposit Copy to Sheet
// @namespace    deposit-copy-to-sheet
// @version      2.3
// @description  Copy a deposit row from any site. Press ` on a Google Sheet to paste values (or Ctrl+V).
// @match        *://*/*
// @match        https://docs.google.com/spreadsheets/*
// @run-at       document-idle
// @inject-into  auto
// @grant        GM_setClipboard
// @grant        GM.setClipboard
// @grant        GM_setValue
// @grant        GM_getValue
// ==/UserScript==

(function () {
    'use strict';

    const STORAGE_KEY = 'pendingSheetRow_depositCopy';
    const LEGACY_STORAGE_KEYS = [
        STORAGE_KEY,
        'pendingSheetRow_kaboom77_jkkbm77',
        'pendingSheetRow'
    ];

    function writeClipboard(text) {
        try {
            if (typeof GM_setClipboard === 'function') {
                GM_setClipboard(text);
            }
        } catch (error) {}

        try {
            if (typeof GM !== 'undefined' && GM.setClipboard) {
                GM.setClipboard(text);
            }
        } catch (error) {}

        try {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(text);
            }
        } catch (error) {}
    }

    function readStoredRow() {
        for (let i = 0; i < LEGACY_STORAGE_KEYS.length; i++) {
            try {
                const value = GM_getValue(LEGACY_STORAGE_KEYS[i], '');
                if (value && String(value).trim()) {
                    return String(value).trim();
                }
            } catch (error) {}
        }

        return '';
    }

    function isGoogleSheets() {
        return (
            location.hostname === 'docs.google.com' &&
            location.pathname.indexOf('/spreadsheets/') === 0
        );
    }

    function isBacktick(event) {
        return event.key === '`' || event.code === 'Backquote';
    }

    function showSheetToast(message, ok) {
        const old = document.getElementById('kaboom-sheet-toast');
        if (old) {
            old.remove();
        }

        const toast = document.createElement('div');
        toast.id = 'kaboom-sheet-toast';
        toast.textContent = message;
        toast.style.position = 'fixed';
        toast.style.top = '16px';
        toast.style.right = '16px';
        toast.style.zIndex = '2147483647';
        toast.style.padding = '10px 14px';
        toast.style.borderRadius = '6px';
        toast.style.font = 'bold 14px Arial, sans-serif';
        toast.style.color = '#fff';
        toast.style.background = ok ? '#188038' : '#c5221f';
        toast.style.boxShadow = '0 2px 8px rgba(0,0,0,.25)';
        document.body.appendChild(toast);

        setTimeout(function () {
            toast.remove();
        }, 1600);
    }

    function dispatchPaste(win, target, text) {
        if (!target) {
            return false;
        }

        const ClipboardEventCtor = win.ClipboardEvent || ClipboardEvent;
        const DataTransferCtor = win.DataTransfer || DataTransfer;

        try {
            const data = new DataTransferCtor();
            data.setData('text/plain', text);

            if (typeof target.focus === 'function') {
                target.focus();
            }

            target.dispatchEvent(
                new ClipboardEventCtor('paste', {
                    bubbles: true,
                    cancelable: true,
                    clipboardData: data
                })
            );

            return true;
        } catch (error) {
            return false;
        }
    }

    function getSheetEditor() {
        return document.querySelector(
            'iframe.docs-texteventtarget-iframe, .docs-texteventtarget-iframe'
        );
    }

    function focusSheetEditor() {
        const nameBox = document.querySelector(
            '#t-name-box input, input#t-name-box'
        );
        if (nameBox) {
            nameBox.blur();
        }

        const iframe = getSheetEditor();
        if (!iframe) {
            return null;
        }

        try {
            iframe.focus();
        } catch (error) {}

        const frameDoc =
            iframe.contentDocument ||
            (iframe.contentWindow && iframe.contentWindow.document);

        if (frameDoc && frameDoc.body) {
            try {
                frameDoc.body.focus();
            } catch (error) {}
        }

        return iframe;
    }

    function tryExecPaste(doc) {
        try {
            return !!(doc && doc.execCommand && doc.execCommand('paste'));
        } catch (error) {
            return false;
        }
    }

    function clickEditPaste() {
        const edit = document.getElementById('docs-edit-menu');
        if (!edit) {
            return false;
        }

        edit.dispatchEvent(
            new MouseEvent('mousedown', { bubbles: true, cancelable: true })
        );
        edit.click();

        setTimeout(function () {
            const items = document.querySelectorAll(
                '.goog-menuitem, [role="menuitem"]'
            );

            for (let i = 0; i < items.length; i++) {
                const label = (items[i].textContent || '')
                    .replace(/\s+/g, ' ')
                    .trim();

                if (
                    label === 'Paste' ||
                    (/^Paste\b/i.test(label) &&
                        !/special|values only|format|transpos|row|column/i.test(
                            label
                        ))
                ) {
                    items[i].dispatchEvent(
                        new MouseEvent('mousedown', { bubbles: true })
                    );
                    items[i].click();
                    return;
                }
            }
        }, 60);

        return true;
    }

    function pasteIntoGoogleSheet(text) {
        writeClipboard(text);

        const iframe = focusSheetEditor();
        const frameWin = iframe && iframe.contentWindow;
        const frameDoc =
            iframe &&
            (iframe.contentDocument || (frameWin && frameWin.document));
        const editable =
            frameDoc &&
            frameDoc.querySelector(
                '[contenteditable="true"], [contenteditable=""]'
            );

        const cellInput = document.querySelector('.cell-input');
        let pasted = false;

        pasted = tryExecPaste(document) || pasted;
        if (frameDoc) {
            pasted = tryExecPaste(frameDoc) || pasted;
        }

        pasted = dispatchPaste(window, cellInput, text) || pasted;
        pasted =
            dispatchPaste(window, document.activeElement, text) || pasted;

        if (frameWin && editable) {
            pasted = dispatchPaste(frameWin, editable, text) || pasted;
        }

        if (frameDoc) {
            pasted = dispatchPaste(frameWin, frameDoc.body, text) || pasted;
        }

        clickEditPaste();
        return pasted;
    }

    function bindSheetsShortcut() {
        function finishPaste(text) {
            const row = (text || '').trim();
            if (!row) {
                showSheetToast(
                    'Nothing to paste. Press ` on a deposit first.',
                    false
                );
                return;
            }

            writeClipboard(row);

            function runPaste() {
                pasteIntoGoogleSheet(row);
                showSheetToast('Pasted. If empty, press Ctrl+V', true);
            }

            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(row).then(runPaste).catch(runPaste);
                return;
            }

            runPaste();
        }

        function onSheetsKey(event) {
            if (!isBacktick(event)) {
                return;
            }

            event.preventDefault();
            event.stopPropagation();
            event.stopImmediatePropagation();

            const stored = readStoredRow();
            if (stored) {
                finishPaste(stored);
                return;
            }

            if (navigator.clipboard && navigator.clipboard.readText) {
                navigator.clipboard.readText().then(finishPaste).catch(function () {
                    finishPaste('');
                });
                return;
            }

            finishPaste('');
        }

        function bindDoc(doc) {
            if (!doc || doc.__depositCopyPasteBound) {
                return;
            }

            doc.__depositCopyPasteBound = true;
            doc.addEventListener('keydown', onSheetsKey, true);
        }

        function bindIframes() {
            const iframes = document.querySelectorAll('iframe');
            for (let i = 0; i < iframes.length; i++) {
                try {
                    bindDoc(
                        iframes[i].contentDocument ||
                            (iframes[i].contentWindow &&
                                iframes[i].contentWindow.document)
                    );
                } catch (error) {}
            }
        }

        bindDoc(document);
        bindDoc(window.document);
        bindIframes();

        const observer = new MutationObserver(bindIframes);
        observer.observe(document.documentElement, {
            childList: true,
            subtree: true
        });

        setInterval(bindIframes, 1000);
    }

    if (isGoogleSheets()) {
        bindSheetsShortcut();
        return;
    }

    let lastCard = null;

    function showCopied(el) {
        if (!el) {
            return;
        }

        const tag = document.createElement('span');
        tag.innerText = ' COPIED';
        tag.style.color = 'red';
        tag.style.fontWeight = 'bold';
        tag.style.marginLeft = '4px';
        el.appendChild(tag);

        setTimeout(function () {
            tag.remove();
        }, 1200);
    }

    function cardText(card) {
        return (card && (card.innerText || card.textContent)) || '';
    }

    function isDepositCard(text) {
        const value = String(text || '');
        const hasAmount = /Amount\s*:/i.test(value);
        const hasDate =
            /Datetime\s*:/i.test(value) ||
            /Date\s*time\s*:/i.test(value) ||
            /Created\s*:/i.test(value);
        const hasPerson =
            /Username\s*:/i.test(value) ||
            /Bank Account Name\s*:/i.test(value) ||
            /Name\s*:/i.test(value);

        return /DEPOSIT/i.test(value) && hasAmount && hasDate && hasPerson;
    }

    function findCard(start) {
        let el = start;

        for (let i = 0; i < 25 && el; i++, el = el.parentElement) {
            if (isDepositCard(cardText(el))) {
                return el;
            }
        }

        return null;
    }

    function saveRow(text) {
        try {
            if (typeof GM_setValue === 'function') {
                GM_setValue(STORAGE_KEY, text);
            }
        } catch (error) {}
    }

    function valueAfterLabel(text, label) {
        const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const match = text.match(
            new RegExp('(?:^|\\n)\\s*' + escaped + '\\s*:\\s*([^\\n]+)', 'i')
        );

        return match ? match[1].trim() : '';
    }

    const COMPANY_LINE = /^(KABOOM(?:77)?VIP[A-Z0-9]*|KABOOM77|PASHMETH|HOLSPIN)$/i;

    function findCompanyOwner(card, text) {
        const parts = [text || ''];

        if (card && card.querySelectorAll) {
            const nodes = card.querySelectorAll('span, div, label, b, strong, a, p');
            for (let i = 0; i < nodes.length; i++) {
                parts.push(nodes[i].innerText || nodes[i].textContent || '');
            }
        }

        const haystack = parts.join(' ');

        if (/KABOOM77|KABOOM(?:77)?VIP/i.test(haystack)) {
            return 'KABOOM77';
        }
        if (/PASHMETH/i.test(haystack)) {
            return 'PASHMETH';
        }
        if (/HOLSPIN/i.test(haystack)) {
            return 'HOLSPIN';
        }

        return '';
    }

    function cleanPersonName(value) {
        let name = String(value || '');
        name = name.replace(/KABOOM(?:77)?VIP[A-Z0-9]*/gi, ' ');
        name = name.replace(/\b(?:KABOOM77|PASHMETH|HOLSPIN)\b/gi, ' ');
        name = name.replace(/\bDEPOSIT\b/gi, ' ');
        name = name.split(
            /(?:Username|Mobile|Bank Account Name|Bank Account Number|Amount|Datetime|Date time|Created|Processed|Completed|Gateway|Method|Bank)\s*:/i
        )[0];
        name = name.replace(/[^A-Za-z .'-]/g, ' ').replace(/\s+/g, ' ').trim();

        const words = name.split(' ').filter(Boolean).slice(0, 5);
        return words.join(' ');
    }

    function extractDescription(text) {
        const candidates = [
            valueAfterLabel(text, 'Bank Account Name'),
            valueAfterLabel(text, 'Name')
        ];

        const lines = text.split(/\n/);
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) {
                continue;
            }
            if (/^DEPOSIT$/i.test(line)) {
                continue;
            }
            if (COMPANY_LINE.test(line.replace(/\s+/g, ''))) {
                continue;
            }
            if (/^\d+$/.test(line)) {
                continue;
            }
            if (line.indexOf(':') !== -1) {
                continue;
            }
            candidates.push(line);
            break;
        }

        for (let i = 0; i < candidates.length; i++) {
            const name = cleanPersonName(candidates[i]);
            if (name && name.length >= 2 && name.length <= 60) {
                return name;
            }
        }

        return '';
    }

    function extractDate(text) {
        return normalizeDate(
            valueAfterLabel(text, 'Datetime') ||
                valueAfterLabel(text, 'Date time') ||
                valueAfterLabel(text, 'DateTime') ||
                valueAfterLabel(text, 'Created')
        );
    }

    function extractId(text) {
        const afterDeposit = text.match(/DEPOSIT\s+(\d{8,})/i);
        if (afterDeposit) {
            return afterDeposit[1];
        }

        const labeled = text.match(
            /(?:^|\n)\s*(?:ID|Order ID|Transaction ID)\s*:?\s*(\d{8,})/i
        );
        if (labeled) {
            return labeled[1];
        }

        const lines = text.split(/\n/);
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (/^\d{8,12}$/.test(line)) {
                return line;
            }
        }

        return '';
    }

    function normalizeDate(raw) {
        const value = (raw || '').trim();
        if (!value) {
            return '';
        }

        const match = value.match(
            /(\d{4})[/-](\d{1,2})[/-](\d{1,2})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/
        );

        if (!match) {
            return value;
        }

        const year = match[1];
        const month = match[2].padStart(2, '0');
        const day = match[3].padStart(2, '0');
        const hour = (match[4] || '00').padStart(2, '0');
        const minute = (match[5] || '00').padStart(2, '0');
        const second = (match[6] || '00').padStart(2, '0');

        return year + '-' + month + '-' + day + ' ' + hour + ':' + minute + ':' + second;
    }

    function buildSheetRow(card) {
        const text = cardText(card);
        const date = extractDate(text);
        const description = extractDescription(text);
        const amount = valueAfterLabel(text, 'Amount').replace(/[^\d.]/g, '');
        const id = extractId(text);
        const player = valueAfterLabel(text, 'Username');
        const companyOwner = findCompanyOwner(card, text);

        // Paste starts on the DATE cell.
        // DATE | Bank | Description | Amount | STATUS | ID | Company Owner | COMPANY TRF | Player
        return [
            date,
            '',
            description,
            amount,
            'Deposit',
            id,
            companyOwner,
            '',
            player
        ].join('\t');
    }

    function copySheetRow(card, feedbackEl) {
        if (!card) {
            return false;
        }

        const row = buildSheetRow(card);
        writeClipboard(row);
        saveRow(row);
        showCopied(feedbackEl || card);
        return true;
    }

    function isTypingTarget(el) {
        if (!el || !el.matches) {
            return false;
        }

        return el.matches('input, textarea, select, [contenteditable="true"]');
    }

    document.addEventListener(
        'mouseover',
        function (e) {
            const card = findCard(e.target);
            if (card) {
                lastCard = card;
            }
        },
        true
    );

    document.addEventListener(
        'dblclick',
        function (e) {
            const card = findCard(e.target);
            if (!card) {
                console.log(
                    '[Deposit Copy] Double-click ignored: deposit card not found'
                );
                return;
            }

            lastCard = card;
            copySheetRow(card, e.target);
        },
        true
    );

    document.addEventListener(
        'keydown',
        function (e) {
            if (!isBacktick(e)) {
                return;
            }

            if (isTypingTarget(e.target)) {
                return;
            }

            const card = findCard(e.target) || lastCard;
            if (!card) {
                return;
            }

            e.preventDefault();
            copySheetRow(card, e.target === document.body ? card : e.target);
        },
        true
    );

    console.log('[Deposit Copy] Ready on', location.href);
})();
