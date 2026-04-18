export type RootStackParamList = {
  Home: undefined;
  Destination: undefined;
  Route: {
    destination: string;
  };
  SOS: undefined;
  Settings: undefined;
  CameraPlaceholder: undefined;
  VoiceAssistantPlaceholder: undefined;
};

export type RouteCoordinate = {
  latitude: number;
  longitude: number;
};

export type CurrentLocation = RouteCoordinate & {
  accuracy?: number | null;
  heading?: number | null;
  speed?: number | null;
};

export type RouteStep = {
  id: string;
  instruction: string;
  distance: number;
  duration: number;
  lat: number;
  lng: number;
  maneuverType: string;
};

export type RouteResponse = {
  destinationLabel: string;
  distance: number;
  duration: number;
  geometry: RouteCoordinate[];
  steps: RouteStep[];
};

export type RouteProgress = {
  activeStepIndex: number;
  hasArrived: boolean;
  needsReroute: boolean;
  distanceToNextStep: number | null;
};
