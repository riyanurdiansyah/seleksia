import UserClient from "./UserClient";

export const metadata = {
    title: "User Management - Admin Panel",
    description: "Manage system users (Admin, Proctor, User)",
};

export default function UserPage() {
    return <UserClient />;
}
