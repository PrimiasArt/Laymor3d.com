import { NextRequest, NextResponse } from 'next/server';
import { printerProfileService } from '@/backend/services/slicing/PrinterProfileService';
import { printSimulationEngine } from '@/backend/services/slicing/PrintSimulationEngine';
import { ISupportConfig } from '@/backend/domain/slicing';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { printerId = 'bambu-x1c-p1s', dimensionsMm, supportConfig, layerHeightMm = 0.20 } = body;

    const printer = printerProfileService.getProfileById(printerId);
    const estimation = printSimulationEngine.calculateEstimation(
      printer,
      dimensionsMm || { x: 100, y: 100, z: 100 },
      supportConfig || { enabled: true, type: 'tree', overhangThresholdDegrees: 50, supportDensityPercent: 15, interfaceLayers: 3 },
      layerHeightMm
    );

    return NextResponse.json({ success: true, printer, estimation });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function GET() {
  const printers = printerProfileService.getAllProfiles();
  return NextResponse.json({ success: true, printers });
}
