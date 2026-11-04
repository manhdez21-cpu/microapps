/** Archivos adjuntos (fotos de facturas y documentos) en IndexedDB: localStorage no aguanta archivos. Todo falla con elegancia. */
const DB = "microapps-files", STORE = "files";
function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") return reject(new Error("Este navegador no permite guardar archivos."));
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("No se pudo abrir el almacenamiento de archivos."));
  });
}
async function run<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open();
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const req = fn(tx.objectStore(STORE));
    tx.oncomplete = () => { db.close(); resolve(req.result); };
    tx.onerror = tx.onabort = () => { db.close(); reject(tx.error ?? new Error("No se pudo guardar el archivo (¿poco espacio?)")); };
  });
}
export const putFile = (key: string, blob: Blob): Promise<IDBValidKey> => run("readwrite", (s) => s.put(blob, key));
export const getFile = (key: string): Promise<Blob | undefined> => run("readonly", (s) => s.get(key));
export const deleteFile = (key: string): Promise<undefined> => run("readwrite", (s) => s.delete(key));

/** Reduce una imagen a un máximo de `max` px y la devuelve como JPEG; los PDF pasan tal cual (límite 4 MB). */
export async function prepareAttachment(file: File, max = 1400): Promise<Blob> {
  if (file.type === "application/pdf") {
    if (file.size > 4 * 1024 * 1024) throw new Error("El PDF pesa más de 4 MB. Usa una foto del documento.");
    return file;
  }
  if (!file.type.startsWith("image/")) throw new Error("Adjunta una foto o un PDF.");
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((ok, bad) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => bad(new Error("No se pudo leer esa imagen.")); i.src = url; });
    const k = Math.min(1, max / Math.max(img.width, img.height));
    const c = document.createElement("canvas"); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
    c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
    return await new Promise<Blob>((ok, bad) => c.toBlob((b) => (b ? ok(b) : bad(new Error("No se pudo preparar la imagen."))), "image/jpeg", 0.82));
  } finally { URL.revokeObjectURL(url); }
}
