// ==UserScript==
// @name            Order Double Click Copy
// @namespace       order-double-click-copy
// @version         1.0
// @description     Double click any order area to copy order data
// @match           *://*/*
// @grant           GM_setClipboard
// ==/UserScript==

(function () {
    'use strict';

    function showCopied(el) {
        let tag = document.createElement('span');
            tag.innerText = ' COPIED';
            tag.style.color = 'red';
            tag.style.fontWeight = 'bold';
            tag.style.marginLeft = '4px';
            el.appendChild(tag);

            setTimeout(() => tag.remove(), 1200);
    }

    document.addEventListener('dblclick', function (e) {
        let el = e.target;

        for (let i = 0; i < 12 && el; i++, el = el.parentElement) {
            let text = el.innerText || '';

            if (
                text.includes('Username:') &&
                text.includes('Bank Account Name:') &&
                text.includes('Bank Account Number:') &&
                text.includes('Amount:') &&
                text.includes('Datetime:')
            ){
                GM_setClipboard(text);
                showCopied(e.target);
                return;
            }
        }
    });
})();