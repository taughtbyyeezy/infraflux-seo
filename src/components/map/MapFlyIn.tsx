import React, { useEffect, useRef } from 'react';
import { useMap } from '../ui/MapLibre';

interface MapFlyInProps {
    isLoading: boolean;
    targetCenter: [number, number]; // [lat, lng]
    targetZoom: number;
}

export const MapFlyIn: React.FC<MapFlyInProps> = ({ isLoading, targetCenter, targetZoom }) => {
    const { map, isLoaded } = useMap();
    const hasFlown = useRef(false);
    
    const isLoadingRef = useRef(isLoading);
    useEffect(() => {
        isLoadingRef.current = isLoading;
    }, [isLoading]);

    useEffect(() => {
        if (!map || !isLoaded) return;
        if (hasFlown.current) return;

        hasFlown.current = true;

        map.setBearing(0); 
        map.setPitch(15);  

        const minDuration = 3000; 
        const speed = 360 / 2000; // 1 spin every 2 seconds
        const spinLat = 20; 
        const overshootDegrees = 180; // The Americas
        
        const startLng = targetCenter[1] + 720; 
        
        map.setZoom(0.2); 
        map.setCenter([startLng, spinLat]);

        const startTime = Date.now();
        
        // This variable holds the exact longitude we want to trigger the flyTo
        let swoopTargetLng: number | null = null;

        const animateRotation = () => {
            const now = Date.now();
            const elapsed = now - startTime;

            // 1. Calculate current position based on speed
            const currentLng = startLng - (speed * elapsed);

            // 2. Are we locked on target AND have we spun past it?
            if (swoopTargetLng !== null && currentLng <= swoopTargetLng) {
                // We reached the Americas! Snap exactly to it to prevent frame-stutter
                map.setCenter([swoopTargetLng, spinLat]);
                
                // THE FINALE: No braking, just instantly sweep into India
                map.flyTo({
                    center: [targetCenter[1], targetCenter[0]], 
                    zoom: targetZoom,
                    pitch: 0,
                    duration: 1200, 
                    curve: 1.6, 
                    essential: true,
                });
                
                return; // STOP THE ANIMATION LOOP
            }

            // 3. Otherwise, keep updating the center to spin the globe
            map.setCenter([currentLng, spinLat]);

            // 4. Have the conditions been met to lock our target?
            if (swoopTargetLng === null && !isLoadingRef.current && elapsed >= minDuration) {
                
                const desiredStop = targetCenter[1] - overshootDegrees;
                
                // Math to find the distance to the *next* occurrence of the Americas
                let diff = (currentLng - desiredStop) % 360;
                if (diff < 0) diff += 360;
                
                // If we are less than 10 degrees away, it will look like a glitchy snap.
                // Add a full rotation to let the user see a smooth final spin.
                if (diff < 10) diff += 360; 

                // Lock the target!
                swoopTargetLng = currentLng - diff;
            }

            // Continue the loop
            requestAnimationFrame(animateRotation);
        };

        requestAnimationFrame(animateRotation);
    }, [map, isLoaded, targetCenter, targetZoom]);

    return null;
};