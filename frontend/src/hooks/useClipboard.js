/**
 * Clipboard Hook
 *
 * Custom hook for copying text to clipboard with success/error states.
 * Uses the modern Clipboard API with fallback for older browsers.
 *
 * @example
 * const { copy, isCopied, error } = useClipboard();
 *
 * <button onClick={() => copy('Hello world')}>
 *   {isCopied ? 'Copied!' : 'Copy'}
 * </button>
 */

import { useState, useCallback } from 'react';

export function useClipboard() {
    const [isCopied, setIsCopied] = useState(false);
    const [error, setError] = useState(null);

    const copy = useCallback(async (text) => {
        setError(null);
        setIsCopied(false);

        try {
            // Use modern Clipboard API
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(text);
                setIsCopied(true);
                // Reset copied state after 2 seconds
                setTimeout(() => setIsCopied(false), 2000);
                return;
            }

            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = text;
            textArea.style.position = 'fixed';
            textArea.style.opacity = '0';
            textArea.style.left = '-999999px';
            document.body.appendChild(textArea);
            textArea.select();

            const successful = document.execCommand('copy');
            document.body.removeChild(textArea);

            if (!successful) {
                throw new Error('Copy command failed');
            }

            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2000);
        } catch (err) {
            setError(err.message || 'Failed to copy to clipboard');
            console.error('Clipboard copy error:', err);
        }
    }, []);

    return { copy, isCopied, error };
}

