/**
 * Formateador de unidades para evitar errores gramaticales como "unidads".
 */
export const formatUnit = (unit: string | undefined, count: number = 1): string => {
  const u = (unit || 'unidad').trim().toLowerCase();
  if (u === 'unidad') {
    return count === 1 ? 'unidad' : 'unidades';
  }
  if (u === 'caja') {
    return count === 1 ? 'caja' : 'cajas';
  }
  if (u === 'paquete') {
    return count === 1 ? 'paquete' : 'paquetes';
  }
  if (u === 'pieza') {
    return count === 1 ? 'pieza' : 'piezas';
  }
  if (u === 'litro') {
    return count === 1 ? 'litro' : 'litros';
  }
  if (u === 'metro') {
    return count === 1 ? 'metro' : 'metros';
  }
  if (u === 'par') {
    return count === 1 ? 'par' : 'pares';
  }
  if (u === 'kg' || u === 'g' || u === 'ml') {
    return u;
  }
  return count === 1 ? u : `${u}s`;
};

export const formatStockWithUnit = (count: number, unit?: string): string => {
  return `${count} ${formatUnit(unit, count)}`;
};
