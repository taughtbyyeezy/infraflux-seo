import { defer, type LoaderFunctionArgs } from "@remix-run/node";
import { Outlet, useLoaderData, useLocation, useNavigate, useFetcher, useRouteLoaderData, useNavigation, Await } from "@remix-run/react";
import { useState, useEffect, useRef, useMemo, Suspense } from "react";
import { query } from "../db.server";
import { Map, MapMarker } from "../components/ui/MapLibre";
import { ZoomHandler } from "../components/map/ZoomHandler";
import { MapRegister } from "../components/map/MapRegister";
import { IssuesLayer } from "../components/map/IssuesLayer";
import { MapClickHandler } from "../components/map/MapClickHandler";
import { MapFlyIn } from "../components/map/MapFlyIn";
import { MobileHeader } from "../components/panels/MobileHeader";
import { MobileBottomPanel } from "../components/panels/MobileBottomPanel";
import { useToast } from "../contexts/ToastContext";
import { hapticButton, hapticSuccess } from "../utils/haptic";
import { getGeoErrorMessage } from "../utils/geo";
import { PlusCircle, Navigation } from "lucide-react";
import { Spinner } from "../components/Skeleton";
import { motion, AnimatePresence } from "framer-motion";
import maplibregl from "maplibre-gl";

export async function loader({ request, params }: LoaderFunctionArgs) {
  const slug = params.slug;
  
  const issuesPromise = query(
    slug 
      ? "SELECT id, slug, type, status, ST_Y(geom::geometry) as lat, ST_X(geom::geometry) as lng FROM issues WHERE slug = $1"
      : "SELECT id, slug, type, status, ST_Y(geom::geometry) as lat, ST_X(geom::geometry) as lng FROM issues WHERE status != 'resolved' LIMIT 50",
    slug ? [slug] : undefined
  ).then(res => res.rows.map(row => ({
    ...row,
    location: [parseFloat(row.lat), parseFloat(row.lng)]
  })));

  const countsPromise = query(`
    SELECT type, COUNT(*)::int as count 
    FROM issues 
    WHERE status != 'resolved' 
    GROUP BY type
  `).then(res => {
    const counts: Record<string, number> = {};
    res.rows.forEach(row => {
      counts[row.type] = row.count;
    });
    return counts;
  });

  return defer({ 
    initialIssues: issuesPromise,
    globalCounts: countsPromise
  });
}

function DeferredDataSync({ resolvedIssues, setIssues }: { resolvedIssues: any[], setIssues: Function }) {
    useEffect(() => {
        setIssues(resolvedIssues);
    }, [resolvedIssues, setIssues]);
    return null;
}

function DeferredCountsSync({ resolvedCounts, setCounts }: { resolvedCounts: Record<string, number>, setCounts: Function }) {
    useEffect(() => {
        setCounts(resolvedCounts);
    }, [resolvedCounts, setCounts]);
    return null;
}

export default function MapLayout() {
  const { initialIssues, globalCounts } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<any>();
  const themeFetcher = useFetcher();
  const { addToast } = useToast();
  const location = useLocation();
  const navigate = useNavigate();
  const navigation = useNavigation();
  const { theme } = useRouteLoaderData("root") as { theme: "light" | "dark" };
  const [issues, setIssues] = useState<any[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [zoom, setZoom] = useState(0);
  const [selectedTypes, setSelectedTypes] = useState<string[]>(['pothole', 'water_logging', 'garbage_dump', 'encroachment', 'misc']);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [map, setMap] = useState<maplibregl.Map | null>(null);
  const [reportCoordinates, setReportCoordinates] = useState<[number, number] | null>(null);
  const [reportType, setReportType] = useState<string>('pothole');
  const [isArtificialLoading, setIsArtificialLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsArtificialLoading(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  const isReporting = location.pathname === "/report";
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [isLocating, setIsLocating] = useState(false);

  const issueColors: Record<string, string> = {
    pothole: '#ef4444',
    water_logging: '#3b82f6',
    garbage_dump: '#fbbf24',
    encroachment: '#8b5cf6',
    misc: '#64748b'
  };

  const lastViewportUpdate = useRef(0);

  // Sync fetcher data with issues state
  useEffect(() => {
    if (fetcher.data?.issues) {
      setIssues(fetcher.data.issues);
    }
  }, [fetcher.data]);


  // SSR sync removed in favor of DeferredDataSync

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

  const ZOOM_THRESHOLD = 5.0;
  const isStreetLevel = zoom > ZOOM_THRESHOLD;
  const isRotationLocked = isStreetLevel || location.pathname.startsWith("/issue/");
  const isNavigatingToIssue = navigation.state === 'loading' && navigation.location.pathname.startsWith('/issue/');
  const isLoading = fetcher.state === 'loading' || fetcher.state === 'submitting' || isArtificialLoading;

  const handleMoveEnd = (mapInstance: any) => {
    // Prevent the globe spin animation from spamming the fetcher 60 times a second
    if (mapInstance && isStreetLevel) {
        fetchMarkersForBounds(mapInstance);
    }

    if (isRotationLocked) {
        const bearing = mapInstance.getBearing();
        const pitch = mapInstance.getPitch();
        
        if (bearing !== 0 || pitch !== 0) {
            mapInstance.easeTo({
                bearing: 0,
                pitch: 0,
                duration: 400, // Adjusted slightly for a smoother cinematic snap
                essential: true
            });
        }
    }
  };

  return (
    <div className="map-container">
      <Suspense fallback={null}>
          <Await resolve={initialIssues}>
              {(resolvedIssues) => (
                  <DeferredDataSync resolvedIssues={resolvedIssues} setIssues={setIssues} />
              )}
          </Await>
      </Suspense>
      <Suspense fallback={null}>
          <Await resolve={globalCounts}>
              {(resolvedCounts) => (
                  <DeferredCountsSync resolvedCounts={resolvedCounts} setCounts={setCounts} />
              )}
          </Await>
      </Suspense>
      
      <Map
        projection={isStreetLevel ? { type: 'mercator' } : { type: 'globe' }}
        dragRotate={!isRotationLocked}
        touchZoomRotate={!isRotationLocked}
        touchPitch={!isRotationLocked}
        maxPitch={isRotationLocked ? 0 : 85}
        center={[-98.5795, 39.8283]} // Geographic center (default)
        zoom={zoom}
        onZoomChange={setZoom}
        style={{ height: '100%', width: '100%' }}
        theme={theme}
        onMoveEnd={handleMoveEnd}
        isPanelOpen={location.pathname.startsWith("/issue/")}
      >
        <MapFlyIn 
            isLoading={isLoading} 
            targetCenter={[78.9629, 20.5937]} 
            targetZoom={4} 
        />
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
          issueCounts={counts}
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
                // Only allow click-to-report in flat projection (zoomed in)
                if (!isStreetLevel) return;

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
              className="unified-action-pill"
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
            >
                <button
                    type="button"
                    className="unified-report-side"
                    onClick={() => {
                        hapticButton();
                        navigate("/report");
                    }}
                >
                    <span>REPORT ISSUE</span>
                </button>
                <button
                    type="button"
                    className={`nested-locate-btn ${isLocating ? 'locating' : ''}`}
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

      {/* Optimistic Skeleton Drawer */}
      {isNavigatingToIssue && (
        <MobileBottomPanel onClose={() => {}}>
            <div className="p-4 space-y-4 w-full">
                {/* Title Skeleton */}
                <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-3/4 animate-pulse"></div>
                {/* Meta Info Skeleton */}
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 animate-pulse mt-2"></div>
                {/* Image/Map Placeholder Skeleton */}
                <div className="h-48 bg-gray-200 dark:bg-gray-700 rounded-lg w-full animate-pulse mt-4"></div>
                {/* Description Skeleton Lines */}
                <div className="space-y-2 mt-4">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full animate-pulse"></div>
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6 animate-pulse"></div>
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-4/6 animate-pulse"></div>
                </div>
            </div>
        </MobileBottomPanel>
      )}
    </div>
  );
}
