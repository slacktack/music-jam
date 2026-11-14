export interface Station {
  id: string;
  name: string;
  url: string;
  favicon: string;
  tags: string;
  country: string;
  hls: boolean;
  codec?: string;
  bitrate?: number;
}

export interface FloorUser {
  id: string;
  name: string;
  color: string;
  stationId: string | null;
}

export interface FloorStation extends Station {
  count: number;
}

export interface ChatMsg {
  id: string;
  user: { id: string; name: string; color: string };
  text: string;
  station: string;
  ts: number;
}
