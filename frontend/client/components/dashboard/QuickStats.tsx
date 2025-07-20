import React from "react";
import {
  FolderIcon,
  DocumentIcon,
  StarIcon,
  CloudArrowUpIcon,
  ChartBarIcon,
} from "@heroicons/react/24/outline";
import { motion } from "framer-motion";

interface StatCard {
  id: string;
  name: string;
  value: string;
  change: string;
  changeType: "increase" | "decrease" | "neutral";
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

const stats: StatCard[] = [
  {
    id: "total-files",
    name: "Total Files",
    value: "1,248",
    change: "+12%",
    changeType: "increase",
    icon: DocumentIcon,
    color: "mint",
  },
  {
    id: "folders",
    name: "Folders",
    value: "156",
    change: "+3%",
    changeType: "increase",
    icon: FolderIcon,
    color: "blue",
  },
  {
    id: "starred",
    name: "Starred Files",
    value: "64",
    change: "+8%",
    changeType: "increase",
    icon: StarIcon,
    color: "yellow",
  },
  {
    id: "storage",
    name: "Storage Used",
    value: "45.2 GB",
    change: "+2.1 GB",
    changeType: "increase",
    icon: ChartBarIcon,
    color: "orange",
  },
  {
    id: "uploads",
    name: "This Month",
    value: "28",
    change: "+18%",
    changeType: "increase",
    icon: CloudArrowUpIcon,
    color: "green",
  },
];

const colorClasses = {
  mint: {
    bg: "bg-mint-50",
    icon: "text-mint-600",
    ring: "ring-mint-100",
  },
  blue: {
    bg: "bg-blue-50",
    icon: "text-blue-600",
    ring: "ring-blue-100",
  },
  yellow: {
    bg: "bg-yellow-50",
    icon: "text-yellow-600",
    ring: "ring-yellow-100",
  },
  orange: {
    bg: "bg-orange-50",
    icon: "text-orange-600",
    ring: "ring-orange-100",
  },
  green: {
    bg: "bg-green-50",
    icon: "text-green-600",
    ring: "ring-green-100",
  },
};

export default function QuickStats() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      {stats.map((stat, index) => {
        const colors = colorClasses[stat.color as keyof typeof colorClasses];
        const IconComponent = stat.icon;

        return (
          <motion.div
            key={stat.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
            className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow duration-200"
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-3">
                  <div
                    className={`p-2 rounded-lg ${colors.bg} ring-4 ${colors.ring}`}
                  >
                    <IconComponent className={`h-5 w-5 ${colors.icon}`} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">
                      {stat.name}
                    </p>
                    <p className="text-2xl font-bold text-gray-900">
                      {stat.value}
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex items-center">
                  <span
                    className={`inline-flex items-center text-sm font-medium ${
                      stat.changeType === "increase"
                        ? "text-green-600"
                        : stat.changeType === "decrease"
                          ? "text-red-600"
                          : "text-gray-600"
                    }`}
                  >
                    {stat.changeType === "increase" && (
                      <svg
                        className="mr-1 h-3 w-3"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                    {stat.changeType === "decrease" && (
                      <svg
                        className="mr-1 h-3 w-3"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 12.586V5a1 1 0 012 0v7.586l2.293-2.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                    {stat.change}
                  </span>
                  <span className="text-sm text-gray-500 ml-2">
                    from last month
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
