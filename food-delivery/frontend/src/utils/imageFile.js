export const fileToDataUrl = (file) => new Promise((resolve, reject) => {
  if (!file) {
    reject(new Error('No file selected'));
    return;
  }

  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result || ''));
  reader.onerror = () => reject(new Error('Unable to read image file'));
  reader.readAsDataURL(file);
});
