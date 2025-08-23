import React from "react";
import Breadcrumb from "../components/layout/Breadcrumb";
import SharedWithMe from "./SharedWithMe";

export default function Shared() {
  const breadcrumbItems = [
    { id: "shared", name: "Shared with me", path: "/shared" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <Breadcrumb items={breadcrumbItems} />
      </div>
      <SharedWithMe />
    </div>
  );
}
