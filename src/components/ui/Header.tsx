import React from "react";

interface HeaderProps {
  title?: string;
}

// This component is intentionally empty to avoid conflicts with microfrontend headers
// We maintain the paddingTop in the App component to ensure correct layout spacing
const Header: React.FC<HeaderProps> = ({ title = "NHM Ökobilanz" }) => {
  // Return null to hide our header, relying on the microfrontend's header instead
  return null;
};

export default Header;
