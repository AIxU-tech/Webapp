/**
 * Image Processing Utilities
 *
 * Shared utilities for image processing, cropping, and validation.
 * Used by profile picture, university logo, and banner upload components.
 */

/**
 * Configuration for square image processing (profile pictures, logos)
 */
export const IMAGE_CONFIG = {
  maxFileSize: 5 * 1024 * 1024, // 5MB
  outputSize: 400, // Output image dimensions (400x400)
  acceptedTypes: 'image/png,image/jpeg,image/jpg,image/gif,image/webp',
  quality: 0.9, // JPEG quality
};

/**
 * Configuration for banner image processing (5:1 aspect ratio)
 */
export const BANNER_CONFIG = {
  maxFileSize: 5 * 1024 * 1024, // 5MB
  outputWidth: 1500,
  outputHeight: 300,
  aspectRatio: 5, // width/height = 5:1
  acceptedTypes: 'image/png,image/jpeg,image/jpg,image/gif,image/webp',
  quality: 0.9,
};

/**
 * Center-crop an image to a square and return as Blob.
 *
 * Takes the center portion of the image, cropping to a square
 * based on the smaller dimension.
 *
 * @param {File} file - The image file to crop
 * @param {number} outputSize - The desired output dimensions (default: 400)
 * @param {number} quality - JPEG quality 0-1 (default: 0.9)
 * @returns {Promise<Blob>} The cropped image as a JPEG Blob
 *
 * @example
 * const croppedBlob = await cropImageToSquare(file);
 * await uploadProfilePicture(croppedBlob);
 */
export async function cropImageToSquare(
  file,
  outputSize = IMAGE_CONFIG.outputSize,
  quality = IMAGE_CONFIG.quality
) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();

    reader.onload = (e) => {
      img.src = e.target.result;
    };

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        canvas.width = outputSize;
        canvas.height = outputSize;

        // Calculate crop dimensions (center crop to square)
        const size = Math.min(img.naturalWidth, img.naturalHeight);
        const offsetX = (img.naturalWidth - size) / 2;
        const offsetY = (img.naturalHeight - size) / 2;

        // Draw the center-cropped square
        ctx.drawImage(
          img,
          offsetX,
          offsetY,
          size,
          size,
          0,
          0,
          outputSize,
          outputSize
        );

        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Failed to create image blob'));
            }
          },
          'image/jpeg',
          quality
        );
      } catch (error) {
        reject(error);
      }
    };

    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };

    reader.readAsDataURL(file);
  });
}

/**
 * Validate an image file for upload.
 *
 * @param {File} file - The file to validate
 * @returns {{valid: boolean, error?: string}} Validation result
 */
export function validateImageFile(file) {
  if (!file) {
    return { valid: false, error: 'No file selected' };
  }

  if (file.size > IMAGE_CONFIG.maxFileSize) {
    return { valid: false, error: 'File size must be less than 5MB' };
  }

  if (!file.type.match(/^image\//)) {
    return { valid: false, error: 'Please select an image file' };
  }

  return { valid: true };
}

/**
 * Center-crop an image to banner aspect ratio (5:1) and return as Blob.
 *
 * Takes the center portion of the image, crops to 5:1 aspect ratio,
 * then scales to the specified output dimensions.
 *
 * @param {File} file - The image file to crop
 * @param {number} outputWidth - The desired output width (default: 1500)
 * @param {number} outputHeight - The desired output height (default: 300)
 * @param {number} quality - JPEG quality 0-1 (default: 0.9)
 * @returns {Promise<Blob>} The cropped image as a JPEG Blob
 *
 * @example
 * const croppedBlob = await cropImageToBanner(file);
 * await uploadBanner(croppedBlob);
 */
export async function cropImageToBanner(
  file,
  outputWidth = BANNER_CONFIG.outputWidth,
  outputHeight = BANNER_CONFIG.outputHeight,
  quality = BANNER_CONFIG.quality
) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();

    reader.onload = (e) => {
      img.src = e.target.result;
    };

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        canvas.width = outputWidth;
        canvas.height = outputHeight;

        // Calculate crop dimensions for 5:1 aspect ratio (center crop)
        const targetRatio = outputWidth / outputHeight;
        const imgRatio = img.naturalWidth / img.naturalHeight;

        let cropWidth, cropHeight, offsetX, offsetY;

        if (imgRatio > targetRatio) {
          // Image is wider than target - crop sides
          cropHeight = img.naturalHeight;
          cropWidth = cropHeight * targetRatio;
          offsetX = (img.naturalWidth - cropWidth) / 2;
          offsetY = 0;
        } else {
          // Image is taller than target - crop top/bottom
          cropWidth = img.naturalWidth;
          cropHeight = cropWidth / targetRatio;
          offsetX = 0;
          offsetY = (img.naturalHeight - cropHeight) / 2;
        }

        // Draw the center-cropped region
        ctx.drawImage(
          img,
          offsetX,
          offsetY,
          cropWidth,
          cropHeight,
          0,
          0,
          outputWidth,
          outputHeight
        );

        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Failed to create image blob'));
            }
          },
          'image/jpeg',
          quality
        );
      } catch (error) {
        reject(error);
      }
    };

    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };

    reader.readAsDataURL(file);
  });
}
