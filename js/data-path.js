/**
 * Chemins relatifs vers data/ — compatible localhost et GitHub Pages (sous-dossier).
 */
function getSiteBase() {
  let path = window.location.pathname;
  const last = path.split('/').pop() || '';
  if (last.includes('.')) {
    path = path.slice(0, path.lastIndexOf('/') + 1);
  } else if (!path.endsWith('/')) {
    path += '/';
  }
  return path;
}

function dataUrl(filename) {
  return `${getSiteBase()}data/${filename}`;
}
