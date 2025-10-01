import React from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import {
  LayoutGrid,
  Users,
  FileText,
  Truck,
  Headphones,
  BookOpen,
  ExternalLink,
} from "lucide-react";

interface GDOPMenuItem {
  id: string;
  name: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}

const gdopMenuItems: GDOPMenuItem[] = [
  {
    id: "visitor-management",
    name: "Visitor Management",
    url: "http://visit.gdop.gov.et/",
    icon: Users,
    description: "Manage visitor access and registration",
  },
  {
    id: "letter-management",
    name: "Letter Management",
    url: "https://lms.gdop.gov.et",
    icon: FileText,
    description: "Handle official correspondence",
  },
  {
    id: "transport-management",
    name: "Transport Management",
    url: "https://tms.gdop.gov.et",
    icon: Truck,
    description: "Manage fleet and transportation",
  },
  {
    id: "contact-center",
    name: "Contact Center",
    url: "https://crm.gdop.gov.et",
    icon: Headphones,
    description: "Customer relationship management",
  },
  {
    id: "resource-center",
    name: "Resource Center",
    url: "https://resources.gdop.gov.et",
    icon: BookOpen,
    description: "Access organizational resources",
  },
];

export default function GDOPMenu() {
  const handleItemClick = (url: string) => {
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="p-2 text-gray-400 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-mint-500 transition-colors"
          aria-label="GDOP Applications Menu"
        >
          <LayoutGrid className="h-6 w-6" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="w-80 sm:w-96 p-4"
        align="end"
        sideOffset={8}
      >
        <div className="mb-3">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
            GDOP Applications
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Access government digital services
          </p>
        </div>
        
        <DropdownMenuGroup>
          <div className="grid grid-cols-1 gap-2">
            {gdopMenuItems.map((item) => {
              const IconComponent = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => handleItemClick(item.url)}
                  className="flex items-center p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors group text-left w-full"
                >
                  <div className="flex-shrink-0 w-10 h-10 bg-mint-100 dark:bg-mint-900 rounded-lg flex items-center justify-center group-hover:bg-mint-200 dark:group-hover:bg-mint-800 transition-colors">
                    <IconComponent className="h-5 w-5 text-mint-600 dark:text-mint-400" />
                  </div>
                  <div className="ml-3 flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-gray-900 dark:text-white group-hover:text-mint-700 dark:group-hover:text-mint-300 transition-colors">
                        {item.name}
                      </p>
                      <ExternalLink className="h-3 w-3 text-gray-400 group-hover:text-mint-500 transition-colors ml-2 flex-shrink-0" />
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                      {item.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </DropdownMenuGroup>
        
        <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-400 dark:text-gray-500 text-center">
            Government Digital Operations Platform
          </p>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}