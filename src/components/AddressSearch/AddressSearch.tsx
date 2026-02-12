import { useEffect, useRef, useCallback } from 'react';
import { useMap } from 'react-leaflet';
import { GeoSearchControl, OpenStreetMapProvider } from 'leaflet-geosearch';
import { FeatureCollection, Geometry, Position, GeoJsonProperties } from 'geojson';
import 'leaflet-geosearch/dist/geosearch.css';

interface SearchResultEvent {
    location: {
        x: number; // longitude
        y: number; // latitude
        label: string;
    };
}

interface AddressSearchProps {
    features: FeatureCollection<Geometry, GeoJsonProperties> | null;
    geoidProperty: string;
    onBlockGroupFound: (geoid: string, lat: number, lng: number) => void;
    onSearchError?: (message: string) => void;
}

// Ray-casting point-in-polygon test for a single ring.
function pointInRing(point: [number, number], ring: Position[]): boolean {
    const [px, py] = point;
    let inside = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
        const [xi, yi] = ring[i];
        const [xj, yj] = ring[j];
        const intersect =
            yi > py !== yj > py &&
            px < ((xj - xi) * (py - yi)) / (yj - yi) + xi;
        if (intersect) inside = !inside;
    }
    return inside;
}

// Check if a point is inside a Polygon or MultiPolygon, handling holes.
function pointInGeometry(lng: number, lat: number, geometry: Geometry): boolean {
    const point: [number, number] = [lng, lat];

    if (geometry.type === 'Polygon') {
        const [outer, ...holes] = geometry.coordinates;
        if (!pointInRing(point, outer)) return false;
        return !holes.some((hole) => pointInRing(point, hole));
    }

    if (geometry.type === 'MultiPolygon') {
        return geometry.coordinates.some((polygon) => {
            const [outer, ...holes] = polygon;
            if (!pointInRing(point, outer)) return false;
            return !holes.some((hole) => pointInRing(point, hole));
        });
    }

    return false;
}

// Find the feature containing a given point and return its GEOID.
function findFeatureAtPoint(
    lng: number,
    lat: number,
    features: FeatureCollection<Geometry, GeoJsonProperties>,
    geoidProperty: string
): string | null {
    for (const feature of features.features) {
        if (pointInGeometry(lng, lat, feature.geometry)) {
            const geoid = feature.properties?.[geoidProperty];
            if (geoid) return String(geoid);
        }
    }
    return null;
}

export const AddressSearch: React.FC<AddressSearchProps> = ({
    features,
    geoidProperty,
    onBlockGroupFound,
    onSearchError,
}) => {
    const map = useMap();

    const stableOnResult = useRef(onBlockGroupFound);
    stableOnResult.current = onBlockGroupFound;

    const stableOnError = useRef(onSearchError);
    stableOnError.current = onSearchError;

    const stableFeatures = useRef(features);
    stableFeatures.current = features;

    const stableGeoidProp = useRef(geoidProperty);
    stableGeoidProp.current = geoidProperty;

    const handleShowLocation = useCallback((e: SearchResultEvent) => {
        console.log('[AddressSearch] geosearch/showlocation fired', e);
        const { x: lng, y: lat } = e.location;
        console.log('[AddressSearch] coordinates:', { lat, lng });

        const fc = stableFeatures.current;
        console.log('[AddressSearch] features loaded:', !!fc, 'count:', fc?.features?.length);
        if (!fc) {
            stableOnError.current?.('Map data not loaded yet.');
            return;
        }

        console.log('[AddressSearch] geoidProperty:', stableGeoidProp.current);
        const geoid = findFeatureAtPoint(lng, lat, fc, stableGeoidProp.current);
        console.log('[AddressSearch] found geoid:', geoid);
        if (geoid) {
            stableOnResult.current(geoid, lat, lng);
        } else {
            stableOnError.current?.('No census block group found at this location.');
        }
    }, []);

    useEffect(() => {
        const provider = new OpenStreetMapProvider({
            params: {
                countrycodes: 'us',
                viewbox: '-162,18,-154,23',
                bounded: 1,
            },
        });

        // @ts-expect-error GeoSearchControl returns a class constructor, not a plain Leaflet control
        const searchControl = new GeoSearchControl({
            provider,
            position: 'topright',
            style: 'button',
            showMarker: true,
            showPopup: true
            ,
            autoClose: true,
            keepResult: true,
            searchLabel: 'Search address in Hawaii...',
        });

        map.addControl(searchControl);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        map.on('geosearch/showlocation' as any, handleShowLocation as any);

        return () => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            map.off('geosearch/showlocation' as any, handleShowLocation as any);
            map.removeControl(searchControl);
        };
    }, [map, handleShowLocation]);

    return null;
};