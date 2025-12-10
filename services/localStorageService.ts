import { SavedScan, UploadedImage } from '../types';

const STORAGE_KEY = 'wardrobe_3d_scans';

/**
 * Local Storage Service for managing 3D body scans
 */

/**
 * Save a new 3D scan to local storage
 */
export const saveScan = (images: UploadedImage[]): SavedScan | null => {
    try {
        const savedScans = getSavedScans();

        const newScan: SavedScan = {
            id: `scan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            timestamp: Date.now(),
            images: images,
            preview: images[0]?.url || '', // Use first image as preview
        };

        savedScans.push(newScan);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(savedScans));

        console.log(`✅ Scan saved successfully: ${newScan.id}`);
        return newScan;
    } catch (error) {
        if (error instanceof Error && error.name === 'QuotaExceededError') {
            console.error('❌ Storage quota exceeded. Unable to save scan.');
            alert('Storage limit reached! Please delete some old scans to save new ones.');
        } else {
            console.error('❌ Failed to save scan:', error);
            alert('Failed to save scan. Please try again.');
        }
        return null;
    }
};

/**
 * Retrieve all saved scans from local storage
 */
export const getSavedScans = (): SavedScan[] => {
    try {
        const data = localStorage.getItem(STORAGE_KEY);
        if (!data) return [];

        const scans = JSON.parse(data) as SavedScan[];
        console.log(`📦 Retrieved ${scans.length} saved scan(s)`);
        return scans;
    } catch (error) {
        console.error('❌ Failed to retrieve saved scans:', error);
        return [];
    }
};

/**
 * Delete a specific scan by ID
 */
export const deleteScan = (scanId: string): boolean => {
    try {
        const savedScans = getSavedScans();
        const filteredScans = savedScans.filter(scan => scan.id !== scanId);

        if (filteredScans.length === savedScans.length) {
            console.warn(`⚠️ Scan not found: ${scanId}`);
            return false;
        }

        localStorage.setItem(STORAGE_KEY, JSON.stringify(filteredScans));
        console.log(`🗑️ Scan deleted: ${scanId}`);
        return true;
    } catch (error) {
        console.error('❌ Failed to delete scan:', error);
        return false;
    }
};

/**
 * Clear all saved scans
 */
export const clearAllScans = (): boolean => {
    try {
        localStorage.removeItem(STORAGE_KEY);
        console.log('🗑️ All scans cleared');
        return true;
    } catch (error) {
        console.error('❌ Failed to clear scans:', error);
        return false;
    }
};

/**
 * Get a specific scan by ID
 */
export const getScanById = (scanId: string): SavedScan | null => {
    const scans = getSavedScans();
    return scans.find(scan => scan.id === scanId) || null;
};

/**
 * Get storage usage information
 */
export const getStorageInfo = (): { used: number; total: number; percentage: number } => {
    try {
        const data = localStorage.getItem(STORAGE_KEY) || '';
        const used = new Blob([data]).size;
        const total = 5 * 1024 * 1024; // Approximate 5MB limit for localStorage
        const percentage = (used / total) * 100;

        return { used, total, percentage };
    } catch (error) {
        console.error('❌ Failed to get storage info:', error);
        return { used: 0, total: 0, percentage: 0 };
    }
};
