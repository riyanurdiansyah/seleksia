"use strict";

// Get base URL from hidden field injected by Layout
var _baseUrl = (function () {
    var input = document.getElementById('base_path');
    return input ? input.value : '';
})();

var _ffMasterData = null;

if (typeof _ffQueryParams === 'undefined') var _ffQueryParams = {};

function f_BuildMobileListUrl() {
    var url = _baseUrl + '/Api/1/FillFormApi/GetFillFormListHtmlMobile';
    var sep = '?';
    if (_ffQueryParams.TxtUsername)        { url += sep + 'TxtUsername='        + encodeURIComponent(_ffQueryParams.TxtUsername);        sep = '&'; }
    if (_ffQueryParams.IntJabatanId)       { url += sep + 'IntJabatanId='       + encodeURIComponent(_ffQueryParams.IntJabatanId);       sep = '&'; }
    if (_ffQueryParams.TxtSource)          { url += sep + 'TxtSource='          + encodeURIComponent(_ffQueryParams.TxtSource);          sep = '&'; }
    if (_ffQueryParams.IntCabangID)        { url += sep + 'IntCabangID='        + encodeURIComponent(_ffQueryParams.IntCabangID);        sep = '&'; }
    if (_ffQueryParams.IntCabangPrimaryID) { url += sep + 'IntCabangPrimaryID=' + encodeURIComponent(_ffQueryParams.IntCabangPrimaryID); sep = '&'; }
    return url;
}

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
            // Merge queryParams from API response into _ffQueryParams (flexible count)
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
// MAIN RENDERER (Adapted for native mobile layouts)
// =========================================================================
function f_RenderFillForm(masterData) {
    var container = document.getElementById('ffFillInner');
    if (!container || !masterData) return;

    var htmlContent = f_RenderFormNode(masterData, 0);

    // C. Submit button (Sticky bottom submit bar)
    htmlContent += `
        <div class="nav-buttons-container">
            <button type="button" id="btnSubmitFillForm"
                class="btn btn-success d-flex align-items-center justify-content-center w-100"
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

function f_InitGeoTagSessions(masterData) {
    if (typeof GeoTelemetryCollector === 'undefined') return;
    var geoTagFields = document.querySelectorAll('[data-geotag="true"]');
    if (geoTagFields.length === 0) return;
    var fieldNames = [];
    geoTagFields.forEach(function (el) {
        var fn = el.getAttribute('data-field-name');
        if (fn) fieldNames.push(fn);
    });
    if (fieldNames.length === 0) return;
    GeoTelemetryCollector.initFieldSessions(masterData.pkFlexFormId, fieldNames)
        .then(function (success) { if (!success) console.warn('[FillForm] GeoTag session init failed'); })
        .catch(function (err) { console.error('[FillForm] GeoTag session init error:', err); });
}

function f_RenderFormNode(form, level) {
    var htmlContent = '';
    var colors = ['#28c76f', '#00cfe8', '#7367f0', '#ff9f43', '#ea5455'];
    var borderColor = colors[level % colors.length];

    // Mobile containers are fully clean and stack nicely without left indentation borders
    var containerStyle = '';

    htmlContent += `<div style="${containerStyle}">`;

    if (level === 0) {
        if (form.txtFormDesc) {
            htmlContent += `
                <div class="native-form-desc-card">
                    <p class="mb-0">${form.txtFormDesc}</p>
                </div>`;
        }
    } else {
        htmlContent += `
            <div class="mt-4 mb-3 border-bottom pb-2">
                <h4 class="fw-bold" style="color:${borderColor} !important; font-size: 16px;"><i class="ti ti-layers-intersect me-2"></i>${form.txtFormName || 'Child Form'}</h4>
                <p class="text-muted m-0" style="font-size:0.8rem;">${form.txtFormDesc || ''}</p>
            </div>`;
    }

    var today = new Date(); today.setHours(0, 0, 0, 0);
    var allVersions = form.Versions || form.versions || [];
    var activeVer = allVersions.find(function (v) {
        var s = new Date(v.dtStartDate); s.setHours(0, 0, 0, 0);
        var e = v.dtEndDate ? new Date(v.dtEndDate) : new Date('9999-12-31'); e.setHours(0, 0, 0, 0);
        return s <= today && e >= today;
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

        htmlContent += `<div id="${cid}" class="w-100 d-flex flex-column gap-2 mb-3 mt-3"></div>`;
        htmlContent += `
        <button type="button" class="btn btn-outline-primary shadow-sm w-100 py-3 fw-bold mb-4"
            style="border-radius:10px; border-style:dashed; border-width:1.5px; border-color:${colors[(level + 1) % colors.length]}!important; color:${colors[(level + 1) % colors.length]}!important;"
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
        var cid = idPrefix + child.pkFlexFormId + '-' + level;
        var cidEl = document.getElementById(cid);
        if (cidEl && cidEl.children.length === 0) {
            f_AddChildFormRow(cid, encodeURIComponent(JSON.stringify(child)), level + 1);
        }
        f_InitInitialChildForms(child, level + 1, idPrefix);
    });
}

function f_PrevRenderCardItem(item) {
    if (item.bolActive === false) return '';
    var reqBadge = item.bolMandatory ? '<span class="text-danger ms-1">*</span>' : '';
    var descHtml = item.txtFieldDesc
        ? `<small class="text-muted d-block mb-2" style="font-size:0.75rem;"><i class="ti ti-info-circle"></i> ${item.txtFieldDesc}</small>`
        : '';
    return `
        <div class="g-form-card question-card">
            <label class="form-label">${item.txtFieldName || ''} ${reqBadge}</label>
            ${descHtml}
            <div class="input-wrapper">${f_BuildInputControl(item)}</div>
        </div>`;
}

// =========================================================================
// PLUGIN INIT
// f_InitDynamicPlugins defined in FlexFormPreview.js (loaded first).
// Mobile (WebView): flatpickr used with disableMobile:true via f_InitDynamicPlugins (defined in FlexFormPreview.js, loaded first).
// =========================================================================
document.addEventListener('shown.bs.collapse', function (event) {
    if (typeof f_InitDynamicPlugins === 'function') f_InitDynamicPlugins(event.target);
});

// =========================================================================
// LIVE REGEX HELPERS
// =========================================================================
function f_extractCharClass(pattern) {
    var m = pattern.match(/^\^?\[([^\]]+)\][+*]\$$/);
    return m ? m[1] : null;
}

function f_liveValidateRegex(el, pat) {
    try {
        var re = new RegExp(pat);
        var prev = el.getAttribute('data-prev-val') || '';
        var v = el.value;
        // Toleransi titik gantung saat mengetik desimal: "12." lolos jika "12" valid,
        // regex mengizinkan titik, dan itu satu-satunya titik (max 1 titik).
        // Nilai final tetap divalidasi pattern attribute saat submit.
        var pendingDot = v.slice(-1) === '.' && v.indexOf('.') === v.length - 1
            && pat.indexOf('\\.') !== -1 && re.test(v.slice(0, -1));
        if (v !== '' && !re.test(v) && !pendingDot) {
            el.value = prev;
        } else {
            el.setAttribute('data-prev-val', el.value);
        }
        el.setCustomValidity('');
    } catch (e) { el.setCustomValidity(''); }
}

// =========================================================================
// INPUT CONTROL BUILDER (Mobile Optimized HTML DOM)
// =========================================================================
function f_BuildInputControl(item, customName, rowId) {
    var typeDesc = item.fieldTypeDesc || '';
    var inputName = customName || item.txtFieldName || 'field';
    var fileKeyBase = item.pkFlexFormDtlItemId || '';
    var fileKey = (rowId && fileKeyBase) ? (fileKeyBase + '__' + rowId) : fileKeyBase;
    var reqAttr = item.bolMandatory ? 'required' : '';
    var safeId = (item.pkFlexFormDtlItemId || ('ff_' + Math.floor(Math.random() * 1e9)))
        + '_' + Math.floor(Math.random() * 9999);

    var customReqMsg = '';
    if (item.bolMandatory && item.txtJsonObjMandatoryException) {
        try {
            var mObj = typeof item.txtJsonObjMandatoryException === 'string'
                ? JSON.parse(item.txtJsonObjMandatoryException)
                : item.txtJsonObjMandatoryException;
            if (mObj.message) customReqMsg = 'oninvalid="this.setCustomValidity(\'' + mObj.message + '\')" oninput="this.setCustomValidity(\'\')"';
        } catch (e) { }
    }

    var ruleHtmlAttrs = '';
    var acceptTypes = [];
    var rMin = 0, rMax = 100, rStep = 1, rMaxStars = 5;

    (item.Rules || item.rules || []).forEach(function (r) {
        var rc = (r.ruleTypeCode || r.RuleTypeCode || '');
        var rl = (r.ruleLabel || r.RuleLabel || '');
        var rv = (r.ruleValue || r.RuleValue || '');
        var rx = (r.ruleRegexValue || r.RuleRegexValue || '');
        if (rc === 'MIME_TYPE') acceptTypes.push(rv);
        if (rx) ruleHtmlAttrs += ' pattern="' + rx.replace(/"/g, '&quot;') + '" title="' + (rl || 'Invalid format') + '" ';
        if (rc === 'LENGTH') {
            var lbl = rl.toLowerCase();
            var lm = rl.match(/\d+/);
            if (lbl.includes('max') && lm) ruleHtmlAttrs += ' maxlength="' + lm[0] + '" ';
            if (lbl.includes('min') && lm) ruleHtmlAttrs += ' minlength="' + lm[0] + '" ';
        }
        if (rc === 'RANGE') {
            var pts = (rl || rv).split(/\s*-\s*/);
            if (pts.length === 2) { rMin = parseFloat(pts[0]) || 0; rMax = parseFloat(pts[1]) || 100; }
        }
        if (rc === 'OTHER') {
            if (rl.toLowerCase().includes('step')) { var sm = rl.match(/\d+(\.\d+)?/); if (sm) rStep = parseFloat(sm[0]); }
            if (rl.toLowerCase().includes('star')) { var stm = rl.match(/\d+/); if (stm) rMaxStars = parseInt(stm[0]); }
        }
    });
    if (acceptTypes.length > 0) ruleHtmlAttrs += ' accept="' + acceptTypes.join(',') + '" ';

    switch (typeDesc) {
        case 'TextBox': {
            var regexPat = '';
            (item.Rules || item.rules || []).forEach(function (r) {
                var rx2 = (r.ruleRegexValue || r.RuleRegexValue || '');
                if (rx2 && !regexPat) regexPat = rx2;
            });

            var oninvalidVal = '';
            var oninputParts = [];

            var mMatch = customReqMsg.match(/oninvalid="([^"]*)"/); if (mMatch) oninvalidVal = mMatch[1];
            if (oninvalidVal) oninputParts.push("this.setCustomValidity('')");

            if (regexPat) {
                var charCls = f_extractCharClass(regexPat);
                if (charCls !== null) {
                    oninputParts.push("this.value=this.value.replace(/[^" + charCls + "]/g,'')");
                } else {
                    var escapedPat = regexPat.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
                    oninputParts.push("f_liveValidateRegex(this,'" + escapedPat + "')");
                }
            }

            var oninputAttr = oninputParts.length > 0 ? ` oninput="${oninputParts.join(';')}"` : '';
            var oninvalidAttr = oninvalidVal ? ` oninvalid="${oninvalidVal}"` : '';

            return `<input type="text" name="${inputName}" class="form-control" placeholder="Type here..." data-prev-val="" ${reqAttr} ${ruleHtmlAttrs}${oninvalidAttr}${oninputAttr}>`;
        }

        case 'TextArea':
            return `<textarea name="${inputName}" class="form-control" rows="3" placeholder="Type here..." ${reqAttr} ${ruleHtmlAttrs} ${customReqMsg}></textarea>`;

        case 'ContextEditor':
            return `<div class="w-100"><textarea id="cke_${safeId}" name="${inputName}" class="ckeditor-dynamic" ${reqAttr} ${customReqMsg}></textarea></div>`;

        case 'CheckBox':
        case 'Check Box': {
            var chkOpts = (item.options && item.options.length) ? item.options : [];
            var chkDepAttr = '';
            var chkHasDep = !!item.txtJsonObjDependency;
            if (item.txtJsonObjDependency) {
                var chkDepStr = typeof item.txtJsonObjDependency === 'string'
                    ? item.txtJsonObjDependency : JSON.stringify(item.txtJsonObjDependency);
                chkDepAttr = ' data-dependency="' + encodeURIComponent(chkDepStr) + '"';
            }
            var h = '<div class="native-option-list ff-dependency-container" data-field-name="' + inputName + '"' + chkDepAttr + '>';
            if (chkHasDep && chkOpts.length === 0) {
                h += '<small class="text-muted fst-italic px-2"><i class="ti ti-hourglass"></i> Loading options...</small>';
            }
            chkOpts.forEach(function (opt, idx) {
                var oid = safeId + '_chk_' + idx;
                var optVal = (typeof opt === 'object' && opt !== null) ? ((opt.value || opt.Id || '') + '||' + (opt.text || opt.ParamDetailName || '')) : (opt + '||' + opt);
                var optText = (typeof opt === 'object' && opt !== null) ? (opt.text || opt.ParamDetailName || String(opt)) : String(opt);
                h += `<label class="native-option-item" for="${oid}">
                    <input type="checkbox" name="${inputName}[]" value="${optVal}" id="${oid}" ${customReqMsg}>
                    <span class="native-option-label">${optText}</span>
                    <div class="native-checkbox-indicator"></div>
                </label>`;
            });
            return h + '</div>';
        }

        case 'Radio':
        case 'RadioButton':
        case 'Radio Button': {
            var radOpts = (item.options && item.options.length) ? item.options : [];
            var radDepAttr = '';
            var radHasDep = !!item.txtJsonObjDependency;
            if (item.txtJsonObjDependency) {
                var radDepStr = typeof item.txtJsonObjDependency === 'string'
                    ? item.txtJsonObjDependency : JSON.stringify(item.txtJsonObjDependency);
                radDepAttr = ' data-dependency="' + encodeURIComponent(radDepStr) + '"';
            }
            if (radHasDep && radOpts.length === 0) {
                return '<div class="ff-dependency-container" data-field-name="' + inputName + '"' + radDepAttr + '>' +
                    '<small class="text-muted fst-italic px-2"><i class="ti ti-hourglass"></i> Loading options...</small></div>';
            }
            // Normalize options to {value, text}
            var radNorm = radOpts.map(function (o) {
                if (typeof o === 'object' && o !== null)
                    return { value: o.value || o.Id || '', text: o.text || o.ParamDetailName || String(o) };
                return { value: String(o), text: String(o) };
            });
            var isYN = radNorm.length <= 2 && radNorm.some(function (o) {
                return o.text.toLowerCase().includes('yes') || o.text.toLowerCase().includes('ya');
            });
            var rh = '';
            if (isYN) {
                rh = '<div class="native-yn-group">';
                radNorm.forEach(function (o, i) {
                    var oid = safeId + '_rad_' + i;
                    var submitVal = o.value + '||' + o.text;
                    var isNo = o.text.toLowerCase().includes('no') || o.text.toLowerCase().includes('tidak');
                    var tog = isNo
                        ? `document.getElementById('rem_${safeId}').style.display='block';document.getElementById('inp_rem_${safeId}').required=true;`
                        : `document.getElementById('rem_${safeId}').style.display='none';document.getElementById('inp_rem_${safeId}').required=false;document.getElementById('inp_rem_${safeId}').value='';`;
                    rh += `<div class="native-yn-item">
                        <input type="radio" name="${inputName}" value="${submitVal}" id="${oid}" data-raw-value="${o.value}" ${reqAttr} ${customReqMsg} onchange="${tog}">
                        <label class="native-yn-label" for="${oid}">${o.text}</label>
                    </div>`;
                });
                rh += `</div><div id="rem_${safeId}" class="remarks-block" style="display:none;animation:ffFadeIn 0.2s;">
                    <input type="text" id="inp_rem_${safeId}" name="${inputName}_Remarks" class="form-control border-danger" placeholder="Provide a reason...">
                </div>`;
            } else {
                rh = '<div class="native-option-list">';
                radNorm.forEach(function (o, i) {
                    var oid = safeId + '_rad_' + i;
                    var submitVal = o.value + '||' + o.text;
                    rh += `<label class="native-option-item" for="${oid}">
                        <input type="radio" name="${inputName}" value="${submitVal}" id="${oid}" data-raw-value="${o.value}" ${reqAttr} ${customReqMsg}>
                        <span class="native-option-label">${o.text}</span>
                        <div class="native-radio-indicator"></div>
                    </label>`;
                });
                rh += '</div>';
            }
            if (radDepAttr) {
                rh = '<div class="ff-dependency-container" data-field-name="' + inputName + '"' + radDepAttr + '>' + rh + '</div>';
            }
            return rh;
        }

        case 'Dropdown':
        case 'DropdownSearch':
        case 'Select': {
            var selOpts = (item.options && item.options.length) ? item.options : null;
            var hasDependencyConfig = !!item.txtJsonObjDependency;
            var needsDataSourceLoad = !hasDependencyConfig && item.bolData && (item.refParamDtlId || item.refParamHdr) && (!selOpts || selOpts.length === 0);
            if (!selOpts || selOpts.length === 0) selOpts = [];
            var depAttr = '';
            if (item.txtJsonObjDependency) {
                var depStr = typeof item.txtJsonObjDependency === 'string'
                    ? item.txtJsonObjDependency : JSON.stringify(item.txtJsonObjDependency);
                depAttr = ' data-dependency="' + encodeURIComponent(depStr) + '"';
            }
            var fieldId = item.pkFlexFormDtlItemId || '';
            var fieldName = item.txtFieldName || '';
            // Prefer refParamDtlId (Id stabil) — refParamHdr = ParamDetailsValue, bisa berubah/duplikat
            var dsAttr = needsDataSourceLoad ? ' data-datasource-ref="' + (item.refParamDtlId || item.refParamHdr) + '"' : '';
            var allOptsJson = encodeURIComponent(JSON.stringify(selOpts));
            var noSearchClass = (typeDesc === 'Dropdown') ? ' select2-no-search' : '';
            var placeholderText = hasDependencyConfig ? 'Loading data...' : 'Select...';
            var startDisabled = hasDependencyConfig ? ' disabled' : '';
            var sh = `<select name="${inputName}" data-field-id="${fieldId}" data-field-name="${fieldName}" data-all-options="${allOptsJson}" class="form-select select2-dynamic${noSearchClass}" ${reqAttr} ${customReqMsg}${depAttr}${dsAttr}${startDisabled}><option value="" selected disabled>${placeholderText}</option>`;
            selOpts.forEach(function (o) {
                if (typeof o === 'object' && o !== null) {
                    var val = o.value || o.Id || o.val || '';
                    var text = o.text || o.ParamDetailName || o.label || '';
                    var submitVal = val + '||' + text;
                    var parentId = o.parentId || o.ParentId || o.refParentId || o.RefParentId || o.refParamDtlIdParent || o.RefParamDtlIdParent || '';
                    var parentAttr = parentId ? ' data-parent-val="' + parentId + '"' : '';
                    sh += `<option value="${submitVal}" data-raw-value="${val}"${parentAttr}>${text}</option>`;
                } else {
                    sh += `<option value="${o}||${o}">${o}</option>`;
                }
            });
            return sh + '</select>';
        }

        case 'DatePicker':
        case 'Date': {
            var fpDateAttrsMob = (typeof f_BuildFlatpickrDataAttrs === 'function') ? f_BuildFlatpickrDataAttrs(item) : '';
            return `<div class="input-group"><input type="text" name="${inputName}" class="form-control flatpickr-dynamic bg-white" placeholder="YYYY-MM-DD" ${reqAttr} ${customReqMsg} ${fpDateAttrsMob} autocomplete="off"></div>`;
        }

        case 'DateTimePicker':
        case 'DateTime': {
            var fpDtAttrsMob = (typeof f_BuildFlatpickrDataAttrs === 'function') ? f_BuildFlatpickrDataAttrs(item) : '';
            return `<div class="input-group"><input type="text" name="${inputName}" class="form-control flatpickr-datetime bg-white" placeholder="YYYY-MM-DD HH:mm" ${reqAttr} ${customReqMsg} ${fpDtAttrsMob} autocomplete="off"></div>`;
        }

        case 'Upload': {
            var mxUp = item.intTotalImage || 1;
            var uh = '<div class="d-flex flex-wrap gap-3 w-100">';
            for (var ui = 1; ui <= mxUp; ui++) {
                var bid = safeId + '_box_' + ui;
                uh += `<div class="position-relative" style="width:80px;height:80px;">
                    <input type="file" name="${fileKey}" id="input_${bid}" class="d-none" ${ruleHtmlAttrs} ${ui === 1 ? reqAttr : ''} ${customReqMsg} onchange="f_PreviewFile(this,'preview_${bid}')">
                    <label for="input_${bid}" class="native-file-slot w-100 h-100">
                        <i class="ti ti-upload"></i>
                        <span>Upload ${ui}</span>
                    </label>
                    <div id="preview_${bid}" class="position-absolute top-0 start-0 w-100 h-100 bg-white border border-primary rounded d-none flex-column align-items-center justify-content-center overflow-hidden shadow-sm" style="z-index:2;">
                        <img id="img_${bid}" src="" class="w-100 h-100 object-fit-cover d-none">
                        <div id="file_icon_${bid}" class="d-none flex-column align-items-center justify-content-center w-100 h-100 bg-white p-1">
                            <i class="ti ti-file-text fs-2 text-secondary"></i>
                            <span class="text-truncate w-100 text-center text-muted fw-bold mt-1" style="font-size:0.6rem;" id="file_name_${bid}"></span>
                        </div>
                        <button type="button" class="position-absolute d-flex align-items-center justify-content-center bg-danger text-white border-0 shadow"
                            style="top:4px;right:4px;width:22px;height:22px;border-radius:50%;z-index:10;padding:0;cursor:pointer;"
                            onclick="f_ClearFile('input_${bid}','preview_${bid}')">
                            <i class="ti ti-x" style="font-size:12px;margin:0;padding:0;"></i>
                        </button>
                    </div>
                </div>`;
            }
            var upLabels = (item.Rules || item.rules || []).map(function (r) { return r.ruleLabel || r.RuleLabel || ''; }).filter(Boolean).join(' | ');
            return uh + `</div><div class="form-text mt-2 text-primary fw-bold" style="font-size:0.75rem;"><i class="ti ti-info-circle"></i> File slots: ${mxUp}. ${upLabels}</div>`;
        }

        case 'Capture': {
            // Route based on uploadMethodDesc
            var _capMethodLow = (item.uploadMethodDesc || '').toLowerCase();
            var _capIsUploadOnly = _capMethodLow.indexOf('upload') !== -1 && _capMethodLow.indexOf('capture') === -1;
            var _capIsHybrid    = _capMethodLow.indexOf('upload') !== -1 && _capMethodLow.indexOf('capture') !== -1;

            if (_capIsHybrid) {
                return f_BuildInputControl(Object.assign({}, item, { fieldTypeDesc: 'UploadCapture' }), customName, rowId);
            }

            if (_capIsUploadOnly) {
                var mxUpC = item.intTotalImage || 1;
                var uhC = '<div class="d-flex flex-wrap gap-3 w-100">';
                for (var uiC = 1; uiC <= mxUpC; uiC++) {
                    var bidC = safeId + '_box_' + uiC;
                    uhC += `<div class="position-relative" style="width:80px;height:80px;">
                        <input type="file" name="${fileKey}" id="input_${bidC}" class="d-none" ${ruleHtmlAttrs} ${uiC === 1 ? reqAttr : ''} ${customReqMsg} onchange="f_PreviewFile(this,'preview_${bidC}')">
                        <label for="input_${bidC}" class="native-file-slot w-100 h-100">
                            <i class="ti ti-upload"></i>
                            <span>Upload ${uiC}</span>
                        </label>
                        <div id="preview_${bidC}" class="position-absolute top-0 start-0 w-100 h-100 bg-white border border-primary rounded d-none flex-column align-items-center justify-content-center overflow-hidden shadow-sm" style="z-index:2;">
                            <img id="img_${bidC}" src="" class="w-100 h-100 object-fit-cover d-none">
                            <div id="file_icon_${bidC}" class="d-none flex-column align-items-center justify-content-center w-100 h-100 bg-white p-1">
                                <i class="ti ti-file-text fs-2 text-secondary"></i>
                                <span class="text-truncate w-100 text-center text-muted fw-bold mt-1" style="font-size:0.6rem;" id="file_name_${bidC}"></span>
                            </div>
                            <button type="button" class="position-absolute d-flex align-items-center justify-content-center bg-danger text-white border-0 shadow"
                                style="top:4px;right:4px;width:22px;height:22px;border-radius:50%;z-index:10;padding:0;cursor:pointer;"
                                onclick="f_ClearFile('input_${bidC}','preview_${bidC}')">
                                <i class="ti ti-x" style="font-size:12px;margin:0;padding:0;"></i>
                            </button>
                        </div>
                    </div>`;
                }
                var upLabelsC = (item.Rules || item.rules || []).map(function (r) { return r.ruleLabel || r.RuleLabel || ''; }).filter(Boolean).join(' | ');
                return uhC + `</div><div class="form-text mt-2 text-primary fw-bold" style="font-size:0.75rem;"><i class="ti ti-info-circle"></i> File slots: ${mxUpC}. ${upLabelsC}</div>`;
            }

            var mxCap = item.intTotalImage || 1;
            var ch = '<div class="d-flex flex-wrap gap-3 w-100 mb-2">';
            for (var ci = 1; ci <= mxCap; ci++) {
                var bid = safeId + '_cap_' + ci;
                ch += `<div class="position-relative" style="width:80px;height:80px;">
                    <input type="file" name="${fileKey}" id="input_${bid}" class="d-none" accept="image/*" capture="environment" ${ci === 1 ? reqAttr : ''} ${customReqMsg} onchange="f_PreviewFile(this,'preview_${bid}')">
                    <button type="button" class="native-file-slot w-100 h-100"
                        onclick="f_ToggleCamera('${safeId}','input_${bid}','preview_${bid}')">
                        <i class="ti ti-camera"></i>
                        <span>Photo ${ci}</span>
                    </button>
                    <div id="preview_${bid}" class="position-absolute top-0 start-0 w-100 h-100 bg-white border border-primary rounded d-none flex-column align-items-center justify-content-center overflow-hidden shadow-sm" style="z-index:2;">
                        <img id="img_${bid}" src="" class="w-100 h-100 object-fit-cover">
                        <button type="button" class="position-absolute d-flex align-items-center justify-content-center bg-danger text-white border-0 shadow"
                            style="top:4px;right:4px;width:22px;height:22px;border-radius:50%;z-index:10;padding:0;cursor:pointer;"
                            onclick="f_ClearFile('input_${bid}','preview_${bid}')">
                            <i class="ti ti-x" style="font-size:12px;margin:0;padding:0;"></i>
                        </button>
                    </div>
                </div>`;
            }
            var capLabels = (item.Rules || item.rules || []).map(function (r) { return r.ruleLabel || r.RuleLabel || ''; }).filter(Boolean).join(' | ');
            return ch + `</div>
                <div class="form-text mt-1 text-primary fw-bold mb-2" style="font-size:0.75rem;"><i class="ti ti-info-circle"></i> Photo slots: ${mxCap}. ${capLabels}</div>
                <div id="cam-container-${safeId}" class="w-100 rounded border p-3 mb-2 shadow-sm bg-dark" style="display:none;animation:ffFadeIn 0.3s;">
                    <div class="d-flex justify-content-between align-items-center mb-2">
                        <span class="text-white fw-bold fs-6"><i class="ti ti-camera"></i> Take Photo</span>
                        <button type="button" class="btn btn-sm btn-outline-light border-0" onclick="f_CloseCameraInline('${safeId}')"><i class="ti ti-x fs-5"></i></button>
                    </div>
                    <video id="video-${safeId}" autoplay playsinline style="width:100%;aspect-ratio:4/3;object-fit:cover;" class="rounded mb-3"></video>
                    <canvas id="canvas-${safeId}" style="display:none;"></canvas>
                    <button type="button" class="btn btn-success w-100 fw-bold py-2 shadow-lg" onclick="f_TakeSnapshotInline('${safeId}')">
                        <i class="ti ti-aperture fs-4 align-middle me-1"></i> Capture Now
                    </button>
                </div>`;
        }

        case 'Upload / Capture':
        case 'UploadCapture': {
            var mxHyb = item.intTotalImage || 1;
            var hh = '<div class="d-flex flex-wrap gap-3 w-100 mb-2">';
            for (var hi = 1; hi <= mxHyb; hi++) {
                var bid = safeId + '_hyb_' + hi;
                hh += `<div class="position-relative" style="width:100px;height:100px;">
                    <input type="file" name="${fileKey}" id="input_${bid}" class="d-none" ${ruleHtmlAttrs} ${hi === 1 ? reqAttr : ''} ${customReqMsg} onchange="f_PreviewFile(this,'preview_${bid}')">
                    <div class="border border-2 border-primary rounded bg-white w-100 h-100 shadow-sm d-flex flex-column align-items-center justify-content-center p-1" style="border-style:dashed!important;">
                        <span class="text-primary fw-bold mb-1 text-center" style="font-size:0.65rem;line-height:1.1;">Slot ${hi}</span>
                        <div class="d-flex gap-1 w-100 h-100">
                            <button type="button" class="btn btn-outline-primary p-0 flex-grow-1 d-flex align-items-center justify-content-center" onclick="document.getElementById('input_${bid}').click()" title="Upload File" style="height:32px;">
                                <i class="ti ti-upload"></i>
                            </button>
                            <button type="button" class="btn btn-outline-primary p-0 flex-grow-1 d-flex align-items-center justify-content-center" onclick="f_ToggleCamera('${safeId}','input_${bid}','preview_${bid}')" title="Open Camera" style="height:32px;">
                                <i class="ti ti-camera"></i>
                            </button>
                        </div>
                    </div>
                    <div id="preview_${bid}" class="position-absolute top-0 start-0 w-100 h-100 bg-white border border-primary rounded d-none flex-column align-items-center justify-content-center overflow-hidden shadow-sm" style="z-index:2;">
                        <img id="img_${bid}" src="" class="w-100 h-100 object-fit-cover d-none">
                        <div id="file_icon_${bid}" class="d-none flex-column align-items-center justify-content-center w-100 h-100 bg-white p-1">
                            <i class="ti ti-file-text fs-2 text-secondary"></i>
                            <span class="text-truncate w-100 text-center text-muted fw-bold mt-1" style="font-size:0.6rem;" id="file_name_${bid}"></span>
                        </div>
                        <button type="button" class="position-absolute d-flex align-items-center justify-content-center bg-danger text-white border-0 shadow"
                            style="top:4px;right:4px;width:22px;height:22px;border-radius:50%;z-index:10;padding:0;cursor:pointer;"
                            onclick="f_ClearFile('input_${bid}','preview_${bid}')">
                            <i class="ti ti-x" style="font-size:12px;margin:0;padding:0;"></i>
                        </button>
                    </div>
                </div>`;
            }
            var hybLabels = (item.Rules || item.rules || []).map(function (r) { return r.ruleLabel || r.RuleLabel || ''; }).filter(Boolean).join(' | ');
            return hh + `</div>
                <div class="form-text mt-1 text-primary fw-bold mb-2" style="font-size:0.75rem;"><i class="ti ti-info-circle"></i> File/photo slots: ${mxHyb}. ${hybLabels}</div>
                <div id="cam-container-${safeId}" class="w-100 rounded border p-3 mb-2 shadow-sm bg-dark" style="display:none;animation:ffFadeIn 0.3s;">
                    <div class="d-flex justify-content-between align-items-center mb-2">
                        <span class="text-white fw-bold fs-6"><i class="ti ti-camera"></i> Take Photo</span>
                        <button type="button" class="btn btn-sm btn-outline-light border-0" onclick="f_CloseCameraInline('${safeId}')"><i class="ti ti-x fs-5"></i></button>
                    </div>
                    <video id="video-${safeId}" autoplay playsinline style="width:100%;aspect-ratio:4/3;object-fit:cover;" class="rounded mb-3"></video>
                    <canvas id="canvas-${safeId}" style="display:none;"></canvas>
                    <button type="button" class="btn btn-success w-100 fw-bold py-2 shadow-lg" onclick="f_TakeSnapshotInline('${safeId}')">
                        <i class="ti ti-aperture fs-4 align-middle me-1"></i> Capture Now
                    </button>
                </div>`;
        }

        case 'Promote Score':
        case 'PromoteScore': {
            var nps = `<div class="w-100 pt-2 pb-1">
                <div class="d-flex align-items-center gap-1 mb-2" style="overflow-x:auto;flex-wrap:nowrap;padding-bottom:4px;">`;
            for (var n = rMin; n <= rMax; n++) {
                nps += `<div class="p-0 m-0 flex-shrink-0" style="width:36px;">
                    <input class="btn-check" type="radio" name="${inputName}" value="${n}" id="nps_${safeId}_${n}" ${reqAttr} ${customReqMsg}>
                    <label class="btn btn-outline-success shadow-none p-0 m-0 fw-bold d-flex align-items-center justify-content-center rounded-circle w-100" style="aspect-ratio:1/1;font-size:clamp(0.7rem,2.5vw,1rem);height:36px;" for="nps_${safeId}_${n}">${n}</label>
                </div>`;
            }
            return nps + `</div>
                <div class="d-flex justify-content-between w-100 text-muted px-1">
                    <small class="fw-bold text-danger" style="font-size:0.75rem;">Very Poor</small>
                    <small class="fw-bold text-success" style="font-size:0.75rem;">Very Good</small>
                </div>
            </div>`;
        }

        case 'Rating': {
            var starsHtml = '&#9733;'.repeat(rMaxStars);
            return `<div class="d-flex flex-column align-items-center bg-white border rounded p-3 w-100 overflow-hidden">
                <div style="position:relative;display:inline-block;color:#dee2e6;line-height:1;user-select:none;white-space:nowrap;font-size:clamp(1rem,${Math.round(75 / rMaxStars)}vw,3rem);">
                    <div style="white-space:nowrap;">${starsHtml}</div>
                    <div id="star_fill_${safeId}" class="text-warning" style="position:absolute;top:0;left:0;white-space:nowrap;overflow:hidden;width:0%;pointer-events:none;">${starsHtml}</div>
                    <input type="range" name="${inputName}" min="0" max="${rMaxStars}" step="0.1" value="0"
                        style="position:absolute;top:0;left:0;width:100%;height:100%;opacity:0;cursor:pointer;margin:0;"
                        oninput="document.getElementById('star_fill_${safeId}').style.width=(this.value/${rMaxStars}*100)+'%';document.getElementById('star_val_${safeId}').innerText=parseFloat(this.value).toFixed(1);" ${reqAttr} ${customReqMsg}>
                </div>
                <div class="mt-3 text-center">
                    <span class="badge bg-warning text-dark shadow-sm" style="font-size:1.2rem;" id="star_val_${safeId}">0.0</span>
                    <span class="text-muted fw-bold ms-1" style="font-size:1rem;">/ ${rMaxStars}</span>
                </div>
            </div>`;
        }

        case 'Slider': {
            if (rStep > (rMax - rMin) || rStep <= 0) rStep = 1;
            var startVal = rMin >= 1 ? rMin : 1;
            return `<div class="d-flex flex-column w-100 bg-white p-3 rounded border">
                <div class="d-flex justify-content-between mb-2">
                    <small class="text-muted fw-bold">Min: ${rMin}</small>
                    <small class="text-muted fw-bold">Max: ${rMax}</small>
                </div>
                <input type="range" name="${inputName}" class="form-range" min="${rMin}" max="${rMax}" step="${rStep}" value="${startVal}" id="slider_${safeId}" ${reqAttr}
                    oninput="document.getElementById('slider_val_${safeId}').innerText=this.value">
                <div class="text-center mt-3">
                    <span id="slider_val_${safeId}" class="badge bg-success shadow-sm" style="font-size:1.2rem;padding:0.5rem 1.5rem;border-radius:8px;">${startVal}</span>
                </div>
            </div>`;
        }

        case 'GeoTag':
        case 'Geo Location Tag': {
            var geoReqAttr = item.bolMandatory ? ' data-geotag-required="true"' : '';
            return `<div class="geotag-field-container w-100" id="geotag_${safeId}" data-field-name="${inputName}" data-geotag="true"${geoReqAttr}>
                <div id="geotag_map_${safeId}" class="geotag-map-container rounded border mb-2" style="min-height:200px;width:100%;background:#f8f9fa;"></div>
                <div id="geotag_info_${safeId}" class="geotag-info-block bg-light rounded border p-3 mb-2" style="display:none;">
                    <div class="geotag-address text-muted mb-1" style="font-size:0.85rem;"><i class="ti ti-map-pin me-1"></i><span id="geotag_address_${safeId}">—</span></div>
                    <div class="geotag-coords text-muted mb-1" style="font-size:0.85rem;"><i class="ti ti-world me-1"></i><span id="geotag_coords_${safeId}">—</span></div>
                    <div class="geotag-time text-muted mb-1" style="font-size:0.85rem;"><i class="ti ti-clock me-1"></i><span id="geotag_time_${safeId}">—</span></div>
                    <div class="geotag-accuracy text-muted" style="font-size:0.85rem;"><i class="ti ti-antenna-bars-5 me-1"></i><span id="geotag_accuracy_${safeId}">—</span></div>
                </div>
                <button type="button" id="geotag_btn_${safeId}" class="btn btn-outline-success w-100 fw-bold shadow-sm" style="min-height:44px;" onclick="f_GeoTagCapture('${safeId}','${inputName}')">
                    <i class="ti ti-map-pin me-2"></i>Capture Location
                </button>
                <input type="hidden" name="${inputName}_lat" id="geotag_lat_${safeId}" value="">
                <input type="hidden" name="${inputName}_lng" id="geotag_lng_${safeId}" value="">
                <input type="hidden" name="${inputName}_accuracy" id="geotag_acc_${safeId}" value="">
                <input type="hidden" name="${inputName}_timestamp" id="geotag_ts_${safeId}" value="">
                <input type="hidden" name="${inputName}_status" id="geotag_status_${safeId}" value="NOT_CAPTURED">
            </div>`;
        }

        default:
            return `<input type="text" name="${inputName}" class="form-control" placeholder="Type here..." ${reqAttr}>`;
    }
}

// =========================================================================
// CHILD FORM REPEATER
// =========================================================================
function f_AddChildFormRow(containerId, childJsonEncoded, level) {
    var container = document.getElementById(containerId);
    if (!container) return;
    var child = JSON.parse(decodeURIComponent(childJsonEncoded));
    var activeVer = (child.Versions || child.versions || []).find(function (v) { return v.bolActive === true; }) || child.Detail || child.detail || {};
    var items = (activeVer.Items || activeVer.items || []).slice().sort(function (a, b) { return (a.intOrder || 0) - (b.intOrder || 0); });

    var rowId = 'row_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
    var rowNum = container.children.length + 1;
    var showCls = rowNum === 1 ? 'show' : '';
    var btnCls = rowNum === 1 ? '' : 'collapsed';
    var expanded = rowNum === 1 ? 'true' : 'false';

    var colors = ['#28c76f', '#00cfe8', '#7367f0', '#ff9f43', '#ea5455'];
    var borderColor = colors[level % colors.length];
    var safeTitle = child.txtFormName || 'Child';

    var html = `<div id="${rowId}" class="accordion-item bg-white border shadow-sm rounded mb-3" style="border-left: 3px solid ${borderColor}!important; animation:ffFadeIn 0.3s ease;">
        <h2 class="accordion-header d-flex align-items-stretch m-0 bg-white border-bottom">
            <button class="accordion-button ${btnCls} fw-bolder py-3 px-3 shadow-none flex-grow-1 bg-transparent text-dark" style="color:${borderColor}!important;" type="button" data-bs-toggle="collapse" data-bs-target="#col-${rowId}" aria-expanded="${expanded}">
                <i class="ti ti-list me-2 fs-4" style="color:${borderColor};"></i> Item #${rowNum} - ${safeTitle}
            </button>
            <div class="px-3 border-start d-flex align-items-center bg-white">
                <button type="button" class="btn btn-sm btn-outline-danger shadow-sm p-1" onclick="document.getElementById('${rowId}').remove()"><i class="ti ti-trash fs-5"></i></button>
            </div>
        </h2>
        <div id="col-${rowId}" class="accordion-collapse collapse ${showCls}">
            <div class="accordion-body p-3"><div class="row g-0">`;

    items.forEach(function (sub) {
        if (sub.bolActive === false) return;
        var customName = 'CHILDFORM||' + child.pkFlexFormId + '||' + rowId + '||' + sub.txtFieldName;
        var isReq = sub.bolMandatory ? '<span class="text-danger ms-1">*</span>' : '';
        var desc = sub.txtFieldDesc ? '<small class="text-muted d-block mb-2" style="font-size:0.75rem;"><i class="ti ti-info-circle"></i> ' + sub.txtFieldDesc + '</small>' : '';
        html += `<div class="col-12 mb-3 border-bottom pb-2">
            <label class="form-label text-dark fw-bold mb-1" style="font-size:0.9rem;">${sub.txtFieldName} ${isReq}</label>
            ${desc}
            ${f_BuildInputControl(sub, customName, rowId)}
        </div>`;
    });

    html += '</div>';

    var subChildren = child.ChildForms || child.childForms || [];
    subChildren.forEach(function (subC) {
        var cid = 'container-child-' + subC.pkFlexFormId + '-' + rowId;
        var subCJson = encodeURIComponent(JSON.stringify(subC)).replace(/'/g, "%27");
        var cTitle = subC.txtFormName || 'Child';
        html += `
            <div class="mt-4 mb-2 border-bottom pb-2">
                <h5 class="fw-bold" style="color:${colors[(level + 1) % colors.length]}!important; font-size: 14px;"><i class="ti ti-layers-intersect me-2"></i>${cTitle}</h5>
            </div>
            <div id="${cid}" class="w-100 d-flex flex-column gap-2 mb-3"></div>`;
        html += `<button type="button" class="btn btn-outline-primary shadow-sm w-100 py-3 fw-bold mb-4"
            style="border-radius:10px; border-style:dashed; border-width:1.5px; border-color:${colors[(level + 1) % colors.length]}!important; color:${colors[(level + 1) % colors.length]}!important;"
            onclick="f_AddChildFormRow('${cid}','${subCJson}',${level + 1})">
            <i class="ti ti-plus me-1"></i> Add Data ${cTitle}
        </button>`;
    });

    html += '</div></div></div>';
    container.insertAdjacentHTML('beforeend', html);
    f_InitDynamicPlugins(document.getElementById(rowId));
}

// =========================================================================
// SUBMIT METHOD & ACTIONS
// =========================================================================
var FILE_FIELD_TYPES = ['Upload', 'Capture', 'Upload / Capture', 'UploadCapture'];

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

    document.querySelectorAll('.ckeditor-dynamic').forEach(function (el) {
        if (el.ckeditorInstance) el.value = el.ckeditorInstance.getData();
    });

    var details = [];
    var multipart = new FormData();
    var snapshot = f_BuildFormSnapshot(_ffMasterData, formElement, multipart, details, 0, '');
    f_CollectGeoTagAndSubmit(snapshot, details, multipart);
}

function f_CollectGeoTagAndSubmit(snapshot, details, multipart) {
    var btn = document.getElementById('btnSubmitFillForm');
    var geoTagPromise;
    if (typeof GeoTelemetryCollector !== 'undefined' && document.querySelectorAll('[data-geotag="true"]').length > 0) {
        geoTagPromise = GeoTelemetryCollector.getAllPayloads();
    } else {
        geoTagPromise = Promise.resolve([]);
    }

    geoTagPromise.then(function (geoTagPayloads) {
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
            IntCabangPrimaryID: _ffQueryParams.IntCabangPrimaryID || null
        };
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
                        }).then(function () { window.location.replace(f_BuildMobileListUrl()); });
                    } else {
                        alert('Form saved successfully!');
                        window.location.replace(f_BuildMobileListUrl());
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

function f_BuildFormSnapshot(formData, scopeEl, multipart, details, level, parentRowId) {
    var snapshot = f_Clone(formData);
    var activeVer = (snapshot.Versions || []).find(function (v) { return v.bolActive === true; })
        || snapshot.Detail || {};

    snapshot.Detail = activeVer;
    delete snapshot.Versions;

    if (activeVer.Items) {
        activeVer.Items.forEach(function (item) {
            if (item.bolActive === false) return;

            var isFile = FILE_FIELD_TYPES.indexOf(item.fieldTypeDesc || '') !== -1;
            var fileKey = item.pkFlexFormDtlItemId + (parentRowId ? '__' + parentRowId : '');

            if (isFile) {
                scopeEl.querySelectorAll('input[type="file"][name="' + fileKey + '"]')
                    .forEach(function (inp) {
                        if (inp.files) Array.from(inp.files).forEach(function (f) {
                            if (f.size > 0) multipart.append(fileKey, f);
                        });
                    });
                item.txtValue = '[FILE:' + fileKey + ']';
                item.isFileField = true;
                item.fileKey = fileKey;
                details.push({ refFlexFormDtlItemId: item.pkFlexFormDtlItemId, isFileField: true, fileKey: fileKey });
            } else {
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

    var children = snapshot.ChildForms || [];
    if (children.length > 0) {
        var processedChildren = [];
        children.forEach(function (child) {
            var containerId = 'container-child-' + child.pkFlexFormId + '-' + (level === 0 ? '0' : parentRowId);
            var containerEl = document.getElementById(containerId);
            if (!containerEl) return;

            var childRows = [];
            Array.from(containerEl.querySelectorAll(':scope > .accordion-item')).forEach(function (rowEl) {
                var rowId = rowEl.id;
                var rowSnapshot = f_BuildFormSnapshot(child, rowEl, multipart, details, level + 1, rowId);
                childRows.push(rowSnapshot);
            });

            if (childRows.length > 0) {
                child.Rows = childRows;
                processedChildren.push(child);
            }
        });
        snapshot.ChildForms = processedChildren;
    }

    return snapshot;
}

function f_GetInputValue(scope, fieldName) {
    var geoTagContainer = scope.querySelector('[data-geotag="true"][data-field-name="' + fieldName + '"]');
    if (geoTagContainer) {
        var safeId = (geoTagContainer.id || '').replace('geotag_', '');
        var lat = (document.getElementById('geotag_lat_' + safeId) || {}).value || null;
        var lng = (document.getElementById('geotag_lng_' + safeId) || {}).value || null;
        var acc = (document.getElementById('geotag_acc_' + safeId) || {}).value || null;
        var ts = (document.getElementById('geotag_ts_' + safeId) || {}).value || null;
        var status = (document.getElementById('geotag_status_' + safeId) || {}).value || 'NOT_CAPTURED';
        if (lat && lng) {
            return JSON.stringify({ latitude: lat, longitude: lng, accuracy: acc, timestamp: ts, status: status });
        }
        return status === 'NOT_CAPTURED' ? 'NOT_CAPTURED' : null;
    }

    var inputs = Array.from(scope.querySelectorAll(
        '[name="' + fieldName + '"], [name="' + fieldName + '[]"]'
    )).filter(function (el) { return el.type !== 'file'; });

    if (inputs.length === 0) return null;

    if (inputs[0].type === 'radio' || inputs[0].type === 'checkbox') {
        var checked = inputs.filter(function (i) { return i.checked; }).map(function (i) { return i.value; });
        return checked.length > 0 ? checked.join(', ') : null;
    }

    return inputs[0].value || null;
}

// =========================================================================
// FILE & CAMERA HELPERS (Identical for Flutter Native WebView)
// =========================================================================
function f_PreviewFile(inputEl, previewBoxId) {
    var previewBox = document.getElementById(previewBoxId);
    var bid = previewBoxId.replace('preview_', '');
    var imgEl = document.getElementById('img_' + bid);
    var iconEl = document.getElementById('file_icon_' + bid);
    var nameEl = document.getElementById('file_name_' + bid);

    if (!(inputEl.files && inputEl.files[0])) return;
    var file = inputEl.files[0];
    previewBox.classList.remove('d-none');
    previewBox.classList.add('d-flex');

    if (file.type.startsWith('image/')) {
        var reader = new FileReader();
        reader.onload = function (e) {
            if (imgEl) { imgEl.src = e.target.result; imgEl.classList.remove('d-none'); }
            if (iconEl) iconEl.classList.add('d-none');
        };
        reader.readAsDataURL(file);
    } else {
        if (imgEl) imgEl.classList.add('d-none');
        if (iconEl) { iconEl.classList.remove('d-none'); iconEl.classList.add('d-flex'); }
        if (nameEl) nameEl.innerText = file.name;
    }
}

function f_ClearFile(inputId, previewBoxId) {
    var inp = document.getElementById(inputId);
    var box = document.getElementById(previewBoxId);
    if (inp) inp.value = '';
    if (box) { box.classList.remove('d-flex'); box.classList.add('d-none'); }
}

function f_ToggleCamera(containerId, targetInputId, targetPreviewId) {
    if (window.FlutterUploadChannel) {
        window.FlutterUploadChannel.postMessage(JSON.stringify({
            action: 'take_photo',
            inputId: targetInputId
        }));
        return;
    }

    _ffCurrentCaptureInput = targetInputId;
    _ffCurrentCapturePreview = targetPreviewId;

    var camDiv = document.getElementById('cam-container-' + containerId);
    var video = document.getElementById('video-' + containerId);

    if (camDiv && camDiv.style.display === 'block') {
        f_CloseCameraInline(containerId);
        return;
    }

    var canUseWebRTC = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)
        && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1');

    if (canUseWebRTC && camDiv) {
        navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
            .then(function (stream) {
                _ffActiveStream = stream;
                video.srcObject = stream;
                camDiv.style.display = 'block';
                camDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            })
            .catch(function (err) {
                console.warn('getUserMedia gagal, fallback ke file picker:', err);
                var inp = document.getElementById(targetInputId);
                if (inp) inp.click();
            });
    } else {
        var inp = document.getElementById(targetInputId);
        if (inp) inp.click();
    }
}

function f_CloseCameraInline(containerId) {
    var camDiv = document.getElementById('cam-container-' + containerId);
    if (_ffActiveStream) { _ffActiveStream.getTracks().forEach(function (t) { t.stop(); }); _ffActiveStream = null; }
    if (camDiv) camDiv.style.display = 'none';
    _ffCurrentCaptureInput = _ffCurrentCapturePreview = null;
}

function f_TakeSnapshotInline(containerId) {
    var video = document.getElementById('video-' + containerId);
    var canvas = document.getElementById('canvas-' + containerId);
    var inp = document.getElementById(_ffCurrentCaptureInput);
    if (!video || !video.videoWidth || !inp) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(function (blob) {
        var dt = new DataTransfer();
        dt.items.add(new File([blob], 'Cam_' + Date.now() + '.jpg', { type: 'image/jpeg' }));
        inp.files = dt.files;
        f_PreviewFile(inp, _ffCurrentCapturePreview);
        f_CloseCameraInline(containerId);
    }, 'image/jpeg', 0.9);
}

// =========================================================================
// FLUTTER MOBILE WEBVIEW INTEGRATION (Bridge to Native Camera/Picker)
// =========================================================================
document.addEventListener('click', function (e) {
    if (typeof window.FlutterUploadChannel !== 'undefined') {
        var inputEl = e.target.closest('input[type="file"]');
        if (inputEl) {
            e.preventDefault();
            e.stopPropagation();

            var inputId = inputEl.id;
            window.FlutterUploadChannel.postMessage(JSON.stringify({
                action: 'pick_file',
                inputId: inputId
            }));
        }
    }
}, true);

window.onFileSelectedFromFlutter = function (inputId, base64Data, fileName, mimeType) {
    try {
        console.log("File received from Flutter for: " + inputId);

        var byteCharacters = atob(base64Data);
        var byteNumbers = new Array(byteCharacters.length);
        for (var i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        var byteArray = new Uint8Array(byteNumbers);
        var blob = new Blob([byteArray], { type: mimeType });
        var file = new File([blob], fileName, { type: mimeType });

        var inputEl = document.getElementById(inputId);
        if (inputEl) {
            var container = new DataTransfer();
            container.items.add(file);
            inputEl.files = container.files;

            var event = new Event('change', { bubbles: true });
            inputEl.dispatchEvent(event);
        }
    } catch (e) {
        console.error("Error setting file from Flutter: ", e);
    }
};
