import EmailTemplateClient from "./EmailTemplateClient";

export const metadata = {
    title: "Email Templates - Admin Panel",
    description: "Manage email templates for candidate invitations",
};

export default function EmailTemplatePage() {
    return <EmailTemplateClient />;
}
