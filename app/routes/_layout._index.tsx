import { useOutletContext, useNavigate } from "@remix-run/react";
import { motion, AnimatePresence } from "framer-motion";
import { PlusCircle, Navigation } from "lucide-react";
import { hapticButton } from "../utils/haptic";
import { Spinner } from "../components/Skeleton";
import { useState } from "react";

export default function HomeView() {
  const { map, setUserLocation } = useOutletContext<any>();
  const navigate = useNavigate();
  const [isLocating, setIsLocating] = useState(false);

  const handleLocateMe = () => {
    hapticButton();
    setIsLocating(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setUserLocation([latitude, longitude]);
          if (map) {
            map.flyTo({
              center: [longitude, latitude],
              zoom: 16,
              essential: true
            });
          }
          setIsLocating(false);
        },
        (error) => {
          console.error("Error getting location:", error);
          setIsLocating(false);
        }
      );
    } else {
      setIsLocating(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        transition={{ duration: 0.5, ease: "linear" }}
        style={{ position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 1000, pointerEvents: 'none' }}
      >
        <div className="mobile-bottom-bar" style={{ pointerEvents: 'auto' }}>
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
            onClick={handleLocateMe}
            disabled={isLocating}
            aria-label="Locate me"
          >
            {isLocating ? (
              <Spinner style={{ fontSize: '1.2rem', width: '18px', height: '18px' }} />
            ) : (
              <Navigation size={18} />
            )}
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
