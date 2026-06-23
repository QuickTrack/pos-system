import { Shift, CashDrop, ZRead, Variance } from '@/models';

export async function generateShiftId(): Promise<string> {
  const year = new Date().getFullYear();
  const count = await Shift.countDocuments({ shiftId: { $regex: `^SHF-${year}-` } });
  return `SHF-${year}-${String(count + 1).padStart(5, '0')}`;
}

export async function generateCashDropId(): Promise<string> {
  const year = new Date().getFullYear();
  const count = await CashDrop.countDocuments({ dropId: { $regex: `^CD-${year}-` } });
  return `CD-${year}-${String(count + 1).padStart(5, '0')}`;
}

export async function generateZReadId(): Promise<string> {
  const year = new Date().getFullYear();
  const count = await ZRead.countDocuments({ readId: { $regex: `^ZR-${year}-` } });
  return `ZR-${year}-${String(count + 1).padStart(5, '0')}`;
}

export async function generateVarianceId(): Promise<string> {
  const year = new Date().getFullYear();
  const count = await Variance.countDocuments({ varianceId: { $regex: `^VAR-${year}-` } });
  return `VAR-${year}-${String(count + 1).padStart(5, '0')}`;
}
