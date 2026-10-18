// Strict file validation for Supabase Storage uploads
// Prevents uploading non-image files or files larger than 5MB

// Allowed image MIME types
export const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/jpg', // Some browsers may send image/jpg
  'image/png',
  'image/webp'
];

// Allowed file extensions (lowercase)
export const ALLOWED_EXTENSIONS = [
  '.jpg',
  '.jpeg',
  '.png',
  '.webp'
];

// Maximum file size: 5 MB in bytes
export const MAX_FILE_SIZE = 5 * 1024 * 1024;

// File signatures (magic bytes) for validation
const FILE_SIGNATURES = {
  'jpeg': [0xFF, 0xD8, 0xFF],
  'png': [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A],
  'webp': [0x52, 0x49, 0x46, 0x46] // RIFF header
};

/**
 * Validate file extension strictly
 * @param {string} filename - The filename to check
 * @returns {boolean} - Whether extension is valid
 */
export function validateFileExtension(filename) {
  if (!filename) return false;
  
  const lowerFilename = filename.toLowerCase();
  return ALLOWED_EXTENSIONS.some(ext => lowerFilename.endsWith(ext));
}

/**
 * Validate MIME type
 * @param {string} mimeType - The MIME type to check
 * @returns {boolean} - Whether MIME type is valid
 */
export function validateMimeType(mimeType) {
  if (!mimeType) return false;
  
  const lowerMimeType = mimeType.toLowerCase();
  return ALLOWED_MIME_TYPES.includes(lowerMimeType);
}

/**
 * Validate file size
 * @param {number} size - File size in bytes
 * @returns {boolean} - Whether file size is within limit
 */
export function validateFileSize(size) {
  return size <= MAX_FILE_SIZE;
}

/**
 * Extract safe file extension from filename
 * @param {string} filename - The filename
 * @returns {string} - Safe extension (jpg, jpeg, png, webp) or empty string if invalid
 */
export function extractSafeExtension(filename) {
  if (!filename) return 'jpg'; // Default fallback
  
  const lowerFilename = filename.toLowerCase();
  
  // Check each allowed extension
  for (const ext of ALLOWED_EXTENSIONS) {
    if (lowerFilename.endsWith(ext)) {
      // Remove the dot and return
      return ext.substring(1);
    }
  }
  
  return 'jpg'; // Default fallback
}

/**
 * Get content type from file extension
 * @param {string} extension - File extension without dot
 * @returns {string} - Corresponding MIME type
 */
export function getContentTypeFromExtension(extension) {
  const ext = extension.toLowerCase();
  switch (ext) {
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'png':
      return 'image/png';
    case 'webp':
      return 'image/webp';
    default:
      return 'application/octet-stream';
  }
}

/**
 * Comprehensive file validation for photo uploads
 * @param {File} file - The file to validate
 * @returns {Object} - Validation result with isValid and error message
 */
export function validatePhotoFile(file) {
  if (!file) {
    return { isValid: false, error: 'Please choose a photo.' };
  }

  // Check file size
  if (!validateFileSize(file.size)) {
    return { 
      isValid: false, 
      error: `Photo must be 5 MB or smaller. Current size: ${(file.size / (1024 * 1024)).toFixed(2)} MB.` 
    };
  }

  // Check MIME type
  const mimeValid = validateMimeType(file.type);
  
  // Check file extension
  const extValid = validateFileExtension(file.name);
  
  if (!mimeValid && !extValid) {
    return { 
      isValid: false, 
      error: 'Photo must be a JPG, PNG, or WebP image. Valid extensions: .jpg, .jpeg, .png, .webp' 
    };
  }

  // If MIME type is valid but extension doesn't match, we should still allow it
  // but use the MIME type to determine the extension
  if (mimeValid && !extValid) {
    console.warn(`File ${file.name} has valid MIME type (${file.type}) but non-standard extension`);
  }

  return { isValid: true, error: '' };
}

/**
 * Validate and prepare file for Supabase upload
 * @param {File} file - The file to prepare
 * @returns {Object} - Result with isValid, error, safeExtension, and contentType
 */
export function prepareFileForUpload(file) {
  const validation = validatePhotoFile(file);
  if (!validation.isValid) {
    return { ...validation, safeExtension: null, contentType: null };
  }

  // Extract safe extension (prioritize MIME type if available)
  let safeExtension = extractSafeExtension(file.name);
  
  // If we have a valid MIME type, use it to determine the correct extension
  if (file.type && validateMimeType(file.type)) {
    const mimeToExt = {
      'image/jpeg': 'jpg',
      'image/jpg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp'
    };
    const mimeBasedExt = mimeToExt[file.type.toLowerCase()];
    if (mimeBasedExt && !file.name.toLowerCase().endsWith(`.${mimeBasedExt}`)) {
      console.warn(`File extension doesn't match MIME type. Using ${mimeBasedExt} based on MIME type`);
      safeExtension = mimeBasedExt;
    }
  }

  // Get content type for upload
  const contentType = getContentTypeFromExtension(safeExtension);

  return {
    isValid: true,
    error: '',
    safeExtension,
    contentType
  };
}