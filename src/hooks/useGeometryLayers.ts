// import { useState, useEffect, useCallback } from "react";
// import { FeatureCollection, Geometry } from "geojson";
// import { HazardLayerConfig } from "../types";

// export const useGeometryLayers = (visibleLayerIds: string[] = []) => {
//   const [hazardLayers, setHazardLayers] = useState<HazardLayerConfig[]>([]);
//   const [isLoaded, setIsLoaded] = useState(false);

//   const loadHazardLayersConfig = useCallback(async () => {
//     try {
//       const response = await fetch(
//         `${import.meta.env.BASE_URL}data/Hazards/Hazard_layers.json`
//       );
//       const config = await response.json();
//       return config.hazardLayers;
//     } catch (err) {
//       console.error("Error loading hazard layers configuration:", err);
//       return [];
//     }
//   }, []);

//   const loadHazardData = useCallback(
//     async (layer: HazardLayerConfig): Promise<FeatureCollection<Geometry> | null> => {
//       try {
//         const url = `${import.meta.env.BASE_URL}${layer.filePath}`;
//         console.log("Fetching Hazard:", layer.id, "url:", url);
//         const response = await fetch(url);
//         return await response.json();
//       } catch (err) {
//         console.error(`Error loading ${layer.name} data:`, err);
//         return null;
//       }
//     },
//     []
//   );

//   // Load hazard layers config once
//   useEffect(() => {
//     if (!isLoaded) {
//       console.log("Loading hazard layers config...");
//       loadHazardLayersConfig().then((layers) => {
//         const layersWithVisibility = layers.map((layer: HazardLayerConfig) => ({
//           ...layer,
//           visible: visibleLayerIds.includes(layer.id),
//         }));

//         console.log("Hazard layers loaded with initial visibility:", {
//           visibleFromUrl: visibleLayerIds,
//           layersLoaded: layersWithVisibility.map((l: HazardLayerConfig) => ({
//             id: l.id,
//             visible: l.visible,
//           })),
//         });

//         setHazardLayers(layersWithVisibility);
//         setIsLoaded(true);
//       });
//     }
//   }, [isLoaded, loadHazardLayersConfig, visibleLayerIds]);

//   // Update visibility when URL changes (after layers are loaded)
//   useEffect(() => {
//     if (isLoaded && hazardLayers.length > 0) {
//       console.log("Updating hazard layer visibility from URL change:", {
//         current: hazardLayers.map((l) => ({ id: l.id, visible: l.visible })),
//         newVisible: visibleLayerIds,
//       });
  
//       setHazardLayers((prev) =>
//         prev.map((layer) => {
//           const shouldBeVisible = visibleLayerIds.includes(layer.id);
//           if (layer.visible === shouldBeVisible) return layer; // no change
//           return { ...layer, visible: shouldBeVisible };
//         })
//       );
//     }
//   }, [visibleLayerIds, isLoaded]); 

//   // Load data for visible hazard layers
//   useEffect(() => {
//     const loadVisibleLayers = async () => {
//       const visibleLayers = hazardLayers.filter(
//         (layer) => layer.visible && !layer.data
//       );

//       if (visibleLayers.length === 0) return;

//       console.log(
//         "Loading data for visible hazard layers:",
//         visibleLayers.map((l) => l.id)
//       );

//       const loadPromises = visibleLayers.map(async (layer) => {
//         const layerData = await loadHazardData(layer);
//         if (layerData) {
//           setHazardLayers((prev) =>
//             prev.map((l) =>
//               l.id === layer.id ? { ...l, data: layerData } : l
//             )
//           );
//         }
//       });

//       await Promise.all(loadPromises);
//     };

//     if (hazardLayers.some((layer) => layer.visible && !layer.data)) {
//       loadVisibleLayers();
//     }
//   }, [hazardLayers, loadHazardData]);

//   // Return current visible hazard layer IDs
//   const getCurrentVisibleLayerIds = useCallback(() => {
//     return hazardLayers.filter((layer) => layer.visible).map((layer) => layer.id);
//   }, [hazardLayers]);

//   const findLayer = (
//     layers: HazardLayerConfig[],
//     id: string
//   ): HazardLayerConfig | undefined => {
//     for (const l of layers) {
//       if (l.id === id) return l;
//       if (l.children) {
//         const found = findLayer(l.children, id);
//         if (found) return found;
//       }
//     }
//     return undefined;
//   };
  
//   const toggleLayer = (
//     layers: HazardLayerConfig[],
//     id: string,
//     isParent = false
//   ): HazardLayerConfig[] => {
//     return layers.map(layer => {
//       if (layer.id === id) {
//         // Parent toggle
//         if (isParent && layer.children) {
//           const newVisible = !layer.visible;
//           return {
//             ...layer,
//             visible: newVisible,
//             children: layer.children.map(child => ({
//               ...child,
//               visible: newVisible
//             }))
//           };
//         }
//         // Normal toggle
//         return { ...layer, visible: !layer.visible };
//       }
  
//       // If this layer has children, recurse
//       if (layer.children) {
//         const updatedChildren = toggleLayer(layer.children, id, isParent);
//         const allChildrenVisible = updatedChildren.every(c => c.visible);
//         const anyChildVisible = updatedChildren.some(c => c.visible);
//         return {
//           ...layer,
//           children: updatedChildren,
//           visible: allChildrenVisible ? true : anyChildVisible ? false : layer.visible,
//         };
//       }
  
//       return layer;
//     });
//   };

//   const toggleHazardLayer = useCallback((id: string, isParent = false) => {
//     setHazardLayers(prev => toggleLayer(prev, id, isParent));
//   }, []);


//   return {
//     hazardLayers,
//     getCurrentVisibleLayerIds,
//     toggleHazardLayer,
//     isInitialized: isLoaded && hazardLayers.length > 0,
//   };
// };