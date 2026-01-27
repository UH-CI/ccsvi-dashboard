declare module 'react-leaflet-cluster' {
  import { FC, ReactNode } from 'react';
  import L from 'leaflet';
  import 'leaflet.markercluster';

  interface MarkerClusterGroupProps {
    children?: ReactNode;
    iconCreateFunction?: (cluster: L.MarkerCluster) => L.DivIcon | L.Icon;
    chunkedLoading?: boolean;
    spiderfyOnMaxZoom?: boolean;
    showCoverageOnHover?: boolean;
    maxClusterRadius?: number | ((zoom: number) => number);
    disableClusteringAtZoom?: number;
    spiderfyDistanceMultiplier?: number;
    spiderLegPolylineOptions?: L.PolylineOptions;
    zoomToBoundsOnClick?: boolean;
    singleMarkerMode?: boolean;
    animate?: boolean;
    animateAddingMarkers?: boolean;
    removeOutsideVisibleBounds?: boolean;
    polygonOptions?: L.PolylineOptions;
  }

  const MarkerClusterGroup: FC<MarkerClusterGroupProps>;
  export default MarkerClusterGroup;
}
