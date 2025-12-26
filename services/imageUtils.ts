
export const downscaleImageToBlob = (
  file: File,
  maxDimension: number = 1280,
  quality: number = 0.9
): Promise<Blob> => {
  return new Promise(async (resolve, reject) => {
    try {
      let imageSource: ImageBitmap | HTMLImageElement;
      let width: number;
      let height: number;
      let cleanup = () => {};

      // Try createImageBitmap (Low memory) if supported
      if ('createImageBitmap' in window) {
        try {
          imageSource = await createImageBitmap(file);
          width = imageSource.width;
          height = imageSource.height;
          cleanup = () => (imageSource as ImageBitmap).close();
        } catch (e) {
            // Fallback to Image element if bitmap fails
            const url = URL.createObjectURL(file);
            const img = new Image();
            img.src = url;
            await new Promise((res, rej) => {
                img.onload = res;
                img.onerror = rej;
            });
            imageSource = img;
            width = img.width;
            height = img.height;
            cleanup = () => URL.revokeObjectURL(url);
        }
      } else {
        // Fallback for older browsers
        const url = URL.createObjectURL(file);
        const img = new Image();
        img.src = url;
        await new Promise((res, rej) => {
            img.onload = res;
            img.onerror = rej;
        });
        imageSource = img;
        width = img.width;
        height = img.height;
        cleanup = () => URL.revokeObjectURL(url);
      }

      // Calculate new dimensions
      if (width > height) {
        if (width > maxDimension) {
          height *= maxDimension / width;
          width = maxDimension;
        }
      } else {
        if (height > maxDimension) {
          width *= maxDimension / height;
          height = maxDimension;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        cleanup();
        reject(new Error("Canvas context unavailable"));
        return;
      }

      // Draw and downscale
      ctx.drawImage(imageSource, 0, 0, width, height);
      
      // Convert to Blob
      canvas.toBlob(
        (blob) => {
          cleanup();
          // Release canvas memory
          canvas.width = 0;
          canvas.height = 0;
          
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error("Canvas toBlob failed"));
          }
        },
        'image/jpeg',
        quality
      );

    } catch (error) {
      reject(error);
    }
  });
};

// Helper strictly for API calls/Storage that require Base64
export const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            if (typeof reader.result === 'string') {
                // Return raw base64 string without data prefix if needed, 
                // but usually APIs want the raw chars. 
                // However, our current Gemini service expects just the base64 part.
                const result = reader.result;
                const base64 = result.includes(',') ? result.split(',')[1] : result;
                resolve(base64);
            } else {
                reject(new Error("Failed to convert blob to base64"));
            }
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
};