import RolesClient from "./RolesClient";

export const metadata = {
    title: "Role Management - Admin Panel",
    description: "Manage system roles",
};

export default function RolesPage() {
    return <RolesClient />;
}
