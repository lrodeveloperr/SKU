import { redirect } from "react-router";

export const loader = () => redirect("/policies");

export default function PrivacyRedirect() {
  return null;
}
