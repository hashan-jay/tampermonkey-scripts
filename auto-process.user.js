// ==UserScript==
// @name         CUNTSPIN Auto PROCESS - DEPOSIT Only
// @namespace    CUNTSPIN-auto-deposit
// @version      1.1
// @description  Automatically clicks PROCESS only for DEPOSIT transactions on both sites
// @match        https://jkwspinau.u55y38.com/*
// @match        https://jkcntspnau.u55y38.com/*
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    const CHECK_INTERVAL = 500;

    console.log('[CUNTSPIN AUTO DEPOSIT] Loaded');

    function getText(element) {
        if (!element) {
            return '';
        }

        return (
            element.innerText ||
            element.textContent ||
            element.value ||
            ''
        )
            .replace(/\s+/g, ' ')
            .trim();
    }

    function isVisible(element) {
        return !!(
            element &&
            element.offsetWidth > 0 &&
            element.offsetHeight > 0
        );
    }

    function findTransactionContainer(button) {

        // Try common table/card structures
        const candidates = [
            button.closest('tr'),
            button.closest('li'),
            button.closest('.transaction'),
            button.closest('.transaction-row'),
            button.closest('.transaction-item'),
            button.closest('.record'),
            button.closest('.record-row'),
            button.closest('.order'),
            button.closest('.order-row'),
            button.closest('.card'),
            button.closest('.row')
        ];

        for (const candidate of candidates) {
            if (candidate) {
                return candidate;
            }
        }

        // Fallback: move upward until we find a container
        // containing transaction information.
        let parent = button.parentElement;

        for (let i = 0; i < 10 && parent; i++) {

            const text =
                getText(parent).toUpperCase();

            if (
                text.includes('PROCESS') &&
                (
                    text.includes('DEPOSIT') ||
                    text.includes('WITHDRAW')
                )
            ) {
                return parent;
            }

            parent = parent.parentElement;
        }

        return null;
    }

    function hasExactDeposit(container) {
        if (!container) {
            return false;
        }

        const elements =
            container.querySelectorAll(
                'span, label, div, td, p, strong, b, a'
            );

        for (const element of elements) {

            const text =
                getText(element)
                    .toUpperCase();

            if (text === 'DEPOSIT') {
                return true;
            }
        }

        return false;
    }

    function processDeposits() {

        const buttons =
            document.querySelectorAll(
                'button, input[type="button"], input[type="submit"], a'
            );

        for (const button of buttons) {

            const buttonText =
                getText(button)
                    .toUpperCase();

            // Only exact PROCESS
            if (buttonText !== 'PROCESS') {
                continue;
            }

            if (button.disabled) {
                continue;
            }

            if (!isVisible(button)) {
                continue;
            }

            // Don't click same button repeatedly
            if (
                button.dataset.CUNTSPINAutoProcessed ===
                '1'
            ) {
                continue;
            }

            const transaction =
                findTransactionContainer(button);

            if (!transaction) {
                console.log(
                    '[CUNTSPIN] Transaction container not found'
                );

                continue;
            }

            // Must contain an exact DEPOSIT label
            if (
                !hasExactDeposit(
                    transaction
                )
            ) {
                continue;
            }

            // Mark BEFORE clicking
            button.dataset.CUNTSPINAutoProcessed =
                '1';

            console.log(
                '[CUNTSPIN] DEPOSIT found -> clicking PROCESS'
            );

            button.click();
        }
    }

    // Regular check
    setInterval(
        processDeposits,
        CHECK_INTERVAL
    );

    // Detect dynamically loaded transactions
    const observer =
        new MutationObserver(
            function () {
                processDeposits();
            }
        );

    function start() {

        if (!document.body) {
            setTimeout(
                start,
                500
            );

            return;
        }

        observer.observe(
            document.body,
            {
                childList: true,
                subtree: true
            }
        );

        processDeposits();

        console.log(
            '[CUNTSPIN] Watching for DEPOSIT transactions'
        );
    }

    start();

})();
