/* 10.65: Excel-bestanden van buiten lezen in een aparte worker: een kwaadaardig bestand kan zo niet bij de app of de inlog. Geeft alle tabbladen als rijen terug. */
importScripts('xlsx.full.min.js');
onmessage = e => { try { const wb = XLSX.read(e.data.buf, { type: 'array' }), b = {}; for (const n of wb.SheetNames) b[n] = XLSX.utils.sheet_to_json(wb.Sheets[n], { header: 1, raw: true, defval: null }); postMessage({ b }); } catch (x) { postMessage({ fout: String((x && x.message) || x) }); } };
