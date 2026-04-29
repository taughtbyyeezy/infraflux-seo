import React, { useEffect, useRef } from 'react';
import { useMap } from '../ui/MapLibre';

interface MapFlyInProps {
    isLoading: boolean;
    targetCenter: [number, number];
    targetZoom: number;
}

export const MapFlyIn: React.FC<MapFlyInProps> = ({ isLoading, targetCenter, targetZoom }) => {
    const { map, isLoaded } = useMap();
    const hasFlown = useRef(false);
    const requestRef = useRef<number>();
    
    const isLoadingRef = useRef(isLoading);
    useEffect(() => {
        isLoadingRef.current = isLoading;
    }, [isLoading]);

    useEffect(() => {
        if (!map || !isLoaded || hasFlown.current) return;

        hasFlown.current = true;
        map.setBearing(0); 
        map.setPitch(15);  

        const minDuration = 3000; 
        const speed = 360 / 2000; 
        const spinLat = 20; 
        const overshootDegrees = 180; 
        
        const startLng = targetCenter[1] + 720; 
        
        map.setZoom(0.2); 
        map.setCenter([startLng, spinLat]);

        const startTime = Date.now();
        let swoopTargetLng: number | null = null;

        const animateRotation = () => {
            const now = Date.now();
            const elapsed = now - startTime;
            const currentLng = startLng - (speed * elapsed);

            // Target locked and passed: Execute the dive
            if (swoopTargetLng !== null && currentLng <= swoopTargetLng) {
                map.setCenter([swoopTargetLng, spinLat]);
                
                map.flyTo({
                    center: [targetCenter[0], targetCenter[1]], // Note: MapLibre expects [lng, lat]
                    zoom: targetZoom,
                    pitch: 0,
                    duration: 1200, 
                    curve: 1.6, 
                    essential: true,
                });
                
                return; // Ends the loop
            }

            // Keep spinning
            map.setCenter([currentLng, spinLat]);

            // Check if we can lock the target
            if (swoopTargetLng === null && !isLoadingRef.current && elapsed >= minDuration) {
                const desiredStop = targetCenter[1] - overshootDegrees;
                let diff = (currentLng - desiredStop) % 360;
                if (diff < 0) diff += 360;
                if (diff < 10) diff += 360; 

                swoopTargetLng = currentLng - diff;
            }

            requestRef.current = requestAnimationFrame(animateRotation);
        };

        requestRef.current = requestAnimationFrame(animateRotation);

        // REMIX CLEANUP: Prevent memory leaks on route changes
        return () => {
            if (requestRef.current) {
                cancelAnimationFrame(requestRef.current);
            }
        };
    }, [map, isLoaded, targetCenter, targetZoom]);

    return null;
};