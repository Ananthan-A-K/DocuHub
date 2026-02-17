"use client";

import { Trash2 } from "lucide-react";
import { useState } from "react";

export type RecentFile = {
  fileName: string;
  tool: string;
  time: string;
};

interface RecentFilesProps {
  files: RecentFile[];
  onDelete: (index: number) => void;
  onClear: () => void;
}

export default function RecentFiles({ files, onDelete, onClear }: RecentFilesProps) {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showClearModal, setShowClearModal] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  if (files.length === 0) return null;

  return (
    <div className="mt-12">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Recent Files</h2>

        <button
          onClick={() => setShowClearModal(true)}
          className="text-red-500 hover:text-red-700 text-sm font-medium"
        >
          Clear History
        </button>
      </div>

      {/* File List */}
      <div className="space-y-3">
        {files.map((file, index) => (
          <div
            key={index}
            className="p-4 rounded-lg border bg-white shadow-sm flex justify-between items-center"
          >
            <div>
              <p className="font-medium">{file.fileName}</p>
              <p className="text-sm text-gray-500">
                {file.tool} • {file.time}
              </p>
            </div>

            {/* Delete Button */}
            <button
              onClick={() => {
                setSelectedIndex(index);
                setShowDeleteModal(true);
              }}
              className="p-2 text-red-500 hover:bg-red-50 rounded-full transition"
              title="Delete"
            >
              <Trash2 size={18} />
            </button>
          </div>
        ))}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/40 z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-80">
            <h3 className="text-lg font-semibold mb-4">Confirm Delete</h3>
            <p className="text-sm text-gray-600 mb-6">
              Are you sure you want to delete this file?
            </p>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 rounded-md border text-gray-600 hover:bg-gray-100"
              >
                Cancel
              </button>

              <button
                onClick={() => {
                  if (selectedIndex !== null) {
                    onDelete(selectedIndex);
                  }
                  setShowDeleteModal(false);
                }}
                className="px-4 py-2 rounded-md bg-red-500 text-white hover:bg-red-600"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clear History Modal */}
      {showClearModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/40 z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-80">
            <h3 className="text-lg font-semibold mb-4">Clear History</h3>
            <p className="text-sm text-gray-600 mb-6">
              Are you sure you want to clear all recent files?
            </p>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowClearModal(false)}
                className="px-4 py-2 rounded-md border text-gray-600 hover:bg-gray-100"
              >
                Cancel
              </button>

              <button
                onClick={() => {
                  onClear();
                  setShowClearModal(false);
                }}
                className="px-4 py-2 rounded-md bg-red-500 text-white hover:bg-red-600"
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
