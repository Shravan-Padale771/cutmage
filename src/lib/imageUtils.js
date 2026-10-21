export const loadImage = src => new Promise((resolve, reject) => { const image = new Image(); image.onload = () => resolve(image); image.onerror = () => reject(new Error('Could not open this image.')); image.src = src; });
export const safeName = name => (name || 'cutmage-image').replace(/\.[^.]+$/, '').replace(/[^a-z0-9-_]+/gi, '-').replace(/^-+|-+$/g, '') || 'cutmage-image';
export const formatBytes = n => n < 1024 ? `${n} B` : n < 1048576 ? `${(n/1024).toFixed(1)} KB` : `${(n/1048576).toFixed(2)} MB`;
export const canvasToBlob = (canvas, type='image/png', quality=.9) => new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('Could not export this format.')),type,quality));
export const downloadBlob = (blob,name) => { const url=URL.createObjectURL(blob), a=document.createElement('a'); a.href=url; a.download=name; a.click(); setTimeout(()=>URL.revokeObjectURL(url),1500); };
export async function zipFiles(files,name='cutmage-files.zip'){ const JSZip=(await import('jszip')).default; const zip=new JSZip(); files.forEach(f=>zip.file(f.name,f.blob)); downloadBlob(await zip.generateAsync({type:'blob'}),name); }
