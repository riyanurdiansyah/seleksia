export default function FooterLinks() {
    return (
        <div className="flex justify-center gap-6 text-sm text-[var(--color-text-muted)] pb-6">
            <a href="#" className="hover:text-primary hover:underline underline-offset-4 transition-all">
                Privacy Policy
            </a>
            <a href="#" className="hover:text-primary hover:underline underline-offset-4 transition-all">
                Technical Support
            </a>
            <a href="#" className="hover:text-primary hover:underline underline-offset-4 transition-all">
                FAQ
            </a>
        </div>
    );
}
