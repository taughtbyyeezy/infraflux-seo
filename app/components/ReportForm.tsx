import React, { useRef, useEffect, useState } from 'react';
import { Navigation, PlusCircle, ChevronRight, X } from 'lucide-react';
import { hapticButton } from '../utils/haptic';
import ImageUpload from './ImageUpload';
import { Spinner } from './Skeleton';
import { useOutletContext, useFetcher } from '@remix-run/react';

type IssueType = 'pothole' | 'water_logging' | 'garbage_dump';

const issueTypes = [
    { value: 'pothole', label: 'Pothole', color: '#ef4444' },
    { value: 'water_logging', label: 'Water Logging', color: '#3b82f6' },
    { value: 'garbage_dump', label: 'Garbage Dump', color: '#fbbf24' }
];

const severityLevels = [
    { value: 2, label: 'Low', description: 'Minor issue', color: '#22c55e' },
    { value: 5, label: 'Moderate', description: 'Affects usage', color: '#eab308' },
    { value: 8, label: 'High', description: 'Dangerous', color: '#ef4444' }
];

interface Jurisdiction {
    mla_name?: string;
    party?: string;
    ac_name?: string;
    st_name?: string;
}

export const ReportForm: React.FC<{ isMobile?: boolean; onCancel: () => void }> = ({ isMobile, onCancel }) => {
    const { reportCoordinates, setReportCoordinates, userLocation } = useOutletContext<{
        reportCoordinates: [number, number] | null;
        setReportCoordinates: (loc: [number, number] | null) => void;
        userLocation: [number, number] | null;
    }>();

    const fetcher = useFetcher();
    const lookupFetcher = useFetcher<any>();
    
    const [type, setType] = useState<IssueType>('pothole');
    const [magnitude, setMagnitude] = useState(5);
    const [note, setNote] = useState('');
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [jurisdiction, setJurisdiction] = useState<Jurisdiction>({});
    const [isUploading, setIsUploading] = useState(false);

    const isSubmitting = fetcher.state !== 'idle';

    // Lookup Jurisdiction when coordinates change
    useEffect(() => {
        if (reportCoordinates) {
            lookupFetcher.load(`/api/lookup-mla?lat=${reportCoordinates[0]}&lng=${reportCoordinates[1]}`);
        }
    }, [reportCoordinates]);

    useEffect(() => {
        if (lookupFetcher.data?.found) {
            setJurisdiction(lookupFetcher.data);
        } else if (lookupFetcher.data) {
            setJurisdiction({ ac_name: 'Unknown' });
        }
    }, [lookupFetcher.data]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!reportCoordinates) return;

        const formData = new FormData();
        formData.append('type', type);
        formData.append('magnitude', magnitude.toString());
        formData.append('note', note);
        formData.append('lat', reportCoordinates[0].toString());
        formData.append('lng', reportCoordinates[1].toString());
        if (userLocation) {
            formData.append('userLat', userLocation[0].toString());
            formData.append('userLng', userLocation[1].toString());
        }
        if (imageFile) {
            formData.append('image', imageFile);
        }
        
        // Jurisdiction info
        if (jurisdiction.mla_name) formData.append('mla_name', jurisdiction.mla_name);
        if (jurisdiction.party) formData.append('party', jurisdiction.party);
        if (jurisdiction.ac_name) formData.append('ac_name', jurisdiction.ac_name);
        if (jurisdiction.st_name) formData.append('st_name', jurisdiction.st_name);

        fetcher.submit(formData, { method: 'POST', encType: 'multipart/form-data' });
        hapticButton();
    };

    const handleSeveritySelect = (value: number) => {
        hapticButton();
        setMagnitude(value);
    };

    return (
        <fetcher.Form onSubmit={handleSubmit} className="report-form mobile-report-form">
            <div className="form-header">
                <h2>Report Issue</h2>
                <button type="button" className="detail-close-btn" onClick={onCancel}>
                    <X size={20} />
                </button>
            </div>

            <div className="form-scroll-content">
                <div className="form-group">
                    <label htmlFor="issue-type">ISSUE TYPE</label>
                    <select
                        id="issue-type"
                        value={type}
                        onChange={(e) => setType(e.target.value as IssueType)}
                        className="form-select"
                    >
                        {issueTypes.map(it => (
                            <option key={it.value} value={it.value}>
                                {it.label}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="form-group">
                    <label>SEVERITY LEVEL</label>
                    <div className="severity-buttons">
                        {severityLevels.map((level) => (
                            <button
                                key={level.value}
                                type="button"
                                className={`severity-btn severity-${level.label.toLowerCase()} ${magnitude === level.value ? 'active' : ''}`}
                                onClick={() => handleSeveritySelect(level.value)}
                                style={{ '--severity-color': level.color } as React.CSSProperties}
                            >
                                <span className="severity-label">{level.label}</span>
                                <span className="severity-desc">{level.description}</span>
                            </button>
                        ))}
                    </div>
                </div>

                <div className="form-group">
                    <label>LOCATION</label>
                    <div className="location-group">
                        <div className="btn-coordinate-display">
                            {reportCoordinates ? (
                                <span className="location-coordinates">
                                    {reportCoordinates[0].toFixed(4)}, {reportCoordinates[1].toFixed(4)}
                                </span>
                            ) : (
                                <span className="location-placeholder">Tap on the map to set location</span>
                            )}
                        </div>
                    </div>
                </div>

                <div className="form-group">
                    <label>REPRESENTATIVE JURISDICTION</label>
                    <div className={`jurisdiction-card ${lookupFetcher.state === 'loading' ? 'jurisdiction-loading' : ''}`}>
                        {lookupFetcher.state === 'loading' ? (
                            <div className="jurisdiction-main-info">
                                <div className="skeleton-block skeleton-block-wide" />
                                <div className="skeleton-block skeleton-block-med" />
                            </div>
                        ) : (
                            <>
                                <div className="jurisdiction-main-info">
                                    <div className="jurisdiction-title">{jurisdiction.mla_name || 'N/A'}</div>
                                    <div className="jurisdiction-subtitle">{jurisdiction.ac_name || 'Unknown Location'}</div>
                                </div>
                                <div className="jurisdiction-divider"></div>
                                <div className="jurisdiction-party-info">
                                    <div className="jurisdiction-party-value">{jurisdiction.party || 'No Member Data'}</div>
                                </div>
                            </>
                        )}
                    </div>
                </div>

                <div className="form-group">
                    <label>PHOTO EVIDENCE</label>
                    <ImageUpload
                        onCompressionComplete={(file) => {
                            setImageFile(file);
                            setIsUploading(false);
                        }}
                        onCompressionStart={() => setIsUploading(true)}
                        onCompressionError={() => setIsUploading(false)}
                        onReset={() => setImageFile(null)}
                    />
                </div>

                <div className="form-group">
                    <label htmlFor="description">DESCRIPTION</label>
                    <textarea
                        id="description"
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder="Describe the issue..."
                        rows={3}
                        className="form-textarea"
                    />
                </div>
            </div>

            <div className="form-footer">
                <button
                    type="submit"
                    className={`report-btn-highlight ${(isUploading || isSubmitting) ? 'loading' : ''}`}
                    disabled={!reportCoordinates || isUploading || isSubmitting}
                >
                    <div className="btn-content">
                        <PlusCircle size={22} />
                        <span>{isSubmitting ? 'SUBMITTING...' : 'SUBMIT REPORT'}</span>
                        <ChevronRight size={20} />
                    </div>
                </button>
            </div>
        </fetcher.Form>
    );
};

export default ReportForm;
