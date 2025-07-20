import React from "react";
import { UserGroupIcon } from "@heroicons/react/24/outline";
import Breadcrumb from "../components/layout/Breadcrumb";

export default function Shared() {
  const breadcrumbItems = [
    { id: "shared", name: "Shared with me", path: "/shared" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <Breadcrumb items={breadcrumbItems} />
        <h1 className="mt-2 text-2xl font-bold text-gray-900">
          Shared with me
        </h1>
        <p className="text-gray-600">
          Files and folders that others have shared with you
        </p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="text-center py-16">
          <UserGroupIcon className="mx-auto h-16 w-16 text-gray-400" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">
            Shared Files
          </h3>
          <p className="mt-2 text-gray-500 max-w-sm mx-auto">
            Files shared with you by your colleagues will appear here. You'll
            receive notifications when new files are shared.
          </p>
          <div className="mt-6">
            <button className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-mint-600 hover:bg-mint-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-mint-500">
              Request Access to Files
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
