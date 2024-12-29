/**
 * @file Security Headers Constants
 * @description Defines security header constants used across the application for HTTP security implementation
 * @version 1.0.0
 */

/**
 * HTTP Strict Transport Security (HSTS)
 * Enforces HTTPS connections by instructing browsers to only connect over HTTPS
 * max-age=31536000 (1 year in seconds)
 * includeSubDomains flag ensures all subdomains are also HTTPS
 */
export const STRICT_TRANSPORT_SECURITY = 'max-age=31536000; includeSubDomains';

/**
 * Content Security Policy (CSP)
 * Restricts resource loading to prevent XSS attacks
 * default-src 'self': Only allow resources from same origin
 * script-src: Allow scripts from same origin and Google APIs (for OAuth integration)
 */
export const CONTENT_SECURITY_POLICY = "default-src 'self'; script-src 'self' *.googleapis.com";

/**
 * X-Frame-Options
 * Prevents clickjacking attacks by controlling iframe embedding
 * DENY: Completely prevents the page from being displayed in an iframe
 */
export const X_FRAME_OPTIONS = 'DENY';

/**
 * X-Content-Type-Options
 * Prevents MIME type sniffing attacks
 * nosniff: Forces browsers to honor the declared content type
 */
export const X_CONTENT_TYPE_OPTIONS = 'nosniff';

/**
 * X-XSS-Protection
 * Enables browser's built-in XSS filtering
 * 1: Enable XSS filtering
 * mode=block: Block rendering rather than sanitize when XSS is detected
 */
export const X_XSS_PROTECTION = '1; mode=block';

/**
 * Consolidated security headers object
 * Contains all security headers for easy application in middleware and response handlers
 * @type {Record<string, string>}
 */
export const SECURITY_HEADERS: Record<string, string> = {
    'Strict-Transport-Security': STRICT_TRANSPORT_SECURITY,
    'Content-Security-Policy': CONTENT_SECURITY_POLICY,
    'X-Frame-Options': X_FRAME_OPTIONS,
    'X-Content-Type-Options': X_CONTENT_TYPE_OPTIONS,
    'X-XSS-Protection': X_XSS_PROTECTION
} as const;