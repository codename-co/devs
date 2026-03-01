/**
 * Convert a File object to a base64-encoded string (without data-URL prefix).
 */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = () => {
      const result = reader.result as string
      // Remove the data URL prefix (data:mime/type;base64,)
      resolve(result.split(',')[1])
    }
    reader.onerror = reject
  })
}
