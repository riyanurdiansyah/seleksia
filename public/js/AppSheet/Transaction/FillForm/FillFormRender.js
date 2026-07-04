"use strict";

// Get base URL from hidden field injected by Layout
var _baseUrl = (function () {
    var input = document.getElementById('base_path');
    return input ? input.value : '';
})();

var _ffMasterData = null;

// Query params context — fallback empty jika tidak di-inject oleh view
if (typeof _ffQueryParams === 'undefined') var _ffQueryParams = {};

// =========================================================================
// LOAD FORM DATA + RENDER ON PAGE LOAD
// =========================================================================
document.addEventListener('DOMContentLoaded', function () {
    // Extract query params from current URL → populate _ffQueryParams (for fetch-based flow)
    if (!_ffQueryParams || Object.keys(_ffQueryParams).length === 0) {
        var urlParams = new URLSearchParams(window.location.search);
        urlParams.forEach(function (value, key) {
            if (key.toLowerCase() !== 'id') _ffQueryParams[key] = value;
        });
    }

    // Log _ffQueryParams for debugging
    console.log('[FillForm] _ffQueryParams:', _ffQueryParams, '| Total keys:', Object.keys(_ffQueryParams).length);

    // Server-embedded mode: data sudah diset via _ffMasterData, skip fetch
    if (_ffMasterData) {
        f_RenderFillForm(_ffMasterData);
        var overlayEl = document.getElementById('ffLoadingOverlay');
        if (overlayEl) overlayEl.style.display = 'none';
        return;
    }

    if (typeof _ffFormId === 'undefined' || !_ffFormId) {
        document.getElementById('ffLoadingOverlay').style.display = 'none';
        document.getElementById('ffFillInner').innerHTML =
            '<div class="alert alert-danger m-4"><i class="ti ti-alert-circle me-2"></i>Form ID not found.</div>';
        return;
    }

    fetch(_baseUrl + '/Api/1/FillFormApi/GetFormData?id=' + _ffFormId)
        .then(function (res) { return res.json(); })
        .then(function (ret) {
            var responseData = (ret && ret.data) ? ret.data : ret;
            var masterData = responseData;
            // Handle wrapped response: { data: { data: {...}, queryParams: {...} } }
            if (responseData && responseData.data) masterData = responseData.data;
            if (!masterData || !masterData.Header) {
                document.getElementById('ffFillInner').innerHTML =
                    '<div class="alert alert-warning m-4"><i class="ti ti-info-circle me-2"></i>Form data not found.</div>';
                document.getElementById('ffLoadingOverlay').style.display = 'none';
                return;
            }
            // Merge queryParams from API response into _ffQueryParams
            var apiQueryParams = (ret && ret.data && ret.data.queryParams) ? ret.data.queryParams
                : (ret && ret.queryParams) ? ret.queryParams : null;
            if (apiQueryParams && typeof apiQueryParams === 'object') {
                Object.keys(apiQueryParams).forEach(function (k) {
                    if (!_ffQueryParams[k]) _ffQueryParams[k] = apiQueryParams[k];
                });
            }
            _ffMasterData = masterData.Header;
            f_RenderFillForm(_ffMasterData);
            document.getElementById('ffLoadingOverlay').style.display = 'none';
        })
        .catch(function () {
            document.getElementById('ffLoadingOverlay').style.display = 'none';
            document.getElementById('ffFillInner').innerHTML =
                '<div class="alert alert-danger m-4"><i class="ti ti-alert-circle me-2"></i>Failed to load form data.</div>';
        });
});

// =========================================================================
// MAIN RENDERER (same layout as FlexFormPreview / prevflexform.js)
// =========================================================================
function f_RenderFillForm(masterData) {
    var container = document.getElementById('ffFillInner');
    if (!container || !masterData) return;

    var htmlContent = f_RenderFormNode(masterData, 0);

    // C. Submit button
    htmlContent += `
        <div class="nav-buttons-container mb-4 pt-3 border-top mt-5">
            <button type="button" id="btnSubmitFillForm"
                class="btn btn-success d-flex align-items-center justify-content-center w-100 py-3 fs-5 shadow"
                onclick="f_SubmitFillForm()">
                <i class="ti ti-device-floppy me-2"></i> Submit Form
            </button>
        </div>`;

    container.innerHTML = `<div class="container ff-preview-container">${htmlContent}</div>`;

    setTimeout(function () {
        f_InitDynamicPlugins(container);
        f_InitInitialChildForms(masterData, 0, 'container-child-');
        f_InitGeoTagSessions(masterData);
    }, 200);
}

function f_RenderFormNode(form, level) {
    var htmlContent = '';
    var colors = ['#28c76f', '#00cfe8', '#7367f0', '#ff9f43', '#ea5455'];
    var borderColor = colors[level % colors.length];

    var containerStyle = level > 0 ? `margin-left: 1rem; border-left: 4px solid ${borderColor}; padding-left: 1rem;` : '';

    htmlContent += `<div style="${containerStyle}">`;

    if (level === 0) {
        htmlContent += `
            <div class="g-form-card g-header-card p-4 p-md-5 mb-4">
                <h2 class="mb-2 text-dark fw-bold fs-3">${form.txtFormName || '(Untitled)'}</h2>
                <p class="mb-0 text-muted fs-6">${form.txtFormDesc || ''}</p>
            </div>`;
    } else {
        htmlContent += `
            <div class="mt-4 mb-3 border-bottom pb-2">
                <h4 class="fw-bold" style="color:${borderColor} !important;"><i class="ti ti-layers-intersect me-2"></i>${form.txtFormName || 'Child Form'}</h4>
                <p class="text-muted m-0" style="font-size:0.9rem;">${form.txtFormDesc || ''}</p>
            </div>`;
    }

    // Active version: same logic as FlexFormPreview.js (date-range first, then bolActive, then Detail fallback)
    var today = new Date();
    today.setHours(0, 0, 0, 0);

    var allVersions = form.Versions || form.versions || [];
    var activeVer = allVersions.find(function (v) {
        var startDate = new Date(v.dtStartDate);
        var endDate = v.dtEndDate ? new Date(v.dtEndDate) : new Date('9999-12-31');
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(0, 0, 0, 0);
        return startDate <= today && endDate >= today;
    });
    if (!activeVer) activeVer = allVersions.find(function (v) { return v.bolActive === true; });
    if (!activeVer) activeVer = form.Detail || form.detail || {};

    var headerItems = (activeVer.Items || activeVer.items || []).slice().sort(function (a, b) { return (a.intOrder || 0) - (b.intOrder || 0); });

    if (headerItems.length > 0) {
        headerItems.forEach(function (item) { htmlContent += f_PrevRenderCardItem(item); });
    } else if (level === 0) {
        htmlContent += '<div class="alert alert-info m-3"><i class="ti ti-info-circle me-2"></i>No fields in this form.</div>';
    }

    var children = form.ChildForms || form.childForms || [];
    children.forEach(function (child) {
        var cid = 'container-child-' + child.pkFlexFormId + '-' + level;
        var childJson = encodeURIComponent(JSON.stringify(child)).replace(/'/g, "%27");
        var safeTitle = (child.txtFormName || 'Child').replace(/'/g, "\\'");

        htmlContent += `<div id="${cid}" class="w-100 d-flex flex-column gap-3 mb-3 mt-4"></div>`;
        htmlContent += `
        <button type="button" class="btn btn-outline-primary shadow-sm w-100 py-3 fw-bold mb-4"
            style="border-radius:8px;border-style:dashed;border-width:2px;border-color:${colors[(level + 1) % colors.length]}!important;color:${colors[(level + 1) % colors.length]}!important;"
            onclick="f_AddChildFormRow('${cid}', '${childJson}', ${level + 1})">
            <i class="ti ti-plus me-1"></i> Add Data ${safeTitle}
        </button>`;
    });

    htmlContent += `</div>`;
    return htmlContent;
}

function f_InitInitialChildForms(form, level, idPrefix) {
    var children = form.ChildForms || form.childForms || [];
    children.forEach(function (child) {
        var selector = '[id^="' + idPrefix + child.pkFlexFormId + '-"]';
        var containerEls = document.querySelectorAll(selector);
        containerEls.forEach(function (cidEl) {
            if (cidEl && cidEl.children.length === 0) {
                f_AddChildFormRow(cidEl.id, encodeURIComponent(JSON.stringify(child)), level + 1);
            }
        });
        f_InitInitialChildForms(child, level + 1, idPrefix);
    });
}

// =========================================================================
// GEOTAG SESSION INITIALIZATION
// =========================================================================

/**
 * Detects GeoTag fields in the rendered form and initializes GeoTelemetry sessions.
 * Called after form rendering completes.
 */
function f_InitGeoTagSessions(masterData) {
    if (typeof GeoTelemetryCollector === 'undefined') return;

    var geoTagFields = document.querySelectorAll('[data-geotag="true"]');
    if (geoTagFields.length === 0) return;

    var fieldNames = [];
    geoTagFields.forEach(function (el) {
        var fieldName = el.getAttribute('data-field-name');
        if (fieldName) fieldNames.push(fieldName);
    });

    if (fieldNames.length === 0) return;

    var flexFormId = masterData.pkFlexFormId;
    GeoTelemetryCollector.initFieldSessions(flexFormId, fieldNames)
        .then(function (success) {
            if (!success) {
                console.warn('[FillForm] GeoTag session initialization failed');
            }
        })
        .catch(function (err) {
            console.error('[FillForm] GeoTag session initialization error:', err);
        });
}

// =========================================================================
// SUBMIT HANDLER
// =========================================================================
var FILE_FIELD_TYPES = ['Upload', 'Capture', 'Upload / Capture', 'UploadCapture'];

// Helper: deep clone object
function f_Clone(obj) { return JSON.parse(JSON.stringify(obj)); }

// =========================================================================
// Inline mandatory validation — highlight invalid field + show custom message
// =========================================================================
function f_InjectMandatoryCss() {
    if (document.getElementById('ff-mandatory-css')) return;
    var s = document.createElement('style');
    s.id = 'ff-mandatory-css';
    s.textContent = [
        '.ff-invalid .form-control,.ff-invalid .form-select,.ff-invalid .native-date-input,',
        '.ff-invalid .native-datetime-input,.ff-invalid textarea,.ff-invalid input[type=text]{',
        'border-color:#ea5455!important;box-shadow:0 0 0 .15rem rgba(234,84,85,.15)!important;}',
        '.ff-invalid{border-left:3px solid #ea5455;padding-left:.75rem;}',
        '.ff-mandatory-msg{color:#ea5455;font-size:.8rem;font-weight:500;margin-top:.35rem;display:flex;align-items:center;gap:.25rem;}'
    ].join('');
    document.head.appendChild(s);
}

function f_GetMandatoryMessage(inp, card) {
    var raw = card && card.getAttribute ? card.getAttribute('data-exceptions') : null;
    if (raw) { try { var o = JSON.parse(decodeURIComponent(raw)); if (o && o.message) return o.message; } catch (e) { } }
    var oi = inp.getAttribute ? inp.getAttribute('oninvalid') : null;
    if (oi) { var m = oi.match(/setCustomValidity\(\s*'([^']*)'/); if (m && m[1]) return m[1]; }
    return (inp && inp.validationMessage) ? inp.validationMessage : null;
}

function f_ClearInlineErr(e) {
    var card = e.target.closest('.question-card') || e.target.closest('.input-wrapper');
    if (!card) return;
    card.classList.remove('ff-invalid');
    var m = card.querySelector('.ff-mandatory-msg');
    if (m) m.remove();
}

function f_ValidateMandatoryInline(formElement) {
    f_InjectMandatoryCss();
    formElement.querySelectorAll('.ff-mandatory-msg').forEach(function (e) { e.remove(); });
    formElement.querySelectorAll('.ff-invalid').forEach(function (e) { e.classList.remove('ff-invalid'); });

    var invalids = formElement.querySelectorAll(':invalid');
    if (invalids.length === 0) return true;

    if (!formElement._ffInlineBound) {
        formElement._ffInlineBound = true;
        formElement.addEventListener('input', f_ClearInlineErr, true);
        formElement.addEventListener('change', f_ClearInlineErr, true);
    }

    var seen = [];
    invalids.forEach(function (inp) {
        var card = inp.closest('.question-card') || inp.closest('.input-wrapper') || inp.parentElement;
        if (!card) return;
        card.classList.add('ff-invalid');
        if (seen.indexOf(card) !== -1) return;
        seen.push(card);
        var msg = f_GetMandatoryMessage(inp, card);
        if (msg) {
            var div = document.createElement('div');
            div.className = 'ff-mandatory-msg';
            div.innerHTML = '<i class="ti ti-alert-circle"></i><span></span>';
            div.querySelector('span').textContent = msg; // textContent: message admin-authored, prevent HTML injection
            card.appendChild(div);
        }
    });

    var first = invalids[0];
    var acc = first.closest('.accordion-collapse:not(.show)');
    if (acc && typeof bootstrap !== 'undefined') bootstrap.Collapse.getOrCreateInstance(acc).show();
    setTimeout(function () {
        (first.closest('.question-card') || first).scrollIntoView({ behavior: 'smooth', block: 'center' });
        try { first.focus(); } catch (e) { }
    }, 300);
    return false;
}

function f_ShowAnonSuccessPage() {
    history.replaceState({}, document.title, window.location.pathname);
    var title = (_ffMasterData && _ffMasterData.txtFlexFormName) ? _ffMasterData.txtFlexFormName : 'Form';
    document.body.innerHTML = [
        '<div style="min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;',
        'background:#f8f9fa;padding:2rem;text-align:center;">',
        '<div style="background:#fff;border-radius:1rem;padding:2.5rem 2rem;max-width:420px;width:100%;box-shadow:0 4px 24px rgba(0,0,0,.08);">',
        '<div style="font-size:4rem;color:#28c76f;margin-bottom:1rem;">&#10003;</div>',
        '<h4 style="color:#28c76f;font-weight:700;margin-bottom:.5rem;">Form Submitted!</h4>',
        '<p style="color:#6c757d;margin-bottom:1rem;">Thank you. <strong>' + title + '</strong> has been submitted successfully.</p>',
        '<p style="color:#adb5bd;font-size:.85rem;">You may now close this tab.</p>',
        '</div></div>'
    ].join('');
    setTimeout(function () { window.close(); }, 300);
}

function f_ShowSubmitOverlay() {
    var overlay = document.getElementById('ffLoadingOverlay');
    if (!overlay) return;
    var p = overlay.querySelector('p');
    if (p) p.textContent = 'Submitting...';
    overlay.style.display = 'flex';
}
function f_HideSubmitOverlay() {
    var overlay = document.getElementById('ffLoadingOverlay');
    if (overlay) overlay.style.display = 'none';
}

function f_SubmitFillForm() {
    var formElement = document.getElementById('dynamicForm');
    if (!formElement || !_ffMasterData) return;

    // 1. Validasi mandatory (inline highlight + custom message)
    if (!f_ValidateMandatoryInline(formElement)) return;

    // 1b. Validate required GeoTag fields
    if (typeof GeoTelemetryCollector !== 'undefined') {
        var requiredGeoTagFields = document.querySelectorAll('[data-geotag="true"][data-geotag-required="true"]');
        for (var i = 0; i < requiredGeoTagFields.length; i++) {
            var fieldName = requiredGeoTagFields[i].getAttribute('data-field-name');
            var fieldState = GeoTelemetryCollector.getFieldState(fieldName);
            if (!fieldState || !fieldState.isCaptured) {
                if (typeof clsGlobal !== 'undefined')
                    clsGlobal.swalWarning('Please capture the location on field "' + fieldName + '" before submitting.');
                else if (typeof Swal !== 'undefined')
                    Swal.fire({ icon: 'warning', title: 'Location Required', text: 'Please capture the location on field "' + fieldName + '" before submitting.' });
                else
                    alert('Please capture the location on field "' + fieldName + '" before submitting.');
                return;
            }
        }
    }

    // 2. Flush CKEditor
    document.querySelectorAll('.ckeditor-dynamic').forEach(function (el) {
        if (el.ckeditorInstance) el.value = el.ckeditorInstance.getData();
    });

    var details = [];
    var multipart = new FormData();

    // Build full snapshot struktur form + user answers
    var snapshot = f_BuildFormSnapshot(_ffMasterData, formElement, multipart, details, 0, '');

    // 3. Collect GeoTag payloads and submit
    f_CollectGeoTagAndSubmit(snapshot, details, multipart);
}

/**
 * Collects GeoTag payloads (async) then performs the actual form submission.
 */
function f_CollectGeoTagAndSubmit(snapshot, details, multipart) {
    var btn = document.getElementById('btnSubmitFillForm');

    // Retrieve GeoTag payloads if GeoTelemetryCollector is available
    var geoTagPromise;
    if (typeof GeoTelemetryCollector !== 'undefined' && document.querySelectorAll('[data-geotag="true"]').length > 0) {
        geoTagPromise = GeoTelemetryCollector.getAllPayloads();
    } else {
        geoTagPromise = Promise.resolve([]);
    }

    geoTagPromise.then(function (geoTagPayloads) {
        // Build requestJson with geoTagPayloads included
        var requestObj = {
            pkFlexFormId:    _ffMasterData.pkFlexFormId,
            rawPayloadJson:  JSON.stringify(snapshot),
            details:         details,
            txtNonce:        _ffQueryParams.nonce        || null,
            txtAppName:         _ffQueryParams.TxtSource          || null,
            txtEmployeeNIK:     null,
            txtEmployeeName:    _ffQueryParams.TxtUsername         || null,
            txtJabatanName:     _ffQueryParams.jabatanName         || null,
            refJabatanId:       _ffQueryParams.IntJabatanId        || null,
            IntCabangID:        _ffQueryParams.IntCabangID        || null,
            IntCabangPrimaryID: _ffQueryParams.IntCabangPrimaryID || null,
            encParams:       (typeof _ffEncParams !== 'undefined' ? _ffEncParams : null)
        };

        // Include GeoTag payloads in the request if any exist
        if (geoTagPayloads && geoTagPayloads.length > 0) {
            requestObj.geoTagPayloads = geoTagPayloads;
        }

        multipart.append('requestJson', JSON.stringify(requestObj));

        if (btn) { btn.disabled = true; btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span> Saving...'; }
        f_ShowSubmitOverlay();

        var isAnon = typeof _ffEncParams !== 'undefined' && !!_ffEncParams;
        var submitUrl = isAnon
            ? _baseUrl + '/Api/1/FillFormApi/SubmitAnonymousFormWithFiles'
            : _baseUrl + '/Api/1/FillFormApi/SubmitFormWithFiles';

        fetch(submitUrl, {
            method: 'POST',
            body: multipart
        })
            .then(function (res) { return res.json(); })
            .then(function (ret) {
                if (ret && (ret.code === 200 || (ret.data && ret.data.pkFillFormId))) {
                    if (isAnon) {
                        f_ShowAnonSuccessPage();
                    } else if (typeof Swal !== 'undefined') {
                        Swal.fire({
                            icon: 'success', title: 'Success!',
                            text: 'Form saved successfully.',
                            confirmButtonClass: 'btn btn-success',
                            confirmButtonText: 'OK'
                        }).then(function () { window.location.replace(_baseUrl + '/FillForm/Index'); });
                    } else {
                        alert('Form saved successfully!');
                        window.location.replace(_baseUrl + '/FillForm/Index');
                    }
                } else {
                    var errMsg = (ret && ret.message) ? ret.message : 'An error occurred while saving.';
                    f_HideSubmitOverlay();
                    if (typeof Swal !== 'undefined') Swal.fire({ icon: 'error', title: 'Failed', text: errMsg });
                    else alert(errMsg);
                    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="ti ti-device-floppy me-2"></i> Submit Form'; }
                }
            })
            .catch(function () {
                f_HideSubmitOverlay();
                if (typeof Swal !== 'undefined') Swal.fire({ icon: 'error', title: 'Error', text: 'Failed to send data to server.' });
                else alert('Failed to send data.');
                if (btn) { btn.disabled = false; btn.innerHTML = '<i class="ti ti-device-floppy me-2"></i> Submit Form'; }
            });
    }).catch(function (err) {
        console.error('[FillForm] Error collecting GeoTag payloads:', err);
        f_HideSubmitOverlay();
        if (btn) { btn.disabled = false; btn.innerHTML = '<i class="ti ti-device-floppy me-2"></i> Submit Form'; }
        if (typeof Swal !== 'undefined') Swal.fire({ icon: 'error', title: 'Error', text: 'Failed to collect location data.' });
    });
}

// Build full snapshot: clone master data structure + inject user answers
function f_BuildFormSnapshot(formData, scopeEl, multipart, details, level, parentRowId) {
    // Clone form metadata
    var snapshot = f_Clone(formData);

    // Ambil versi aktif
    var activeVer = (snapshot.Versions || []).find(function (v) { return v.bolActive === true; })
        || snapshot.Detail || {};

    // Set sebagai Detail untuk konsistensi response
    snapshot.Detail = activeVer;
    delete snapshot.Versions; // Reduce size

    // Process items: inject user values
    if (activeVer.Items) {
        activeVer.Items.forEach(function (item) {
            if (item.bolActive === false) return;

            var isFile = FILE_FIELD_TYPES.indexOf(item.fieldTypeDesc || '') !== -1;
            var fileKey = item.pkFlexFormDtlItemId + (parentRowId ? '__' + parentRowId : '');

            if (isFile) {
                // Collect files
                scopeEl.querySelectorAll('input[type="file"][name="' + fileKey + '"]')
                    .forEach(function (inp) {
                        if (inp.files) Array.from(inp.files).forEach(function (f) {
                            if (f.size > 0) multipart.append(fileKey, f);
                        });
                    });
                // Placeholder akan di-replace backend dengan URL
                item.txtValue = '[FILE:' + fileKey + ']';
                item.isFileField = true;
                item.fileKey = fileKey;
                details.push({ refFlexFormDtlItemId: item.pkFlexFormDtlItemId, isFileField: true, fileKey: fileKey });
            } else {
                // Get value from input — child rows pakai format CHILDFORM||formId||rowId||fieldName
                var inputName = (level > 0 && parentRowId)
                    ? ('CHILDFORM||' + formData.pkFlexFormId + '||' + parentRowId + '||' + item.txtFieldName)
                    : item.txtFieldName;
                var val = f_GetInputValue(scopeEl, inputName);
                item.txtValue = val;
                item.isFileField = false;
                details.push({ refFlexFormDtlItemId: item.pkFlexFormDtlItemId, txtValueName: val, isFileField: false });
            }
        });
    }

    // Process child forms
    var children = snapshot.ChildForms || [];
    if (children.length > 0) {
        var processedChildren = [];
        children.forEach(function (child) {
            var containerId = 'container-child-' + child.pkFlexFormId + '-' + (level === 0 ? '0' : parentRowId);
            var containerEl = document.getElementById(containerId);
            if (!containerEl) return;

            // Collect all rows for this child
            var childRows = [];
            Array.from(containerEl.querySelectorAll(':scope > .accordion-item')).forEach(function (rowEl) {
                var rowId = rowEl.id;
                var rowSnapshot = f_BuildFormSnapshot(child, rowEl, multipart, details, level + 1, rowId);
                childRows.push(rowSnapshot);
            });

            if (childRows.length > 0) {
                child.Rows = childRows; // Add rows to child snapshot
                processedChildren.push(child);
            }
        });
        snapshot.ChildForms = processedChildren;
    }

    return snapshot;
}

// Helper: baca nilai dari satu input field dalam scope DOM tertentu.
// Menangani: text, textarea, select, radio, checkbox, range, GeoTag.
function f_GetInputValue(scope, fieldName) {
    // GeoTag field — combine hidden inputs into JSON string
    var geoTagContainer = scope.querySelector('[data-geotag="true"][data-field-name="' + fieldName + '"]');
    if (geoTagContainer) {
        var safeId = (geoTagContainer.id || '').replace('geotag_', '');
        var lat = (document.getElementById('geotag_lat_' + safeId) || {}).value || null;
        var lng = (document.getElementById('geotag_lng_' + safeId) || {}).value || null;
        var acc = (document.getElementById('geotag_acc_' + safeId) || {}).value || null;
        var ts = (document.getElementById('geotag_ts_' + safeId) || {}).value || null;
        var status = (document.getElementById('geotag_status_' + safeId) || {}).value || 'NOT_CAPTURED';

        if (lat && lng) {
            return JSON.stringify({
                latitude: lat,
                longitude: lng,
                accuracy: acc,
                timestamp: ts,
                status: status
            });
        }
        return status === 'NOT_CAPTURED' ? 'NOT_CAPTURED' : null;
    }

    var inputs = Array.from(scope.querySelectorAll(
        '[name="' + fieldName + '"], [name="' + fieldName + '[]"]'
    )).filter(function (el) { return el.type !== 'file'; });

    if (inputs.length === 0) return null;

    // Radio / checkbox — hanya yang checked
    if (inputs[0].type === 'radio' || inputs[0].type === 'checkbox') {
        var checked = inputs.filter(function (i) { return i.checked; }).map(function (i) { return i.value; });
        return checked.length > 0 ? checked.join(', ') : null;
    }

    return inputs[0].value || null;
}

// Rekursif: kumpulkan semua rows + nested child forms dalam satu container.
// Dipanggil untuk setiap level nesting child form.
function f_CollectChildRows(childFormData, containerEl, multipart, details) {
    var childActiveVer = (childFormData.Versions || []).find(function (v) { return v.bolActive === true; })
        || childFormData.Detail || {};
    var childItems = (childActiveVer.Items || []).slice()
        .sort(function (a, b) { return (a.intOrder || 0) - (b.intOrder || 0); });

    var rows = [];
    Array.from(containerEl.querySelectorAll(':scope > .accordion-item')).forEach(function (rowEl) {
        var rowId = rowEl.id;
        var rowData = {};

        childItems.forEach(function (item) {
            if (item.bolActive === false) return;
            var isFile = FILE_FIELD_TYPES.indexOf(item.fieldTypeDesc || '') !== -1;
            var alias = item.txtFieldNameForColumnAlias || item.txtFieldName;
            var col = item.txtFieldNameForColumnTable || item.txtFieldName;
            // File key unik per row: GUID__rowId
            var fileKey = item.pkFlexFormDtlItemId + '__' + rowId;
            if (isFile) {
                rowEl.querySelectorAll('input[type="file"][name="' + fileKey + '"]')
                    .forEach(function (inp) {
                        if (inp.files) Array.from(inp.files).forEach(function (f) {
                            if (f.size > 0) multipart.append(fileKey, f);
                        });
                    });
                details.push({ refFlexFormDtlItemId: item.pkFlexFormDtlItemId, isFileField: true, fileKey: fileKey });
                rowData[alias] = { value: '[FILE]', col: col };
            } else {
                var customName = 'CHILDFORM||' + childFormData.pkFlexFormId + '||' + rowId + '||' + item.txtFieldName;
                var val = f_GetInputValue(rowEl, customName);
                details.push({ refFlexFormDtlItemId: item.pkFlexFormDtlItemId, txtValueName: val, isFileField: false });
                rowData[alias] = { value: val, col: col };
            }
        });

        // Rekursi ke sub-children dalam row ini
        var subChildren = childFormData.ChildForms || [];
        if (subChildren.length > 0) {
            var subChildFormsData = [];
            subChildren.forEach(function (subChild) {
                // Sub-child container ID = 'container-child-{subChildId}-{rowId}'
                var subContainerEl = document.getElementById('container-child-' + subChild.pkFlexFormId + '-' + rowId);
                if (!subContainerEl) return;
                var subRows = f_CollectChildRows(subChild, subContainerEl, multipart, details);
                subChildFormsData.push({
                    refFlexFormIdChild: subChild.pkFlexFormId,
                    txtFormName: subChild.txtFormName,
                    Items: subRows
                });
            });
            rowData.ChildFormsData = subChildFormsData;
        }

        rows.push(rowData);
    });

    return rows;
}

