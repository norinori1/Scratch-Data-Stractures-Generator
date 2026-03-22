export function buildCostume(dsId, dsName, complexity, color) {
  const escapedName = dsName.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const escapedComplexity = complexity.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const svgString = `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96"><rect width="96" height="96" rx="12" fill="${color}"/><text x="48" y="38" font-family="sans-serif" font-size="11" fill="white" text-anchor="middle" font-weight="bold">${escapedName}</text><text x="48" y="62" font-family="sans-serif" font-size="9" fill="rgba(255,255,255,0.8)" text-anchor="middle">${escapedComplexity}</text></svg>`;

  const assetId = SparkMD5.hash(svgString);
  const md5ext = `${assetId}.svg`;

  return { svgString, md5ext, assetId };
}
