import React from "react";
import { motion } from "framer-motion";
import {
  DocumentIcon,
  FolderIcon,
  ShareIcon,
  ShieldCheckIcon,
  CloudArrowUpIcon,
  MagnifyingGlassIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";
import { useAuth } from "../../services/auth";

const features = [
  {
    icon: DocumentIcon,
    title: "Document Management",
    description: "Organize, store, and manage all your important documents in one secure location.",
  },
  {
    icon: FolderIcon,
    title: "Smart Organization",
    description: "Create folders, categorize files, and use tags to keep everything organized.",
  },
  {
    icon: ShareIcon,
    title: "Secure Sharing",
    description: "Share files and folders with team members with granular permission controls.",
  },
  {
    icon: ShieldCheckIcon,
    title: "Enterprise Security",
    description: "Advanced security with encryption, audit trails, and compliance features.",
  },
  {
    icon: CloudArrowUpIcon,
    title: "Version Control",
    description: "Track file versions, see change history, and revert to previous versions easily.",
  },
  {
    icon: MagnifyingGlassIcon,
    title: "Powerful Search",
    description: "Find any file instantly with our advanced search and filtering capabilities.",
  },
];

export default function WelcomeSection() {
  const { login } = useAuth();

  return (
    <div className="space-y-8">
      {/* Enhanced Hero Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative text-center bg-gradient-to-br from-mint-50 via-blue-50 to-purple-50 rounded-3xl p-8 md:p-16 overflow-hidden"
      >
        {/* Background decoration */}
        <div className="absolute inset-0 bg-gradient-to-br from-mint-100/20 to-blue-100/20 rounded-3xl"></div>
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-mint-200/30 to-transparent rounded-full -translate-y-32 translate-x-32"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-blue-200/30 to-transparent rounded-full translate-y-24 -translate-x-24"></div>
        
        <div className="relative max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="mb-8"
          >
            <div className="inline-flex items-center px-4 py-2 bg-mint-100 text-mint-700 text-sm font-medium rounded-full mb-6">
              <SparklesIcon className="h-4 w-4 mr-2" />
              Ministry of Innovation and Technology
            </div>
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
              Welcome to{" "}
              <span className="bg-gradient-to-r from-mint-600 to-blue-600 bg-clip-text text-transparent">
                MINT Resource Center
              </span>
            </h1>
            <p className="text-xl md:text-2xl text-gray-600 mb-8 leading-relaxed max-w-3xl mx-auto">
              Your comprehensive document management system. Securely store, organize, and collaborate 
              on important files with enterprise-grade features and modern workflows.
            </p>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <button
              onClick={login}
              className="group inline-flex items-center px-8 py-4 bg-gradient-to-r from-mint-600 to-mint-700 text-white text-lg font-semibold rounded-xl shadow-xl hover:shadow-2xl focus:outline-none focus:ring-2 focus:ring-mint-500 focus:ring-offset-2 transition-all duration-300 transform hover:scale-105"
            >
              <svg className="h-6 w-6 mr-3 group-hover:rotate-12 transition-transform duration-300" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12H3m0 0l4-4m-4 4l4 4m13-4a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Sign In with Keycloak
              <div className="ml-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                →
              </div>
            </button>

          </motion.div>
        </div>
      </motion.div>

      {/* Enhanced Features Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {features.map((feature, index) => (
          <motion.div
            key={feature.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: index * 0.1 }}
            className="group bg-white rounded-2xl border border-gray-200 p-6 hover:shadow-xl hover:border-mint-200 transition-all duration-300 transform hover:-translate-y-1"
          >
            <div className="flex items-start space-x-4 mb-4">
              <div className="p-3 bg-gradient-to-br from-mint-50 to-mint-100 rounded-xl group-hover:from-mint-100 group-hover:to-mint-200 transition-all duration-300">
                <feature.icon className="h-6 w-6 text-mint-600 group-hover:scale-110 transition-transform duration-300" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 group-hover:text-mint-700 transition-colors duration-300">
                  {feature.title}
                </h3>
                <p className="text-gray-600 leading-relaxed mt-2 group-hover:text-gray-700 transition-colors duration-300">
                  {feature.description}
                </p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Enhanced Trust Indicators */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.8 }}
        className="bg-gradient-to-br from-white to-gray-50 rounded-2xl border border-gray-200 p-8 shadow-lg"
      >
        <div className="text-center mb-8">
          <div className="inline-flex items-center px-4 py-2 bg-mint-100 text-mint-700 text-sm font-medium rounded-full mb-4">
            <ShieldCheckIcon className="h-4 w-4 mr-2" />
            Enterprise Grade Security
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            Trusted by Government Agencies
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Powering digital transformation across the Ministry of Innovation and Technology 
            with world-class security and reliability standards.
          </p>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          <motion.div 
            className="text-center group"
            whileHover={{ scale: 1.05 }}
            transition={{ duration: 0.2 }}
          >
            <div className="text-4xl font-bold bg-gradient-to-r from-mint-600 to-mint-700 bg-clip-text text-transparent mb-2 group-hover:from-mint-700 group-hover:to-mint-800 transition-all duration-300">
              99.9%
            </div>
            <div className="text-sm font-medium text-gray-600 group-hover:text-gray-700 transition-colors duration-300">
              Uptime Guarantee
            </div>
          </motion.div>
          <motion.div 
            className="text-center group"
            whileHover={{ scale: 1.05 }}
            transition={{ duration: 0.2 }}
          >
            <div className="text-4xl font-bold bg-gradient-to-r from-mint-600 to-mint-700 bg-clip-text text-transparent mb-2 group-hover:from-mint-700 group-hover:to-mint-800 transition-all duration-300">
              256-bit
            </div>
            <div className="text-sm font-medium text-gray-600 group-hover:text-gray-700 transition-colors duration-300">
              AES Encryption
            </div>
          </motion.div>
          <motion.div 
            className="text-center group"
            whileHover={{ scale: 1.05 }}
            transition={{ duration: 0.2 }}
          >
            <div className="text-4xl font-bold bg-gradient-to-r from-mint-600 to-mint-700 bg-clip-text text-transparent mb-2 group-hover:from-mint-700 group-hover:to-mint-800 transition-all duration-300">
              24/7
            </div>
            <div className="text-sm font-medium text-gray-600 group-hover:text-gray-700 transition-colors duration-300">
              Expert Support
            </div>
          </motion.div>
          <motion.div 
            className="text-center group"
            whileHover={{ scale: 1.05 }}
            transition={{ duration: 0.2 }}
          >
            <div className="text-4xl font-bold bg-gradient-to-r from-mint-600 to-mint-700 bg-clip-text text-transparent mb-2 group-hover:from-mint-700 group-hover:to-mint-800 transition-all duration-300">
              ISO 27001
            </div>
            <div className="text-sm font-medium text-gray-600 group-hover:text-gray-700 transition-colors duration-300">
              Certified Secure
            </div>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}