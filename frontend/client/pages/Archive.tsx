import React from "react";
import { ArchiveBoxIcon } from "@heroicons/react/24/outline";
import Breadcrumb from "../components/layout/Breadcrumb";

export default function Archive() {
  const breadcrumbItems = [
    { id: "archive", name: "Archive", path: "/archive" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <Breadcrumb items={breadcrumbItems} />
        <h1 className="mt-2 text-2xl font-bold text-gray-900">Archive</h1>
        <p className="text-gray-600">
          Archived files and folders for long-term storage
        </p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="text-center py-16">
          <ArchiveBoxIcon className="mx-auto h-16 w-16 text-gray-400" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">
            No archived files
          </h3>
          <p className="mt-2 text-gray-500 max-w-sm mx-auto">
            Archive old files to keep your workspace organized while preserving
            important documents for compliance and reference.
          </p>
          <div className="mt-6">
            <button className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-mint-600 hover:bg-mint-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-mint-500">
              Browse Files to Archive
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
