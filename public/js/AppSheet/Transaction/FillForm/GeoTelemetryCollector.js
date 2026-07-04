// =========================================================================
// GeoTelemetry Collector — Anti-Fraud Telemetry for GeoTag Fields
// =========================================================================
// This module provides per-field HMAC signing, field session state management,
// webdriver detection, hardware fingerprinting, and structured payload
// generation for the GeoTag anti-fraud system.
//
// Dependencies:
//   - Web Crypto API (crypto.subtle) for HMAC-SHA256 computation
//   - navigator.geolocation for GPS capture
//   - GeoTagField.js for UI rendering (called from this module)
//
// Usage:
//   1. On form load with GeoTag fields, call:
//      GeoTelemetryCollector.initFieldSessions(flexFormId, geoTagFieldNames)
//   2. On user tap "Capture Location", call:
//      GeoTelemetryCollector.captureLocation(fieldName)
//   3. On form submit, retrieve all payloads via:
//      GeoTelemetryCollector.getAllPayloads()
// =========================================================================

// Get base URL from hidden field (mobile-compatible)
var _geoTagBaseUrl = (function () {
    var input = document.getElementById('base_path');
    return input ? input.value : '';
})();

var GeoTelemetryCollector = (function () {
    "use strict";

    // =====================================================================
    // PRIVATE STATE
    // =====================================================================

    /**
     * Map of fieldName → GeoTagFieldState
     * @type {Object.<string, GeoTagFieldState>}
     */
    var _fieldStates = {};

    /**
     * The FlexForm ID for the current form instance.
     * @type {string}
     */
    var _formId = '';

    /**
     * Hardware fingerprint — collected once on init, reused for all fields.
     * @type {Object|null}
     */
    var _hardwareFingerprint = null;

    /**
     * Motion sensor samples collected passively in background.
     * Only on devices that support it (mobile). Empty on desktop.
     * @type {Array}
     */
    var _motionSamples = [];
    var _motionListenerActive = false;

    // =====================================================================
    // HARDWARE DETECTION (Non-blocking, lightweight)
    // =====================================================================

    /**
     * Collects hardware fingerprint data. Runs once, instantly.
     * - WebGL renderer: detects emulators (SwiftShader, llvmpipe)
     * - Device memory: helps identify virtual machines
     * - Hardware concurrency: helps identify emulators
     * - Touch support: cross-reference with claimed mobile GPS
     *
     * On desktop/laptop: all of this works fine, just yields desktop-class values.
     * No performance impact — synchronous reads of existing browser properties.
     *
     * @returns {Object} Hardware fingerprint data
     */
    function collectHardwareFingerprint() {
        var fingerprint = {
            webglRenderer: null,
            webglVendor: null,
            bolIsEmulator: false,
            deviceMemory: null,
            hardwareConcurrency: null,
            maxTouchPoints: 0,
            platform: null
        };

        try {
            // WebGL GPU detection — instant, no rendering involved
            var canvas = document.createElement('canvas');
            var gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
            if (gl) {
                var debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
                if (debugInfo) {
                    fingerprint.webglRenderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || null;
                    fingerprint.webglVendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) || null;
                }

                // Detect known emulator signatures
                var renderer = (fingerprint.webglRenderer || '').toLowerCase();
                var emulatorSignatures = ['swiftshader', 'llvmpipe', 'virtualbox', 'vmware', 'microsoft basic render'];
                for (var i = 0; i < emulatorSignatures.length; i++) {
                    if (renderer.indexOf(emulatorSignatures[i]) !== -1) {
                        fingerprint.bolIsEmulator = true;
                        break;
                    }
                }
            }
        } catch (e) { /* WebGL not available — fine */ }

        // Device info — instant property reads
        fingerprint.deviceMemory = navigator.deviceMemory || null; // GB (Chrome only)
        fingerprint.hardwareConcurrency = navigator.hardwareConcurrency || null;
        fingerprint.maxTouchPoints = navigator.maxTouchPoints || 0;
        fingerprint.platform = navigator.platform || null;

        return fingerprint;
    }

    /**
     * Starts passive motion sensor collection.
     * Only activates on devices that support DeviceMotionEvent.
     * On desktop: does nothing (event never fires). Zero CPU cost.
     * Collects max 20 samples then stops — minimal memory.
     */
    function startMotionCollection() {
        if (_motionListenerActive) return;
        if (typeof DeviceMotionEvent === 'undefined') return;

        _motionSamples = [];
        _motionListenerActive = true;

        var handler = function (e) {
            if (_motionSamples.length >= 20) {
                window.removeEventListener('devicemotion', handler);
                _motionListenerActive = false;
                return;
            }
            var acc = e.acceleration || {};
            _motionSamples.push({
                x: acc.x || 0,
                y: acc.y || 0,
                z: acc.z || 0
            });
        };

        window.addEventListener('devicemotion', handler);

        // Auto-stop after 5 seconds regardless (safety net)
        setTimeout(function () {
            if (_motionListenerActive) {
                window.removeEventListener('devicemotion', handler);
                _motionListenerActive = false;
            }
        }, 5000);
    }

    /**
     * Analyzes collected motion samples to determine if device has real movement.
     * @returns {Object} Motion analysis result
     */
    function analyzeMotion() {
        var result = {
            hasSensor: _motionSamples.length > 0,
            sampleCount: _motionSamples.length,
            bolIsStationary: false, // true if ALL samples ≈ 0 (suspicious for mobile)
            avgMagnitude: 0
        };

        if (_motionSamples.length === 0) {
            // No sensor data — desktop or permission denied. NOT suspicious.
            return result;
        }

        // Calculate average magnitude of acceleration
        var totalMagnitude = 0;
        for (var i = 0; i < _motionSamples.length; i++) {
            var s = _motionSamples[i];
            totalMagnitude += Math.sqrt(s.x * s.x + s.y * s.y + s.z * s.z);
        }
        result.avgMagnitude = totalMagnitude / _motionSamples.length;

        // If device reports motion sensor but ALL readings ≈ 0 → suspicious
        // Real handheld devices always have micro-tremor (> 0.1 m/s²)
        if (result.avgMagnitude < 0.05 && _motionSamples.length >= 5) {
            result.bolIsStationary = true;
        }

        return result;
    }

    // =====================================================================
    // WEBDRIVER DETECTION
    // =====================================================================

    /**
     * Detects if the browser is controlled by an automation driver.
     * @returns {boolean} true if webdriver is detected
     */
    function detectWebdriver() {
        return !!(navigator.webdriver);
    }

    // =====================================================================
    // HMAC-SHA256 COMPUTATION (Web Crypto API)
    // =====================================================================

    /**
     * Computes HMAC-SHA256 signature over the concatenation:
     *   lat + lng + timestamp + formId + fieldName
     *
     * The key is the Base64-decoded HMAC secret key from the field session.
     *
     * @param {string} base64Key - Base64-encoded 256-bit HMAC secret key
     * @param {number|null} lat - Latitude (null if not captured)
     * @param {number|null} lng - Longitude (null if not captured)
     * @param {number} timestamp - Epoch milliseconds (dtClientTimestamp)
     * @param {string} formId - pkFlexFormId
     * @param {string} fieldName - txtFieldName
     * @returns {Promise<string>} Hex-encoded HMAC-SHA256 signature
     */
    async function computeHmac(base64Key, lat, lng, timestamp, formId, fieldName) {
        // Decode Base64 key to ArrayBuffer
        var binaryStr = atob(base64Key);
        var keyBytes = new Uint8Array(binaryStr.length);
        for (var i = 0; i < binaryStr.length; i++) {
            keyBytes[i] = binaryStr.charCodeAt(i);
        }

        // Import key for HMAC-SHA256
        var cryptoKey = await crypto.subtle.importKey(
            'raw',
            keyBytes,
            { name: 'HMAC', hash: 'SHA-256' },
            false,
            ['sign']
        );

        // Build message string: lat + lng + timestamp + formId + fieldName
        // Match backend format: $"{lat}{lng}{timestamp}{formId}{fieldName}"
        var message = '' + (lat !== null ? lat : '') +
            (lng !== null ? lng : '') +
            timestamp +
            formId +
            fieldName;

        // Encode message to bytes
        var encoder = new TextEncoder();
        var messageBytes = encoder.encode(message);

        // Compute HMAC
        var signatureBuffer = await crypto.subtle.sign('HMAC', cryptoKey, messageBytes);

        // Convert to hex string
        var signatureArray = new Uint8Array(signatureBuffer);
        var hexSignature = '';
        for (var j = 0; j < signatureArray.length; j++) {
            hexSignature += signatureArray[j].toString(16).padStart(2, '0');
        }

        return hexSignature;
    }

    // =====================================================================
    // GEO STATUS DETERMINATION
    // =====================================================================

    /**
     * Determines the geo status string based on capture result.
     * @param {GeolocationPosition|null} position - The position object from geolocation API
     * @param {GeolocationPositionError|null} error - The error object if capture failed
     * @returns {string} Status code: "OK"|"ACCURACY_ZERO"|"PERMISSION_DENIED"|"TIMEOUT"|"NOT_CAPTURED"
     */
    function determineGeoStatus(position, error) {
        if (error) {
            if (error.code === error.PERMISSION_DENIED) return 'PERMISSION_DENIED';
            if (error.code === error.TIMEOUT) return 'TIMEOUT';
            return 'PERMISSION_DENIED'; // POSITION_UNAVAILABLE treated as denied
        }
        if (!position) return 'NOT_CAPTURED';
        if (position.coords.accuracy === 0) return 'ACCURACY_ZERO';
        return 'OK';
    }

    // =====================================================================
    // FIELD SESSION INITIALIZATION
    // =====================================================================

    /**
     * Initializes field sessions by calling the GeoTagApiController.GenerateFieldSessions endpoint.
     * Stores session tokens and HMAC keys per field in _fieldStates.
     *
     * @param {string} flexFormId - The form identifier (UUID)
     * @param {string[]} geoTagFieldNames - Array of GeoTag field names in the form
     * @returns {Promise<boolean>} true if initialization succeeded
     */
    async function initFieldSessions(flexFormId, geoTagFieldNames) {
        if (!flexFormId || !geoTagFieldNames || geoTagFieldNames.length === 0) {
            return false;
        }

        _formId = flexFormId;
        _fieldStates = {};

        // Collect hardware fingerprint (instant, one-time)
        _hardwareFingerprint = collectHardwareFingerprint();

        // Start passive motion sensor collection (mobile only, zero cost on desktop)
        startMotionCollection();

        try {
            var response = await fetch(_geoTagBaseUrl + '/api/1/GeoTag/GenerateFieldSessions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    flexFormId: flexFormId,
                    geoTagFieldNames: geoTagFieldNames
                })
            });

            if (!response.ok) {
                console.error('[GeoTelemetry] Failed to generate field sessions:', response.status);
                return false;
            }

            var result = await response.json();
            // Handle wrapped response: { data: [...] } or direct array
            var sessions = (result && result.data) ? result.data : result;

            if (!Array.isArray(sessions)) {
                console.error('[GeoTelemetry] Invalid session response format');
                return false;
            }

            // Initialize field states from session data
            sessions.forEach(function (session) {
                _fieldStates[session.fieldName] = {
                    fieldName: session.fieldName,
                    fieldSessionToken: session.fieldSessionToken,
                    hmacSecretKey: session.hmacSecretKey,
                    payload: null,
                    isCaptured: false
                };
            });

            return true;
        } catch (err) {
            console.error('[GeoTelemetry] Error initializing field sessions:', err);
            return false;
        }
    }

    // =====================================================================
    // GEOLOCATION CAPTURE
    // =====================================================================

    /**
     * Captures geolocation for a specific GeoTag field.
     * Triggered ONLY on explicit button tap (not passive interaction).
     * Computes HMAC signature immediately after capture.
     *
     * @param {string} fieldName - The field name to capture location for
     * @returns {Promise<GeoTagPayload>} The captured and signed payload
     */
    async function captureLocation(fieldName) {
        var fieldState = _fieldStates[fieldName];
        if (!fieldState) {
            console.error('[GeoTelemetry] No session state for field:', fieldName);
            return null;
        }

        var isWebdriver = detectWebdriver();
        var timestamp = Date.now();

        // Check if geolocation API is available
        if (!navigator.geolocation) {
            var payload = await _buildPayload(fieldState, null, null, null, timestamp, isWebdriver, 'NOT_CAPTURED');
            fieldState.payload = payload;
            fieldState.isCaptured = false;
            return payload;
        }

        // Capture geolocation — returns a Promise wrapping the callback API
        return new Promise(function (resolve) {
            navigator.geolocation.getCurrentPosition(
                async function (position) {
                    var lat = position.coords.latitude;
                    var lng = position.coords.longitude;
                    var accuracy = position.coords.accuracy;
                    var captureTimestamp = Date.now(); // Timestamp at capture moment

                    var status = determineGeoStatus(position, null);
                    var payload = await _buildPayload(fieldState, lat, lng, accuracy, captureTimestamp, isWebdriver, status);

                    fieldState.payload = payload;
                    fieldState.isCaptured = true;
                    resolve(payload);
                },
                async function (error) {
                    var errorTimestamp = Date.now();
                    var status = determineGeoStatus(null, error);
                    var payload = await _buildPayload(fieldState, null, null, null, errorTimestamp, isWebdriver, status);

                    fieldState.payload = payload;
                    fieldState.isCaptured = false;
                    resolve(payload);
                },
                {
                    enableHighAccuracy: true,
                    timeout: 15000,
                    maximumAge: 0
                }
            );
        });
    }

    /**
     * Builds a GeoTagPayload with HMAC signature.
     * @private
     */
    async function _buildPayload(fieldState, lat, lng, accuracy, timestamp, isWebdriver, geoStatus) {
        var hmacSignature = '';

        try {
            hmacSignature = await computeHmac(
                fieldState.hmacSecretKey,
                lat,
                lng,
                timestamp,
                _formId,
                fieldState.fieldName
            );
        } catch (err) {
            console.error('[GeoTelemetry] HMAC computation failed:', err);
            hmacSignature = '';
        }

        // Build motion analysis at payload time
        var motionAnalysis = analyzeMotion();

        return {
            decLatitude: lat,
            decLongitude: lng,
            decAccuracy: accuracy,
            dtClientTimestamp: timestamp,
            bolIsWebdriver: isWebdriver,
            txtGeoStatus: geoStatus,
            txtFieldSessionToken: fieldState.fieldSessionToken,
            txtHmacSignature: hmacSignature,
            pkFlexFormId: _formId,
            txtFieldName: fieldState.fieldName,
            // Hardware detection data (non-blocking, informational)
            hardwareInfo: {
                webglRenderer: _hardwareFingerprint ? _hardwareFingerprint.webglRenderer : null,
                webglVendor: _hardwareFingerprint ? _hardwareFingerprint.webglVendor : null,
                bolIsEmulator: _hardwareFingerprint ? _hardwareFingerprint.bolIsEmulator : false,
                maxTouchPoints: _hardwareFingerprint ? _hardwareFingerprint.maxTouchPoints : 0,
                platform: _hardwareFingerprint ? _hardwareFingerprint.platform : null,
                motionHasSensor: motionAnalysis.hasSensor,
                motionSampleCount: motionAnalysis.sampleCount,
                motionIsStationary: motionAnalysis.bolIsStationary,
                motionAvgMagnitude: Math.round(motionAnalysis.avgMagnitude * 1000) / 1000
            }
        };
    }

    // =====================================================================
    // PAYLOAD RETRIEVAL
    // =====================================================================

    /**
     * Injects pre-captured coordinates into the collector state without re-calling GPS.
     * Called by GeoTagField.js after the UI capture succeeds, so both DOM and telemetry
     * stay in sync using the same position object.
     *
     * @param {string} fieldName - The field name
     * @param {number} lat - Latitude
     * @param {number} lng - Longitude
     * @param {number} accuracy - Accuracy in meters
     * @param {number} timestamp - Capture timestamp (ms since epoch)
     * @param {string} status - Geo status string ('OK', 'ACCURACY_ZERO', etc.)
     * @returns {Promise<GeoTagPayload|null>}
     */
    async function captureFromCoords(fieldName, lat, lng, accuracy, timestamp, status) {
        var fieldState = _fieldStates[fieldName];
        if (!fieldState) return null;
        var isWebdriver = detectWebdriver();
        var payload = await _buildPayload(fieldState, lat, lng, accuracy, timestamp, isWebdriver, status);
        fieldState.payload = payload;
        fieldState.isCaptured = true;
        return payload;
    }

    /**
     * Gets the payload for a specific field.
     * If the field hasn't been interacted with, returns a NOT_CAPTURED payload.
     *
     * @param {string} fieldName - The field name
     * @returns {Promise<GeoTagPayload|null>} The payload, or null if field not registered
     */
    async function getFieldPayload(fieldName) {
        var fieldState = _fieldStates[fieldName];
        if (!fieldState) return null;

        // If already captured, return the stored payload
        if (fieldState.payload) {
            return fieldState.payload;
        }

        // Not captured — build a NOT_CAPTURED payload
        var isWebdriver = detectWebdriver();
        var timestamp = Date.now();
        var payload = await _buildPayload(fieldState, null, null, null, timestamp, isWebdriver, 'NOT_CAPTURED');
        return payload;
    }

    /**
     * Gets all GeoTag payloads for form submission.
     * For fields that haven't been interacted with, generates NOT_CAPTURED payloads.
     *
     * @returns {Promise<GeoTagPayload[]>} Array of all field payloads
     */
    async function getAllPayloads() {
        var payloads = [];
        var fieldNames = Object.keys(_fieldStates);

        for (var i = 0; i < fieldNames.length; i++) {
            var payload = await getFieldPayload(fieldNames[i]);
            if (payload) {
                payloads.push(payload);
            }
        }

        return payloads;
    }

    // =====================================================================
    // STATE QUERIES
    // =====================================================================

    /**
     * Checks if a specific field has been captured (has valid geolocation data).
     * @param {string} fieldName - The field name
     * @returns {boolean} true if field has been captured
     */
    function isFieldCaptured(fieldName) {
        var state = _fieldStates[fieldName];
        return state ? state.isCaptured : false;
    }

    /**
     * Gets the current field state for a specific field.
     * @param {string} fieldName - The field name
     * @returns {GeoTagFieldState|null} The field state or null
     */
    function getFieldState(fieldName) {
        return _fieldStates[fieldName] || null;
    }

    /**
     * Gets all registered field names.
     * @returns {string[]} Array of field names
     */
    function getRegisteredFields() {
        return Object.keys(_fieldStates);
    }

    /**
     * Checks if any field requires geolocation but hasn't been captured.
     * Used for form submission validation.
     * @param {Object.<string, boolean>} requiredFields - Map of fieldName → bolRequireGeolocation
     * @returns {string|null} The first field name that requires capture but hasn't, or null if all valid
     */
    function getUncapturedRequiredField(requiredFields) {
        if (!requiredFields) return null;

        var fieldNames = Object.keys(requiredFields);
        for (var i = 0; i < fieldNames.length; i++) {
            var fn = fieldNames[i];
            if (requiredFields[fn] && !isFieldCaptured(fn)) {
                return fn;
            }
        }
        return null;
    }

    /**
     * Resets state for all fields (e.g., on form reload).
     */
    function reset() {
        _fieldStates = {};
        _formId = '';
    }

    // =====================================================================
    // PUBLIC API
    // =====================================================================

    return {
        // Initialization
        initFieldSessions: initFieldSessions,

        // Capture
        captureLocation: captureLocation,
        captureFromCoords: captureFromCoords,

        // Payload retrieval
        getFieldPayload: getFieldPayload,
        getAllPayloads: getAllPayloads,

        // State queries
        isFieldCaptured: isFieldCaptured,
        getFieldState: getFieldState,
        getRegisteredFields: getRegisteredFields,
        getUncapturedRequiredField: getUncapturedRequiredField,

        // Utilities (exposed for testing/advanced usage)
        computeHmac: computeHmac,
        detectWebdriver: detectWebdriver,
        determineGeoStatus: determineGeoStatus,
        collectHardwareFingerprint: collectHardwareFingerprint,
        analyzeMotion: analyzeMotion,

        // Lifecycle
        reset: reset
    };
})();
