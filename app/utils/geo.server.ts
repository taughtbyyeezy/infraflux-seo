import crypto from 'crypto';

/**
 * Reverse geocodes coordinates into human-readable location parts using Nominatim.
 */
export async function getAddressFromCoords(lat: number, lng: number): Promise<{ location: string; city: string }> {
    try {
        const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`;
        
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'InfraFlux App - contact@infraflux.org'
            }
        });

        if (!response.ok) {
            throw new Error(`Reverse geocoding failed: ${response.statusText}`);
        }

        const data = await response.json();
        const address = data.address || {};

        // Extract location part: road, suburb, neighbourhood, or village
        const location = address.road || address.suburb || address.neighbourhood || address.village || "";
        
        // Extract city part: city, town, or county
        const city = address.city || address.town || address.county || "";

        return { location, city };
    } catch (error) {
        console.error("Reverse geocoding error:", error);
        return { location: "", city: "" };
    }
}

/**
 * Generates an SEO-friendly slug from issue type, location, and city.
 * Format: {type}-{location}-{city}-{shortId}
 */
export function generateIssueSlug(issueType: string, location: string, city: string, fullUuid: string): string {
    const shortId = fullUuid.substring(0, 8);
    
    // Combine into base string
    let base = `${issueType} ${location} ${city}`.trim();
    
    // Clean string: lowercase, replace spaces/underscores with hyphens, strip non-alphanumeric/hyphen
    let cleaned = base.toLowerCase()
        .replace(/[\s_]+/g, '-')
        .replace(/[^a-z0-9-]/g, '');

    // Truncate to 80 chars
    let truncated = cleaned.substring(0, 80);
    
    // Remove any trailing hyphens
    truncated = truncated.replace(/-+$/, '');

    // If truncated became empty (no valid chars in name), use the type only or a default
    if (!truncated) {
        truncated = issueType.toLowerCase();
    }

    return `${truncated}-${shortId}`;
}
