import React, { useState, useEffect } from 'react';
import { SavedScan } from '../types';
import { getSavedScans, deleteScan, clearAllScans } from '../services/localStorageService';
import { Trash2, Download, Clock, AlertCircle, Loader2 } from 'lucide-react';

interface SavedScansManagerProps {
    onLoadScan: (scan: SavedScan) => void;
}

const SavedScansManager: React.FC<SavedScansManagerProps> = ({ onLoadScan }) => {
    const [savedScans, setSavedScans] = useState<SavedScan[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadScans();
    }, []);

    const loadScans = () => {
        setIsLoading(true);
        const scans = getSavedScans();
        setSavedScans(scans);
        setIsLoading(false);
    };

    const handleDelete = (scanId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (confirm('Delete this scan? This action cannot be undone.')) {
            const success = deleteScan(scanId);
            if (success) {
                loadScans();
            }
        }
    };

    const handleClearAll = () => {
        if (confirm(`Delete all ${savedScans.length} saved scans? This action cannot be undone.`)) {
            const success = clearAllScans();
            if (success) {
                loadScans();
            }
        }
    };

    const formatDate = (timestamp: number) => {
        const date = new Date(timestamp);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;

        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-8">
                <Loader2 className="animate-spin text-zinc-600" size={24} />
            </div>
        );
    }

    if (savedScans.length === 0) {
        return null; // Don't show anything if no scans
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-zinc-400 uppercase tracking-wider">Saved 3D Scans</span>
                    <span className="bg-zinc-800 text-zinc-400 text-xs px-2 py-0.5 rounded-full">{savedScans.length}</span>
                </div>
                {savedScans.length > 0 && (
                    <button
                        onClick={handleClearAll}
                        className="text-xs text-zinc-500 hover:text-red-400 transition-colors flex items-center gap-1"
                    >
                        <Trash2 size={12} />
                        Clear All
                    </button>
                )}
            </div>

            <div className="grid grid-cols-2 gap-3">
                {savedScans.map((scan) => (
                    <div
                        key={scan.id}
                        className="relative group cursor-pointer bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden hover:border-indigo-500/50 transition-all"
                        onClick={() => onLoadScan(scan)}
                    >
                        {/* Preview Image */}
                        <div className="aspect-[3/4] bg-zinc-950 overflow-hidden">
                            <img
                                src={scan.preview}
                                alt="Scan preview"
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                        </div>

                        {/* Overlay Info */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="absolute bottom-0 left-0 right-0 p-3 space-y-2">
                                <div className="flex items-center gap-1.5 text-white text-xs">
                                    <Download size={14} />
                                    <span className="font-semibold">Load Scan</span>
                                </div>
                            </div>
                        </div>

                        {/* Timestamp Badge */}
                        <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-sm text-white text-[10px] px-2 py-1 rounded-full flex items-center gap-1">
                            <Clock size={10} />
                            {formatDate(scan.timestamp)}
                        </div>

                        {/* Delete Button */}
                        <button
                            onClick={(e) => handleDelete(scan.id, e)}
                            className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm hover:bg-red-500/80 text-white p-1.5 rounded-full transition-colors opacity-0 group-hover:opacity-100"
                            title="Delete scan"
                        >
                            <Trash2 size={12} />
                        </button>

                        {/* Image Count Badge */}
                        <div className="absolute bottom-2 right-2 bg-black/60 backdrop-blur-sm text-white text-[10px] px-2 py-1 rounded-full">
                            {scan.images.length} views
                        </div>
                    </div>
                ))}
            </div>

            <div className="flex items-start gap-2 p-3 bg-zinc-900/50 border border-zinc-800/50 rounded-lg">
                <AlertCircle size={14} className="text-zinc-500 mt-0.5 flex-shrink-0" />
                <p className="text-[11px] text-zinc-500 leading-relaxed">
                    Scans are saved locally in your browser. Clearing browser data will remove them.
                </p>
            </div>
        </div>
    );
};

export default SavedScansManager;
