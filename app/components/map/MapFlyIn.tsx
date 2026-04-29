import React, { useEffect, useRef } from 'react';
import { useMap } from '../ui/MapLibre';

interface MapFlyInProps {
    isLoading: boolean;
    targetCenter: [number, number]; // [lng, lat] for MapLibre
    targetZoom: number;
}

export const MapFlyIn: React.FC<MapFlyInProps> = ({ isLoading, targetCenter, targetZoom }) => {
    const { map, isLoaded } = useMap();
    const hasFlown = useRef(false);
    const requestRef = useRef<number>();
    
    // Keep a mutable ref of the loading state so the animation loop can read it live
    const isLoadingRef = useRef(isLoading);
    useEffect(() => {
        isLoadingRef.current = isLoading;
    }, [isLoading]);

    // Destructure to prevent infinite unmount/remount loops due to inline array props
    const targetLng = targetCenter[0];
    const targetLat = targetCenter[1];

    useEffect(() => {
        if (!map || !isLoaded || hasFlown.current) return;

        hasFlown.current = true;

        // EXACT PROD VALUES
        map.setBearing(0); 
        map.setPitch(15);  
        const minDuration = 3000; 
        const speed = 360 / 2000; // 1 spin every 2 seconds
        const spinLat = 20; 
        const overshootDegrees = 180; 
        
        const startLng = targetLng + 720; // Start 2 spins away
        
        map.setZoom(0.2); 
        map.setCenter([startLng, spinLat]);

        const startTime = Date.now();
        let swoopTargetLng: number | null = null;

        const animateRotation = () => {
            const now = Date.now();
            const elapsed = now - startTime;
            
            // 1. Calculate continuous spin (works indefinitely while loading)
            const currentLng = startLng - (speed * elapsed);

            // 2. Execute the dive if target is locked and we spun past it
            if (swoopTargetLng !== null && currentLng <= swoopTargetLng) {
                map.setCenter([swoopTargetLng, spinLat]);
                
                map.flyTo({
                    center: [targetLng, targetLat], 
                    zoom: targetZoom,
                    pitch: 0,
                    duration: 1200, 
                    curve: 1.6, 
                    essential: true,
                });
                
                return; // Break the infinite loop
            }

            // 3. Keep spinning the globe
            map.setCenter([currentLng, spinLat]);

            // 4. Check if data is ready to calculate the landing lock
            if (swoopTargetLng === null && !isLoadingRef.current && elapsed >= minDuration) {
                const desiredStop = targetLng - overshootDegrees;
                
                let diff = (currentLng - desiredStop) % 360;
                if (diff < 0) diff += 360;
                if (diff < 10) diff += 360; // Add extra spin to prevent glitchy snapping

                swoopTargetLng = currentLng - diff;
            }

            requestRef.current = requestAnimationFrame(animateRotation);
        };

        requestRef.current = requestAnimationFrame(animateRotation);

        return () => {
            hasFlown.current = false;
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
        };
    }, [map, isLoaded, targetLng, targetLat, targetZoom]);

    return null;
};