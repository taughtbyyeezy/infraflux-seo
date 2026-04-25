import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { Outlet, useLoaderData, useLocation, useNavigate, useFetcher, useRouteLoaderData } from "@remix-run/react";
import { useState, useEffect, useRef, useMemo } from "react";
import { query } from "../db.server";
import { Map, MapMarker } from "../components/ui/MapLibre";
import { ZoomHandler } from "../components/map/ZoomHandler";
import { MapRegister } from "../components/map/MapRegister";
import { IssuesLayer } from "../components/map/IssuesLayer";
import { MapClickHandler } from "../components/map/MapClickHandler";
import { MobileHeader } from "../components/panels/MobileHeader";
import { useToast } from "../contexts/ToastContext";
import { hapticButton, hapticSuccess } from "../utils/haptic";
import { getGeoErrorMessage } from "../utils/geo";
import { PlusCircle, Navigation } from "lucide-react";
import { Spinner } from "../components/Skeleton";
import { motion, AnimatePresence } from "framer-motion";
import maplibregl from "maplibre-gl";

export async function loader({ request, params }: LoaderFunctionArgs) {
  // Lightweight fetch logic for initial SSR
  // If we have a slug in params, fetch that specific one
  // Otherwise fetch a general summary
  const slug = params.slug;
  
  let issues = [];
  if (slug) {
    const res = await query("SELECT *, ST_Y(geom::geometry) as lat, ST_X(geom::geometry) as lng FROM issues WHERE slug = $1", [slug]);
    issues = res.rows.map(row => ({
      ...row,
      location: [parseFloat(row.lat), parseFloat(row.lng)]
    }));
  } else {
    // Fetch top 50 recent issues for initial view
    const res = await query("SELECT *, ST_Y(geom::geometry) as lat, ST_X(geom::geometry) as lng FROM issues WHERE status != 'resolved' LIMIT 50");
    issues = res.rows.map((row: any) => ({
      ...row,
      location: [parseFloat(row.lat), parseFloat(row.lng)]
    }));
  }

  // Fetch global counts for all active/pending issues
  const countsRes = await query(`
    SELECT type, COUNT(*)::int as count 
    FROM issues 
    WHERE status != 'resolved' 
    GROUP BY type
  `);

  const globalCounts: Record<string, number> = {};
  countsRes.rows.forEach(row => {
    globalCounts[row.type] = row.count;
  });

  return json({ 
    initialIssues: issues,
    globalCounts
  });
}

export default function MapLayout() {
  const { initialIssues, globalCounts } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<any>();
  const themeFetcher = useFetcher();
  const { addToast } = useToast();
  const location = useLocation();
  const navigate = useNavigate();
  const { theme } = useRouteLoaderData("root") as { theme: "light" | "dark" };
  const [issues, setIssues] = useState(initialIssues);
  const [zoom, setZoom] = useState(0);
  const [selectedTypes, setSelectedTypes] = useState<string[]>(['pothole', 'water_logging', 'garbage_dump']);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [map, setMap] = useState<maplibregl.Map | null>(null);
  const [reportCoordinates, setReportCoordinates] = useState<[number, number] | null>(null);
  const [reportType, setReportType] = useState<string>('pothole');

  const isReporting = location.pathname === "/report";
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [isLocating, setIsLocating] = useState(false);

  const issueColors: Record<string, string> = {
    pothole: '#ef4444',
    water_logging: '#3b82f6',
    garbage_dump: '#fbbf24'
  };

  const lastViewportUpdate = useRef(0);

  // Sync fetcher data with issues state
  useEffect(() => {
    if (fetcher.data?.issues) {
      setIssues(fetcher.data.issues);
    }
  }, [fetcher.data]);


  // Update issues if loader data changes (initial SSR issues)
  useEffect(() => {
    setIssues(initialIssues);
  }, [initialIssues]);

  const handleIssueSelect = (issue: any) => {
    hapticButton();
    navigate(`/issue/${issue.slug}`);
  };

  const toggleTheme = () => {
    hapticButton();
    const nextTheme = theme === "light" ? "dark" : "light";
    themeFetcher.submit(
      { theme: nextTheme },
      { method: "post", action: "/api/set-theme" }
    );
  };

  const handleLocateMe = () => {
    if (!navigator.geolocation) {
        addToast('Geolocation is not supported by your browser', 'error');
        return;
    }

    if (isLocating) return;
    setIsLocating(true);

    const options = {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
    };

    const success = (position: GeolocationPosition) => {
        const { latitude, longitude } = position.coords;
        const newLoc: [number, number] = [latitude, longitude];

        setUserLocation(newLoc);
        hapticSuccess();
        
        if (map) {
            map.flyTo({
                center: [longitude, latitude],
                zoom: 16,
                duration: 2000,
                essential: true
            });
        }
        
        // Cooldown
        setTimeout(() => setIsLocating(false), 2000);
    };

    const error = (err: GeolocationPositionError) => {
        console.error('Geolocation error:', err);
        addToast(getGeoErrorMessage(err), 'error');
        setIsLocating(false);
    };

    navigator.geolocation.getCurrentPosition(success, error, options);
  };

  const fetchMarkersForBounds = (m: maplibregl.Map) => {
    const bounds = m.getBounds();
    const minLng = bounds.getWest();
    const minLat = bounds.getSouth();
    const maxLng = bounds.getEast();
    const maxLat = bounds.getNorth();

    const timestamp = new Date().toISOString();
    fetcher.load(`/api/map-state?minLng=${minLng}&minLat=${minLat}&maxLng=${maxLng}&maxLat=${maxLat}&timestamp=${timestamp}`);
  };

  const filteredIssues = useMemo(() => {
    return issues.filter((issue: any) => selectedTypes.includes(issue.type));
  }, [issues, selectedTypes]);

  return (
    <div className="map-container">
      
      <Map
        center={[-98.5795, 39.8283]} // Geographic center (default)
        zoom={zoom}
        style={{ height: '100%', width: '100%' }}
        theme={theme}
        onMoveEnd={(vp) => {
          setZoom(vp.zoom);
          if (map) {
            fetchMarkersForBounds(map);
          }
        }}
        isPanelOpen={location.pathname.startsWith("/issue/")}
      >
        <MobileHeader 
          theme={theme}
          isMenuOpen={isMenuOpen}
          onMenuToggle={() => setIsMenuOpen(!isMenuOpen)}
          selectedTypes={selectedTypes}
          onToggleType={(type) => {
            setSelectedTypes(prev => 
              prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
            );
          }}
          onThemeToggle={toggleTheme}
          issueCounts={globalCounts}
        />
        <ZoomHandler onZoomChange={setZoom} />
        <MapRegister setMap={setMap} />
        <IssuesLayer 
          issues={filteredIssues} 
          zoom={zoom} 
          onSelect={handleIssueSelect} 
          onZoomChange={setZoom}
        />

        {isReporting && reportCoordinates && (
          <MapMarker
            longitude={reportCoordinates[1]}
            latitude={reportCoordinates[0]}
            draggable={true}
            onDrag={(lngLat) => setReportCoordinates([lngLat.lat, lngLat.lng])}
            onDragEnd={(lngLat) => setReportCoordinates([lngLat.lat, lngLat.lng])}
          >
            <div className="report-pin-marker" style={{ '--marker-color': issueColors[reportType] || '#ef4444' } as any}>
              <div className="report-pin-glow" />
              <div className="report-pin-inner" />
            </div>
          </MapMarker>
        )}
        
        {/* Mobile controls and extra layers from UserMap */}
        <MapClickHandler 
            onMapClick={(loc) => {
                // If we are already reporting, just move the pin
                setReportCoordinates(loc);
                hapticButton();
                
                if (map) {
                    map.flyTo({
                        center: [loc[1], loc[0]],
                        zoom: 18,
                        duration: 1000,
                        essential: true
                    });
                }

                // If not in reporting mode, enter it automatically
                if (!isReporting) {
                    navigate("/report");
                }
            }}
            addToast={addToast}
        />

        {/* Floating Action Bar */}
        <AnimatePresence>
          {!isReporting && (
            <motion.div 
              className="mobile-bottom-bar"
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
            >
                <button
                    type="button"
                    className="mobile-report-btn"
                    onClick={() => {
                        hapticButton();
                        navigate("/report");
                    }}
                >
                    <PlusCircle size={18} />
                    <span>REPORT ISSUE</span>
                </button>
                <button
                    type="button"
                    className={`mobile-locate-btn ${isLocating ? 'locating' : ''}`}
                    onClick={() => {
                        hapticButton();
                        handleLocateMe();
                    }}
                    disabled={isLocating}
                    aria-label="Locate me"
                >
                    {isLocating ? (
                        <Spinner style={{ fontSize: '1.2rem', width: '18px', height: '18px' }} />
                    ) : (
                        <Navigation size={18} />
                    )}
                </button>
            </motion.div>
          )}
        </AnimatePresence>
      </Map>
      
      {/* Route Content (Bottom Panels, Admin, etc.) */}
      <Outlet context={{ 
        map, 
        issues, 
        setIssues, 
        userLocation, 
        setUserLocation, 
        reportCoordinates, 
        setReportCoordinates,
        reportType,
        setReportType
      }} />
    </div>
  );
}
