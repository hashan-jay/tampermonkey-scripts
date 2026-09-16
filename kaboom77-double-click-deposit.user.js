// ==UserScript==
// @name         KABOOM77 Deposit Copy
// @namespace    kaboom77-jkkbm77-deposit
// @version      2.0
// @description  KABOOM77 only: copy from jkkbm77 transactions, paste values only into the KABOOM77 sheet.
// @match        https://jkkbm77.u55y38.com/*
// @match        https://docs.google.com/spreadsheets/d/1A6byK3749MtZsBxfG6gK0o1T3JeqTyNKD-il5T5OXdQ/*
// @grant        GM_setClipboard
// @grant        GM_setValue
// @grant        GM_getValue
// ==/UserScript==

(function () {
    'use strict';

    const STORAGE_KEY = 'pendingSheetRow_kaboom77_jkkbm77';
    const SHEET_ID = '1A6byK3749MtZsBxfG6gK0o1T3JeqTyNKD-il5T5OXdQ';
    const SITE_HOST = 'jkkbm77.u55y38.com';

    function isTargetSheet() {
        return (
            location.hostname === 'docs.google.com' &&
            location.pathname.indexOf('/spreadsheets/d/' + SHEET_ID) === 0
        );
    }

    function isTargetTransactionPage() {
        return (
            location.hostname === SITE_HOST &&
            /transactions/i.test(location.hash)
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

    function pasteIntoGoogleSheet(text) {
        const iframe = document.querySelector('.docs-texteventtarget-iframe');
        const frameWin = iframe && iframe.contentWindow;
        const frameDoc =
            iframe &&
            (iframe.contentDocument || (frameWin && frameWin.document));
        const editable =
            frameDoc &&
            frameDoc.querySelector(
                '[contenteditable="true"], [contenteditable=""]'
            );

        const nameBox = document.querySelector(
            '#t-name-box input, input#t-name-box'
        );
        if (nameBox) {
            nameBox.blur();
        }

        const cellInput = document.querySelector('.cell-input');
        let pasted = false;

        pasted = dispatchPaste(window, cellInput, text) || pasted;
        pasted =
            dispatchPaste(window, document.activeElement, text) || pasted;

        if (frameWin && editable) {
            pasted = dispatchPaste(frameWin, editable, text) || pasted;
        }

        if (frameDoc) {
            pasted = dispatchPaste(frameWin, frameDoc.body, text) || pasted;
        }

        return pasted;
    }

    function bindSheetsShortcut() {
        function onSheetsKey(event) {
            if (!isBacktick(event)) {
                return;
            }

            event.preventDefault();
            event.stopPropagation();
            event.stopImmediatePropagation();

            const stored = GM_getValue(STORAGE_KEY, '');

            function finish(text) {
                const row = (text || '').trim();
                if (!row) {
                    showSheetToast(
                        'Nothing to paste. Press ` on a deposit first.',
                        false
                    );
                    return;
                }

                pasteIntoGoogleSheet(row);
                showSheetToast('PASTED', true);
            }

            if (stored) {
                finish(stored);
                return;
            }

            if (navigator.clipboard && navigator.clipboard.readText) {
                navigator.clipboard.readText().then(finish).catch(function () {
                    finish('');
                });
                return;
            }

            finish('');
        }

        function bindDoc(doc) {
            if (!doc || doc.__kaboom77PasteBound) {
                return;
            }

            doc.__kaboom77PasteBound = true;
            doc.addEventListener('keydown', onSheetsKey, true);
        }

        function bindIframe() {
            const iframe = document.querySelector(
                '.docs-texteventtarget-iframe'
            );
            if (!iframe) {
                return;
            }

            const frameDoc =
                iframe.contentDocument ||
                (iframe.contentWindow && iframe.contentWindow.document);

            bindDoc(frameDoc);
        }

        bindDoc(document);
        bindIframe();

        const observer = new MutationObserver(bindIframe);
        observer.observe(document.documentElement, {
            childList: true,
            subtree: true
        });

        setInterval(bindIframe, 1000);
    }

    if (isTargetSheet()) {
        bindSheetsShortcut();
        return;
    }

    if (!isTargetTransactionPage()) {
        window.addEventListener('hashchange', function () {
            if (isTargetTransactionPage() && !window.__kaboom77CopyBound) {
                location.reload();
            }
        });
        return;
    }

    window.__kaboom77CopyBound = true;

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
        return (
            text.includes('Username:') &&
            text.includes('Bank Account Name:') &&
            text.includes('Bank Account Number:') &&
            text.includes('Amount:') &&
            text.includes('Datetime:') &&
            /DEPOSIT/i.test(text)
        );
    }

    function findCard(start) {
        let el = start;

        for (let i = 0; i < 12 && el; i++, el = el.parentElement) {
            if (isDepositCard(cardText(el))) {
                return el;
            }
        }

        return null;
    }

    function valueAfterLabel(text, label) {
        const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const match = text.match(
            new RegExp('(?:^|\\n)\\s*' + escaped + '\\s*:\\s*([^\\n]+)', 'i')
        );

        return match ? match[1].trim() : '';
    }

    const KABOOM_BADGE_EXACT = /^KABOOM(?:77)?VIP[A-Z0-9]*$/i;

    function cleanPersonName(value) {
        let name = String(value || '');
        name = name.replace(/KABOOM(?:77)?VIP[A-Z0-9]*/gi, ' ');
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
            if (KABOOM_BADGE_EXACT.test(line.replace(/\s+/g, ''))) {
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

        // This site is KABOOM77 only. Paste starts on the DATE cell.
        // DATE | Bank | Description | Amount | STATUS | ID | Company Owner | COMPANY TRF | Player
        return [
            date,
            '',
            description,
            amount,
            'Deposit',
            id,
            'KABOOM77',
            '',
            player
        ].join('\t');
    }

    function copySheetRow(card, feedbackEl) {
        if (!card) {
            return false;
        }

        const row = buildSheetRow(card);
        GM_setClipboard(row);
        GM_setValue(STORAGE_KEY, row);
        showCopied(feedbackEl || card);
        return true;
    }

    function isTypingTarget(el) {
        if (!el || !el.matches) {
            return false;
        }

        return el.matches('input, textarea, select, [contenteditable="true"]');
    }

    document.addEventListener('mouseover', function (e) {
        const card = findCard(e.target);
        if (card) {
            lastCard = card;
        }
    });

    document.addEventListener('dblclick', function (e) {
        const card = findCard(e.target);
        if (!card) {
            return;
        }

        lastCard = card;
        copySheetRow(card, e.target);
    });

    document.addEventListener('keydown', function (e) {
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
    });
})();