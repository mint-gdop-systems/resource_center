import React, { useState } from "react";
import { toast } from "react-hot-toast";

interface FolderModalProps {
  open: boolean;
  onClose: () => void;
  onCreate: (name: string) => Promise<void>;
}

const FolderModal: React.FC<FolderModalProps> = ({ open, onClose, onCreate }) => {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClose = () => {
    setName("");
    setError(null);
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError("Folder name is required");
      return;
    }
    setLoading(true);
    try {
      await onCreate(name.trim());
      setName("");
      setError(null);
      onClose();
      toast.success("Folder created");
    } catch (err: any) {
      let msg = err?.response?.data?.error || err?.message || "Failed to create folder";
      if (msg.includes("already exists")) {
        msg = "A folder with this name already exists in this location.";
      }
      setError(msg);
      setName("");
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-lg p-6 w-80">
        <h2 className="text-lg font-semibold mb-4">Create New Folder</h2>
        <input
          type="text"
          className={`w-full border ${error ? 'border-red-500' : 'border-gray-300'} rounded px-3 py-2 mb-2 focus:outline-none focus:ring-2 focus:ring-mint-500`}
          placeholder="Folder name"
          value={name}
          onChange={e => { setName(e.target.value); setError(null); }}
          disabled={loading}
          autoFocus
        />
        {error && <div className="text-red-600 text-xs mb-2">{error}</div>}
        <div className="flex justify-end space-x-2 mt-2">
          <button type="button" onClick={handleClose} className="px-4 py-2 rounded bg-gray-100 text-gray-700" disabled={loading}>Cancel</button>
          <button type="submit" className="px-4 py-2 rounded bg-mint-600 text-white hover:bg-mint-700" disabled={loading}>{loading ? "Creating..." : "Create"}</button>
        </div>
      </form>
    </div>
  );
};

export default FolderModal; 