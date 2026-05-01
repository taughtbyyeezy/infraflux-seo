import { Moon, Sun, Heart, X, Copy, Search } from 'lucide-react';
import { hapticButton } from '../../utils/haptic';
import { useFetcher, useNavigate } from '@remix-run/react';
import { useMap } from '../ui/MapLibre';
import { useState, useEffect, useRef } from 'react';
import { useToast } from '../../contexts/ToastContext';

interface MobileHeaderProps {
    theme: 'light' | 'dark';
    isMenuOpen: boolean;
    onMenuToggle: () => void;
    selectedTypes: string[];
    onToggleType: (type: string) => void;
    onThemeToggle: () => void;
    onDonateClick?: () => void;
    isHidden?: boolean;
    isLoading?: boolean;
    issueCounts: Record<string, number>;
    voterId?: string;
}

export const MobileHeader: React.FC<MobileHeaderProps> = ({
    theme,
    isMenuOpen,
    onMenuToggle,
    selectedTypes,
    onToggleType,
    onThemeToggle,
    onDonateClick,
    isHidden = false,
    isLoading = false,
    issueCounts,
    voterId
}) => {
    const { map } = useMap();
    const fetcher = useFetcher<any>();
    const navigate = useNavigate();
    const { addToast } = useToast();
    const [searchQuery, setSearchQuery] = useState('');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [results, setResults] = useState<any[]>([]);
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const lastDataRef = useRef<any>(null);
    const isUserSearchRef = useRef<boolean>(false);

    const copyToClipboard = (text: string) => {
        if (navigator.clipboard) {
            navigator.clipboard.writeText(text);
            hapticButton();
        } else {
            // Fallback for non-secure contexts
            const textArea = document.createElement("textarea");
            textArea.value = text;
            document.body.appendChild(textArea);
            textArea.select();
            try {
                document.execCommand('copy');
                hapticButton();
            } catch (err) {
                console.error('Fallback copy failed', err);
            }
            document.body.removeChild(textArea);
        }
    };

    // Determine visibility for the CSS transition
    const isVisible = !isLoading && !isHidden;

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        isUserSearchRef.current = true;
        if (!searchQuery.trim() || !map) return;

        hapticButton();

        // Get current viewbox for biasing
        const bounds = map.getBounds();
        const viewbox = `${bounds.getWest()},${bounds.getNorth()},${bounds.getEast()},${bounds.getSouth()}`;

        fetcher.submit(
            { q: searchQuery, viewbox },
            { method: 'get', action: '/api/geocode' }
        );
    };

    const handleResultClick = (result: any) => {
        if (!map) return;
        hapticButton();

        const lng = parseFloat(result.lon);
        const lat = parseFloat(result.lat);

        if (!isNaN(lng) && !isNaN(lat)) {
            map.flyTo({
                center: [lng, lat],
                zoom: 12,
                duration: 2500,
                essential: true
            });
            setSearchQuery(result.display_name.split(',')[0]); // Use first part of address
            setIsDropdownOpen(false);
            setResults([]);
            
            // Blur input to prevent re-opening and collapse mobile keyboard
            if (inputRef.current) {
                inputRef.current.blur();
            }
        }
    };

    // Click outside handler to close dropdown
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
        };

        if (isDropdownOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isDropdownOpen]);

    // Update results when fetcher completes
    useEffect(() => {
        // Only trigger if fetcher.data actually changed to a new response
        if (fetcher.data && fetcher.data !== lastDataRef.current) {
            lastDataRef.current = fetcher.data;
            
            if (Array.isArray(fetcher.data)) {
                setResults(fetcher.data);
                if (isUserSearchRef.current) {
                    setIsDropdownOpen(fetcher.data.length > 0);
                    isUserSearchRef.current = false;
                }
            } else if (fetcher.data.error) {
                addToast("Search failed. Please try again.", 'error');
                isUserSearchRef.current = false;
            }
        }
    }, [fetcher.data, addToast]);

    return (
        <>
            <div className={`mobile-header-simplified ${isHidden ? 'hidden' : ''}`}>
                <div className={`unified-search-pill ${isDropdownOpen ? 'expanded' : ''}`} ref={containerRef}>
                    <form onSubmit={handleSearch} className="mobile-search-form">
                        {/* Left: Logo Icon inside form */}
                        <div 
                            className="mobile-logo-icon" 
                            onClick={() => {
                                hapticButton();
                                navigate('/');
                            }}
                            style={{ cursor: 'pointer', paddingRight: '10px' }}
                        >
                            <img
                                src={theme === 'light' ? '/infrafluxblack.png' : '/infrafluxwhite.png'}
                                alt="InfraFlux Logo"
                            />
                        </div>

                        <input
                            ref={inputRef}
                            type="text"
                            className="mobile-search-pill"
                            placeholder="Search InfraFlux"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onFocus={() => {
                                if (isMenuOpen) {
                                    onMenuToggle();
                                }
                                if (results.length > 0) {
                                    setIsDropdownOpen(true);
                                }
                            }}
                            onBlur={(e) => {
                                if (containerRef.current?.contains(e.relatedTarget as Node)) return;
                                setIsDropdownOpen(false);
                            }}
                            autoComplete="off"
                            autoCorrect="off"
                            spellCheck="false"
                        />
                        
                        {fetcher.state === 'submitting' && (
                            <div className="search-loading-spinner animate-spin">
                                <svg className="w-4 h-4" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                            </div>
                        )}

                        {/* Right: Hamburger Menu inside form */}
                        <button
                            type="button"
                            className={`mobile-hamburger ${isMenuOpen || isDropdownOpen ? 'active' : ''}`}
                            onClick={() => {
                                hapticButton();
                                if (isDropdownOpen) {
                                    setIsDropdownOpen(false);
                                    inputRef.current?.blur();
                                    setSearchQuery('');
                                } else {
                                    onMenuToggle();
                                }
                            }}
                        >
                            <div className="hamburger-line"></div>
                            <div className="hamburger-line"></div>
                            <div className="hamburger-line"></div>
                        </button>
                    </form>

                    {/* Search Results Dropdown */}
                    <div className={`search-results-dropdown ${isDropdownOpen ? 'open' : ''}`}>
                        {results.map((result, idx) => {
                            const addressParts = result.display_name.split(',');
                            const cityName = addressParts[0];
                            const locationDetails = addressParts.slice(1).join(',').trim();
                            
                            return (
                                <div 
                                    key={idx} 
                                    className="search-result-item"
                                    onMouseDown={(e) => {
                                        e.preventDefault();
                                        handleResultClick(result);
                                    }}
                                >
                                    <span className="search-result-item-main">{cityName}</span>
                                    {locationDetails && (
                                        <span className="search-result-item-sub">{locationDetails}</span>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Mobile Dropdown Menu (Android/Material Style) */}
            <div className={`mobile-dropdown ${isMenuOpen ? 'open' : ''} ${isHidden ? 'hidden-for-support' : ''}`}>
                <div className="mobile-dropdown-content">
                    <div className="menu-section">
                        <div className="menu-label">FILTERS</div>
                        <div className="android-menu-grid">
                            <div
                                className={`android-filter-item ${selectedTypes.includes('pothole') ? 'active' : ''}`}
                                onClick={() => {
                                    hapticButton();
                                    onToggleType('pothole');
                                }}
                            >
                                <div className="android-icon-box" style={{ background: '#ef4444' }}>
                                    {issueCounts['pothole'] || 0}
                                </div>
                                <span className="android-label">Potholes</span>
                            </div>

                            <div
                                className={`android-filter-item ${selectedTypes.includes('garbage_dump') ? 'active' : ''}`}
                                onClick={() => {
                                    hapticButton();
                                    onToggleType('garbage_dump');
                                }}
                            >
                                <div className="android-icon-box" style={{ background: '#fbbf24' }}>
                                    {issueCounts['garbage_dump'] || 0}
                                </div>
                                <span className="android-label">Garbage Dump</span>
                            </div>

                            <div
                                className={`android-filter-item ${selectedTypes.includes('water_logging') ? 'active' : ''}`}
                                onClick={() => {
                                    hapticButton();
                                    onToggleType('water_logging');
                                }}
                            >
                                <div className="android-icon-box" style={{ background: '#3b82f6' }}>
                                    {issueCounts['water_logging'] || 0}
                                </div>
                                <span className="android-label">Water Logging</span>
                            </div>

                            <div
                                className={`android-filter-item ${selectedTypes.includes('encroachment') ? 'active' : ''}`}
                                onClick={() => {
                                    hapticButton();
                                    onToggleType('encroachment');
                                }}
                            >
                                <div className="android-icon-box" style={{ background: '#8b5cf6' }}>
                                    {issueCounts['encroachment'] || 0}
                                </div>
                                <span className="android-label">Encroachment</span>
                            </div>

                            <div
                                className={`android-filter-item ${selectedTypes.includes('misc') ? 'active' : ''}`}
                                onClick={() => {
                                    hapticButton();
                                    onToggleType('misc');
                                }}
                            >
                                <div className="android-icon-box" style={{ background: '#64748b' }}>
                                    {issueCounts['misc'] || 0}
                                </div>
                                <span className="android-label">Miscellaneous</span>
                            </div>

                            <div
                                className="android-support-btn"
                                onClick={() => {
                                    hapticButton();
                                    onDonateClick?.();
                                }}
                            >
                                <div className="android-support-icon">
                                    <Heart size={30} fill="#ffffff" color="#ffffff" />
                                </div>
                                <span className="android-support-label">Support Me</span>
                            </div>
                        </div>
                    </div>

                    <div className="menu-section" style={{ marginTop: '1rem' }}>
                        <div className="menu-label">APPEARANCE</div>
                        <div
                            className="android-appearance-bar"
                            onClick={() => {
                                hapticButton();
                                onThemeToggle();
                            }}
                        >
                            {theme === 'light' ? (
                                <><Moon size={20} /> Dark Mode</>
                            ) : (
                                <><Sun size={20} /> Light Mode</>
                            )}
                        </div>
                    </div>

                    {voterId && (
                        <div className="menu-section" style={{ marginTop: '1rem' }}>
                            <div className="menu-label">REWARDS PAYOUT ID</div>
                                <div className="reward-id-box" style={{ marginTop: '0.5rem' }}>
                                    <span className="reward-id-value">
                                        {voterId.substring(0, 8)}...
                                    </span>
                                    <button
                                        className="reward-id-copy"
                                        onClick={() => copyToClipboard(voterId)}
                                        aria-label="Copy Reward ID"
                                    >
                                        <Copy size={16} />
                                    </button>
                                </div>
                                <p className="reward-id-info" style={{ marginTop: '0.5rem' }}>
                                    This anonymous ID is stored locally on your device to track your 10 reports and prevent duplicate payouts.
                                </p>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
};
