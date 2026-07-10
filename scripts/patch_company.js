const fs = require('fs');
const path = './app/(admin)/master/company/CompanyClient.tsx';
let code = fs.readFileSync(path, 'utf8');

// 1. Import useRbac
if (!code.includes('useRbac')) {
    code = code.replace(
        'import Modal from "../../components/Modal";',
        'import Modal from "../../components/Modal";\nimport { useRbac } from "@/app/hooks/useRbac";'
    );
}

// 2. Initialize useRbac
if (!code.includes('const { access, loading: rbacLoading } = useRbac("/master/company");')) {
    code = code.replace(
        'const [formData, setFormData] = useState({ id: "", name: "", email: "", password: "", smtpUser: "" });',
        'const [formData, setFormData] = useState({ id: "", name: "", email: "", password: "", smtpUser: "" });\n  const { access, loading: rbacLoading } = useRbac("/master/company");'
    );
}

// 3. Hide Add Button
if (code.includes('className="flex items-center gap-2 px-5 py-2.5 rounded-[var(--radius-sm)] bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-accent)] text-white font-bold text-sm shadow-[0_4px_15px_var(--color-primary-glow)] hover:shadow-[0_6px_25px_var(--color-primary-glow)] hover:translate-y-[-1px] active:translate-y-0 transition-all cursor-pointer btn-shine btn-press"')) {
    code = code.replace(
        /<button\s+onClick=\{handleOpenCreate\}\s+className="flex items-center gap-2 px-5 py-2.5 rounded-\[var\(--radius-sm\)\] bg-gradient-to-br from-\[var\(--color-primary\)\] to-\[var\(--color-accent\)\] text-white font-bold text-sm shadow-\[0_4px_15px_var\(--color-primary-glow\)\] hover:shadow-\[0_6px_25px_var\(--color-primary-glow\)\] hover:translate-y-\[-1px\] active:translate-y-0 transition-all cursor-pointer btn-shine btn-press"\s*>\s*<span className="material-symbols-outlined text-\[18px\]">add<\/span>\s*Tambah Perusahaan\s*<\/button>/s,
        `{access.canCreate && (
            <button
              onClick={handleOpenCreate}
              className="flex items-center gap-2 px-5 py-2.5 rounded-[var(--radius-sm)] bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-accent)] text-white font-bold text-sm shadow-[0_4px_15px_var(--color-primary-glow)] hover:shadow-[0_6px_25px_var(--color-primary-glow)] hover:translate-y-[-1px] active:translate-y-0 transition-all cursor-pointer btn-shine btn-press"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              Tambah Perusahaan
            </button>
          )}`
    );
}

// 4. Hide Edit & Delete Buttons inside DataTable columns
if (!code.includes('access.canUpdate')) {
    code = code.replace(
        /<button\s+onClick=\{.*\}\s+className="p-1.5 text-\[var\(--color-text-muted\)\] hover:text-\[var\(--color-primary\)\] hover:bg-\[var\(--color-bg-elevated\)\] rounded-lg transition-colors"\s+title="Edit"\s*>\s*<span className="material-symbols-outlined text-\[18px\]">edit<\/span>\s*<\/button>/g,
        `{access.canUpdate && (
              <button
                onClick={() => handleOpenEdit(row)}
                className="p-1.5 text-[var(--color-text-muted)] hover:text-[var(--color-primary)] hover:bg-[var(--color-bg-elevated)] rounded-lg transition-colors"
                title="Edit"
              >
                <span className="material-symbols-outlined text-[18px]">edit</span>
              </button>
            )}`
    );
}

if (!code.includes('access.canDelete')) {
    code = code.replace(
        /<button\s+onClick=\{.*\}\s+className="p-1.5 text-\[var\(--color-text-muted\)\] hover:text-\[var\(--color-danger\)\] hover:bg-\[var\(--color-danger-light\)\] rounded-lg transition-colors"\s+title="Hapus"\s*>\s*<span className="material-symbols-outlined text-\[18px\]">delete<\/span>\s*<\/button>/g,
        `{access.canDelete && (
              <button
                onClick={() => handleDelete(row.id)}
                className="p-1.5 text-[var(--color-text-muted)] hover:text-[var(--color-danger)] hover:bg-[var(--color-danger-light)] rounded-lg transition-colors"
                title="Hapus"
              >
                <span className="material-symbols-outlined text-[18px]">delete</span>
              </button>
            )}`
    );
}

fs.writeFileSync(path, code);
console.log('patched');
