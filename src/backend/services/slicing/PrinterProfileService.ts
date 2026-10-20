import { IPrinterProfile } from '../../domain/slicing';

export const STANDARD_PRINTER_PROFILES: IPrinterProfile[] = [
  {
    id: 'bambu-x1c-p1s',
    name: 'Bambu Lab X1-Carbon / P1S / P1P',
    manufacturer: 'Bambu Lab',
    bedDimensions: { x: 256, y: 256, z: 256 },
    maxSpeedMmS: 500,
    heatedBed: true,
    recommendedSupport: 'tree',
    accentColor: '#10b981', // Emerald green
  },
  {
    id: 'bambu-a1-mini',
    name: 'Bambu Lab A1 Mini',
    manufacturer: 'Bambu Lab',
    bedDimensions: { x: 180, y: 180, z: 180 },
    maxSpeedMmS: 500,
    heatedBed: true,
    recommendedSupport: 'tree',
    accentColor: '#059669',
  },
  {
    id: 'prusa-mk4',
    name: 'Original Prusa MK4S / MK4',
    manufacturer: 'Prusa',
    bedDimensions: { x: 250, y: 210, z: 220 },
    maxSpeedMmS: 200,
    heatedBed: true,
    recommendedSupport: 'tree',
    accentColor: '#f97316', // Orange
  },
  {
    id: 'creality-k1',
    name: 'Creality K1 / K1 Max',
    manufacturer: 'Creality',
    bedDimensions: { x: 220, y: 220, z: 250 },
    maxSpeedMmS: 600,
    heatedBed: true,
    recommendedSupport: 'normal',
    accentColor: '#3b82f6', // Blue
  },
  {
    id: 'voron-24',
    name: 'Voron 2.4 CoreXY',
    manufacturer: 'Custom',
    bedDimensions: { x: 300, y: 300, z: 300 },
    maxSpeedMmS: 400,
    heatedBed: true,
    recommendedSupport: 'tree',
    accentColor: '#ef4444', // Red
  }
];

export class PrinterProfileService {
  getAllProfiles(): IPrinterProfile[] {
    return STANDARD_PRINTER_PROFILES;
  }

  getProfileById(id: string): IPrinterProfile {
    const found = STANDARD_PRINTER_PROFILES.find(p => p.id === id);
    return found || STANDARD_PRINTER_PROFILES[0];
  }
}

export const printerProfileService = new PrinterProfileService();
