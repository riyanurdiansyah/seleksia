import CompanyClient from "./CompanyClient";

export const metadata = {
  title: "Company Management - Admin Panel",
  description: "Manage companies within the system",
};

export default function CompanyPage() {
  return <CompanyClient />;
}
