import React, { useState } from "react";
import { useTheme } from "../../contexts/ThemeContext";
import {
  Cog6ToothIcon,
  ClockIcon,
  TrashIcon,
  XMarkIcon,
  CheckIcon,
} from "@heroicons/react/24/outline";

interface ArchiveSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (settings: ArchiveSettings) => void;
  currentSettings?: ArchiveSettings;
}

export interface ArchiveSettings {
  autoArchiveEnabled: boolean;
  autoArchiveDays: number;
  autoDeleteEnabled: boolean;
  autoDeleteDays: number;
  notifyBeforeArchive: boolean;
  notifyBeforeDelete: boolean;
}

const defaultSettings: ArchiveSettings = {
  autoArchiveEnabled: false,
  autoArchiveDays: 90,
  autoDeleteEnabled: false,
  autoDeleteDays: 365,
  notifyBeforeArchive: true,
  notifyBeforeDelete: true,
};

export default function ArchiveSettings({
  isOpen,
  onClose,
  onSave,
  currentSettings = defaultSettings,
}: ArchiveSettingsProps) {
  const { actualTheme } = useTheme();
  const isDarkMode = actualTheme === 'dark';
  const [settings, setSettings] = useState<ArchiveSettings>(currentSettings);

  const handleSave = () => {
    onSave(settings);
    onClose();
  };

  const updateSetting = <K extends keyof ArchiveSettings>(
    key: K,
    value: ArchiveSettings[K]
  ) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className={`max-w-2xl w-full mx-4 rounded-lg shadow-xl ${
        isDarkMode ? 'bg-gray-800' : 'bg-white'
      }`}>
        {/* Header */}
        <div className={`flex items-center justify-between p-6 border-b ${
          isDarkMode ? 'border-gray-700' : 'border-gray-200'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${
              isDarkMode ? 'bg-mint-900/20 text-mint-400' : 'bg-mint-100 text-mint-600'
            }`}>
              <Cog6ToothIcon className="h-5 w-5" />
            </div>
            <div>
              <h2 className={`text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                Archive Settings
              </h2>
              <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Configure automatic archiving and cleanup rules
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-2 rounded-lg transition-colors ${
              isDarkMode ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-700' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
            }`}
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Auto Archive Section */}
          <div className={`p-4 rounded-lg border ${
            isDarkMode ? 'bg-gray-750 border-gray-600' : 'bg-gray-50 border-gray-200'
          }`}>
            <div className="flex items-center gap-3 mb-4">
              <ClockIcon className={`h-5 w-5 ${isDarkMode ? 'text-mint-400' : 'text-mint-600'}`} />
              <h3 className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                Auto Archive
              </h3>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className={`font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Enable Auto Archive
                  </label>
                  <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Automatically archive files after a specified period
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.autoArchiveEnabled}
                    onChange={(e) => updateSetting('autoArchiveEnabled', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-mint-300 dark:peer-focus:ring-mint-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-mint-600"></div>
                </label>
              </div>

              {settings.autoArchiveEnabled && (
                <>
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      Archive files older than (days)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="3650"
                      value={settings.autoArchiveDays}
                      onChange={(e) => updateSetting('autoArchiveDays', parseInt(e.target.value) || 90)}
                      className={`w-full px-3 py-2 border rounded-lg text-sm ${
                        isDarkMode
                          ? 'bg-gray-700 border-gray-600 text-white'
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
                    />
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="notifyArchive"
                      checked={settings.notifyBeforeArchive}
                      onChange={(e) => updateSetting('notifyBeforeArchive', e.target.checked)}
                      className="h-4 w-4 text-mint-600 focus:ring-mint-500 border-gray-300 rounded"
                    />
                    <label htmlFor="notifyArchive" className={`ml-2 text-sm ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      Notify me before archiving files
                    </label>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Auto Delete Section */}
          <div className={`p-4 rounded-lg border ${
            isDarkMode ? 'bg-gray-750 border-gray-600' : 'bg-gray-50 border-gray-200'
          }`}>
            <div className="flex items-center gap-3 mb-4">
              <TrashIcon className={`h-5 w-5 ${isDarkMode ? 'text-red-400' : 'text-red-600'}`} />
              <h3 className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                Auto Delete Archived Items
              </h3>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className={`font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Enable Auto Delete
                  </label>
                  <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Permanently delete archived files after a specified period
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.autoDeleteEnabled}
                    onChange={(e) => updateSetting('autoDeleteEnabled', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-red-300 dark:peer-focus:ring-red-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-red-600"></div>
                </label>
              </div>

              {settings.autoDeleteEnabled && (
                <>
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      Delete archived files older than (days)
                    </label>
                    <input
                      type="number"
                      min="30"
                      max="3650"
                      value={settings.autoDeleteDays}
                      onChange={(e) => updateSetting('autoDeleteDays', parseInt(e.target.value) || 365)}
                      className={`w-full px-3 py-2 border rounded-lg text-sm ${
                        isDarkMode
                          ? 'bg-gray-700 border-gray-600 text-white'
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
                    />
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="notifyDelete"
                      checked={settings.notifyBeforeDelete}
                      onChange={(e) => updateSetting('notifyBeforeDelete', e.target.checked)}
                      className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                    />
                    <label htmlFor="notifyDelete" className={`ml-2 text-sm ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      Notify me before deleting archived files
                    </label>
                  </div>

                  <div className={`p-3 rounded-lg ${
                    isDarkMode ? 'bg-red-900/20 border border-red-800' : 'bg-red-50 border border-red-200'
                  }`}>
                    <p className={`text-sm ${isDarkMode ? 'text-red-300' : 'text-red-700'}`}>
                      ⚠️ Warning: Auto-deleted files cannot be recovered. Use this feature with caution.
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className={`flex items-center justify-end gap-3 p-6 border-t ${
          isDarkMode ? 'border-gray-700' : 'border-gray-200'
        }`}>
          <button
            onClick={onClose}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              isDarkMode
                ? 'text-gray-300 bg-gray-700 hover:bg-gray-600'
                : 'text-gray-700 bg-gray-100 hover:bg-gray-200'
            }`}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className={`inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              isDarkMode
                ? 'bg-mint-700 text-mint-100 hover:bg-mint-600'
                : 'bg-mint-600 text-white hover:bg-mint-700'
            }`}
          >
            <CheckIcon className="h-4 w-4 mr-2" />
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
}