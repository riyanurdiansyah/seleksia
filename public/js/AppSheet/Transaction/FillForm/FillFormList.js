"use strict";

// Get base URL from hidden field injected by Layout
var _baseUrl = (function () {
    var input = document.getElementById('base_path');
    return input ? input.value : '';
})();

var _allForms = [];

function f_RenderFormList(data) {
    var container = document.getElementById('formListContainer');
    if (!container) return;

    container.innerHTML = '';

    if (!data || data.length === 0) {
        container.innerHTML = `
            <div class="text-center mt-5" style="color:#b9b9c3;animation:fadeIn 0.3s ease;">
                <i class="ti ti-file-search mb-2" style="font-size:3rem;"></i>
                <h5 class="fw-bold mt-2">Not found</h5>
                <p>No forms available or no search results.</p>
            </div>`;
        return;
    }

    data.forEach(function (form) {
        var fillUrl = _baseUrl + '/FillForm/Fill?id=' + form.pkFlexFormId;
        var card = `
            <div class="g-list-card" onclick="window.location.href='${fillUrl}'" style="animation:fadeIn 0.3s ease;">
                <div class="d-flex justify-content-between align-items-start mb-2">
                    <div class="card-title-text pe-3">${form.txtFormName || '(Untitled)'}</div>
                    <span class="badge-source text-nowrap">
                        <i class="ti ti-forms me-1"></i>FlexForm
                    </span>
                </div>
                <div class="card-desc">${form.txtFormDesc || '<em class="text-muted">No description.</em>'}</div>
                <div class="dept-info border-top pt-3 mt-2">
                    <i class="ti ti-arrow-right text-success me-1" style="font-size:1rem;"></i>
                    <span class="text-success fw-bold" style="font-size:0.85rem;">Fill Form</span>
                </div>
            </div>`;
        container.insertAdjacentHTML('beforeend', card);
    });
}

document.addEventListener('DOMContentLoaded', function () {
    fetch(_baseUrl + '/Api/1/FillFormApi/GetFormList')
        .then(function (res) { return res.json(); })
        .then(function (ret) {
            _allForms = (ret && ret.data) ? ret.data : (Array.isArray(ret) ? ret : []);
            f_RenderFormList(_allForms);
        })
        .catch(function () {
            document.getElementById('formListContainer').innerHTML =
                '<div class="alert alert-danger m-4"><i class="ti ti-alert-circle me-2"></i>Failed to load form list.</div>';
        });

    var searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', function (e) {
            var kw = e.target.value.toLowerCase();
            var filtered = _allForms.filter(function (f) {
                return (f.txtFormName || '').toLowerCase().includes(kw) ||
                    (f.txtFormDesc || '').toLowerCase().includes(kw);
            });
            f_RenderFormList(filtered);
        });
    }
});
