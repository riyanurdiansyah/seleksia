// =========================================================================
// GeoTag Field — Location Capture Control for FlexForm Engine
// =========================================================================
// Features:
//   - Default map shown on load (centered Indonesia, no pin)
//   - Custom permission popup before browser GPS prompt
//   - Accuracy validation: < 50m on mobile, no limit on desktop
//   - Reverse geocoding via server proxy
//   - Map with dragging + zoom, pin non-draggable
// =========================================================================

/**
 * Detects if device is mobile (has touch support).
 * Used to determine whether to enforce accuracy threshold.
 */
function f_GeoTagIsMobile() {
    return (navigator.maxTouchPoints || 0) > 0;
}

/**
 * Initializes a default map for a GeoTag field (called on page load).
 * Shows map centered on Indonesia without a pin.
 * @param {string} safeId - Unique identifier for DOM elements
 */
function f_GeoTagInitMap(safeId) {
    var mapEl = document.getElementById('geotag_map_' + safeId);
    if (!mapEl || typeof L === 'undefined') return;

    mapEl.style.display = 'block';

    // Default center: Indonesia (-2.5, 118) at zoom 5
    var map = L.map(mapEl, {
        dragging: true,
        zoomControl: true,
        touchZoom: true,
        scrollWheelZoom: true,
        doubleClickZoom: true,
        boxZoom: false,
        keyboard: false,
        attributionControl: true
    }).setView([-2.5, 118], 5);

    L.tileLayer('/api/1/GeoTagApi/Tile?s={s}&z={z}&x={x}&y={y}', {
        attribution: '© OpenStreetMap',
        subdomains: ['a', 'b', 'c']
    }).addTo(map);

    mapEl._leafletMap = map;
    mapEl._leafletMarker = null;

    setTimeout(function () { map.invalidateSize(); }, 300);
}

/**
 * Initiates GPS capture directly — no custom popup, uses browser default permission flow.
 */
function f_GeoTagCapture(safeId, fieldName) {
    f_GeoTagDoCapture(safeId, fieldName);
}

/**
 * Performs the actual GPS capture after permission is handled.
 */
function f_GeoTagDoCapture(safeId, fieldName) {
    var btnEl = document.getElementById('geotag_btn_' + safeId);
    var mapEl = document.getElementById('geotag_map_' + safeId);
    var infoEl = document.getElementById('geotag_info_' + safeId);

    if (!btnEl) return;

    // Transition to loading state
    btnEl.disabled = true;
    btnEl.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Getting location...';

    // ── Check if we are running in Flutter WebView ──
    if (typeof window.FlutterUploadChannel !== 'undefined') {
        window.FlutterUploadChannel.postMessage(JSON.stringify({
            action: 'get_location',
            safeId: safeId
        }));
        return;
    }

    if (!navigator.geolocation) {
        f_GeoTagError(safeId, 'Geolocation is not supported by this browser.');
        return;
    }

    navigator.geolocation.getCurrentPosition(
        function (position) {
            var lat = position.coords.latitude;
            var lng = position.coords.longitude;
            var accuracy = position.coords.accuracy;
            var timestamp = Date.now();

            // Accuracy validation: only enforce on mobile devices (touch devices with GPS)
            // Desktop/laptop skip this check — they use WiFi/IP which is less accurate
            if (f_GeoTagIsMobile() && accuracy > 50) {
                btnEl.disabled = false;
                btnEl.innerHTML = '<i class="ti ti-map-pin me-2"></i>Capture Location';
                if (infoEl) {
                    infoEl.style.display = 'block';
                    document.getElementById('geotag_address_' + safeId).textContent =
                        'GPS accuracy too low (' + accuracy.toFixed(0) + 'm). Try in an open area or enable GPS.';
                    document.getElementById('geotag_coords_' + safeId).textContent = '—';
                    document.getElementById('geotag_time_' + safeId).textContent = '—';
                    document.getElementById('geotag_accuracy_' + safeId).textContent = 'Minimum: < 50m';
                }
                return;
            }

            // Store values in hidden inputs
            var geoStatus = accuracy === 0 ? 'ACCURACY_ZERO' : 'OK';
            document.getElementById('geotag_lat_' + safeId).value = lat.toFixed(7);
            document.getElementById('geotag_lng_' + safeId).value = lng.toFixed(7);
            document.getElementById('geotag_acc_' + safeId).value = accuracy.toFixed(2);
            document.getElementById('geotag_ts_' + safeId).value = timestamp;
            document.getElementById('geotag_status_' + safeId).value = geoStatus;

            // Bridge: sync captured coords into telemetry collector (HMAC sign + isCaptured=true)
            if (typeof GeoTelemetryCollector !== 'undefined') {
                GeoTelemetryCollector.captureFromCoords(fieldName, lat, lng, accuracy, timestamp, geoStatus);
            }

            // Show info block
            if (infoEl) {
                infoEl.style.display = 'block';
                document.getElementById('geotag_coords_' + safeId).textContent = lat.toFixed(7) + ', ' + lng.toFixed(7);
                document.getElementById('geotag_time_' + safeId).textContent = new Date(timestamp).toLocaleString('id-ID', {
                    day: '2-digit', month: 'short', year: 'numeric',
                    hour: '2-digit', minute: '2-digit', second: '2-digit'
                });
                document.getElementById('geotag_accuracy_' + safeId).textContent = 'Accuracy: ' + accuracy.toFixed(1) + ' m';
            }

            // Update map — fly to captured location and add/move pin
            if (typeof L !== 'undefined' && mapEl) {
                mapEl.style.display = 'block';
                var map = mapEl._leafletMap;

                if (!map) {
                    // Map not initialized yet — create it
                    map = L.map(mapEl, {
                        dragging: true, zoomControl: true, touchZoom: true,
                        scrollWheelZoom: true, doubleClickZoom: true,
                        boxZoom: false, keyboard: false, attributionControl: true
                    }).setView([lat, lng], 16);

                    L.tileLayer('/api/1/GeoTagApi/Tile?s={s}&z={z}&x={x}&y={y}', {
                        attribution: '© OpenStreetMap',
                        subdomains: ['a', 'b', 'c']
                    }).addTo(map);

                    mapEl._leafletMap = map;
                } else {
                    // Map exists — fly to new location
                    map.flyTo([lat, lng], 16, { duration: 1.5 });
                }

                // Add or move marker
                if (mapEl._leafletMarker) {
                    mapEl._leafletMarker.setLatLng([lat, lng]);
                } else {
                    mapEl._leafletMarker = L.marker([lat, lng]).addTo(map);
                }

                setTimeout(function () { map.invalidateSize(); }, 200);
            }

            // Reverse geocoding (non-blocking)
            f_GeoTagReverseGeocode(safeId, lat, lng);

            // Reset button to "Recapture" state
            btnEl.disabled = false;
            btnEl.innerHTML = '<i class="ti ti-refresh me-2"></i>Recapture Location';
        },
        function (error) {
            var message = 'Location access denied.';
            if (error.code === error.TIMEOUT) {
                message = 'Location request timed out. Try again.';
            } else if (error.code === error.POSITION_UNAVAILABLE) {
                message = 'Location information unavailable.';
            }

            document.getElementById('geotag_status_' + safeId).value =
                error.code === error.TIMEOUT ? 'TIMEOUT' : 'PERMISSION_DENIED';
            f_GeoTagError(safeId, message);
        },
        {
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 0
        }
    );
}

/**
 * Flutter Callback: Handles successful location capture sent from native app.
 */
window.onLocationCapturedFromFlutter = function (safeId, lat, lng, accuracy) {
    try {
        console.log("Location received from Flutter for safeId: " + safeId + ", lat: " + lat + ", lng: " + lng + ", accuracy: " + accuracy);
        var btnEl = document.getElementById('geotag_btn_' + safeId);
        var mapEl = document.getElementById('geotag_map_' + safeId);
        var infoEl = document.getElementById('geotag_info_' + safeId);
        var timestamp = Date.now();

        // Accuracy validation: only enforce on mobile devices (touch devices with GPS)
        if (f_GeoTagIsMobile() && accuracy > 50) {
            if (btnEl) {
                btnEl.disabled = false;
                btnEl.innerHTML = '<i class="ti ti-map-pin me-2"></i>Capture Location';
            }
            if (infoEl) {
                infoEl.style.display = 'block';
                document.getElementById('geotag_address_' + safeId).textContent =
                    'GPS accuracy too low (' + accuracy.toFixed(0) + 'm). Try in an open area or enable GPS.';
                document.getElementById('geotag_coords_' + safeId).textContent = '—';
                document.getElementById('geotag_time_' + safeId).textContent = '—';
                document.getElementById('geotag_accuracy_' + safeId).textContent = 'Minimum: < 50m';
            }
            return;
        }

        // Store values in hidden inputs
        var geoStatusFlutter = accuracy === 0 ? 'ACCURACY_ZERO' : 'OK';
        document.getElementById('geotag_lat_' + safeId).value = lat.toFixed(7);
        document.getElementById('geotag_lng_' + safeId).value = lng.toFixed(7);
        document.getElementById('geotag_acc_' + safeId).value = accuracy.toFixed(2);
        document.getElementById('geotag_ts_' + safeId).value = timestamp;
        document.getElementById('geotag_status_' + safeId).value = geoStatusFlutter;

        // Bridge: sync captured coords into telemetry collector (HMAC sign + isCaptured=true)
        if (typeof GeoTelemetryCollector !== 'undefined') {
            var flutterFieldName = document.getElementById('geotag_' + safeId) &&
                document.getElementById('geotag_' + safeId).getAttribute('data-field-name');
            if (flutterFieldName) {
                GeoTelemetryCollector.captureFromCoords(flutterFieldName, lat, lng, accuracy, timestamp, geoStatusFlutter);
            }
        }

        // Show info block
        if (infoEl) {
            infoEl.style.display = 'block';
            document.getElementById('geotag_coords_' + safeId).textContent = lat.toFixed(7) + ', ' + lng.toFixed(7);
            document.getElementById('geotag_time_' + safeId).textContent = new Date(timestamp).toLocaleString('id-ID', {
                day: '2-digit', month: 'short', year: 'numeric',
                hour: '2-digit', minute: '2-digit', second: '2-digit'
            });
            document.getElementById('geotag_accuracy_' + safeId).textContent = 'Accuracy: ' + accuracy.toFixed(1) + ' m';
        }

        // Update map — fly to captured location and add/move pin
        if (typeof L !== 'undefined' && mapEl) {
            mapEl.style.display = 'block';
            var map = mapEl._leafletMap;

            if (!map) {
                map = L.map(mapEl, {
                    dragging: true, zoomControl: true, touchZoom: true,
                    scrollWheelZoom: true, doubleClickZoom: true,
                    boxZoom: false, keyboard: false, attributionControl: true
                }).setView([lat, lng], 16);

                L.tileLayer('/api/1/GeoTagApi/Tile?s={s}&z={z}&x={x}&y={y}', {
                    attribution: '© OpenStreetMap',
                    subdomains: ['a', 'b', 'c']
                }).addTo(map);

                mapEl._leafletMap = map;
            } else {
                map.flyTo([lat, lng], 16, { duration: 1.5 });
            }

            if (mapEl._leafletMarker) {
                mapEl._leafletMarker.setLatLng([lat, lng]);
            } else {
                mapEl._leafletMarker = L.marker([lat, lng]).addTo(map);
            }

            setTimeout(function () { map.invalidateSize(); }, 200);
        }

        // Reverse geocoding (non-blocking)
        f_GeoTagReverseGeocode(safeId, lat, lng);

        // Reset button to "Recapture" state
        if (btnEl) {
            btnEl.disabled = false;
            btnEl.innerHTML = '<i class="ti ti-refresh me-2"></i>Recapture Location';
        }
    } catch (err) {
        console.error("Error setting location from Flutter: ", err);
    }
};

/**
 * Flutter Callback: Handles failed location capture / permission denied sent from native app.
 */
window.onLocationFailedFromFlutter = function (safeId, errorMessage) {
    console.warn("Location capture failed from Flutter for safeId: " + safeId + ", error: " + errorMessage);
    document.getElementById('geotag_status_' + safeId).value = 'PERMISSION_DENIED';
    f_GeoTagError(safeId, errorMessage || 'Location access denied.');
};

/**
 * Handles GeoTag field error state.
 */
function f_GeoTagError(safeId, message) {
    var btnEl = document.getElementById('geotag_btn_' + safeId);
    var infoEl = document.getElementById('geotag_info_' + safeId);

    if (btnEl) {
        btnEl.disabled = false;
        btnEl.innerHTML = '<i class="ti ti-map-pin me-2"></i>Capture Location';
    }

    if (infoEl) {
        infoEl.style.display = 'block';
        document.getElementById('geotag_address_' + safeId).textContent = message;
        document.getElementById('geotag_coords_' + safeId).textContent = '—';
        document.getElementById('geotag_time_' + safeId).textContent = '—';
        document.getElementById('geotag_accuracy_' + safeId).textContent = '—';
    }
}

// =========================================================================
// REVERSE GEOCODING (Server-side proxy, cached)
// =========================================================================
var _geoTagNominatimCache = {};
var _geoTagNominatimLastCall = 0;
var _geoTagNominatimMinInterval = 1100;

function f_GeoTagReverseGeocode(safeId, lat, lng) {
    var addressEl = document.getElementById('geotag_address_' + safeId);
    if (!addressEl) return;

    var cacheKey = lat.toFixed(4) + ',' + lng.toFixed(4);
    if (_geoTagNominatimCache[cacheKey]) {
        addressEl.textContent = _geoTagNominatimCache[cacheKey];
        return;
    }

    addressEl.textContent = 'Looking up address...';

    var now = Date.now();
    var elapsed = now - _geoTagNominatimLastCall;
    var delay = elapsed < _geoTagNominatimMinInterval ? (_geoTagNominatimMinInterval - elapsed) : 0;

    setTimeout(function () {
        _geoTagNominatimLastCall = Date.now();
        var url = '/api/1/GeoTagApi/ReverseGeocode?lat=' + lat + '&lon=' + lng;

        var controller = new AbortController();
        var timeoutId = setTimeout(function () { controller.abort(); }, 5000);

        fetch(url, { signal: controller.signal })
            .then(function (response) {
                clearTimeout(timeoutId);
                if (!response.ok) throw new Error('Proxy error');
                return response.json();
            })
            .then(function (data) {
                var result = data.data || data;
                if (result && result.display_name) {
                    _geoTagNominatimCache[cacheKey] = result.display_name;
                    addressEl.textContent = result.display_name;
                } else {
                    addressEl.textContent = lat.toFixed(7) + ', ' + lng.toFixed(7);
                }
            })
            .catch(function () {
                clearTimeout(timeoutId);
                addressEl.textContent = lat.toFixed(7) + ', ' + lng.toFixed(7);
            });
    }, delay);
}

// =========================================================================
// AUTO-INIT: Initialize default maps for all GeoTag fields after form render
// =========================================================================
// Note: DOMContentLoaded fires before FlexForm dynamic rendering completes.
// We use MutationObserver to detect when GeoTag fields are added to DOM.
(function () {
    var initialized = {};

    function initGeoTagMaps() {
        var geoTagFields = document.querySelectorAll('[data-geotag="true"]');
        geoTagFields.forEach(function (el) {
            var id = el.id;
            if (!id || initialized[id]) return;
            var safeId = id.replace('geotag_', '');
            var mapEl = document.getElementById('geotag_map_' + safeId);
            if (mapEl && !mapEl._leafletMap) {
                f_GeoTagInitMap(safeId);
                initialized[id] = true;
            }
        });
    }

    // Try on DOMContentLoaded
    document.addEventListener('DOMContentLoaded', function () {
        setTimeout(initGeoTagMaps, 800);
    });

    // Also observe DOM for dynamically added GeoTag fields
    if (typeof MutationObserver !== 'undefined') {
        var observer = new MutationObserver(function () {
            setTimeout(initGeoTagMaps, 300);
        });
        // Start observing once DOM is ready
        if (document.body) {
            observer.observe(document.body, { childList: true, subtree: true });
        } else {
            document.addEventListener('DOMContentLoaded', function () {
                observer.observe(document.body, { childList: true, subtree: true });
            });
        }
    }
})();
