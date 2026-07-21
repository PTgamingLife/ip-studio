/* ── IP Studio:圖片壓縮(送 Claude vision 前先壓,省 token 又快)──
   仿 curve-app/index.html:fileToCompressedBase64,回傳去掉 data: 前綴的純 base64。 */

async function fileToBase64(file, maxSize = 1000, quality = 0.75) {
  const img = await new Promise((res, rej) => {
    const im = new Image();
    im.onload = () => res(im);
    im.onerror = rej;
    im.src = URL.createObjectURL(file);
  });
  const ratio = Math.min(maxSize / img.width, maxSize / img.height, 1);
  const w = Math.round(img.width * ratio);
  const h = Math.round(img.height * ratio);
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  canvas.getContext('2d').drawImage(img, 0, 0, w, h);
  URL.revokeObjectURL(img.src);
  const dataUrl = canvas.toDataURL('image/jpeg', quality);
  return dataUrl.replace(/^data:image\/\w+;base64,/, '');
}
